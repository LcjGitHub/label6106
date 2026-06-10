import { useState, useMemo, useEffect } from 'react'
import TeletypeOutput from './TeletypeOutput'
import TagFilter from './TagFilter'
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

const RECALL_WINDOW_MS = 2 * 60 * 1000
const RECALL_STORAGE_KEY = 'telex_recalled_messages'
const STAR_STORAGE_KEY = 'telex_starred_messages'

function loadRecalledFromStorage() {
  try {
    const raw = localStorage.getItem(RECALL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveRecalledToStorage(data) {
  try {
    localStorage.setItem(RECALL_STORAGE_KEY, JSON.stringify(data))
  } catch {
  }
}

function loadStarredFromStorage() {
  try {
    const raw = localStorage.getItem(STAR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStarredToStorage(data) {
  try {
    localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(data))
  } catch {
  }
}

function parseTimestamp(timestamp) {
  if (!timestamp) return NaN
  let t = String(timestamp).trim()
  if (!t) return NaN

  if (t.includes('T') || /^\d{4}-\d{2}-\d{2}[ T]/.test(t)) {
    const parsed = new Date(t.replace(' ', 'T'))
    return parsed.getTime()
  }

  if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(t)) {
    const parts = t.split(/[\s\/:]/)
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    const hour = parseInt(parts[3] || '0', 10)
    const min = parseInt(parts[4] || '0', 10)
    const sec = parseInt(parts[5] || '0', 10)
    const parsed = new Date(year, month, day, hour, min, sec)
    return parsed.getTime()
  }

  const fallback = new Date(t)
  return fallback.getTime()
}

function isWithinRecallWindow(msg) {
  if (!msg || msg.recalled) return false
  const msgTime = parseTimestamp(msg.timestamp)
  if (isNaN(msgTime)) return false
  const now = Date.now()
  const diff = now - msgTime
  return diff >= 0 && diff <= RECALL_WINDOW_MS
}

function formatRecallTime(isoString) {
  const d = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function HistoryPage({
  messages,
  soundEnabled,
  tags,
  onCreateTag,
  onAddTagToMessage,
  onRemoveTagFromMessage,
  onRecallMessage,
}) {
  const [selected, setSelected] = useState(null)
  const [replaying, setReplaying] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [timeRangeFilter, setTimeRangeFilter] = useState('all')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [exportToast, setExportToast] = useState(null)
  const [confirmRecall, setConfirmRecall] = useState(null)
  const [starFilter, setStarFilter] = useState(false)
  const [starred, setStarred] = useState(() => loadStarredFromStorage())
  const [starAnimatingId, setStarAnimatingId] = useState(null)
  const { playClick, playBell } = useTypewriterSound(soundEnabled)

  useEffect(() => {
    const stored = loadRecalledFromStorage()
    const hasNew = messages.some(
      (m) => m.recalled && !stored[m.id]
    )
    if (hasNew) {
      const updated = { ...stored }
      messages.forEach((m) => {
        if (m.recalled) {
          updated[m.id] = {
            recalledAt: m.recalledAt,
          }
        }
      })
      saveRecalledToStorage(updated)
    }
  }, [messages])

  const getTagById = (tagId) => tags.find((t) => t.id === tagId)

  const handleToggleStar = (messageId) => {
    setStarAnimatingId(messageId)
    setTimeout(() => setStarAnimatingId(null), 400)

    setStarred((prev) => {
      const updated = { ...prev }
      if (updated[messageId]) {
        delete updated[messageId]
      } else {
        updated[messageId] = {
          starredAt: new Date().toISOString(),
        }
      }
      saveStarredToStorage(updated)
      return updated
    })
  }

  const isStarred = (messageId) => {
    return !!starred[messageId]
  }

  const filteredMessages = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return messages.filter((msg) => {
      if (starFilter && !isStarred(msg.id)) {
        return false
      }
      if (priorityFilter !== 'all' && msg.priority !== priorityFilter) {
        return false
      }
      if (!isInTimeRange(msg.timestamp, timeRangeFilter)) {
        return false
      }
      if (selectedTagIds.length > 0) {
        const msgTagIds = msg.tags || []
        const hasAllTags = selectedTagIds.every((tagId) => msgTagIds.includes(tagId))
        if (!hasAllTags) {
          return false
        }
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
  }, [messages, searchKeyword, priorityFilter, timeRangeFilter, selectedTagIds, starFilter, starred])

  const handleToggleTagFilter = (tagId) => {
    if (tagId === null) {
      setSelectedTagIds([])
      return
    }
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  const handleAddTagToSelected = (tagId) => {
    if (selected && !selected.tags.includes(tagId)) {
      onAddTagToMessage(selected.id, tagId)
    }
  }

  const handleRemoveTagFromSelected = (tagId) => {
    if (selected && selected.tags.includes(tagId)) {
      onRemoveTagFromMessage(selected.id, tagId)
    }
  }

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

  useEffect(() => {
    if (selected) {
      const latest = messages.find((m) => m.id === selected.id)
      if (latest && latest !== selected) {
        setSelected(latest)
      } else if (!latest) {
        setSelected(null)
        setReplaying(false)
        reset()
      }
    }
  }, [messages, selected, reset])

  useEffect(() => {
    if (!exportToast) return
    const timer = setTimeout(() => setExportToast(null), 2000)
    return () => clearTimeout(timer)
  }, [exportToast])

  const showExportToast = (msg) => {
    setExportToast({ msg })
  }

  const handleExportText = () => {
    exportAsText(selected)
    showExportToast('已导出文本文件')
  }

  const handleExportJson = () => {
    exportAsJson(selected)
    showExportToast('已导出结构化数据文件')
  }

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

  const handleRequestRecall = (msg, e) => {
    if (e) {
      e.stopPropagation()
    }
    setConfirmRecall(msg)
  }

  const handleConfirmRecall = () => {
    if (confirmRecall && onRecallMessage) {
      onRecallMessage(confirmRecall.id)
    }
    setConfirmRecall(null)
  }

  const handleCancelRecall = () => {
    setConfirmRecall(null)
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
          <label className="history-page__star-filter">
            <input
              type="checkbox"
              checked={starFilter}
              onChange={(e) => setStarFilter(e.target.checked)}
            />
            <span className="history-page__star-filter-icon">★</span>
            <span>只看收藏</span>
          </label>
          <TagFilter
            tags={tags}
            selectedTagIds={selectedTagIds}
            onToggleTag={handleToggleTagFilter}
            onCreateTag={onCreateTag}
          />
        </div>
        <ul className="history-page__list" role="list">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((msg) => (
            <li key={msg.id} className={msg.recalled ? 'history-page__list-item--recalled' : ''}>
              <button
                type="button"
                className={`history-page__item ${selected?.id === msg.id ? 'history-page__item--active' : ''} ${msg.recalled ? 'history-page__item--recalled' : ''}`}
                onClick={() => openMessage(msg)}
              >
                <span className="history-page__item-top">
                  <span className="history-page__item-id">
                    <span
                      className={`history-page__star-icon ${isStarred(msg.id) ? 'history-page__star-icon--active' : ''} ${starAnimatingId === msg.id ? 'history-page__star-icon--animating' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleStar(msg.id)
                      }}
                      title={isStarred(msg.id) ? '取消收藏' : '收藏'}
                    >
                      ★
                    </span>
                    #{String(msg.index).padStart(3, '0')}
                  </span>
                  <span className="history-page__item-top-right">
                    {msg.recalled && (
                      <span className="history-page__recall-badge">已撤回</span>
                    )}
                    <span className={`history-page__priority ${PRIORITY_CLASS[msg.priority] ?? ''}`}>
                      {msg.priority}
                    </span>
                  </span>
                </span>
                <span className="history-page__item-route">
                  {msg.from} → {msg.to}
                </span>
                <span className="history-page__item-time">{msg.timestamp}</span>
                {msg.recalled && msg.recalledAt && (
                  <span className="history-page__item-recall-time">
                    撤回于 {formatRecallTime(msg.recalledAt)}
                  </span>
                )}
                {msg.tags && msg.tags.length > 0 && (
                  <span className="history-page__item-tags">
                    {msg.tags.map((tagId) => {
                      const tag = getTagById(tagId)
                      if (!tag) return null
                      return (
                        <span
                          key={tagId}
                          className="history-page__item-tag"
                          style={{ background: tag.color, color: '#fff' }}
                        >
                          {tag.name}
                        </span>
                      )
                    })}
                  </span>
                )}
                <span className="history-page__item-preview">{msg.preview}</span>
                {isWithinRecallWindow(msg) && (
                  <span className="history-page__item-actions">
                    <button
                      type="button"
                      className="history-page__recall-btn"
                      onClick={(e) => handleRequestRecall(msg, e)}
                      title="撤回此报文"
                    >
                      撤回
                    </button>
                  </span>
                )}
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
        {confirmRecall && (
          <div className="history-page__modal-overlay" onClick={handleCancelRecall}>
            <div className="history-page__modal" onClick={(e) => e.stopPropagation()}>
              <h4 className="history-page__modal-title">确认撤回报文</h4>
              <p className="history-page__modal-message">
                您确定要撤回报文 #{String(confirmRecall.index).padStart(3, '0')} 吗？
              </p>
              <p className="history-page__modal-hint">
                撤回后报文内容将被清空，此操作不可撤销。
              </p>
              <div className="history-page__modal-actions">
                <button type="button" className="history-page__modal-btn--cancel" onClick={handleCancelRecall}>
                  取消
                </button>
                <button type="button" className="history-page__modal-btn--confirm" onClick={handleConfirmRecall}>
                  确认撤回
                </button>
              </div>
            </div>
          </div>
        )}
        {selected ? (
          <>
            <header className="history-page__detail-header">
              <div className="history-page__detail-header-main">
                <h3>
                  <span
                    className={`history-page__detail-star ${isStarred(selected.id) ? 'history-page__detail-star--active' : ''} ${starAnimatingId === selected.id ? 'history-page__detail-star--animating' : ''}`}
                    onClick={() => handleToggleStar(selected.id)}
                    title={isStarred(selected.id) ? '取消收藏' : '收藏'}
                  >
                    ★
                  </span>
                  报文 #{String(selected.index).padStart(3, '0')}
                  {selected.recalled && (
                    <span className="history-page__recall-badge history-page__recall-badge--large">已撤回</span>
                  )}
                </h3>
                <p className="history-page__meta">
                  {selected.from} → {selected.to} · {selected.timestamp} ·{' '}
                  <span className={PRIORITY_CLASS[selected.priority]}>{selected.priority}</span>
                </p>
                {selected.recalled && selected.recalledAt && (
                  <p className="history-page__recall-info">
                    此报文已于 {formatRecallTime(selected.recalledAt)} 被撤回
                  </p>
                )}
                <div className="history-page__tag-manager">
                  <div className="history-page__tag-manager-label">标签管理：</div>
                  <div className="history-page__tag-manager-tags">
                    {selected.tags && selected.tags.length > 0 ? (
                      selected.tags.map((tagId) => {
                        const tag = getTagById(tagId)
                        if (!tag) return null
                        return (
                          <span
                            key={tagId}
                            className="history-page__managed-tag"
                            style={{ background: tag.color, color: '#fff' }}
                          >
                            {tag.name}
                            <button
                              type="button"
                              className="history-page__managed-tag-remove"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveTagFromSelected(tagId)
                              }}
                              title="移除标签"
                            >
                              ×
                            </button>
                          </span>
                        )
                      })
                    ) : (
                      <span className="history-page__tag-manager-empty">暂无标签</span>
                    )}
                  </div>
                  <div className="history-page__tag-manager-add">
                    <span className="history-page__tag-manager-add-label">+ 添加：</span>
                    {tags
                      .filter((t) => !selected.tags.includes(t.id))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className="history-page__tag-add-btn"
                          style={{ color: tag.color, borderColor: tag.color }}
                          onClick={() => handleAddTagToSelected(tag.id)}
                        >
                          {tag.name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
              <div className="history-page__detail-actions">
                {isWithinRecallWindow(selected) && (
                  <button
                    type="button"
                    className="history-page__recall-action-btn"
                    onClick={() => handleRequestRecall(selected)}
                  >
                    撤回
                  </button>
                )}
                {replaying && !done && (
                  <button type="button" onClick={skip}>
                    跳过
                  </button>
                )}
                {!selected.recalled && (
                  <button type="button" onClick={() => openMessage(selected)}>
                    重播
                  </button>
                )}
                {!selected.recalled && (
                  <>
                    <button type="button" onClick={handleExportText}>
                      导出文本
                    </button>
                    <button type="button" onClick={handleExportJson}>
                      导出结构化数据
                    </button>
                  </>
                )}
                <button type="button" onClick={closeDetail}>
                  关闭
                </button>
              </div>
              {exportToast && (
                <div className="history-page__toast">
                  {exportToast.msg}
                </div>
              )}
            </header>
            {selected.recalled ? (
              <div className="history-page__recalled-viewer">
                <div className="history-page__recalled-icon">⚑</div>
                <p className="history-page__recalled-text">此报文已被撤回</p>
                <p className="history-page__recalled-hint">
                  报文发送者已于 {formatRecallTime(selected.recalledAt)} 撤回此报文，内容已被清空。
                </p>
              </div>
            ) : (
              <>
                <TeletypeOutput
                  text={replaying ? displayed : body}
                  showCursor={replaying && !done}
                  className="history-page__viewer"
                />
                <footer className="history-page__legend">
                  <code>\r\n</code> 换行 · <code>\r</code> 回车至行首（覆盖） · 逐字电传打印
                </footer>
              </>
            )}
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
