import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('NotificationManager', () => {
  let originalNotification

  beforeEach(async () => {
    originalNotification = global.Notification
    vi.useFakeTimers()
    vi.resetModules()
  })

  afterEach(() => {
    if (originalNotification !== undefined) {
      global.Notification = originalNotification
    } else {
      delete global.Notification
    }
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  const setupMockNotification = (permission = 'default') => {
    const mockRequestPermission = vi.fn().mockResolvedValue(permission)
    const mockClose = vi.fn()
    
    const MockNotification = vi.fn().mockImplementation((title, options) => {
      const instance = {
        title,
        options,
        close: mockClose,
        onclick: null,
      }
      return instance
    })
    
    MockNotification.permission = permission
    MockNotification.requestPermission = mockRequestPermission
    
    global.Notification = MockNotification
    
    return { MockNotification, mockRequestPermission, mockClose }
  }

  const loadNotificationManager = async () => {
    const mod = await import('../NotificationManager')
    return mod.default
  }

  describe('isSupported', () => {
    it('should return true when Notification is available', async () => {
      setupMockNotification('default')
      const NotificationManager = await loadNotificationManager()
      expect(NotificationManager.isSupported()).toBe(true)
    })

    it('should return false when Notification is not available', async () => {
      const NotificationManager = await loadNotificationManager()
      expect(NotificationManager.isSupported()).toBe(false)
    })
  })

  describe('getPermission', () => {
    it('should return "unsupported" when Notification is not available', async () => {
      const NotificationManager = await loadNotificationManager()
      expect(NotificationManager.getPermission()).toBe('unsupported')
    })

    it('should return "default" when permission is default', async () => {
      setupMockNotification('default')
      const NotificationManager = await loadNotificationManager()
      expect(NotificationManager.getPermission()).toBe('default')
    })

    it('should return "granted" when permission is granted', async () => {
      setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      expect(NotificationManager.getPermission()).toBe('granted')
    })

    it('should return "denied" when permission is denied', async () => {
      setupMockNotification('denied')
      const NotificationManager = await loadNotificationManager()
      expect(NotificationManager.getPermission()).toBe('denied')
    })
  })

  describe('requestPermission', () => {
    it('should return false when Notification is not supported', async () => {
      const NotificationManager = await loadNotificationManager()
      const result = await NotificationManager.requestPermission()
      expect(result).toBe(false)
    })

    it('should return true when permission is already granted', async () => {
      const { mockRequestPermission } = setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      const result = await NotificationManager.requestPermission()
      expect(result).toBe(true)
      expect(mockRequestPermission).not.toHaveBeenCalled()
    })

    it('should return false when permission is already denied', async () => {
      const { mockRequestPermission } = setupMockNotification('denied')
      const NotificationManager = await loadNotificationManager()
      const result = await NotificationManager.requestPermission()
      expect(result).toBe(false)
      expect(mockRequestPermission).not.toHaveBeenCalled()
    })

    it('should request permission and return true when granted', async () => {
      const { MockNotification, mockRequestPermission } = setupMockNotification('default')
      const NotificationManager = await loadNotificationManager()
      
      mockRequestPermission.mockResolvedValueOnce('granted')
      MockNotification.permission = 'granted'
      
      const result = await NotificationManager.requestPermission()
      expect(result).toBe(true)
    })

    it('should request permission and return false when denied', async () => {
      const { MockNotification, mockRequestPermission } = setupMockNotification('default')
      const NotificationManager = await loadNotificationManager()
      
      mockRequestPermission.mockResolvedValueOnce('denied')
      MockNotification.permission = 'denied'
      
      const result = await NotificationManager.requestPermission()
      expect(result).toBe(false)
    })

    it('should return false when requestPermission throws', async () => {
      const { mockRequestPermission } = setupMockNotification('default')
      const NotificationManager = await loadNotificationManager()
      
      mockRequestPermission.mockRejectedValueOnce(new Error('Permission error'))
      
      const result = await NotificationManager.requestPermission()
      expect(result).toBe(false)
    })
  })

  describe('showNotification', () => {
    it('should return null when Notification is not supported', async () => {
      const NotificationManager = await loadNotificationManager()
      const result = await NotificationManager.showNotification('Test Title')
      expect(result).toBeNull()
    })

    it('should return null when permission is denied', async () => {
      setupMockNotification('denied')
      const NotificationManager = await loadNotificationManager()
      const result = await NotificationManager.showNotification('Test Title')
      expect(result).toBeNull()
    })

    it('should create notification when permission is granted', async () => {
      const { MockNotification } = setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      const result = await NotificationManager.showNotification('Test Title', {
        body: 'Test Body',
        icon: 'test-icon.png',
        tag: 'test-tag',
      })
      
      expect(result).not.toBeNull()
      expect(MockNotification).toHaveBeenCalledWith('Test Title', {
        icon: 'test-icon.png',
        body: 'Test Body',
        tag: 'test-tag',
        requireInteraction: false,
      })
    })

    it('should call onClick when notification is clicked', async () => {
      setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      const onClick = vi.fn()
      const mockFocus = vi.fn()
      window.focus = mockFocus
      
      const notification = await NotificationManager.showNotification('Test Title', { onClick })
      
      expect(notification.onclick).toBeDefined()
      notification.onclick()
      expect(mockFocus).toHaveBeenCalled()
      expect(onClick).toHaveBeenCalled()
      expect(notification.close).toHaveBeenCalled()
    })

    it('should auto close after default 5 seconds', async () => {
      setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      const notification = await NotificationManager.showNotification('Test Title')
      
      expect(notification.close).not.toHaveBeenCalled()
      vi.advanceTimersByTime(5000)
      expect(notification.close).toHaveBeenCalled()
    })

    it('should auto close after custom time', async () => {
      setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      const notification = await NotificationManager.showNotification('Test Title', { autoClose: 3000 })
      
      vi.advanceTimersByTime(2000)
      expect(notification.close).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(notification.close).toHaveBeenCalled()
    })

    it('should not auto close when autoClose is false', async () => {
      setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      const notification = await NotificationManager.showNotification('Test Title', { autoClose: false })
      
      vi.advanceTimersByTime(10000)
      expect(notification.close).not.toHaveBeenCalled()
    })

    it('should return null when creating notification throws', async () => {
      const { MockNotification } = setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      MockNotification.mockImplementationOnce(() => {
        throw new Error('Notification error')
      })
      
      const result = await NotificationManager.showNotification('Test Title')
      expect(result).toBeNull()
    })
  })

  describe('showIncomingMessage', () => {
    it('should return success:false when permission is denied', async () => {
      setupMockNotification('denied')
      const NotificationManager = await loadNotificationManager()
      
      const result = await NotificationManager.showIncomingMessage('TestStation', 'Test message')
      
      expect(result.success).toBe(false)
      expect(result.permission).toBe('denied')
    })

    it('should return success:false when unsupported', async () => {
      const NotificationManager = await loadNotificationManager()
      
      const result = await NotificationManager.showIncomingMessage('TestStation', 'Test message')
      
      expect(result.success).toBe(false)
      expect(result.permission).toBe('unsupported')
    })

    it('should show notification with correct title and body when permission is granted', async () => {
      const { MockNotification } = setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      const result = await NotificationManager.showIncomingMessage('TestStation', 'Test message preview')
      
      expect(result.success).toBe(true)
      expect(result.permission).toBe('granted')
      expect(result.notification).toBeDefined()
      
      expect(MockNotification).toHaveBeenCalledTimes(1)
      const callArgs = MockNotification.mock.calls[0]
      expect(callArgs[0]).toBe('新报文 - 来自 TestStation')
      expect(callArgs[1].body).toBe('Test message preview')
    })

    it('should use default body when preview is empty', async () => {
      const { MockNotification } = setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      await NotificationManager.showIncomingMessage('TestStation', '')
      
      const callArgs = MockNotification.mock.calls[0]
      expect(callArgs[1].body).toBe('（无内容）')
    })

    it('should have msg- tag prefix', async () => {
      const { MockNotification } = setupMockNotification('granted')
      const NotificationManager = await loadNotificationManager()
      
      await NotificationManager.showIncomingMessage('TestStation', 'Test')
      
      const callArgs = MockNotification.mock.calls[0]
      expect(callArgs[1].tag).toContain('msg-')
    })
  })
})
