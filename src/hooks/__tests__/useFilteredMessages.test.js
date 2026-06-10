import { describe, it, expect } from 'vitest'

const createIsInTimeRange = () => {
  let cachedToday = null
  let cachedTodayTime = 0

  function getToday() {
    const now = Date.now()
    if (now - cachedTodayTime > 60000) {
      const nowDate = new Date()
      cachedToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
      cachedTodayTime = now
    }
    return cachedToday
  }

  return function isInTimeRange(timestamp, range) {
    if (range === 'all') return true
    const msgDate = new Date(timestamp.replace(' ', 'T'))
    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate())
    const today = getToday()
    const diffTime = today.getTime() - msgDay.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    switch (range) {
      case 'today':
        return diffDays === 0
      case '7days':
        return diffDays >= 0 && diffDays <= 7
      case '30days':
        return diffDays >= 0 && diffDays <= 30
      default:
        return true
    }
  }
}

const extractSubject = (body) => {
  const match = body.match(/SUBJ:+\s*(.+?)(?:\r\n|\r|\n|$)/i)
  return match ? match[1].trim() : ''
}

const filterByPriority = (messages, priorityFilter) => {
  if (priorityFilter === 'all') return messages
  return messages.filter((msg) => msg.priority === priorityFilter)
}

const filterByTags = (messages, selectedTagIds) => {
  if (selectedTagIds.length === 0) return messages
  return messages.filter((msg) => {
    const msgTagIds = msg.tags || []
    return selectedTagIds.every((tagId) => msgTagIds.includes(tagId))
  })
}

const filterByKeyword = (messages, searchKeyword) => {
  const keyword = searchKeyword.trim().toLowerCase()
  if (!keyword) return messages
  return messages.filter((msg) => {
    const subject = extractSubject(msg.body).toLowerCase()
    const from = msg.from.toLowerCase()
    const to = msg.to.toLowerCase()
    const body = msg.body.toLowerCase()
    return (
      subject.includes(keyword) ||
      from.includes(keyword) ||
      to.includes(keyword) ||
      body.includes(keyword)
    )
  })
}

describe('filter functions', () => {
  const mockMessages = [
    {
      id: '1',
      priority: 'high',
      from: 'alice@example.com',
      to: 'bob@example.com',
      body: 'SUBJ: Hello World\r\nThis is a test message.',
      timestamp: '2024-01-15 10:00:00',
      tags: ['important', 'work'],
    },
    {
      id: '2',
      priority: 'normal',
      from: 'charlie@example.com',
      to: 'alice@example.com',
      body: 'SUBJ: Meeting Tomorrow\r\nPlease attend the meeting.',
      timestamp: '2024-01-10 14:30:00',
      tags: ['personal'],
    },
    {
      id: '3',
      priority: 'low',
      from: 'bob@example.com',
      to: 'charlie@example.com',
      body: 'Just a quick note.',
      timestamp: '2024-01-01 09:00:00',
      tags: [],
    },
  ]

  describe('filterByPriority', () => {
    it('should return all messages when filter is "all"', () => {
      expect(filterByPriority(mockMessages, 'all')).toHaveLength(3)
    })

    it('should filter by high priority', () => {
      const result = filterByPriority(mockMessages, 'high')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by normal priority', () => {
      const result = filterByPriority(mockMessages, 'normal')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('should return empty array for non-matching priority', () => {
      expect(filterByPriority(mockMessages, 'urgent')).toHaveLength(0)
    })
  })

  describe('filterByTags', () => {
    it('should return all messages when no tags selected', () => {
      expect(filterByTags(mockMessages, [])).toHaveLength(3)
    })

    it('should filter by single tag', () => {
      const result = filterByTags(mockMessages, ['important'])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by multiple tags (AND logic)', () => {
      const result = filterByTags(mockMessages, ['important', 'work'])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should return empty array when tags do not match', () => {
      expect(filterByTags(mockMessages, ['important', 'personal'])).toHaveLength(0)
    })
  })

  describe('filterByKeyword', () => {
    it('should return all messages when keyword is empty', () => {
      expect(filterByKeyword(mockMessages, '')).toHaveLength(3)
    })

    it('should filter by subject keyword', () => {
      const result = filterByKeyword(mockMessages, 'Hello')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should filter by from field', () => {
      const result = filterByKeyword(mockMessages, 'alice@example.com')
      expect(result).toHaveLength(2)
    })

    it('should filter by body content', () => {
      const result = filterByKeyword(mockMessages, 'quick note')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('should be case insensitive', () => {
      const result = filterByKeyword(mockMessages, 'MEETING')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })
  })

  describe('extractSubject', () => {
    it('should extract subject from body', () => {
      expect(extractSubject('SUBJ: Test Subject\r\nBody')).toBe('Test Subject')
    })

    it('should handle SUBJ:: format', () => {
      expect(extractSubject('SUBJ:: Another Subject\r\nBody')).toBe('Another Subject')
    })

    it('should handle case insensitivity', () => {
      expect(extractSubject('subj: lowercase subject\r\nBody')).toBe('lowercase subject')
    })

    it('should return empty string when no subject', () => {
      expect(extractSubject('Just a body')).toBe('')
    })

    it('should trim whitespace', () => {
      expect(extractSubject('SUBJ:   Spaced Subject   \r\nBody')).toBe('Spaced Subject')
    })
  })

  describe('isInTimeRange', () => {
    const isInTimeRange = createIsInTimeRange()

    it('should return true for "all" range', () => {
      expect(isInTimeRange('2024-01-15 10:00:00', 'all')).toBe(true)
    })

    it('should handle today range', () => {
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 10:00:00`
      expect(isInTimeRange(todayStr, 'today')).toBe(true)
    })

    it('should handle 7 days range', () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      const dateStr = `${sixDaysAgo.getFullYear()}-${String(sixDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixDaysAgo.getDate()).padStart(2, '0')} 10:00:00`
      expect(isInTimeRange(dateStr, '7days')).toBe(true)
    })

    it('should handle 30 days range', () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      const dateStr = `${twentyDaysAgo.getFullYear()}-${String(twentyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twentyDaysAgo.getDate()).padStart(2, '0')} 10:00:00`
      expect(isInTimeRange(dateStr, '30days')).toBe(true)
    })

    it('should return false for dates outside range', () => {
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
      const dateStr = `${hundredDaysAgo.getFullYear()}-${String(hundredDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(hundredDaysAgo.getDate()).padStart(2, '0')} 10:00:00`
      expect(isInTimeRange(dateStr, '7days')).toBe(false)
      expect(isInTimeRange(dateStr, '30days')).toBe(false)
    })
  })
})
