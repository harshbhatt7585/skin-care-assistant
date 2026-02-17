'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 560, textAlign: 'center' }}>
            <h1 style={{ marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ marginBottom: 20, opacity: 0.8 }}>{error.message}</p>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
