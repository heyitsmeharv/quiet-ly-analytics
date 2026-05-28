import React, { useEffect, useRef, useState } from 'react'

const SHIMMER_STYLE = `
  @keyframes qly-journey-shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
`

const skShimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%)',
  backgroundSize: '800px 100%',
  animation: 'qly-journey-shimmer 1.4s ease-in-out infinite',
  borderRadius: 4,
}

interface JourneyEvent {
  type: string
  path: string
  timestamp: string
  params?: Record<string, unknown>
  [key: string]: unknown
}

export interface VisitorJourneyProps {
  endpoint: string
  appId: string
  visitorId: string
  from: string
  to: string
}

export function VisitorJourney({ endpoint, appId, visitorId, from, to }: VisitorJourneyProps) {
  const [events, setEvents] = useState<JourneyEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const url = new URL(endpoint)
    url.searchParams.set('appId', appId)
    url.searchParams.set('from', from)
    url.searchParams.set('to', to)
    url.searchParams.set('visitorId', visitorId)

    fetch(url.toString(), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ events?: JourneyEvent[] }>
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setEvents(data.events ?? [])
          setLoading(false)
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Failed to load journey')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [endpoint, appId, visitorId, from, to])

  if (loading) {
    return (
      <div style={styles.stepper}>
        <style>{SHIMMER_STYLE}</style>
        {[1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            <div style={styles.stepItem}>
              <div style={{ ...skShimmer, width: 20, height: 20, borderRadius: '50%' }} />
              <div style={{ ...skShimmer, width: 72, height: 12, marginTop: 4 }} />
              <div style={{ ...skShimmer, width: 40, height: 10, marginTop: 2 }} />
            </div>
            {i < 3 && (
              <svg width="20" height="20" viewBox="0 0 20 20" style={styles.arrow} aria-hidden="true">
                <path d="M2 10h14M12 5l5 5-5 5" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  if (error) {
    return <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
  }

  if (!events || events.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13 }}>No events found for this visitor in the selected range.</div>
  }

  return (
    <div style={styles.stepper}>
      {events.map((e, i) => {
        const isPageView = e.type === 'page_view'
        return (
          <React.Fragment key={i}>
            <div style={styles.stepItem}>
              <span
                style={{ ...styles.stepNum, ...(isPageView ? styles.stepNumNav : styles.stepNumAction) }}
                title={new Date(e.timestamp).toLocaleString()}
              >
                {i + 1}
              </span>
              <span style={styles.stepLabel}>
                {isPageView ? e.path : e.type}
              </span>
              <span style={styles.stepTime}>
                {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {i < events.length - 1 && (
              <svg width="20" height="20" viewBox="0 0 20 20" style={styles.arrow} aria-hidden="true">
                <path d="M2 10h14M12 5l5 5-5 5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  stepper: {
    display: 'flex',
    alignItems: 'flex-start',
    overflowX: 'auto',
    gap: 8,
    paddingBottom: 16,
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flex: '1 0 88px',
    textAlign: 'center',
  },
  arrow: {
    flexShrink: 0,
    alignSelf: 'center',
  },
  stepNum: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: '50%',
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumNav: {
    background: '#0f172a',
    color: '#fff',
  },
  stepNumAction: {
    background: 'transparent',
    color: '#0f172a',
    border: '1.5px solid #0f172a',
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 88,
  },
  stepTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
}
