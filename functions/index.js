const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialisation de l'application Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Configuration du fuseau horaire de la France
const TIMEZONE = 'Europe/Paris';

// Fonction utilitaire pour extraire la date au format YYYY-MM-DD selon le fuseau
const getLocalYYYYMMDD = (dateObj) => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(dateObj);
};

exports.healthAutoExportWebhook = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send({ error: 'Méthode non autorisée. Utilisez POST.' });
        return;
    }

    const payload = req.body;
    if (!payload || !payload.data) {
        res.status(400).send({ error: 'Format de payload invalide. Objet "data" manquant.' });
        return;
    }

    const db = admin.firestore();
    const metrics = payload.data.metrics || [];
    const workouts = payload.data.workouts || [];

    if (metrics.length === 0 && workouts.length === 0) {
        res.status(200).send({ success: true, message: 'Aucune donnée à traiter.' });
        return;
    }

    // --- CALCUL DES DATES DE RÉFÉRENCE (Aujourd'hui et Hier) ---
    const now = new Date();
    const todayStr = getLocalYYYYMMDD(now);
    
    // On calcule la date d'hier pour rattraper le sommeil de la nuit dernière
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getLocalYYYYMMDD(yesterday);

    try {
        // =========================================================================
        // VIDAGE INTELLIGENT DE LA COLLECTION (Indépendance Workouts / Metrics)
        // =========================================================================
        const collectionRef = db.collection('health_metrics');
        const snapshot = await collectionRef.get();
        const hasWorkouts = workouts.length > 0;

        if (!snapshot.empty) {
            let deleteBatch = db.batch();
            let deleteOperationsCount = 0;

            for (const doc of snapshot.docs) {
                const docData = doc.data();
                const isVitalia = docData.source === "Vitalia AI";
                
                // On sécurise la casse et les accents pour détecter l'entraînement
                const metricName = (docData.metric_name || "").toLowerCase();
                const isInterieurMarcher = metricName === "intérieur marcher" || metricName === "interieur marcher";

                let shouldDelete = false;

                if (!isVitalia) { // On ne touche jamais à Vitalia AI
                    if (hasWorkouts) {
                        // EXPORT WORKOUTS : On ne supprime QUE "intérieur marcher" pour le remplacer
                        if (isInterieurMarcher) {
                            shouldDelete = true;
                        }
                    } else {
                        // EXPORT METRICS : On supprime TOUT SAUF "intérieur marcher"
                        if (!isInterieurMarcher) {
                            shouldDelete = true;
                        }
                    }
                }

                if (shouldDelete) {
                    deleteBatch.delete(doc.ref);
                    deleteOperationsCount++;

                    if (deleteOperationsCount === 490) {
                        await deleteBatch.commit();
                        deleteBatch = db.batch();
                        deleteOperationsCount = 0;
                    }
                }
            }

            if (deleteOperationsCount > 0) {
                await deleteBatch.commit();
            }
        }

        // =========================================================================
        // FILTRAGE ET SAUVEGARDE DES NOUVELLES DONNÉES
        // =========================================================================
        let batch = db.batch();
        let operationsCount = 0;
        let totalProcessed = 0;

        // 1. Traitement des METRICS classiques
        for (const metric of metrics) {
            const metricName = metric.name;
            const units = metric.units;
            const metricData = metric.data || [];

            for (const point of metricData) {
                if (!point.date) continue;
                
                const parsedDate = new Date(point.date);
                if (isNaN(parsedDate.getTime())) continue;

                const pointDateStr = getLocalYYYYMMDD(parsedDate);
                let isDataFromToday = false;

                if (pointDateStr === todayStr) {
                    isDataFromToday = true;
                } else if (pointDateStr === yesterdayStr && metricName.toLowerCase().includes('sleep')) {
                    isDataFromToday = true;
                }

                if (!isDataFromToday) continue; 

                const docRef = db.collection('health_metrics').doc();
                const docData = {
                    metric_name: metricName,
                    ...point,
                    parsed_date: parsedDate,
                    created_at: admin.firestore.FieldValue.serverTimestamp()
                };

                if (units !== undefined) {
                    docData.units = units;
                }

                Object.keys(docData).forEach(key => {
                    if (docData[key] === undefined) delete docData[key];
                });

                batch.set(docRef, docData);
                operationsCount++;
                totalProcessed++;

                if (operationsCount === 490) {
                    await batch.commit();
                    batch = db.batch(); 
                    operationsCount = 0;
                }
            }
        }

        // 2. Traitement et CUMUL des WORKOUTS (Entraînements)
        const aggregatedWorkouts = {};

        for (const workout of workouts) {
            if (!workout.start) continue;

            const parsedDate = new Date(workout.start);
            if (isNaN(parsedDate.getTime())) continue;

            // On vérifie si l'entraînement a eu lieu aujourd'hui
            const pointDateStr = getLocalYYYYMMDD(parsedDate);
            if (pointDateStr !== todayStr) {
                continue; 
            }

            const workoutName = workout.name;
            const workoutDuration = workout.duration || 0; // Sécurité si undefined

            // Si c'est le premier entraînement de ce type, on l'initialise
            if (!aggregatedWorkouts[workoutName]) {
                aggregatedWorkouts[workoutName] = {
                    metric_name: workoutName,
                    duration: 0,
                    parsed_date: parsedDate // On garde l'heure du premier workout de la journée comme référence
                };
            }

            // On additionne la durée
            aggregatedWorkouts[workoutName].duration += workoutDuration;
        }

        // Sauvegarde des entraînements cumulés dans Firestore
        for (const workoutName in aggregatedWorkouts) {
            const docRef = db.collection('health_metrics').doc();
            const workoutData = aggregatedWorkouts[workoutName];

            const docData = {
                metric_name: workoutData.metric_name,
                duration: workoutData.duration, // Durée totale en secondes
                parsed_date: workoutData.parsed_date,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };

            batch.set(docRef, docData);
            operationsCount++;
            totalProcessed++;

            if (operationsCount === 490) {
                await batch.commit();
                batch = db.batch(); 
                operationsCount = 0;
            }
        }

        // Commit des opérations restantes
        if (operationsCount > 0) {
            await batch.commit();
        }

        res.status(200).send({ 
            success: true, 
            message: `Nettoyage ciblé effectué. ${totalProcessed} documents du jour insérés avec succès (entraînements cumulés).` 
        });

    } catch (error) {
        console.error("Erreur lors de la sauvegarde sur Firestore:", error);
        res.status(500).send({ 
            success: false, 
            error: "Erreur interne du serveur lors de la sauvegarde sur Firestore." 
        });
    }
});