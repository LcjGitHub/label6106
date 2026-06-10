import { useState, useMemo, useEffect } from 'react'
import TeletypeOutput from './TeletypeOutput'
import { useTypewriter } from '../hooks/useTypewriter'
import { useTypewriterSound } from '../hooks/useTypewriterSound'
import { exportAsText, exportAsJson } from '../utils/exportUtils'
import './HistoryPage.css'

const PRIORITY_CLASS = {
  ROUTINE: 'priority--routine',
  PRIORITY: 'priority--priority',
  IMMEDIATE: 'priority--immediate',
  FLASH: 'priority--flash',
}

const PRIORITY_OPTIONS = [
  { value: 'all', label: '全部优先级' },
  { value: 'ROUTINE', label: 'ROUTINE (常规)' },
  { value: 'PRIORITY', label: 'PRIORITY (优先)' },
  { value: 'IMMEDIATE', label: 'IMMEDIATE (急件)' },
  { value: 'FLASH', label: 'FLASH (特急)' },
]

const TIME_RANGE_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7days', label: '近7天' },
  { value: '30days', label: '近30天' },
]

function extractSubject(body) {
  const match = body.match(/SUBJ[::]\s*(.+?)(?:\r\n|\r|\n|$)/i)
  return match ? match[1].trim() : ''
}

function isInTimeRange(timestamp, range) {
  if (range === 'all') return true
  const msgDate = new Date(timestamp.replace(' ', 'T'))
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffTime = today.getTime() - msgDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  switch (range) {
    case 'today':
      return diffDays === 0
    case '7days':
      return diffDays >= 0 && diffDays <= 7
    case '30days':
      return diffDays >= 0 && diffDays <= 30
    default:
      return true
  }
}

export default function HistoryPage({ messages, soundEnabled }) {
  const [selected, setSelected] = useState(null)
  const [replaying, setReplaying] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [timeRangeFilter, setTimeRangeFilter] = useState('all')
  const { playClick, playBell } = useTypewriterSound(soundEnabled)

  const filteredMessages = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return messages.filter((msg) => {
      if (priorityFilter !== 'all' && msg.priority !== priorityFilter) {
        return false
      }
      if (!isInTimeRange(msg.timestamp, timeRangeFilter)) {
        return false
      }
      if (keyword) {
        const subject = extractSubject(msg.body).toLowerCase()
        const from = msg.from.toLowerCase()
        const to = msg.to.toLowerCase()
        const body = msg.body.toLowerCase()
        return (
          subject.includes(keyword) ||
          from.includes(keyword) ||
          to.includes(keyword) ||
          body.includes(keyword)
        )
      }
      return true
    })
  }, [messages, searchKeyword, priorityFilter, timeRangeFilter])

  useEffect(() => {
    if (selected && !filteredMessages.some((m) => m.id === selected.id)) {
      setSelected(null)
      setReplaying(false)
      reset()
    }
  }, [filteredMessages, selected, reset])

  const body = selected?.body ?? ''

  const handleComplete = () => {
    playBell()
    setReplaying(false)
  }

  const { displayed, done, skip, reset } = useTypewriter(body, {
    active: replaying && !!body,
    speed: 24,
    onTick: () => playClick(),
    onComplete: handleComplete,
  })

  const openMessage = (msg) => {
    setSelected(msg)
    setReplaying(true)
    reset()
  }

  const closeDetail = () => {
    setSelected(null)
    setReplaying(false)
    reset()
  }

  return (
    <div className="history-page">
      <aside className="history-page__list-panel">
        <header className="history-page__list-header">
          <h2>报文历史</h2>
          <span className="history-page__count">{filteredMessages.length} / {messages.length} 条</span>
        </header>
        <div className="history-page__filters">
          <input
            type="text"
            className="history-page__search-input"
            placeholder="搜索主题/收发方/内容..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <div className="history-page__filter-row">
            <select
              className="history-page__filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              className="history-page__filter-select"
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value)}
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ul className="history-page__list" role="list">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((msg) => (
            <li key={msg.id}>
              <button
                type="button"
                className={`history-page__item ${selected?.id === msg.id ? 'history-page__item--active' : ''}`}
                onClick={() => openMessage(msg)}
              >
                <span className="history-page__item-top">
                  <span className="history-page__item-id">#{String(msg.index).padStart(3, '0')}</span>
                  <span className={`history-page__priority ${PRIORITY_CLASS[msg.priority] ?? ''}`}>
                    {msg.priority}
                  </span>
                </span>
                <span className="history-page__item-route">
                  {msg.from} → {msg.to}
                </span>
                <span className="history-page__item-time">{msg.timestamp}</span>
                <span className="history-page__item-preview">{msg.preview}</span>
              </button>
            </li>
          ))
          ) : (
            <li className="history-page__no-results">
              <p>未找到匹配的报文</p>
              <p className="history-page__no-results-hint">请尝试调整搜索条件或筛选器</p>
            </li>
          )}
        </ul>
      </aside>

      <section className="history-page__detail">
        {selected ? (
          <>
            <header className="history-page__detail-header">
              <div>
                <h3>
                  报文 #{String(selected.index).padStart(3, '0')}
                </h3>
                <p className="history-page__meta">
                  {selected.from} → {selected.to} · {selected.timestamp} ·{' '}
                  <span className={PRIORITY_CLASS[selected.priority]}>{selected.priority}</span>
                </p>
              </div>
              <div className="history-page__detail-actions">
                {replaying && !done && (
                  <button type="button" onClick={skip}>
                    跳过
                  </button>
                )}
                <button type="button" onClick={() => openMessage(selected)}>
                  重播
                </button>
                <button type="button" onClick={() => exportAsText(selected)}>
                  导出TXT
                </button>
                <button type="button" onClick={() => exportAsJson(selected)}>
                  导出JSON
                </button>
                <button type="button" onClick={closeDetail}>
                  关闭
                </button>
              </div>
            </header>
            <TeletypeOutput
              text={replaying ? displayed : body}
              showCursor={replaying && !done}
              className="history-page__viewer"
            />
            <footer className="history-page__legend">
              <code>\r\n</code> 换行 · <code>\r</code> 回车至行首（覆盖） · 逐字电传打印
            </footer>
          </>
        ) : (
          <div className="history-page__empty">
            <p>← 选择一条报文</p>
            <p className="history-page__empty-hint">点击列表项可逐字回放电传打印效果</p>
          </div>
        )}
      </section>
    </div>
  )
}
