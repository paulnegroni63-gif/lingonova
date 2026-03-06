import { useState, useEffect } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Home from './components/Home'
import Chat from './components/Chat'
import './lib/firebase' // init Firebase

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [targetLang, setTargetLang] = useState(null)

  // Dark mode: suit la preference systeme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (dark) => document.documentElement.classList.toggle('dark', dark)
    apply(mq.matches)
    const handler = (e) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function handleSelectLanguage(lang) {
    setTargetLang(lang)
    setActiveTab('chat')
  }

  function handleResetChat() {
    setTargetLang(null)
    setActiveTab('home')
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black font-sans antialiased transition-colors">
      <Header />

      <main className="flex-1 overflow-hidden pt-[60px] pb-[72px] flex flex-col items-center justify-center">
        {activeTab === 'home' && (
          <Home onSelectLanguage={handleSelectLanguage} />
        )}
        {activeTab === 'chat' && targetLang && (
          <Chat lang={targetLang} onReset={handleResetChat} />
        )}
        {activeTab === 'chat' && !targetLang && (
          <Home onSelectLanguage={handleSelectLanguage} />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
