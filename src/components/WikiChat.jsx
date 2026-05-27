import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useThemeTokens } from './useThemeTokens'

const PROMPTS = [
  'What is this wiki about?',
  'Show me the main topics',
  'Where should I start?',
]

function renderAssistantText(text, onLinkClick, linkColor) {
  const parts = []
  const regex = /\[([^\]]+)\]\((\/[^\s)]+)\)/g
  let last = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ label: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <Link key={i} href={p.href} onClick={onLinkClick} style={{ color: linkColor, textDecoration: 'underline' }}>
        {p.label}
      </Link>
    )
  )
}

function prettyTitleFromPath(path) {
  if (!path || path === '/') return 'Home'
  const last = path.split('/').filter(Boolean).pop() || 'Home'
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function WikiChat() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const C = useThemeTokens()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const pageTitle = prettyTitleFromPath(router.asPath.split('#')[0])

  async function callApi(nextMessages) {
    setLoading(true)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.filter((m) => !m.error),
          currentPath: router.asPath.split('#')[0].split('?')[0],
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.error || 'Request failed.', error: true }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }])
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Network error: ' + String(err), error: true }])
    } finally {
      setLoading(false)
    }
  }

  function sendText(text) {
    const userMsg = { role: 'user', text }
    const next = [...messages, userMsg]
    setMessages(next)
    callApi(next)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    sendText(userText)
  }

  function reset() {
    setMessages([])
  }

  return (
    <>
      <button
        aria-label="Open AI chat"
        onClick={() => setOpen(true)}
        title="Ask the wiki (Cmd+/)"
        style={{
          position: 'fixed',
          right: 'calc(24px + env(safe-area-inset-right))',
          bottom: 'calc(24px + env(safe-area-inset-bottom))',
          padding: '10px 32px',
          height: '50px',
          borderRadius: '9999px',
          background:
            'hsl(var(--nextra-primary-hue, 200) var(--nextra-primary-saturation, 100%) var(--nextra-primary-lightness, 45%))',
          color: 'white',
          boxShadow: '0 10px 25px rgba(0,0,0,0.20)',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          zIndex: 60,
          border: 'none',
          fontFamily: 'inherit',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 1.5 L10.3 7.7 16.5 9 10.3 10.3 9 16.5 7.7 10.3 1.5 9 7.7 7.7 Z" />
          <path d="M18 3 L18.7 5.3 21 6 18.7 6.7 18 9 17.3 6.7 15 6 17.3 5.3 Z" opacity="0.85" />
          <path d="M19 16 L19.4 17.6 21 18 19.4 18.4 19 20 18.6 18.4 17 18 18.6 17.6 Z" opacity="0.7" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: '22px', letterSpacing: '0.3px', lineHeight: 1 }}>Ai</span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: C.overlay, zIndex: 70 }}
        />
      )}

      <aside
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          maxHeight: '100dvh',
          width: 'min(420px, 100vw)',
          background: C.surface,
          color: C.text,
          boxShadow: C.panelShadow,
          zIndex: 80,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: C.text }}>Wiki Chat</div>
            <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
              Asking about: <span style={{ color: C.text }}>{pageTitle}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={reset} title="New conversation" style={{ padding: '6px 10px', fontSize: '12px', border: `1px solid ${C.border}`, borderRadius: '6px', background: C.secondaryBtnBg, cursor: 'pointer', color: C.secondaryBtnText }}>Reset</button>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ padding: '6px 10px', fontSize: '14px', border: `1px solid ${C.border}`, borderRadius: '6px', background: C.secondaryBtnBg, cursor: 'pointer', color: C.secondaryBtnText }}>✕</button>
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {messages.length === 0 && (
            <>
              <div style={{ fontSize: '13px', color: C.textMuted, marginBottom: '12px', lineHeight: 1.5 }}>
                Ask anything about this wiki. Answers will cite the pages they draw from.
              </div>
              <div style={{ fontSize: '11px', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Suggested</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PROMPTS.map((label) => (
                  <button
                    key={label}
                    onClick={() => sendText(label)}
                    disabled={loading}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: `1px solid ${C.border}`,
                      borderRadius: '8px',
                      background: C.dropBg,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      color: C.text,
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: '14px' }}>
              {m.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: C.primaryBtnBg, color: C.primaryBtnText, padding: '8px 12px', borderRadius: '14px 14px 4px 14px', maxWidth: '85%', fontSize: '13px', lineHeight: 1.5 }}>
                    {m.text}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: m.error ? C.errorBubbleBg : C.chip, padding: '10px 12px', borderRadius: '14px 14px 14px 4px', fontSize: '13px', lineHeight: 1.55, color: m.error ? C.errorText : C.text, whiteSpace: 'pre-wrap' }}>
                    {renderAssistantText(m.text, () => setOpen(false), C.link)}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ background: C.chip, padding: '10px 12px', borderRadius: '14px 14px 14px 4px', fontSize: '13px', color: C.textMuted, display: 'inline-block' }}>
                Thinking…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ borderTop: `1px solid ${C.border}`, padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', display: 'flex', gap: '8px', background: C.surface }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            style={{ flex: 1, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', color: C.text, background: C.surface }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{ padding: '10px 14px', background: C.primaryBtnBg, color: C.primaryBtnText, border: 'none', borderRadius: '8px', fontSize: '13px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.6 : 1 }}
          >
            Send
          </button>
        </form>
        <div className="wiki-chat-kb-hint" style={{ padding: '6px 16px 10px', fontSize: '11px', color: C.textDim, textAlign: 'center', background: C.surface }}>
          Cmd+/ to toggle ・ Esc to close
        </div>
      </aside>

      <style jsx global>{`
        @media (hover: none) and (pointer: coarse) {
          .wiki-chat-kb-hint { display: none; }
        }
      `}</style>
    </>
  )
}
