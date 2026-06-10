import { useState, useEffect, useRef, useCallback } from 'react'
import TerminalPage from './components/TerminalPage'
import HistoryPage from './components/HistoryPage'
import DraftPage from './components/DraftPage'
import { MOCK_MESSAGES, DEFAULT_TAGS } from './data/mockMessages'
import './App.css'

const RECALL_STORAGE_KEY = 'telex_recalled_messages'
const SCHEDULED_STORAGE_KEY = 'telex_scheduled_tasks'

function loadRecalledFromStorage() {
  try {
    const raw = localStorage.getItem(RECALL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function mergeRecalledMessages(messages) {
  const recalled = loadRecalledFromStorage()
  return messages.map((m) => {
    if (recalled[m.id]) {
      return {
        ...m,
        body: '',
        preview: '[此报文已被撤回]',
        recalled: true,
        recalledAt: recalled[m.id].recalledAt,
      }
    }
    return m
  })
}

function loadScheduledFromStorage() {
  try {
    const raw = localStorage.getItem(SCHEDULED_STORAGE_KEY)
    if (!raw) return []
    const tasks = JSON.parse(raw)
    const now = Date.now()
    return tasks.filter((t) => t.scheduledAt > now)
  } catch {
    return []
  }
}

function saveScheduledToStorage(tasks) {
  try {
    localStorage.setItem(SCHEDULED_STORAGE_KEY, JSON.stringify(tasks))
  } catch {
  }
}

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
  const [messages, setMessages] = useState(() => mergeRecalledMessages(MOCK_MESSAGES))
  const [drafts, setDrafts] = useState([])
  const [restoredDraftData, setRestoredDraftData] = useState(null)
  const [tags, setTags] = useState(DEFAULT_TAGS)
  const [scheduledTasks, setScheduledTasks] = useState(() => loadScheduledFromStorage())
  const scheduledTimersRef = useRef(new Map())
  const executingTasksRef = useRef(new Set())

  const executeScheduledTask = useCallback((taskId) => {
    if (executingTasksRef.current.has(taskId)) {
      return
    }

    const existingTimer = scheduledTimersRef.current.get(taskId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      scheduledTimersRef.current.delete(taskId)
    }

    executingTasksRef.current.add(taskId)

    setScheduledTasks((prev) => {
      const task = prev.find((t) => t.id === taskId)
      if (!task) {
        executingTasksRef.current.delete(taskId)
        return prev
      }

      const payload = task.content.endsWith('\r\n') ? task.content : task.content + '\r\n'
      const trimmed = task.content.trim()
      const newMessage = {
        id: `scheduled-${Date.now()}`,
        from: 'LOCAL',
        to: 'NET',
        priority: 'ROUTINE',
        timestamp: new Date().toLocaleString('zh-CN'),
        preview: trimmed.slice(0, 48) + (trimmed.length > 48 ? '…' : ''),
        body: payload,
        tags: [],
        index: 0,
        scheduled: true,
      }
      if (task.attachments && task.attachments.length > 0) {
        newMessage.attachments = task.attachments
      }
      setMessages((prevMsgs) => [
        {
          ...newMessage,
          index: prevMsgs.length + 1,
        },
        ...prevMsgs,
      ])

      setTab('history')

      const remaining = prev.filter((t) => t.id !== taskId)
      saveScheduledToStorage(remaining)
      executingTasksRef.current.delete(taskId)
      return remaining
    })
  }, [])

  const registerTimer = useCallback((task) => {
    const existing = scheduledTimersRef.current.get(task.id)
    if (existing) {
      clearTimeout(existing)
    }
    const delay = task.scheduledAt - Date.now()
    if (delay <= 0) {
      executeScheduledTask(task.id)
      return
    }
    const timerId = setTimeout(() => executeScheduledTask(task.id), delay)
    scheduledTimersRef.current.set(task.id, timerId)
  }, [executeScheduledTask])

  const clearAllTimers = useCallback(() => {
    scheduledTimersRef.current.forEach((timerId) => clearTimeout(timerId))
    scheduledTimersRef.current.clear()
  }, [])

  useEffect(() => {
    scheduledTasks.forEach((task) => registerTimer(task))
    return () => clearAllTimers()
  }, [])

  useEffect(() => {
    saveScheduledToStorage(scheduledTasks)
  }, [scheduledTasks])

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

  const addScheduledTask = (task) => {
    const now = Date.now()
    if (task.scheduledAt <= now) {
      return { success: false, error: '发送时间必须晚于当前时间' }
    }
    const newTask = {
      id: `scheduled-${Date.now()}`,
      name: task.name || `定时任务 ${scheduledTasks.length + 1}`,
      content: task.content,
      scheduledAt: task.scheduledAt,
      createdAt: new Date().toLocaleString('zh-CN'),
    }
    if (task.attachments && task.attachments.length > 0) {
      newTask.attachments = task.attachments
    }
    setScheduledTasks((prev) => [newTask, ...prev])
    registerTimer(newTask)
    return { success: true, task: newTask }
  }

  const cancelScheduledTask = (taskId) => {
    const timerId = scheduledTimersRef.current.get(taskId)
    if (timerId) {
      clearTimeout(timerId)
      scheduledTimersRef.current.delete(taskId)
    }
    setScheduledTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== taskId)
      saveScheduledToStorage(remaining)
      return remaining
    })
  }

  const updateScheduledTask = (taskId, updates) => {
    let updatedTask = null
    setScheduledTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          updatedTask = { ...t, ...updates, updatedAt: new Date().toLocaleString('zh-CN') }
          return updatedTask
        }
        return t
      })
      saveScheduledToStorage(updated)
      return updated
    })
    if (updatedTask && updates.scheduledAt !== undefined) {
      registerTimer(updatedTask)
    }
    return updatedTask
  }

  const addDraft = (draft) => {
    const newDraft = {
      id: `draft-${Date.now()}`,
      name: draft.name || `草稿 ${drafts.length + 1}`,
      content: draft.content || '',
      createdAt: new Date().toLocaleString('zh-CN'),
    }
    if (draft.attachments && draft.attachments.length > 0) {
      newDraft.attachments = draft.attachments
    }
    setDrafts((prev) => [newDraft, ...prev])
    return newDraft
  }

  const findDraftByName = (name) => {
    return drafts.find((d) => d.name === name)
  }

  const overwriteDraft = (id, data) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d
        const updated = { ...d, content: typeof data === 'string' ? data : data.content ?? d.content, updatedAt: new Date().toLocaleString('zh-CN') }
        if (typeof data !== 'string' && data.attachments !== undefined) {
          if (data.attachments && data.attachments.length > 0) {
            updated.attachments = data.attachments
          } else {
            delete updated.attachments
          }
        }
        return updated
      })
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

  const restoreDraftToTerminal = (data) => {
    if (typeof data === 'string') {
      setRestoredDraftData({ content: data, attachments: [] })
    } else {
      setRestoredDraftData({ content: data.content || '', attachments: data.attachments || [] })
    }
    setTab('terminal')
  }

  const clearRestoredDraft = () => {
    setRestoredDraftData(null)
  }

  const createTag = (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return { success: false, error: '标签名称不能为空' }
    }
    const exists = tags.some((t) => t.name === trimmedName)
    if (exists) {
      return { success: false, error: '标签名称已存在' }
    }
    const newTag = {
      id: `tag-${Date.now()}`,
      name: trimmedName,
      color: TAG_COLORS[tags.length % TAG_COLORS.length],
    }
    setTags((prev) => [...prev, newTag])
    return { success: true, tag: newTag }
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

  const recallMessage = (messageId) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const recallTime = new Date().toISOString()
          return {
            ...m,
            body: '',
            preview: '[此报文已被撤回]',
            recalled: true,
            recalledAt: recallTime,
          }
        }
        return m
      })
    )
  }

  const deleteMessages = (messageIds) => {
    setMessages((prev) => prev.filter((m) => !messageIds.includes(m.id)))
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
            restoredData={restoredDraftData}
            onClearRestored={clearRestoredDraft}
            onAddScheduledTask={addScheduledTask}
          />
        )}
        {tab === 'drafts' && (
          <DraftPage
            drafts={drafts}
            onAddDraft={addDraft}
            onUpdateDraft={updateDraft}
            onDeleteDraft={deleteDraft}
            onRestoreToTerminal={restoreDraftToTerminal}
            scheduledTasks={scheduledTasks}
            onCancelScheduledTask={cancelScheduledTask}
            onUpdateScheduledTask={updateScheduledTask}
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
            onRecallMessage={recallMessage}
            onDeleteMessages={deleteMessages}
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
