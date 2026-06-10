import { useState } from 'react'
import TerminalPage from './components/TerminalPage'
import HistoryPage from './components/HistoryPage'
import DraftPage from './components/DraftPage'
import { MOCK_MESSAGES, DEFAULT_TAGS } from './data/mockMessages'
import './App.css'

const TAG_COLORS = [
  '#4a90d9', '#e07030', '#8a9a6a', '#c4a035', '#e03030', '#9b59b6',
  '#16a085', '#2980b9', '#d35400', '#8e44ad', '#27ae60', '#c0392b',
]

const TABS = [
  { id: 'terminal', label: '终端' },
  { id: 'drafts', label: '草稿' },
  { id: 'history', label: '报文历史' },
]

export default function App() {
  const [tab, setTab] = useState('terminal')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  const [drafts, setDrafts] = useState([])
  const [restoredDraftContent, setRestoredDraftContent] = useState(null)
  const [tags, setTags] = useState(DEFAULT_TAGS)

  const handleSendToHistory = (msg) => {
    setMessages((prev) => [
      {
        ...msg,
        index: prev.length + 1,
        tags: msg.tags || [],
      },
      ...prev,
    ])
  }

  const addDraft = (draft) => {
    const newDraft = {
      id: `draft-${Date.now()}`,
      name: draft.name || `草稿 ${drafts.length + 1}`,
      content: draft.content || '',
      createdAt: new Date().toLocaleString('zh-CN'),
    }
    setDrafts((prev) => [newDraft, ...prev])
    return newDraft
  }

  const findDraftByName = (name) => {
    return drafts.find((d) => d.name === name)
  }

  const overwriteDraft = (id, content) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, content, updatedAt: new Date().toLocaleString('zh-CN') }
          : d
      )
    )
  }

  const updateDraft = (id, updates) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    )
  }

  const deleteDraft = (id) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  const restoreDraftToTerminal = (content) => {
    setRestoredDraftContent(content)
    setTab('terminal')
  }

  const clearRestoredDraft = () => {
    setRestoredDraftContent(null)
  }

  const createTag = (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) return null
    const exists = tags.some((t) => t.name === trimmedName)
    if (exists) return null
    const newTag = {
      id: `tag-${Date.now()}`,
      name: trimmedName,
      color: TAG_COLORS[tags.length % TAG_COLORS.length],
    }
    setTags((prev) => [...prev, newTag])
    return newTag
  }

  const addTagToMessage = (messageId, tagId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && !m.tags.includes(tagId)
          ? { ...m, tags: [...m.tags, tagId] }
          : m
      )
    )
  }

  const removeTagFromMessage = (messageId, tagId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, tags: m.tags.filter((t) => t !== tagId) }
          : m
      )
    )
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
        {tab === 'terminal' && (
          <TerminalPage
            soundEnabled={soundEnabled}
            onSendToHistory={handleSendToHistory}
            onSaveDraft={addDraft}
            onOverwriteDraft={overwriteDraft}
            onFindDraftByName={findDraftByName}
            drafts={drafts}
            restoredContent={restoredDraftContent}
            onClearRestored={clearRestoredDraft}
          />
        )}
        {tab === 'drafts' && (
          <DraftPage
            drafts={drafts}
            onAddDraft={addDraft}
            onUpdateDraft={updateDraft}
            onDeleteDraft={deleteDraft}
            onRestoreToTerminal={restoreDraftToTerminal}
          />
        )}
        {tab === 'history' && (
          <HistoryPage
            messages={messages}
            soundEnabled={soundEnabled}
            tags={tags}
            onCreateTag={createTag}
            onAddTagToMessage={addTagToMessage}
            onRemoveTagFromMessage={removeTagFromMessage}
          />
        )}
      </main>

      <footer className="app__footer">
        <span>LOCAL STATION · CH-01</span>
        <span>{new Date().toLocaleDateString('zh-CN')}</span>
      </footer>
    </div>
  )
}
