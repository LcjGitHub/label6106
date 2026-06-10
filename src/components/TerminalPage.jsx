import { useState, useCallback, useRef, useEffect } from 'react'
import TeletypeOutput from './TeletypeOutput'
import { useTypewriter } from '../hooks/useTypewriter'
import { useTypewriterSound } from '../hooks/useTypewriterSound'
import './TerminalPage.css'

const WELCOME =
  '电传打字机终端 v1.0 就绪\r\n输入报文后按 Enter 发送，或使用下方快捷操作\r\n---\r\n'

export default function TerminalPage({ soundEnabled, onSendToHistory }) {
  const [input, setInput] = useState('')
  const [outputLog, setOutputLog] = useState(WELCOME)
  const [incoming, setIncoming] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const inputRef = useRef(null)
  const flushedRef = useRef('')
  const { playClick, playBell } = useTypewriterSound(soundEnabled)

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
      </div>
    </div>
  )
}
