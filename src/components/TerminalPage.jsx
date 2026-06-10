import { useState, useCallback, useRef, useEffect } from 'react'
import TeletypeOutput from './TeletypeOutput'
import { useTypewriter } from '../hooks/useTypewriter'
import { useTypewriterSound } from '../hooks/useTypewriterSound'
import './TerminalPage.css'

const WELCOME =
  '电传打字机终端 v1.0 就绪\r\n输入报文后按 Enter 发送，或使用下方快捷操作\r\n---\r\n'

export default function TerminalPage({
  soundEnabled,
  onSendToHistory,
  onSaveDraft,
  onOverwriteDraft,
  onFindDraftByName,
  drafts,
  restoredContent,
  onClearRestored,
}) {
  const [input, setInput] = useState('')
  const [outputLog, setOutputLog] = useState(WELCOME)
  const [incoming, setIncoming] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [showDraftMenu, setShowDraftMenu] = useState(false)
  const [showSaveDraftPanel, setShowSaveDraftPanel] = useState(false)
  const [draftNameInput, setDraftNameInput] = useState('')
  const [toast, setToast] = useState(null)
  const [overwriteCandidate, setOverwriteCandidate] = useState(null)
  const inputRef = useRef(null)
  const flushedRef = useRef('')
  const draftMenuRef = useRef(null)
  const savePanelRef = useRef(null)
  const { playClick, playBell } = useTypewriterSound(soundEnabled)

  useEffect(() => {
    if (restoredContent != null) {
      setInput(restoredContent)
      onClearRestored?.()
      inputRef.current?.focus()
    }
  }, [restoredContent, onClearRestored])

  useEffect(() => {
    if (!showDraftMenu) return
    const handleClickOutside = (e) => {
      if (draftMenuRef.current && !draftMenuRef.current.contains(e.target)) {
        setShowDraftMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDraftMenu])

  useEffect(() => {
    if (!showSaveDraftPanel) return
    const handleClickOutside = (e) => {
      if (savePanelRef.current && !savePanelRef.current.contains(e.target)) {
        setShowSaveDraftPanel(false)
        setOverwriteCandidate(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSaveDraftPanel])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type })
  }

  const appendOutput = useCallback((chunk) => {
    setOutputLog((prev) => prev + chunk)
  }, [])

  const handleTick = useCallback(() => {
    playClick()
  }, [playClick])

  const handlePrintComplete = useCallback(() => {
    playBell()
    setIsPrinting(false)
    setIncoming('')
    flushedRef.current = ''
    inputRef.current?.focus()
  }, [playBell])

  const { displayed, done, skip } = useTypewriter(incoming, {
    active: isPrinting && !!incoming,
    speed: 32,
    onTick: handleTick,
    onComplete: handlePrintComplete,
  })

  const sendMessage = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isPrinting) return

    const payload = trimmed.endsWith('\r\n') ? trimmed : trimmed + '\r\n'
    const echo = `\r\n>>> TX ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}\r\n${payload}\r\n`

    onSendToHistory?.({
      id: `local-${Date.now()}`,
      from: 'LOCAL',
      to: 'NET',
      priority: 'ROUTINE',
      timestamp: new Date().toLocaleString('zh-CN'),
      preview: trimmed.slice(0, 48) + (trimmed.length > 48 ? '…' : ''),
      body: payload,
    })

    setInput('')
    flushedRef.current = ''
    setIncoming(echo)
    setIsPrinting(true)
  }, [input, isPrinting, onSendToHistory])

  const simulateReceive = useCallback(
    (text) => {
      if (isPrinting) return
      const payload = text.endsWith('\r\n') ? text : text + '\r\n'
      const header = `\r\n<<< RX ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}\r\n`
      flushedRef.current = ''
      setIncoming(header + payload)
      setIsPrinting(true)
    },
    [isPrinting],
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const openSaveDraftPanel = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setDraftNameInput(trimmed.slice(0, 20))
    setOverwriteCandidate(null)
    setShowSaveDraftPanel(true)
  }

  const closeSaveDraftPanel = () => {
    setShowSaveDraftPanel(false)
    setOverwriteCandidate(null)
    setDraftNameInput('')
  }

  const handleConfirmSaveDraft = () => {
    const name = draftNameInput.trim()
    const content = input
    if (!name && !content.trim()) return

    const existing = onFindDraftByName?.(name)
    if (existing && existing.content !== content) {
      setOverwriteCandidate(existing)
      return
    }

    if (existing) {
      onOverwriteDraft?.(existing.id, content)
      showToastMsg(`已更新草稿「${name}」`)
    } else {
      onSaveDraft?.({ name, content })
      showToastMsg(`草稿「${name || '未命名'}」已保存`)
    }
    closeSaveDraftPanel()
  }

  const handleOverwriteConfirm = () => {
    if (!overwriteCandidate) return
    onOverwriteDraft?.(overwriteCandidate.id, input)
    showToastMsg(`已覆盖草稿「${overwriteCandidate.name}」`)
    closeSaveDraftPanel()
  }

  const handleRestoreDraft = (draft) => {
    setInput(draft.content)
    setShowDraftMenu(false)
    inputRef.current?.focus()
  }

  const fullOutput = outputLog + (isPrinting ? displayed : '')

  useEffect(() => {
    if (done && isPrinting && displayed && flushedRef.current !== displayed) {
      flushedRef.current = displayed
      appendOutput(displayed)
    }
  }, [done, isPrinting, displayed, appendOutput])

  const flushPrinted = () => {
    if (isPrinting && displayed && flushedRef.current !== displayed) {
      flushedRef.current = displayed
      appendOutput(displayed)
    }
    skip()
  }

  return (
    <div className="terminal-page">
      <div className="terminal-page__screen">
        <TeletypeOutput text={fullOutput} showCursor={isPrinting && !done} />
        {isPrinting && (
          <button type="button" className="terminal-page__skip" onClick={flushPrinted}>
            跳过动画
          </button>
        )}
        {toast && (
          <div className={`terminal-page__toast terminal-page__toast--${toast.type}`}>
            {toast.msg}
          </div>
        )}
      </div>

      <div className="terminal-page__input-area">
        <label className="terminal-page__label" htmlFor="teletype-input">
          打字区
        </label>
        <textarea
          id="teletype-input"
          ref={inputRef}
          className="terminal-page__textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="在此输入报文… (Enter 发送, Shift+Enter 换行)"
          rows={4}
          disabled={isPrinting}
          spellCheck={false}
        />
        <div className="terminal-page__actions">
          <button type="button" onClick={sendMessage} disabled={isPrinting || !input.trim()}>
            发送 Enter
          </button>
          <button
            type="button"
            onClick={openSaveDraftPanel}
            disabled={isPrinting || !input.trim()}
          >
            保存草稿
          </button>
          <div className="terminal-page__draft-menu" ref={draftMenuRef}>
            <button
              type="button"
              onClick={() => setShowDraftMenu((v) => !v)}
              disabled={isPrinting || drafts.length === 0}
            >
              恢复草稿 ▾
            </button>
            {showDraftMenu && drafts.length > 0 && (
              <div className="terminal-page__draft-dropdown">
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    className="terminal-page__draft-item"
                    onClick={() => handleRestoreDraft(draft)}
                  >
                    <span className="terminal-page__draft-item-name">{draft.name}</span>
                    <span className="terminal-page__draft-item-time">{draft.createdAt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              simulateReceive(
                'TEST MSG\r\n逐字打印演示: THE QUICK BROWN FOX\r\n回车覆盖: ALFA\rBETA\r\n换行: LINE-1\r\nLINE-2\r\n',
              )
            }
            disabled={isPrinting}
          >
            模拟接收
          </button>
          <button
            type="button"
            onClick={() => {
              setOutputLog(WELCOME)
              setIncoming('')
              setIsPrinting(false)
            }}
          >
            清屏
          </button>
        </div>

        {showSaveDraftPanel && (
          <div className="terminal-page__save-panel" ref={savePanelRef}>
            {overwriteCandidate ? (
              <>
                <p className="terminal-page__save-confirm">
                  草稿「<strong>{overwriteCandidate.name}</strong>」已存在，是否覆盖？
                </p>
                <div className="terminal-page__save-actions">
                  <button type="button" onClick={handleOverwriteConfirm}>
                    覆盖
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverwriteCandidate(null)}
                  >
                    改名保存
                  </button>
                  <button type="button" onClick={closeSaveDraftPanel}>
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="terminal-page__save-label" htmlFor="terminal-draft-name">
                  草稿名称
                </label>
                <div className="terminal-page__save-row">
                  <input
                    id="terminal-draft-name"
                    type="text"
                    className="terminal-page__save-input"
                    value={draftNameInput}
                    onChange={(e) => setDraftNameInput(e.target.value)}
                    placeholder="输入草稿名称（可选）"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleConfirmSaveDraft()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmSaveDraft}
                    disabled={!draftNameInput.trim() && !input.trim()}
                  >
                    保存
                  </button>
                  <button type="button" onClick={closeSaveDraftPanel}>
                    取消
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
