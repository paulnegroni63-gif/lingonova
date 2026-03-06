import { useState, useRef, useEffect } from 'react'
import { sendMessage, getWelcomeMessage } from '../lib/gemini'

const LANG_NAMES = {
  en: 'Anglais', es: 'Espagnol', de: 'Allemand',
  it: 'Italien', ja: 'Japonais', pt: 'Portugais',
}

function MessageBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-500 text-white rounded-br-md'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
        }`}
      >
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

export default function Chat({ lang, onReset }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const welcomeText = getWelcomeMessage(lang)

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const reply = await sendMessage(messages, text, lang)
      setMessages(prev => [...prev, { role: 'model', text: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          {LANG_NAMES[lang] || lang}
        </span>
        <button
          onClick={onReset}
          className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          Changer de langue
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 hide-scrollbar">
        <MessageBubble role="model" text={welcomeText} />
        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} text={msg.text} />
        ))}
        {loading && <TypingIndicator />}
        {error && (
          <div className="text-center text-sm text-red-500 py-2">{error}</div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 pb-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ecris ton message..."
            className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 text-white px-4 py-3 font-semibold transition-all active:scale-95"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
