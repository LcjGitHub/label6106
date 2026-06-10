import { useState } from 'react'
import './DraftPage.css'

export default function DraftPage({
  drafts,
  onAddDraft,
  onUpdateDraft,
  onDeleteDraft,
  onSwitchToTerminal,
}) {
  const [selected, setSelected] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const startCreate = () => {
    setIsCreating(true)
    setSelected(null)
    setEditingName('')
    setEditingContent('')
  }

  const handleCreate = () => {
    if (!editingName.trim() && !editingContent.trim()) return
    onAddDraft({
      name: editingName.trim(),
      content: editingContent,
    })
    setIsCreating(false)
    setEditingName('')
    setEditingContent('')
  }

  const handleCancelCreate = () => {
    setIsCreating(false)
    setEditingName('')
    setEditingContent('')
  }

  const openDraft = (draft) => {
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
  }

  const handleDelete = (draft) => {
    if (window.confirm(`确定要删除草稿「${draft.name}」吗？`)) {
      onDeleteDraft(draft.id)
      if (selected?.id === draft.id) {
        setSelected(null)
        setEditingName('')
        setEditingContent('')
      }
    }
  }

  const handleRestore = () => {
    if (!selected) return
    const content = editingContent || selected.content
    sessionStorage.setItem('restored-draft', content)
    onSwitchToTerminal()
  }

  return (
    <div className="draft-page">
      <aside className="draft-page__list-panel">
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
                  <span className="draft-page__item-name">{draft.name}</span>
                  <span className="draft-page__item-time">{draft.createdAt}</span>
                  <span className="draft-page__item-preview">
                    {draft.content.slice(0, 40) + (draft.content.length > 40 ? '…' : '') || '(空草稿)'}
                  </span>
                </button>
                <button
                  type="button"
                  className="draft-page__item-delete"
                  onClick={() => handleDelete(draft)}
                  aria-label="删除草稿"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <section className="draft-page__detail">
        {isCreating ? (
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
              <h3>编辑草稿</h3>
              <div className="draft-page__detail-actions">
                <button type="button" onClick={handleSaveEdit}>
                  保存修改
                </button>
                <button type="button" onClick={handleRestore}>
                  恢复到终端
                </button>
                <button type="button" onClick={() => handleDelete(selected)}>
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
            <p>← 选择一条草稿或新建草稿</p>
            <p className="draft-page__empty-hint">
              草稿可帮助你暂存未发送的报文内容
            </p>
            <button type="button" className="draft-page__empty-btn" onClick={startCreate}>
              + 新建草稿
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
