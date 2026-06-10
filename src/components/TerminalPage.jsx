import { useState, useCallback, useRef, useEffect } from 'react'
import TeletypeOutput from './TeletypeOutput'
import { useTypewriter } from '../hooks/useTypewriter'
import { useTypewriterSound } from '../hooks/useTypewriterSound'
import NotificationManager from '../utils/NotificationManager'
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
  onAddScheduledTask,
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
  const [notificationPermission, setNotificationPermission] = useState(NotificationManager.getPermission())
  const [showSchedulePanel, setShowSchedulePanel] = useState(false)
  const [scheduleName, setScheduleName] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const flushedRef = useRef('')
  const draftMenuRef = useRef(null)
  const savePanelRef = useRef(null)
  const schedulePanelRef = useRef(null)
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
    if (!showSchedulePanel) return
    const handleClickOutside = (e) => {
      if (schedulePanelRef.current && !schedulePanelRef.current.contains(e.target)) {
        setShowSchedulePanel(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSchedulePanel])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type })
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    const MAX_SIZE = 2 * 1024 * 1024

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        showToastMsg(`文件「${file.name}」超过 2MB 限制`, 'error')
        continue
      }

      try {
        const base64 = await fileToBase64(file)
        const newAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: base64,
        }
        setAttachments((prev) => [...prev, newAttachment])
        showToastMsg(`已添加附件「${file.name}」`, 'success')
      } catch (err) {
        showToastMsg(`文件「${file.name}」读取失败`, 'error')
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const handleEnableNotification = async () => {
    const granted = await NotificationManager.requestPermission()
    const currentPermission = NotificationManager.getPermission()
    setNotificationPermission(currentPermission)
    if (granted) {
      showToastMsg('通知权限已开启', 'success')
    } else if (currentPermission === 'denied') {
      showToastMsg('通知权限被拒绝，请在浏览器设置中手动开启', 'error')
    }
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

    const messageAttachments = attachments.map((att) => ({
      id: att.id,
      name: att.name,
      size: att.size,
      type: att.type,
      data: att.data,
    }))

    onSendToHistory?.({
      id: `local-${Date.now()}`,
      from: 'LOCAL',
      to: 'NET',
      priority: 'ROUTINE',
      timestamp: new Date().toLocaleString('zh-CN'),
      preview: trimmed.slice(0, 48) + (trimmed.length > 48 ? '…' : ''),
      body: payload,
      attachments: messageAttachments,
    })

    setInput('')
    setAttachments([])
    flushedRef.current = ''
    setIncoming(echo)
    setIsPrinting(true)
  }, [input, isPrinting, onSendToHistory, attachments])

  const simulateReceive = useCallback(
    (text, { from = 'UNKNOWN' } = {}) => {
      if (isPrinting) return
      const payload = text.endsWith('\r\n') ? text : text + '\r\n'
      const header = `\r\n<<< RX ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}\r\n`
      const preview = text.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').slice(0, 48).trim() + (text.length > 48 ? '…' : '')

      NotificationManager.showIncomingMessage(from, preview).then((result) => {
        if (!result?.success) {
          showToastMsg(`新报文 - 来自 ${from}：${preview}`, 'info')
        }
      })

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

  const openSchedulePanel = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().slice(0, 5)
    setScheduleName(trimmed.slice(0, 20))
    setScheduleDate(dateStr)
    setScheduleTime(timeStr)
    setShowSchedulePanel(true)
  }

  const closeSchedulePanel = () => {
    setShowSchedulePanel(false)
    setScheduleName('')
    setScheduleDate('')
    setScheduleTime('')
  }

  const handleConfirmSchedule = () => {
    const trimmed = input.trim()
    if (!trimmed || !scheduleDate || !scheduleTime) return

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
    const scheduledAt = scheduledDateTime.getTime()
    const now = Date.now()

    if (scheduledAt <= now) {
      showToastMsg('发送时间必须晚于当前时间', 'error')
      return
    }

    const taskData = {
      name: scheduleName.trim() || trimmed.slice(0, 20) || '定时报文',
      content: input,
      scheduledAt,
    }

    if (attachments.length > 0) {
      taskData.attachments = attachments.map((att) => ({
        id: att.id,
        name: att.name,
        size: att.size,
        type: att.type,
        data: att.data,
      }))
    }

    const result = onAddScheduledTask?.(taskData)

    if (result?.success) {
      showToastMsg(`定时发送已设置，将于 ${scheduledDateTime.toLocaleString('zh-CN')} 发送`)
      setInput('')
      setAttachments([])
      closeSchedulePanel()
    } else if (result?.error) {
      showToastMsg(result.error, 'error')
    }
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

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          style={{ display: 'none' }}
        />

        {attachments.length > 0 && (
          <div className="terminal-page__attachments">
            <div className="terminal-page__attachments-label">
              附件 ({attachments.length})
            </div>
            <div className="terminal-page__attachments-list">
              {attachments.map((att) => (
                <div key={att.id} className="terminal-page__attachment-item">
                  <span className="terminal-page__attachment-icon">📎</span>
                  <span className="terminal-page__attachment-name" title={att.name}>
                    {att.name}
                  </span>
                  <span className="terminal-page__attachment-size">
                    {formatFileSize(att.size)}
                  </span>
                  <button
                    type="button"
                    className="terminal-page__attachment-remove"
                    onClick={() => handleRemoveAttachment(att.id)}
                    title="移除附件"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="terminal-page__actions">
          <button type="button" onClick={sendMessage} disabled={isPrinting || !input.trim()}>
            发送 Enter
          </button>
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={isPrinting}
            className="terminal-page__attach-btn"
          >
            📎 附件
          </button>
          <button
            type="button"
            onClick={openSaveDraftPanel}
            disabled={isPrinting || !input.trim()}
          >
            保存草稿
          </button>
          <button
            type="button"
            onClick={openSchedulePanel}
            disabled={isPrinting || !input.trim()}
            className="terminal-page__schedule-btn"
          >
            定时发送
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
                { from: 'TEST-STATION' },
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
          {notificationPermission === 'default' && (
            <button type="button" onClick={handleEnableNotification}>
              开启通知
            </button>
          )}
        </div>

        {notificationPermission === 'denied' && (
          <div className="terminal-page__notification-hint">
            <span>通知权限被拒绝，新报文提醒将以页面内提示显示。如需系统通知，请在浏览器设置中开启本站点的通知权限。</span>
          </div>
        )}

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

        {showSchedulePanel && (
          <div className="terminal-page__schedule-panel" ref={schedulePanelRef}>
            <label className="terminal-page__schedule-label">
              定时发送设置
            </label>
            <div className="terminal-page__schedule-form">
              <div className="terminal-page__schedule-input-group">
                <label className="terminal-page__schedule-input-label" htmlFor="schedule-name">
                  任务名称
                </label>
                <input
                  id="schedule-name"
                  type="text"
                  className="terminal-page__schedule-input"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="输入任务名称（可选）"
                />
              </div>
              <div className="terminal-page__schedule-row">
                <div className="terminal-page__schedule-input-group">
                  <label className="terminal-page__schedule-input-label" htmlFor="schedule-date">
                    发送日期
                  </label>
                  <input
                    id="schedule-date"
                    type="date"
                    className="terminal-page__schedule-input"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="terminal-page__schedule-input-group">
                  <label className="terminal-page__schedule-input-label" htmlFor="schedule-time">
                    发送时间
                  </label>
                  <input
                    id="schedule-time"
                    type="time"
                    className="terminal-page__schedule-input"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="terminal-page__schedule-actions">
              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={!scheduleDate || !scheduleTime}
              >
                确认定时
              </button>
              <button type="button" onClick={closeSchedulePanel}>
                取消
              </button>
            </div>
            <p className="terminal-page__schedule-hint">
              到达设定时间后，报文将自动发送到历史记录
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
