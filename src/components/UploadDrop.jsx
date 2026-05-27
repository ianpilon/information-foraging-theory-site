import { useEffect, useRef, useState } from 'react'

const LIGHT = {
  pillBg: '#111827',
  pillText: '#ffffff',
  modalBg: '#ffffff',
  text: '#111827',
  textMuted: '#6b7280',
  textSecondary: '#374151',
  border: '#e5e7eb',
  dropBg: '#f9fafb',
  dropBgActive: '#eff6ff',
  dropBorder: '#d1d5db',
  dropBorderActive: '#2563eb',
  chip: '#f3f4f6',
  success: '#065f46',
  errorText: '#991b1b',
  errorBg: '#fef2f2',
  primaryBtnBg: '#111827',
  primaryBtnText: '#ffffff',
  secondaryBtnBg: '#ffffff',
  secondaryBtnText: '#111827',
  overlay: 'rgba(0,0,0,0.30)',
  shadow: '0 20px 50px rgba(0,0,0,0.25)',
}

const DARK = {
  pillBg: '#f9fafb',
  pillText: '#111827',
  modalBg: '#111827',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  textSecondary: '#d1d5db',
  border: '#374151',
  dropBg: '#1f2937',
  dropBgActive: '#1e3a8a',
  dropBorder: '#4b5563',
  dropBorderActive: '#60a5fa',
  chip: '#374151',
  success: '#34d399',
  errorText: '#fca5a5',
  errorBg: '#450a0a',
  primaryBtnBg: '#f9fafb',
  primaryBtnText: '#111827',
  secondaryBtnBg: '#1f2937',
  secondaryBtnText: '#f3f4f6',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '0 20px 50px rgba(0,0,0,0.55)',
}

function useIsDark() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

export default function UploadDrop() {
  const [open, setOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)
  const isDark = useIsDark()
  const C = isDark ? DARK : LIGHT

  async function upload(file) {
    if (!file) return
    setStatus('uploading')
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/ingest', { method: 'POST', body: fd })
      const data = await r.json()
      if (!r.ok) {
        setStatus('error')
        setError(data.error || 'Upload failed.')
        return
      }
      setStatus('done')
      setResult(data)
    } catch (e) {
      setStatus('error')
      setError(String(e))
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) upload(f)
  }

  function reset() {
    setStatus('idle')
    setError(null)
    setResult(null)
  }

  return (
    <>
      <button
        aria-label="Upload source"
        onClick={() => setOpen(true)}
        title="Add a source to this wiki"
        style={{
          position: 'fixed',
          right: 'calc(24px + env(safe-area-inset-right))',
          bottom: 'calc(86px + env(safe-area-inset-bottom))',
          padding: '10px 22px',
          height: '44px',
          borderRadius: '9999px',
          background: C.pillBg,
          color: C.pillText,
          boxShadow: '0 10px 25px rgba(0,0,0,0.20)',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          zIndex: 60,
          border: 'none',
          fontFamily: 'inherit',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Add source</span>
      </button>

      {open && (
        <div onClick={() => { setOpen(false); reset() }} style={{ position: 'fixed', inset: 0, background: C.overlay, zIndex: 70 }} />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Add a source to this wiki"
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(520px, 92vw)',
            background: C.modalBg,
            color: C.text,
            borderRadius: '14px',
            boxShadow: C.shadow,
            border: `1px solid ${C.border}`,
            zIndex: 80,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: C.text }}>Add a source</div>
              <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>
                Drop a .md, .txt, or .pdf. I'll draft wiki pages and open a PR you can review.
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); reset() }}
              aria-label="Close"
              style={{ padding: '6px 10px', fontSize: '14px', border: `1px solid ${C.border}`, borderRadius: '6px', background: C.secondaryBtnBg, cursor: 'pointer', color: C.secondaryBtnText }}
            >
              ✕
            </button>
          </div>

          {status === 'idle' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? C.dropBorderActive : C.dropBorder}`,
                  borderRadius: '10px',
                  padding: '34px 16px',
                  textAlign: 'center',
                  background: dragOver ? C.dropBgActive : C.dropBg,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: C.textSecondary,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px', color: C.text }}>Drop a file here or click to choose</div>
                <div style={{ fontSize: '12px', color: C.textMuted }}>.md, .txt, or .pdf (max 10 MB)</div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".md,.markdown,.txt,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </>
          )}

          {status === 'uploading' && (
            <div style={{ padding: '30px 0', textAlign: 'center', fontSize: '14px', color: C.textSecondary }}>
              <div style={{ marginBottom: '8px' }}>Extracting text, generating pages, opening PR…</div>
              <div style={{ fontSize: '12px', color: C.textMuted }}>This usually takes 15 to 45 seconds.</div>
            </div>
          )}

          {status === 'done' && result && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: C.success, marginBottom: '8px' }}>
                Pull request opened
              </div>
              <div style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '14px', lineHeight: 1.5 }}>
                Added {result.filesAdded} file(s) on branch <code style={{ background: C.chip, color: C.text, padding: '1px 6px', borderRadius: '4px' }}>{result.branch}</code>.
              </div>
              <a
                href={result.prUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', padding: '10px 14px', background: C.primaryBtnBg, color: C.primaryBtnText, borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
              >
                Review PR #{result.prNumber} on GitHub →
              </a>
              <button
                onClick={reset}
                style={{ marginLeft: '10px', padding: '10px 14px', background: C.secondaryBtnBg, color: C.secondaryBtnText, border: `1px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                Upload another
              </button>
            </div>
          )}

          {status === 'error' && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: C.errorText, marginBottom: '8px' }}>Something went wrong</div>
              <div style={{ fontSize: '13px', color: C.text, background: C.errorBg, padding: '10px 12px', borderRadius: '8px', lineHeight: 1.5, marginBottom: '12px', whiteSpace: 'pre-wrap', border: `1px solid ${C.border}` }}>
                {error}
              </div>
              <button
                onClick={reset}
                style={{ padding: '10px 14px', background: C.primaryBtnBg, color: C.primaryBtnText, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
