import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TerminalPage from '../TerminalPage'

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

vi.mock('../../utils/NotificationManager', () => ({
  default: {
    getPermission: vi.fn().mockReturnValue('default'),
    requestPermission: vi.fn().mockResolvedValue(true),
    showIncomingMessage: vi.fn().mockResolvedValue({ success: false, permission: 'default' }),
  },
}))

describe('TerminalPage', () => {
  const defaultProps = {
    soundEnabled: false,
    onSendToHistory: vi.fn(),
    onSaveDraft: vi.fn(),
    onOverwriteDraft: vi.fn(),
    onFindDraftByName: vi.fn().mockReturnValue(null),
    drafts: [],
    restoredData: null,
    onClearRestored: vi.fn(),
    onAddScheduledTask: vi.fn(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('报文发送功能', () => {
    it('应该在输入框中输入内容', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Hello World' } })
      
      expect(textarea.value).toBe('Hello World')
    })

    it('应该在点击发送按钮时调用 onSendToHistory', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Test Message' } })
      
      const sendButton = screen.getByRole('button', { name: /发送 Enter/i })
      fireEvent.click(sendButton)
      
      expect(defaultProps.onSendToHistory).toHaveBeenCalledTimes(1)
      const callArg = defaultProps.onSendToHistory.mock.calls[0][0]
      expect(callArg.from).toBe('LOCAL')
      expect(callArg.to).toBe('NET')
      expect(callArg.priority).toBe('ROUTINE')
      expect(callArg.body).toContain('Test Message')
    })

    it('应该在输入为空时禁用发送按钮', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const sendButton = screen.getByRole('button', { name: /发送 Enter/i })
      expect(sendButton.disabled).toBe(true)
    })

    it('应该在输入有内容时启用发送按钮', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'test' } })
      
      const sendButton = screen.getByRole('button', { name: /发送 Enter/i })
      expect(sendButton.disabled).toBe(false)
    })

    it('应该在按下 Enter 键时发送消息', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Test via Enter' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      
      expect(defaultProps.onSendToHistory).toHaveBeenCalledTimes(1)
    })

    it('应该在按下 Shift+Enter 时不发送消息（换行）', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
      
      expect(defaultProps.onSendToHistory).not.toHaveBeenCalled()
    })

    it('发送后应该清空输入框', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Test Message' } })
      
      const sendButton = screen.getByRole('button', { name: /发送 Enter/i })
      fireEvent.click(sendButton)
      
      expect(textarea.value).toBe('')
    })

    it('发送的消息应该以 \\r\\n 结尾', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Test' } })
      
      const sendButton = screen.getByRole('button', { name: /发送 Enter/i })
      fireEvent.click(sendButton)
      
      const callArg = defaultProps.onSendToHistory.mock.calls[0][0]
      expect(callArg.body.endsWith('\r\n')).toBe(true)
    })

    it('应该包含正确的预览文本', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Short message' } })
      
      const sendButton = screen.getByRole('button', { name: /发送 Enter/i })
      fireEvent.click(sendButton)
      
      const callArg = defaultProps.onSendToHistory.mock.calls[0][0]
      expect(callArg.preview).toBe('Short message')
    })

    it('应该对长消息截断预览', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const longMessage = 'A'.repeat(100)
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: longMessage } })
      
      const sendButton = screen.getByRole('button', { name: /发送 Enter/i })
      fireEvent.click(sendButton)
      
      const callArg = defaultProps.onSendToHistory.mock.calls[0][0]
      expect(callArg.preview.length).toBeLessThanOrEqual(49)
      expect(callArg.preview.endsWith('…')).toBe(true)
    })
  })

  describe('初始状态', () => {
    it('应该显示欢迎消息', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const output = screen.getByTestId('teletype-output')
      expect(output.textContent).toContain('电传打字机终端')
    })

    it('应该有一个空的输入框', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      expect(textarea.value).toBe('')
    })
  })

  describe('清屏功能', () => {
    it('点击清屏按钮应该清空输出', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const clearButton = screen.getByRole('button', { name: /清屏/i })
      fireEvent.click(clearButton)
      
      const output = screen.getByTestId('teletype-output')
      expect(output.textContent).toContain('电传打字机终端')
    })
  })

  describe('模拟接收功能', () => {
    it('点击模拟接收按钮应该触发接收流程并设置打印状态', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const simulateButton = screen.getByRole('button', { name: /模拟接收/i })
      act(() => {
        fireEvent.click(simulateButton)
      })
      
      expect(screen.getByRole('button', { name: /跳过动画/i })).toBeInTheDocument()
    })
  })

  describe('保存草稿功能', () => {
    it('应该打开保存草稿面板', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Draft content' } })
      
      const saveDraftButton = screen.getByRole('button', { name: /保存草稿/i })
      fireEvent.click(saveDraftButton)
      
      expect(screen.getByLabelText(/草稿名称/i)).toBeInTheDocument()
    })

    it('应该保存草稿', () => {
      render(<TerminalPage {...defaultProps} />)
      
      const textarea = screen.getByRole('textbox', { name: /打字区/i })
      fireEvent.change(textarea, { target: { value: 'Draft content' } })
      
      const saveDraftButton = screen.getByRole('button', { name: /保存草稿/i })
      fireEvent.click(saveDraftButton)
      
      const nameInput = screen.getByLabelText(/草稿名称/i)
      fireEvent.change(nameInput, { target: { value: 'My Draft' } })
      
      const saveButtons = screen.getAllByRole('button', { name: /保存/i })
      fireEvent.click(saveButtons[1])
      
      expect(defaultProps.onSaveDraft).toHaveBeenCalledTimes(1)
      expect(defaultProps.onSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Draft',
          content: 'Draft content',
        })
      )
    })
  })
})
