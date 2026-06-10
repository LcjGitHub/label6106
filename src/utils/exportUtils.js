function generateFilename(message, extension) {
  const safeId = (message.id || 'message').replace(/[\\/:*?"<>|]/g, '_')
  const timestamp = (message.timestamp || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
  const parts = ['teletype', safeId]
  if (timestamp) parts.push(timestamp)
  return `${parts.join('_')}.${extension}`
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportAsText(message) {
  if (!message) return
  const content = message.body || ''
  const filename = generateFilename(message, 'txt')
  triggerDownload(content, filename, 'text/plain;charset=utf-8')
}

export function exportAsJson(message) {
  if (!message) return
  const data = {
    id: message.id,
    index: message.index,
    from: message.from,
    to: message.to,
    priority: message.priority,
    timestamp: message.timestamp,
    preview: message.preview,
    body: message.body,
  }
  const content = JSON.stringify(data, null, 2)
  const filename = generateFilename(message, 'json')
  triggerDownload(content, filename, 'application/json;charset=utf-8')
}
