import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import DraftPage from '../DraftPage'

describe('DraftPage', () => {
  const mockDrafts = [
    {
      id: 'draft-1',
      name: '草稿一',
      content: '这是第一个草稿的内容',
      createdAt: '2024-01-15 10:00:00',
      attachments: [],
    },
    {
      id: 'draft-2',
      name: '草稿二',
      content: '这是第二个草稿的内容，更长一些',
      createdAt: '2024-01-16 14:30:00',
      attachments: [],
    },
    {
      id: 'draft-3',
      name: '草稿三',
      content: '',
      createdAt: '2024-01-17 09:00:00',
      attachments: [],
    },
  ]

  const mockScheduledTasks = [
    {
      id: 'task-1',
      name: '定时任务一',
      content: '定时发送的内容',
      scheduledAt: Date.now() + 3600000,
      createdAt: '2024-01-15 10:00:00',
    },
  ]

  const defaultProps = {
    drafts: mockDrafts,
    onAddDraft: vi.fn(),
    onUpdateDraft: vi.fn(),
    onDeleteDraft: vi.fn(),
    onRestoreToTerminal: vi.fn(),
    scheduledTasks: mockScheduledTasks,
    onCancelScheduledTask: vi.fn(),
    onUpdateScheduledTask: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const getDraftListPanel = () => {
    return screen.getByRole('list')
  }

  describe('草稿列表', () => {
    it('应该显示草稿列表', () => {
      render(<DraftPage {...defaultProps} />)
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBe(3)
    })

    it('应该显示草稿数量', () => {
      render(<DraftPage {...defaultProps} />)
      
      expect(screen.getByText(/草稿列表/)).toBeInTheDocument()
      expect(screen.getByText('3 条')).toBeInTheDocument()
    })

    it('应该显示草稿名称', () => {
      render(<DraftPage {...defaultProps} />)
      
      expect(screen.getByText('草稿一')).toBeInTheDocument()
      expect(screen.getByText('草稿二')).toBeInTheDocument()
      expect(screen.getByText('草稿三')).toBeInTheDocument()
    })

    it('应该显示草稿预览', () => {
      render(<DraftPage {...defaultProps} />)
      
      expect(screen.getByText(/这是第一个草稿的内容/)).toBeInTheDocument()
    })

    it('空草稿应该显示空提示', () => {
      render(<DraftPage {...defaultProps} />)
      
      expect(screen.getByText('(空草稿)')).toBeInTheDocument()
    })
  })

  describe('新建草稿', () => {
    it('点击新建草稿按钮应该进入创建模式', () => {
      render(<DraftPage {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /\+ 新建草稿/ })
      fireEvent.click(createButton)
      
      expect(screen.getByRole('heading', { name: /新建草稿/ })).toBeInTheDocument()
      expect(screen.getByLabelText(/草稿名称/)).toBeInTheDocument()
      expect(screen.getByLabelText(/草稿内容/)).toBeInTheDocument()
    })

    it('应该可以输入草稿名称和内容', () => {
      render(<DraftPage {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /\+ 新建草稿/ })
      fireEvent.click(createButton)
      
      const nameInput = screen.getByLabelText(/草稿名称/)
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      
      fireEvent.change(nameInput, { target: { value: '新草稿' } })
      fireEvent.change(contentTextarea, { target: { value: '新草稿的内容' } })
      
      expect(nameInput.value).toBe('新草稿')
      expect(contentTextarea.value).toBe('新草稿的内容')
    })

    it('保存按钮在空内容时应该禁用', () => {
      render(<DraftPage {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /\+ 新建草稿/ })
      fireEvent.click(createButton)
      
      const saveButtons = screen.getAllByRole('button', { name: /保存/ })
      expect(saveButtons[0].disabled).toBe(true)
    })

    it('应该成功创建草稿', () => {
      render(<DraftPage {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /\+ 新建草稿/ })
      fireEvent.click(createButton)
      
      const nameInput = screen.getByLabelText(/草稿名称/)
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      
      fireEvent.change(nameInput, { target: { value: '新草稿' } })
      fireEvent.change(contentTextarea, { target: { value: '新草稿内容' } })
      
      const saveButtons = screen.getAllByRole('button', { name: /保存/ })
      fireEvent.click(saveButtons[0])
      
      expect(defaultProps.onAddDraft).toHaveBeenCalledTimes(1)
      expect(defaultProps.onAddDraft).toHaveBeenCalledWith({
        name: '新草稿',
        content: '新草稿内容',
      })
    })

    it('取消创建应该返回列表视图', () => {
      render(<DraftPage {...defaultProps} />)
      
      const createButton = screen.getByRole('button', { name: /\+ 新建草稿/ })
      fireEvent.click(createButton)
      
      const cancelButton = screen.getByRole('button', { name: /取消/ })
      fireEvent.click(cancelButton)
      
      expect(screen.getByText('← 选择一条草稿')).toBeInTheDocument()
    })
  })

  describe('查看草稿详情', () => {
    it('点击草稿应该打开详情', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      expect(screen.getByText(/编辑草稿/)).toBeInTheDocument()
      expect(screen.getByDisplayValue('草稿一')).toBeInTheDocument()
      expect(screen.getByDisplayValue('这是第一个草稿的内容')).toBeInTheDocument()
    })

    it('应该显示创建时间', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      expect(screen.getByText(/创建时间：/)).toBeInTheDocument()
      expect(screen.getByText('2024-01-15 10:00:00')).toBeInTheDocument()
    })
  })

  describe('编辑草稿', () => {
    it('应该可以修改草稿名称', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      const nameInput = screen.getByLabelText(/草稿名称/)
      fireEvent.change(nameInput, { target: { value: '修改后的草稿一' } })
      
      expect(nameInput.value).toBe('修改后的草稿一')
    })

    it('应该可以修改草稿内容', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      fireEvent.change(contentTextarea, { target: { value: '修改后的内容' } })
      
      expect(contentTextarea.value).toBe('修改后的内容')
    })

    it('未修改时保存按钮应该禁用', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      const saveButton = screen.getByRole('button', { name: /保存修改/ })
      expect(saveButton.disabled).toBe(true)
    })

    it('修改后应该显示未保存标识', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      fireEvent.change(contentTextarea, { target: { value: '修改后的内容' } })
      
      expect(screen.getByText(/（未保存）/)).toBeInTheDocument()
    })

    it('应该成功保存修改', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      const nameInput = screen.getByLabelText(/草稿名称/)
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      
      fireEvent.change(nameInput, { target: { value: '修改后的草稿' } })
      fireEvent.change(contentTextarea, { target: { value: '修改后的内容' } })
      
      const saveButton = screen.getByRole('button', { name: /保存修改/ })
      fireEvent.click(saveButton)
      
      expect(defaultProps.onUpdateDraft).toHaveBeenCalledTimes(1)
      expect(defaultProps.onUpdateDraft).toHaveBeenCalledWith(
        'draft-1',
        {
          name: '修改后的草稿',
          content: '修改后的内容',
        }
      )
    })
  })

  describe('删除草稿', () => {
    it('点击删除按钮应该显示确认对话框', () => {
      render(<DraftPage {...defaultProps} />)
      
      const deleteButtons = screen.getAllByRole('button', { name: /删除草稿/ })
      fireEvent.click(deleteButtons[0])
      
      const modal = screen.getByText(/确定要删除草稿/).closest('.draft-page__modal')
      expect(modal).toBeInTheDocument()
      expect(within(modal).getByText('草稿一')).toBeInTheDocument()
    })

    it('确认删除应该调用 onDeleteDraft', () => {
      render(<DraftPage {...defaultProps} />)
      
      const deleteButtons = screen.getAllByRole('button', { name: /删除草稿/ })
      fireEvent.click(deleteButtons[0])
      
      const modal = screen.getByText(/确定要删除草稿/).closest('.draft-page__modal')
      const confirmButton = within(modal).getByRole('button', { name: /删除/ })
      fireEvent.click(confirmButton)
      
      expect(defaultProps.onDeleteDraft).toHaveBeenCalledTimes(1)
      expect(defaultProps.onDeleteDraft).toHaveBeenCalledWith('draft-1')
    })

    it('取消删除应该关闭对话框', () => {
      render(<DraftPage {...defaultProps} />)
      
      const deleteButtons = screen.getAllByRole('button', { name: /删除草稿/ })
      fireEvent.click(deleteButtons[0])
      
      const modal = screen.getByText(/确定要删除草稿/).closest('.draft-page__modal')
      const cancelButton = within(modal).getByRole('button', { name: /取消/ })
      fireEvent.click(cancelButton)
      
      expect(screen.queryByText(/确定要删除草稿/)).not.toBeInTheDocument()
    })

    it('删除当前查看的草稿后应该返回空状态', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      const detailSection = screen.getByText(/编辑草稿/).closest('.draft-page__detail')
      const deleteButton = within(detailSection).getByRole('button', { name: /删除/ })
      fireEvent.click(deleteButton)
      
      const modal = screen.getByText(/确定要删除草稿/).closest('.draft-page__modal')
      const confirmButton = within(modal).getByRole('button', { name: /删除/ })
      fireEvent.click(confirmButton)
      
      expect(defaultProps.onDeleteDraft).toHaveBeenCalledWith('draft-1')
    })
  })

  describe('恢复到终端', () => {
    it('应该有恢复到终端按钮', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      expect(screen.getByRole('button', { name: /恢复到终端/ })).toBeInTheDocument()
    })

    it('点击恢复应该调用 onRestoreToTerminal', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem)
      
      const restoreButton = screen.getByRole('button', { name: /恢复到终端/ })
      fireEvent.click(restoreButton)
      
      expect(defaultProps.onRestoreToTerminal).toHaveBeenCalledTimes(1)
      expect(defaultProps.onRestoreToTerminal).toHaveBeenCalledWith({
        content: '这是第一个草稿的内容',
        attachments: [],
      })
    })
  })

  describe('未保存修改提示', () => {
    it('切换草稿时应该提示未保存修改', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem1 = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem1)
      
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      fireEvent.change(contentTextarea, { target: { value: '修改后的内容' } })
      
      const draftItem2 = screen.getByText('草稿二').closest('.draft-page__item-main')
      fireEvent.click(draftItem2)
      
      expect(screen.getByText(/当前有未保存的修改/)).toBeInTheDocument()
    })

    it('放弃修改后应该切换到新草稿', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem1 = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem1)
      
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      fireEvent.change(contentTextarea, { target: { value: '修改后的内容' } })
      
      const draftItem2 = screen.getByText('草稿二').closest('.draft-page__item-main')
      fireEvent.click(draftItem2)
      
      const discardButton = screen.getByRole('button', { name: /放弃修改/ })
      fireEvent.click(discardButton)
      
      expect(screen.getByDisplayValue('草稿二')).toBeInTheDocument()
    })

    it('取消切换应该停留在当前草稿', () => {
      render(<DraftPage {...defaultProps} />)
      
      const draftItem1 = screen.getByText('草稿一').closest('.draft-page__item-main')
      fireEvent.click(draftItem1)
      
      const contentTextarea = screen.getByLabelText(/草稿内容/)
      fireEvent.change(contentTextarea, { target: { value: '修改后的内容' } })
      
      const draftItem2 = screen.getByText('草稿二').closest('.draft-page__item-main')
      fireEvent.click(draftItem2)
      
      const modal = screen.getByText(/当前有未保存的修改/).closest('.draft-page__modal')
      const cancelButtons = within(modal).getAllByRole('button', { name: /取消/ })
      fireEvent.click(cancelButtons[0])
      
      expect(screen.getByDisplayValue('修改后的内容')).toBeInTheDocument()
    })
  })

  describe('定时任务标签页', () => {
    it('应该可以切换到定时任务标签', () => {
      render(<DraftPage {...defaultProps} />)
      
      const scheduledTab = screen.getByRole('button', { name: /定时发送/ })
      fireEvent.click(scheduledTab)
      
      expect(screen.getByText(/待发送任务/)).toBeInTheDocument()
    })

    it('应该显示定时任务列表', () => {
      render(<DraftPage {...defaultProps} />)
      
      const scheduledTab = screen.getByRole('button', { name: /定时发送/ })
      fireEvent.click(scheduledTab)
      
      expect(screen.getByText('定时任务一')).toBeInTheDocument()
    })

    it('点击定时任务应该显示详情', () => {
      render(<DraftPage {...defaultProps} />)
      
      const scheduledTab = screen.getByRole('button', { name: /定时发送/ })
      fireEvent.click(scheduledTab)
      
      const taskItem = screen.getByText('定时任务一').closest('.draft-page__item-main')
      fireEvent.click(taskItem)
      
      expect(screen.getByText(/定时任务详情/)).toBeInTheDocument()
      expect(screen.getAllByText('定时任务一').length).toBeGreaterThan(0)
    })

    it('应该可以取消定时任务', () => {
      render(<DraftPage {...defaultProps} />)
      
      const scheduledTab = screen.getByRole('button', { name: /定时发送/ })
      fireEvent.click(scheduledTab)
      
      const cancelButtons = screen.getAllByRole('button', { name: /取消定时发送/ })
      fireEvent.click(cancelButtons[0])
      
      expect(screen.getByText(/确定要取消定时发送/)).toBeInTheDocument()
      
      const modal = screen.getByText(/确定要取消定时发送/).closest('.draft-page__modal')
      const confirmButton = within(modal).getByRole('button', { name: /取消发送/ })
      fireEvent.click(confirmButton)
      
      expect(defaultProps.onCancelScheduledTask).toHaveBeenCalledTimes(1)
      expect(defaultProps.onCancelScheduledTask).toHaveBeenCalledWith('task-1')
    })
  })
})
