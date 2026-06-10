import { useState, useEffect, useMemo } from 'react'
import './DraftPage.css'

export default function DraftPage({
  drafts,
  onAddDraft,
  onUpdateDraft,
  onDeleteDraft,
  onRestoreToTerminal,
  scheduledTasks,
  onCancelScheduledTask,
  onUpdateScheduledTask,
}) {
  const [selected, setSelected] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [dirtyPrompt, setDirtyPrompt] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('drafts')
  const [selectedScheduled, setSelectedScheduled] = useState(null)
  const [editingScheduleDate, setEditingScheduleDate] = useState('')
  const [editingScheduleTime, setEditingScheduleTime] = useState('')
  const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)

  const originalName = selected?.name ?? ''
  const originalContent = selected?.content ?? ''

  const isDirty = useMemo(() => {
    if (isCreating) {
      return editingName.trim() || editingContent.trim()
    }
    if (!selected) return false
    return editingName !== originalName || editingContent !== originalContent
  }, [isCreating, editingName, editingContent, selected, originalName, originalContent])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const showToastMsg = (msg) => {
    setToast(msg)
  }

  const resetState = () => {
    setSelected(null)
    setEditingName('')
    setEditingContent('')
    setIsCreating(false)
  }

  const startCreate = () => {
    if (isDirty) {
      setDirtyPrompt({
        type: 'create',
        next: () => {
          resetState()
          setIsCreating(true)
          setDirtyPrompt(null)
        },
      })
      return
    }
    resetState()
    setIsCreating(true)
  }

  const discardChanges = () => {
    if (dirtyPrompt?.next) {
      dirtyPrompt.next()
    }
  }

  const cancelDirtyPrompt = () => {
    setDirtyPrompt(null)
  }

  const handleCreate = () => {
    if (!editingName.trim() && !editingContent.trim()) return
    onAddDraft({
      name: editingName.trim(),
      content: editingContent,
    })
    showToastMsg('草稿已创建')
    resetState()
  }

  const handleCancelCreate = () => {
    if (editingName.trim() || editingContent.trim()) {
      setDirtyPrompt({ type: 'cancel-create', next: resetState })
      return
    }
    resetState()
  }

  const openDraft = (draft) => {
    if (selected?.id === draft.id) return
    if (isDirty) {
      setDirtyPrompt({
        type: 'switch',
        next: () => {
          setIsCreating(false)
          setSelected(draft)
          setEditingName(draft.name)
          setEditingContent(draft.content)
          setDirtyPrompt(null)
        },
      })
      return
    }
    setIsCreating(false)
    setSelected(draft)
    setEditingName(draft.name)
    setEditingContent(draft.content)
  }

  const handleSaveEdit = () => {
    if (!selected) return
    onUpdateDraft(selected.id, {
      name: editingName.trim() || selected.name,
      content: editingContent,
    })
    setSelected({
      ...selected,
      name: editingName.trim() || selected.name,
      content: editingContent,
    })
    showToastMsg('修改已保存')
  }

  const confirmDelete = (draft) => {
    setDeleteTarget(draft)
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return
    onDeleteDraft(deleteTarget.id)
    if (selected?.id === deleteTarget.id) {
      resetState()
    }
    showToastMsg('草稿已删除')
    setDeleteTarget(null)
  }

  const handleDeleteCancel = () => {
    setDeleteTarget(null)
  }

  const handleRestore = () => {
    if (!selected) return
    const content = editingContent || selected.content
    const attachments = selected.attachments || []
    if (isDirty) {
      setDirtyPrompt({
        type: 'restore',
        next: () => {
          onRestoreToTerminal?.({ content, attachments })
          setDirtyPrompt(null)
        },
      })
      return
    }
    onRestoreToTerminal?.({ content, attachments })
  }

  const formatScheduledTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const openScheduledTask = (task) => {
    setSelectedScheduled(task)
    setIsEditingSchedule(false)
    setActiveTab('scheduled')
  }

  const startEditSchedule = () => {
    if (!selectedScheduled) return
    const date = new Date(selectedScheduled.scheduledAt)
    const dateStr = date.toISOString().split('T')[0]
    const timeStr = date.toTimeString().slice(0, 5)
    setEditingScheduleDate(dateStr)
    setEditingScheduleTime(timeStr)
    setIsEditingSchedule(true)
  }

  const cancelEditSchedule = () => {
    setIsEditingSchedule(false)
    setEditingScheduleDate('')
    setEditingScheduleTime('')
  }

  const handleSaveSchedule = () => {
    if (!selectedScheduled || !editingScheduleDate || !editingScheduleTime) return

    const scheduledDateTime = new Date(`${editingScheduleDate}T${editingScheduleTime}`)
    const scheduledAt = scheduledDateTime.getTime()
    const now = Date.now()

    if (scheduledAt <= now) {
      showToastMsg('发送时间必须晚于当前时间')
      return
    }

    onUpdateScheduledTask?.(selectedScheduled.id, { scheduledAt })
    setSelectedScheduled((prev) => ({
      ...prev,
      scheduledAt,
      updatedAt: new Date().toLocaleString('zh-CN'),
    }))
    setIsEditingSchedule(false)
    showToastMsg('定时时间已修改')
  }

  const confirmCancelScheduled = (task) => {
    setCancelTarget(task)
  }

  const handleCancelScheduledConfirm = () => {
    if (!cancelTarget) return
    onCancelScheduledTask?.(cancelTarget.id)
    if (selectedScheduled?.id === cancelTarget.id) {
      setSelectedScheduled(null)
      setIsEditingSchedule(false)
    }
    showToastMsg('定时发送已取消')
    setCancelTarget(null)
  }

  const handleCancelScheduledCancel = () => {
    setCancelTarget(null)
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    if (tab === 'drafts') {
      setSelectedScheduled(null)
      setIsEditingSchedule(false)
    } else {
      setSelected(null)
      setIsCreating(false)
    }
  }

  return (
    <div className="draft-page">
      <aside className="draft-page__list-panel">
        <div className="draft-page__tabs">
          <button
            type="button"
            className={`draft-page__tab ${activeTab === 'drafts' ? 'draft-page__tab--active' : ''}`}
            onClick={() => switchTab('drafts')}
          >
            草稿 ({drafts.length})
          </button>
          <button
            type="button"
            className={`draft-page__tab ${activeTab === 'scheduled' ? 'draft-page__tab--active' : ''}`}
            onClick={() => switchTab('scheduled')}
          >
            定时发送 ({scheduledTasks.length})
          </button>
        </div>

        {activeTab === 'drafts' && (
          <>
            <header className="draft-page__list-header">
              <h2>草稿列表</h2>
              <span className="draft-page__count">{drafts.length} 条</span>
            </header>
            <div className="draft-page__list-actions">
              <button type="button" onClick={startCreate}>
                + 新建草稿
              </button>
            </div>
            <ul className="draft-page__list" role="list">
              {drafts.map((draft) => (
                <li key={draft.id}>
                  <div
                    className={`draft-page__item ${selected?.id === draft.id && !isCreating ? 'draft-page__item--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="draft-page__item-main"
                      onClick={() => openDraft(draft)}
                    >
                      <span className="draft-page__item-name">
                        {draft.name}
                        {selected?.id === draft.id && isDirty && (
                          <span className="draft-page__dirty-dot" title="有未保存修改">
                            ●
                          </span>
                        )}
                      </span>
                      <span className="draft-page__item-time">{draft.createdAt}</span>
                      <span className="draft-page__item-preview">
                        {draft.content.slice(0, 40) + (draft.content.length > 40 ? '…' : '') ||
                          '(空草稿)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="draft-page__item-delete"
                      onClick={() => confirmDelete(draft)}
                      aria-label="删除草稿"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {activeTab === 'scheduled' && (
          <>
            <header className="draft-page__list-header">
              <h2>待发送任务</h2>
              <span className="draft-page__count">{scheduledTasks.length} 条</span>
            </header>
            <div className="draft-page__list-actions">
              <span className="draft-page__list-hint">在终端页面设置定时发送</span>
            </div>
            <ul className="draft-page__list" role="list">
              {scheduledTasks.map((task) => (
                <li key={task.id}>
                  <div
                    className={`draft-page__item draft-page__item--scheduled ${selectedScheduled?.id === task.id ? 'draft-page__item--active' : ''}`}
                  >
                    <button
                      type="button"
                      className="draft-page__item-main"
                      onClick={() => openScheduledTask(task)}
                    >
                      <span className="draft-page__item-name">
                        {task.name}
                        <span className="draft-page__scheduled-badge">定时</span>
                      </span>
                      <span className="draft-page__item-time">
                        发送时间: {formatScheduledTime(task.scheduledAt)}
                      </span>
                      <span className="draft-page__item-preview">
                        {task.content.slice(0, 40) + (task.content.length > 40 ? '…' : '') ||
                          '(空)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="draft-page__item-delete"
                      onClick={() => confirmCancelScheduled(task)}
                      aria-label="取消定时发送"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <section className="draft-page__detail">
        {toast && <div className="draft-page__toast">{toast}</div>}

        {deleteTarget && (
          <div className="draft-page__modal-mask">
            <div className="draft-page__modal">
              <p className="draft-page__modal-text">
                确定要删除草稿「<strong>{deleteTarget.name}</strong>」吗？
              </p>
              <div className="draft-page__modal-actions">
                <button
                  type="button"
                  className="draft-page__modal-btn--danger"
                  onClick={handleDeleteConfirm}
                >
                  删除
                </button>
                <button type="button" onClick={handleDeleteCancel}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {dirtyPrompt && (
          <div className="draft-page__modal-mask">
            <div className="draft-page__modal">
              <p className="draft-page__modal-text">当前有未保存的修改，是否放弃？</p>
              <div className="draft-page__modal-actions">
                {dirtyPrompt.type === 'switch' && selected && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveEdit()
                      setDirtyPrompt(null)
                    }}
                  >
                    保存并切换
                  </button>
                )}
                <button
                  type="button"
                  className="draft-page__modal-btn--danger"
                  onClick={discardChanges}
                >
                  放弃修改
                </button>
                <button type="button" onClick={cancelDirtyPrompt}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelTarget && (
          <div className="draft-page__modal-mask">
            <div className="draft-page__modal">
              <p className="draft-page__modal-text">
                确定要取消定时发送「<strong>{cancelTarget.name}</strong>」吗？
              </p>
              <div className="draft-page__modal-actions">
                <button
                  type="button"
                  className="draft-page__modal-btn--danger"
                  onClick={handleCancelScheduledConfirm}
                >
                  取消发送
                </button>
                <button type="button" onClick={handleCancelScheduledCancel}>
                  保留
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && selectedScheduled ? (
          <>
            <header className="draft-page__detail-header">
              <h3>
                定时任务详情
                <span className="draft-page__scheduled-badge-large">定时发送</span>
              </h3>
              <div className="draft-page__detail-actions">
                {isEditingSchedule ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveSchedule}
                      disabled={!editingScheduleDate || !editingScheduleTime}
                    >
                      保存修改
                    </button>
                    <button type="button" onClick={cancelEditSchedule}>
                      取消编辑
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={startEditSchedule}>
                      修改时间
                    </button>
                    <button type="button" onClick={() => confirmCancelScheduled(selectedScheduled)}>
                      取消发送
                    </button>
                  </>
                )}
              </div>
            </header>
            <div className="draft-page__form">
              <label className="draft-page__label">任务名称</label>
              <div className="draft-page__scheduled-name">{selectedScheduled.name}</div>

              <label className="draft-page__label">发送时间</label>
              {isEditingSchedule ? (
                <div className="draft-page__schedule-edit-row">
                  <div className="draft-page__schedule-edit-group">
                    <label className="draft-page__schedule-edit-label" htmlFor="edit-schedule-date">
                      日期
                    </label>
                    <input
                      id="edit-schedule-date"
                      type="date"
                      className="draft-page__input"
                      value={editingScheduleDate}
                      onChange={(e) => setEditingScheduleDate(e.target.value)}
                    />
                  </div>
                  <div className="draft-page__schedule-edit-group">
                    <label className="draft-page__schedule-edit-label" htmlFor="edit-schedule-time">
                      时间
                    </label>
                    <input
                      id="edit-schedule-time"
                      type="time"
                      className="draft-page__input"
                      value={editingScheduleTime}
                      onChange={(e) => setEditingScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="draft-page__scheduled-time">
                  {formatScheduledTime(selectedScheduled.scheduledAt)}
                </div>
              )}

              <label className="draft-page__label">报文内容</label>
              <textarea
                className="draft-page__textarea draft-page__textarea--readonly"
                value={selectedScheduled.content}
                readOnly
                rows={10}
              />

              <p className="draft-page__meta">创建时间：{selectedScheduled.createdAt}</p>
              {selectedScheduled.updatedAt && (
                <p className="draft-page__meta">最后修改：{selectedScheduled.updatedAt}</p>
              )}
            </div>
          </>
        ) : activeTab === 'scheduled' ? (
          <div className="draft-page__empty">
            <p>← 选择一条定时任务</p>
            <p className="draft-page__empty-hint">在终端页面设置报文定时发送</p>
          </div>
        ) : isCreating ? (
          <>
            <header className="draft-page__detail-header">
              <h3>新建草稿</h3>
              <div className="draft-page__detail-actions">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!editingName.trim() && !editingContent.trim()}
                >
                  保存
                </button>
                <button type="button" onClick={handleCancelCreate}>
                  取消
                </button>
              </div>
            </header>
            <div className="draft-page__form">
              <label className="draft-page__label" htmlFor="draft-name-new">
                草稿名称
              </label>
              <input
                id="draft-name-new"
                type="text"
                className="draft-page__input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="输入草稿名称…"
              />
              <label className="draft-page__label" htmlFor="draft-content-new">
                草稿内容
              </label>
              <textarea
                id="draft-content-new"
                className="draft-page__textarea"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                placeholder="在此输入草稿内容…"
                rows={10}
              />
            </div>
          </>
        ) : selected ? (
          <>
            <header className="draft-page__detail-header">
              <h3>
                编辑草稿
                {isDirty && <span className="draft-page__dirty-badge">（未保存）</span>}
              </h3>
              <div className="draft-page__detail-actions">
                <button type="button" onClick={handleSaveEdit} disabled={!isDirty}>
                  保存修改
                </button>
                <button type="button" onClick={handleRestore}>
                  恢复到终端
                </button>
                <button type="button" onClick={() => confirmDelete(selected)}>
                  删除
                </button>
              </div>
            </header>
            <div className="draft-page__form">
              <label className="draft-page__label" htmlFor="draft-name-edit">
                草稿名称
              </label>
              <input
                id="draft-name-edit"
                type="text"
                className="draft-page__input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
              <label className="draft-page__label" htmlFor="draft-content-edit">
                草稿内容
              </label>
              <textarea
                id="draft-content-edit"
                className="draft-page__textarea"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                rows={10}
              />
              <p className="draft-page__meta">创建时间：{selected.createdAt}</p>
            </div>
          </>
        ) : (
          <div className="draft-page__empty">
            <p>← 选择一条草稿</p>
            <p className="draft-page__empty-hint">点击上方「新建草稿」按钮创建新草稿</p>
          </div>
        )}
      </section>
    </div>
  )
}
