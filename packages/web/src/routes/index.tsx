import { Resource } from '@quizfunnel/resource'
import { renderMediaOnLambda } from '@remotion/lambda/client'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

const getServerMessage = createServerFn().handler(async () => {
  try {
    return {
      message: 'Hello from the server!',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Server function error:', error)
    throw error
  }
})

const renderServer = createServerFn({
  method: 'POST',
}).handler(async () => {
  const res = await renderMediaOnLambda({
    functionName: Resource.Remotion.functionName,
    serveUrl: Resource.Remotion.siteUrl,
    composition: 'HelloWorld',
    codec: 'h264',
    region: 'eu-central-1',
    framesPerLambda: 180 / 4,
    outName: {
      bucketName: Resource.Remotion.bucketName,
      key: 'out.mp4',
      s3OutputProvider: {
        endpoint: 'https://6f32a0b6e541ed416faba0c9afe7593e.r2.cloudflarestorage.com',
        accessKeyId: Resource.CLOUDFLARE_R2_ACCESS_KEY_ID.value,
        secretAccessKey: Resource.CLOUDFLARE_R2_SECRET_ACCESS_KEY.value,
      },
    },
  })
  return { renderId: res.renderId, functionName: Resource.Remotion.functionName }
})

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const getMessage = useServerFn(getServerMessage)
  const renderRemotion = useServerFn(renderServer)

  const [result, setResult] = useState<{ message: string; timestamp: string } | null>(null)
  const [renderResult, setRenderResult] = useState<{ renderId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>TanStack Start on Cloudflare Workers</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={async () => {
            try {
              setError(null)
              const response = await getMessage()
              setResult(response)
            } catch (err) {
              console.error('Button click error:', err)
              setError(err instanceof Error ? err.message : String(err))
            }
          }}
          style={{
            padding: '0.5rem 1rem',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Call Server Function
        </button>

        <button
          type="button"
          onClick={async () => {
            try {
              setError(null)
              const response = await renderRemotion()
              setRenderResult(response)
            } catch (err) {
              console.error('Remotion render error:', err)
              setError(err instanceof Error ? err.message : String(err))
            }
          }}
          style={{
            padding: '0.5rem 1rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Render Remotion Video
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee', borderRadius: '8px', color: '#c00' }}>
          <p>
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
          <p>
            <strong>Message:</strong> {result.message}
          </p>
          <p>
            <strong>Timestamp:</strong> {result.timestamp}
          </p>
        </div>
      )}

      {renderResult && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#e0f2fe', borderRadius: '8px' }}>
          <p>
            <strong>Render ID:</strong> {renderResult.renderId}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            Video rendering has been started. Check your bucket for the output file.
          </p>
        </div>
      )}
    </div>
  )
}
