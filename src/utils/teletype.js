/**
 * Parse teletype text with \r\n semantics into renderable lines.
 * \r returns carriage to line start (overwrites).
 * \n advances to next line.
 */
export function parseTeletypeText(text) {
  const lines = ['']
  let lineIndex = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (ch === '\r') {
      const next = text[i + 1]
      if (next === '\n') {
        i++
        lines.push('')
        lineIndex = lines.length - 1
      } else {
        lines[lineIndex] = ''
      }
      continue
    }

    if (ch === '\n') {
      lines.push('')
      lineIndex = lines.length - 1
      continue
    }

    lines[lineIndex] += ch
  }

  return lines
}

/** Visible character count (excludes control chars). */
export function visibleLength(text) {
  return text.replace(/[\r\n]/g, '').length
}

/** Slice teletype text to N visible characters, preserving control sequences. */
export function sliceTeletypeText(text, visibleCount) {
  let count = 0
  let result = ''

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (ch === '\r') {
      const next = text[i + 1]
      if (next === '\n') {
        result += '\r\n'
        i++
      } else {
        result += '\r'
      }
      continue
    }

    if (ch === '\n') {
      result += '\n'
      continue
    }

    if (count >= visibleCount) break
    result += ch
    count++
  }

  return result
}
