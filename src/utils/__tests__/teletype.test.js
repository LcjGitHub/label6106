import { describe, it, expect } from 'vitest'
import { parseTeletypeText, visibleLength, sliceTeletypeText } from '../teletype'

describe('teletype utils', () => {
  describe('parseTeletypeText', () => {
    it('should parse simple text into a single line', () => {
      expect(parseTeletypeText('Hello World')).toEqual(['Hello World'])
    })

    it('should handle newline characters', () => {
      expect(parseTeletypeText('Hello\nWorld')).toEqual(['Hello', 'World'])
    })

    it('should handle carriage return with newline', () => {
      expect(parseTeletypeText('Hello\r\nWorld')).toEqual(['Hello', 'World'])
    })

    it('should handle carriage return without newline (overwrite)', () => {
      expect(parseTeletypeText('Hello\rWorld')).toEqual(['World'])
    })

    it('should handle multiple control characters', () => {
      expect(parseTeletypeText('Line1\nLine2\r\nLine3\rOverwrite')).toEqual([
        'Line1',
        'Line2',
        'Overwrite',
      ])
    })

    it('should return empty array for empty string', () => {
      expect(parseTeletypeText('')).toEqual([''])
    })
  })

  describe('visibleLength', () => {
    it('should count visible characters', () => {
      expect(visibleLength('Hello')).toBe(5)
    })

    it('should exclude newline characters', () => {
      expect(visibleLength('Hello\nWorld')).toBe(10)
    })

    it('should exclude carriage return characters', () => {
      expect(visibleLength('Hello\rWorld')).toBe(10)
    })

    it('should exclude both \\r and \\n', () => {
      expect(visibleLength('Hello\r\nWorld')).toBe(10)
    })

    it('should return 0 for empty string', () => {
      expect(visibleLength('')).toBe(0)
    })
  })

  describe('sliceTeletypeText', () => {
    it('should slice visible characters', () => {
      expect(sliceTeletypeText('Hello World', 5)).toBe('Hello')
    })

    it('should preserve control characters', () => {
      expect(sliceTeletypeText('Hello\nWorld', 8)).toBe('Hello\nWor')
    })

    it('should handle \\r\\n correctly', () => {
      expect(sliceTeletypeText('Hello\r\nWorld', 8)).toBe('Hello\r\nWor')
    })

    it('should handle \\r correctly', () => {
      expect(sliceTeletypeText('Hello\rWorld', 8)).toBe('Hello\rWor')
    })

    it('should return empty string when visibleCount is 0', () => {
      expect(sliceTeletypeText('Hello', 0)).toBe('')
    })

    it('should return full text when visibleCount is larger than text length', () => {
      expect(sliceTeletypeText('Hello', 100)).toBe('Hello')
    })
  })
})
