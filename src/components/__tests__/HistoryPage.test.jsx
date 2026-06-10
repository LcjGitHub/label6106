import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import HistoryPage from '../HistoryPage'

vi.mock('../TeletypeOutput', () => ({
  default: ({ text }) => <div data-testid="teletype-output">{text}</div>,
}))

vi.mock('../../hooks/useTypewriter', () => ({
  useTypewriter: (text) => ({
    displayed: text,
    visibleCount: text?.length || 0,
    total: text?.length || 0,
    done: true,
    skip: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('../../hooks/useTypewriterSound', () => ({
  useTypewriterSound: () => ({
    playClick: vi.fn(),
    playBell: vi.fn(),
  }),
}))

vi.mock('../TagFilter', () => ({
  default: ({ tags, selectedTagIds, onToggleTag }) => (
    <div data-testid="tag-filter">
      <button onClick={() => onToggleTag(null)}>全部</button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onToggleTag(tag.id)}
          data-selected={selectedTagIds.includes(tag.id)}
        >
          {tag.name}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../../utils/exportUtils', () => ({
  exportAsText: vi.fn(),
  exportAsJson: vi.fn(),
}))

describe('HistoryPage', () => {
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const mockMessages = [
    {
      id: 'msg-1',
      index: 1,
      from: 'ALPHA',
      to: 'BETA',
      priority: 'ROUTINE',
      timestamp: formatDate(new Date()),
      preview: 'Hello World message',
      body: 'SUBJ: Hello World\r\nThis is a test message.',
      tags: ['tag-1', 'tag-2'],
      recalled: false,
    },
    {
      id: 'msg-2',
      index: 2,
      from: 'GAMMA',
      to: 'DELTA',
      priority: 'PRIORITY',
      timestamp: formatDate(new Date()),
      preview: 'Urgent notice',
      body: 'SUBJ: Urgent Notice\r\nPlease read immediately.',
      tags: ['tag-1'],
      recalled: false,
    },
    {
      id: 'msg-3',
      index: 3,
      from: 'ALPHA',
      to: 'GAMMA',
      priority: 'IMMEDIATE',
      timestamp: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      preview: 'Another test message',
      body: 'SUBJ: Test\r\nAnother test message content.',
      tags: [],
      recalled: false,
    },
  ]

  const mockTags = [
    { id: 'tag-1', name: '工作', color: '#ff6b6b' },
    { id: 'tag-2', name: '重要', color: '#4ecdc4' },
  ]

  const defaultProps = {
    messages: mockMessages,
    soundEnabled: false,
    tags: mockTags,
    onCreateTag: vi.fn().mockReturnValue({ success: true }),
    onAddTagToMessage: vi.fn(),
    onRemoveTagFromMessage: vi.fn(),
    onRecallMessage: vi.fn(),
    onDeleteMessages: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('搜索筛选功能', () => {
    it('应该显示所有报文列表', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeGreaterThanOrEqual(3)
    })

    it('应该通过关键词搜索报文', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/搜索主题\/收发方\/内容/i)
      fireEvent.change(searchInput, { target: { value: 'Urgent' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('1 / 3 条')
    })

    it('应该通过发件人搜索', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/搜索主题\/收发方\/内容/i)
      fireEvent.change(searchInput, { target: { value: 'ALPHA' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('2 / 3 条')
    })

    it('应该通过收件人搜索', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/搜索主题\/收发方\/内容/i)
      fireEvent.change(searchInput, { target: { value: 'BETA' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('1 / 3 条')
    })

    it('应该通过内容搜索', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/搜索主题\/收发方\/内容/i)
      fireEvent.change(searchInput, { target: { value: 'test message' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('2 / 3 条')
    })

    it('搜索不应该区分大小写', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/搜索主题\/收发方\/内容/i)
      fireEvent.change(searchInput, { target: { value: 'hello world' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('1 / 3 条')
    })

    it('应该按优先级筛选', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const prioritySelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(prioritySelect, { target: { value: 'PRIORITY' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('1 / 3 条')
    })

    it('应该显示全部优先级', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const prioritySelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(prioritySelect, { target: { value: 'all' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('3 / 3 条')
    })

    it('应该按时间范围筛选', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const timeSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(timeSelect, { target: { value: 'today' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('2 / 3 条')
    })

    it('应该显示所有时间范围的报文', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const timeSelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(timeSelect, { target: { value: 'all' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('3 / 3 条')
    })

    it('应该显示未找到结果的提示', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/搜索主题\/收发方\/内容/i)
      fireEvent.change(searchInput, { target: { value: '不存在的内容' } })
      
      expect(screen.getByText(/未找到匹配的报文/)).toBeInTheDocument()
    })

    it('应该组合多个筛选条件', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText(/搜索主题\/收发方\/内容/i)
      fireEvent.change(searchInput, { target: { value: 'ALPHA' } })
      
      const prioritySelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(prioritySelect, { target: { value: 'ROUTINE' } })
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('1 / 3 条')
    })
  })

  describe('报文详情', () => {
    it('点击报文应该打开详情', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const list = screen.getByRole('list')
      const firstItemButton = within(list).getAllByRole('button')[0]
      fireEvent.click(firstItemButton)
      
      expect(screen.getAllByText(/#001/).length).toBeGreaterThan(0)
      expect(screen.getByTestId('teletype-output')).toBeInTheDocument()
    })

    it('关闭详情应该返回空状态', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const items = screen.getAllByRole('button', { name: /#001/ })
      fireEvent.click(items[0])
      
      const closeButton = screen.getByRole('button', { name: /关闭/ })
      fireEvent.click(closeButton)
      
      expect(screen.getByText(/← 选择一条报文/)).toBeInTheDocument()
    })
  })

  describe('收藏功能', () => {
    it('点击星标应该切换收藏状态', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const items = screen.getAllByRole('button', { name: /#001/ })
      fireEvent.click(items[0])
      
      const starButton = screen.getByRole('button', { name: /收藏/ })
      fireEvent.click(starButton)
      
      expect(screen.getByRole('button', { name: /取消收藏/ })).toBeInTheDocument()
    })

    it('应该支持只看收藏筛选', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const starFilterCheckbox = screen.getByLabelText(/只看收藏/)
      fireEvent.click(starFilterCheckbox)
      
      const countSpan = screen.getByText(/\/ \d+ 条/)
      expect(countSpan.textContent).toContain('0 / 3 条')
    })
  })

  describe('批量选择', () => {
    it('应该可以选择单条报文', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const checkboxes = screen.getAllByRole('checkbox', { name: /选择报文/ })
      fireEvent.click(checkboxes[0])
      
      expect(screen.getByText(/已选 1 条/)).toBeInTheDocument()
    })

    it('应该可以全选', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const checkboxes = screen.getAllByRole('checkbox', { name: /选择报文/ })
      fireEvent.click(checkboxes[0])
      
      const selectAllCheckbox = screen.getByLabelText(/全选/)
      fireEvent.click(selectAllCheckbox)
      
      expect(screen.getByText(/已选 3 条/)).toBeInTheDocument()
    })

    it('应该可以批量删除', () => {
      render(<HistoryPage {...defaultProps} />)
      
      const checkboxes = screen.getAllByRole('checkbox', { name: /选择报文/ })
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])
      
      const deleteButton = screen.getByRole('button', { name: /批量删除/ })
      fireEvent.click(deleteButton)
      
      expect(screen.getByText(/确认批量删除/)).toBeInTheDocument()
      
      const confirmButton = screen.getByRole('button', { name: /确认删除/ })
      fireEvent.click(confirmButton)
      
      expect(defaultProps.onDeleteMessages).toHaveBeenCalledTimes(1)
    })
  })
})
