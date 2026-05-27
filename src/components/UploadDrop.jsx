import { useRef, useState } from 'react'

export default function UploadDrop() {
  const [open, setOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

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
          background: '#111827',
          color: 'white',
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
        <div onClick={() => { setOpen(false); reset() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.30)', zIndex: 70 }} />
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
            background: '#fff',
            color: '#111827',
            borderRadius: '14px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            zIndex: 80,
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px' }}>Add a source</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Drop a .md, .txt, or .pdf. I'll draft wiki pages and open a PR you can review.
              </div>
            </div>
            <button onClick={() => { setOpen(false); reset() }} style={{ padding: '6px 10px', fontSize: '14px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#111827' }} aria-label="Close">✕</button>
          </div>

          {status === 'idle' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#2563eb' : '#d1d5db'}`,
                  borderRadius: '10px',
                  padding: '34px 16px',
                  textAlign: 'center',
                  background: dragOver ? '#eff6ff' : '#f9fafb',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Drop a file here or click to choose</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>.md, .txt, or .pdf (max 10 MB)</div>
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
            <div style={{ padding: '30px 0', textAlign: 'center', fontSize: '14px', color: '#374151' }}>
              <div style={{ marginBottom: '8px' }}>Extracting text, generating pages, opening PR…</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>This usually takes 15 to 45 seconds.</div>
            </div>
          )}

          {status === 'done' && result && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#065f46', marginBottom: '8px' }}>
                Pull request opened
              </div>
              <div style={{ fontSize: '13px', color: '#374151', marginBottom: '14px', lineHeight: 1.5 }}>
                Added {result.filesAdded} file(s) on branch <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: '4px' }}>{result.branch}</code>.
              </div>
              <a
                href={result.prUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', padding: '10px 14px', background: '#111827', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
              >
                Review PR #{result.prNumber} on GitHub →
              </a>
              <button
                onClick={reset}
                style={{ marginLeft: '10px', padding: '10px 14px', background: 'white', color: '#111827', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                Upload another
              </button>
            </div>
          )}

          {status === 'error' && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', marginBottom: '8px' }}>Something went wrong</div>
              <div style={{ fontSize: '13px', color: '#374151', background: '#fef2f2', padding: '10px 12px', borderRadius: '8px', lineHeight: 1.5, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                {error}
              </div>
              <button
                onClick={reset}
                style={{ padding: '10px 14px', background: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
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
