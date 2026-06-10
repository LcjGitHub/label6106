import { useState } from 'react'

export default function TagFilter({ tags, selectedTagIds, onToggleTag, onCreateTag }) {
  const [newTagName, setNewTagName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    const trimmed = newTagName.trim()
    if (!trimmed) {
      setError('标签名称不能为空')
      return
    }
    const result = onCreateTag(trimmed)
    if (result.success) {
      setNewTagName('')
      setShowCreate(false)
      setError('')
    } else {
      setError(result.error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowCreate(false)
      setNewTagName('')
      setError('')
    }
  }

  const handleNameChange = (e) => {
    setNewTagName(e.target.value)
    if (error) setError('')
  }

  const handleToggleCreate = () => {
    setShowCreate((v) => !v)
    setError('')
    if (showCreate) setNewTagName('')
  }

  return (
    <div className="tag-filter">
      <div className="tag-filter__header">
        <span className="tag-filter__label">标签筛选</span>
        <button type="button" className="tag-filter__create-btn" onClick={handleToggleCreate}>
          {showCreate ? '取消' : '+ 新建标签'}
        </button>
      </div>

      {showCreate && (
        <form className="tag-filter__create-form" onSubmit={handleCreateSubmit}>
          <input
            type="text"
            className={`tag-filter__create-input ${error ? 'tag-filter__create-input--error' : ''}`}
            placeholder="输入标签名称..."
            value={newTagName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button type="submit" className="tag-filter__create-submit">
            创建
          </button>
        </form>
      )}
      {error && showCreate && <div className="tag-filter__error">{error}</div>}

      <div className="tag-filter__list">
        <button
          type="button"
          className={`tag-filter__chip ${selectedTagIds.length === 0 ? 'tag-filter__chip--all' : ''}`}
          onClick={() => onToggleTag(null)}
        >
          全部
        </button>
        {tags.map((tag) => {
          const selected = selectedTagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              className={`tag-filter__chip ${selected ? 'tag-filter__chip--selected' : ''}`}
              style={{ '--tag-color': tag.color }}
              onClick={() => onToggleTag(tag.id)}
              title={tag.name}
            >
              <span className="tag-filter__chip-dot" style={{ background: tag.color }} />
              {tag.name}
              {selected && <span className="tag-filter__chip-check">✓</span>}
            </button>
          )
        })}
      </div>

      {selectedTagIds.length > 0 && (
        <div className="tag-filter__status">
          <span>已筛选 {selectedTagIds.length} 个标签</span>
          <button type="button" className="tag-filter__clear" onClick={() => onToggleTag(null)}>
            清除
          </button>
        </div>
      )}
    </div>
  )
}
