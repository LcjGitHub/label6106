import { useEffect, useRef } from 'react'
import { parseTeletypeText } from '../utils/teletype'
import './TeletypeOutput.css'

export default function TeletypeOutput({ text, showCursor = false, className = '' }) {
  const scrollRef = useRef(null)
  const lines = parseTeletypeText(text)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  return (
    <div className={`teletype-output ${className}`} ref={scrollRef}>
      <pre className="teletype-output__pre" aria-live="polite">
        {lines.map((line, i) => (
          <span key={i} className="teletype-output__line">
            {line || '\u00A0'}
            {'\n'}
          </span>
        ))}
        {showCursor && <span className="teletype-cursor" aria-hidden="true" />}
      </pre>
    </div>
  )
}
