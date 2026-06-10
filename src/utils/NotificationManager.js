const NotificationManager = (() => {
  let permissionRequested = false

  const isSupported = () => typeof Notification !== 'undefined'

  const getPermission = () => {
    if (!isSupported()) return 'unsupported'
    return Notification.permission
  }

  const requestPermission = async () => {
    if (!isSupported()) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    if (permissionRequested) return Notification.permission === 'granted'
    permissionRequested = true
    try {
      const result = await Notification.requestPermission()
      return result === 'granted'
    } catch {
      return false
    }
  }

  const showNotification = async (title, options = {}) => {
    if (!isSupported()) return null
    const granted = await requestPermission()
    if (!granted) return null
    try {
      const notification = new Notification(title, {
        icon: options.icon,
        body: options.body,
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      })
      notification.onclick = () => {
        window.focus()
        if (options.onClick) options.onClick()
        notification.close()
      }
      if (options.autoClose !== false) {
        setTimeout(() => notification.close(), options.autoClose || 5000)
      }
      return notification
    } catch {
      return null
    }
  }

  const showIncomingMessage = async (from, preview, onClick) => {
    const permission = getPermission()
    if (permission === 'denied') {
      return { success: false, permission: 'denied' }
    }
    if (permission === 'unsupported') {
      return { success: false, permission: 'unsupported' }
    }
    const title = `新报文 - 来自 ${from}`
    const body = preview || '（无内容）'
    const notification = await showNotification(title, {
      body,
      tag: `msg-${Date.now()}`,
      onClick,
      autoClose: 8000,
    })
    if (notification) {
      return { success: true, permission: 'granted', notification }
    }
    return { success: false, permission: getPermission() }
  }

  return {
    isSupported,
    getPermission,
    requestPermission,
    showNotification,
    showIncomingMessage,
  }
})()

export default NotificationManager
