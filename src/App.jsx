import { useState } from 'react'
import TerminalPage from './components/TerminalPage'
import HistoryPage from './components/HistoryPage'
import { MOCK_MESSAGES } from './data/mockMessages'
import './App.css'

const TABS = [
  { id: 'terminal', label: '终端' },
  { id: 'history', label: '报文历史' },
]

export default function App() {
  const [tab, setTab] = useState('terminal')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [messages, setMessages] = useState(MOCK_MESSAGES)

  const handleSendToHistory = (msg) => {
    setMessages((prev) => [
      {
        ...msg,
        index: prev.length + 1,
      },
      ...prev,
    ])
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__lamp" aria-hidden="true" />
          <h1>电传打字机终端</h1>
          <span className="app__model">TELEX MODEL 33</span>
        </div>

        <nav className="app__nav" role="tablist" aria-label="页面导航">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`app__tab ${tab === t.id ? 'app__tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <label className="app__sound-toggle">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          <span>打字机音效</span>
        </label>
      </header>

      <main className="app__main" role="tabpanel">
        {tab === 'terminal' ? (
          <TerminalPage soundEnabled={soundEnabled} onSendToHistory={handleSendToHistory} />
        ) : (
          <HistoryPage messages={messages} soundEnabled={soundEnabled} />
        )}
      </main>

      <footer className="app__footer">
        <span>LOCAL STATION · CH-01</span>
        <span>{new Date().toLocaleDateString('zh-CN')}</span>
      </footer>
    </div>
  )
}
