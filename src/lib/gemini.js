const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

const SYSTEM_PROMPTS = {
  en: "Tu es un tuteur d'anglais bienveillant. L'utilisateur veut pratiquer l'anglais. Parle-lui en anglais, corrige ses erreurs avec douceur en expliquant brievement pourquoi, et encourage-le. Adapte ton niveau a ses reponses. Sois naturel et conversationnel, pas scolaire.",
  es: "Eres un tutor de espanol amable. El usuario quiere practicar espanol. Hablale en espanol, corrige sus errores con amabilidad explicando brevemente por que, y anima. Adapta tu nivel a sus respuestas. Se natural y conversacional.",
  de: "Du bist ein freundlicher Deutschlehrer. Der Benutzer mochte Deutsch uben. Sprich mit ihm auf Deutsch, korrigiere seine Fehler sanft mit kurzen Erklarungen und ermutige ihn. Passe dein Niveau an seine Antworten an. Sei naturlich und gespraechig.",
  it: "Sei un tutor di italiano gentile. L'utente vuole praticare l'italiano. Parlagli in italiano, correggi i suoi errori con dolcezza spiegando brevemente perche, e incoraggialo. Adatta il tuo livello alle sue risposte. Sii naturale e conversazionale.",
  ja: "あなたは優しい日本語の先生です。ユーザーは日本語を練習したいです。日本語で話しかけ、間違いがあれば優しく簡潔に説明して直してください。相手のレベルに合わせてください。自然な会話を心がけてください。",
  pt: "Voce e um tutor de portugues gentil. O usuario quer praticar portugues. Fale com ele em portugues, corrija seus erros com gentileza explicando brevemente por que, e encoraje-o. Adapte seu nivel as respostas dele. Seja natural e conversacional.",
}

const WELCOME_MESSAGES = {
  en: "Hey! Ready to practice some English? Tell me about your day, ask me anything, or we can just chat. I'll help you along the way!",
  es: "Hola! Listo para practicar espanol? Cuentame sobre tu dia, preguntame lo que quieras, o simplemente charlemos. Te ayudo en el camino!",
  de: "Hallo! Bereit, etwas Deutsch zu uben? Erzaehl mir von deinem Tag, frag mich was du willst, oder wir koennen einfach plaudern!",
  it: "Ciao! Pronto a praticare un po' di italiano? Raccontami della tua giornata, chiedimi quello che vuoi, o facciamo semplicemente due chiacchiere!",
  ja: "こんにちは！日本語を練習しましょう！今日のことを教えて、何でも聞いて、それとも会話を楽しみましょう！",
  pt: "Ola! Pronto para praticar portugues? Me conta sobre o seu dia, pergunta o que quiser, ou podemos simplesmente conversar!",
}

export function getWelcomeMessage(lang) {
  return WELCOME_MESSAGES[lang] || WELCOME_MESSAGES.en
}

export async function sendMessage(history, userText, lang) {
  const systemPrompt = SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en

  // Build Gemini contents array from conversation history
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: getWelcomeMessage(lang) }] },
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    })),
    { role: 'user', parts: [{ text: userText }] },
  ]

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erreur API (${res.status})`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Reponse vide de Gemini')
  return text
}
