import { useState } from 'react'
import TeletypeOutput from './TeletypeOutput'
import { useTypewriter } from '../hooks/useTypewriter'
import { useTypewriterSound } from '../hooks/useTypewriterSound'
import './HistoryPage.css'

const PRIORITY_CLASS = {
  ROUTINE: 'priority--routine',
  PRIORITY: 'priority--priority',
  IMMEDIATE: 'priority--immediate',
  FLASH: 'priority--flash',
}

export default function HistoryPage({ messages, soundEnabled }) {
  const [selected, setSelected] = useState(null)
  const [replaying, setReplaying] = useState(false)
  const { playClick, playBell } = useTypewriterSound(soundEnabled)

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
          <span className="history-page__count">{messages.length} 条</span>
        </header>
        <ul className="history-page__list" role="list">
          {messages.map((msg) => (
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
          ))}
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
