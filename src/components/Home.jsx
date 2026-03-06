const LANGUAGES = [
  { code: 'en', flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'Anglais' },
  { code: 'es', flag: '\uD83C\uDDEA\uD83C\uDDF8', name: 'Espagnol' },
  { code: 'de', flag: '\uD83C\uDDE9\uD83C\uDDEA', name: 'Allemand' },
  { code: 'it', flag: '\uD83C\uDDEE\uD83C\uDDF9', name: 'Italien' },
  { code: 'ja', flag: '\uD83C\uDDEF\uD83C\uDDF5', name: 'Japonais' },
  { code: 'pt', flag: '\uD83C\uDDE7\uD83C\uDDF7', name: 'Portugais' },
]

export default function Home({ onSelectLanguage }) {
  return (
    <div className="text-center space-y-8 w-full max-w-sm animate-fade-in">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Quelle langue aujourd'hui ?
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Choisis une langue et commence a discuter avec ton tuteur IA.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LANGUAGES.map(({ code, flag, name }) => (
          <button
            key={code}
            onClick={() => onSelectLanguage(code)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-95 shadow-sm"
          >
            <span className="text-2xl">{flag}</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[15px]">{name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
