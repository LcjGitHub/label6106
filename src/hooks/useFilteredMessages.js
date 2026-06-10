import { useMemo, useRef } from 'react'

function extractSubject(body) {
  const match = body.match(/SUBJ:+\s*(.+?)(?:\r\n|\r|\n|$)/i)
  return match ? match[1].trim() : ''
}

function createIsInTimeRange() {
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

const isInTimeRange = createIsInTimeRange()

function filterByPriority(messages, priorityFilter) {
  if (priorityFilter === 'all') return messages
  return messages.filter((msg) => msg.priority === priorityFilter)
}

function filterByTimeRange(messages, timeRangeFilter) {
  if (timeRangeFilter === 'all') return messages
  return messages.filter((msg) => isInTimeRange(msg.timestamp, timeRangeFilter))
}

function filterByTags(messages, selectedTagIds) {
  if (selectedTagIds.length === 0) return messages
  return messages.filter((msg) => {
    const msgTagIds = msg.tags || []
    return selectedTagIds.every((tagId) => msgTagIds.includes(tagId))
  })
}

function filterByKeyword(messages, searchKeyword) {
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

function filterByStar(messages, starFilter, isStarred) {
  if (!starFilter) return messages
  return messages.filter((msg) => isStarred(msg.id))
}

export function useFilteredMessages({
  messages,
  searchKeyword,
  priorityFilter,
  timeRangeFilter,
  selectedTagIds,
  starFilter,
  isStarred,
}) {
  const perfLogRef = useRef([])

  const priorityFiltered = useMemo(() => {
    const start = performance.now()
    const result = filterByPriority(messages, priorityFilter)
    const duration = performance.now() - start
    perfLogRef.current.push({
      filter: 'priority',
      duration,
      count: result.length,
      timestamp: Date.now(),
    })
    return result
  }, [messages, priorityFilter])

  const timeFiltered = useMemo(() => {
    const start = performance.now()
    const result = filterByTimeRange(priorityFiltered, timeRangeFilter)
    const duration = performance.now() - start
    perfLogRef.current.push({
      filter: 'timeRange',
      duration,
      count: result.length,
      timestamp: Date.now(),
    })
    return result
  }, [priorityFiltered, timeRangeFilter])

  const tagFiltered = useMemo(() => {
    const start = performance.now()
    const result = filterByTags(timeFiltered, selectedTagIds)
    const duration = performance.now() - start
    perfLogRef.current.push({
      filter: 'tags',
      duration,
      count: result.length,
      timestamp: Date.now(),
    })
    return result
  }, [timeFiltered, selectedTagIds])

  const keywordFiltered = useMemo(() => {
    const start = performance.now()
    const result = filterByKeyword(tagFiltered, searchKeyword)
    const duration = performance.now() - start
    perfLogRef.current.push({
      filter: 'keyword',
      duration,
      count: result.length,
      timestamp: Date.now(),
    })
    return result
  }, [tagFiltered, searchKeyword])

  const filteredMessages = useMemo(() => {
    const start = performance.now()
    const result = filterByStar(keywordFiltered, starFilter, isStarred)
    const duration = performance.now() - start
    perfLogRef.current.push({
      filter: 'star',
      duration,
      count: result.length,
      timestamp: Date.now(),
    })

    const totalDuration = perfLogRef.current
      .filter((log) => log.timestamp >= Date.now() - 1000)
      .reduce((sum, log) => sum + log.duration, 0)

    if (perfLogRef.current.length > 0) {
      const recentLogs = perfLogRef.current.filter((log) => log.timestamp >= Date.now() - 1000)
      if (recentLogs.length > 0) {
        console.debug('[Filter Performance]', {
          totalTime: `${totalDuration.toFixed(2)}ms`,
          finalCount: result.length,
          steps: recentLogs.map((l) => `${l.filter}: ${l.duration.toFixed(2)}ms`).join(' → '),
        })
      }
    }

    return result
  }, [keywordFiltered, starFilter, isStarred])

  const getPerformanceLogs = () => {
    return [...perfLogRef.current]
  }

  return {
    filteredMessages,
    getPerformanceLogs,
  }
}
