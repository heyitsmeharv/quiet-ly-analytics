import React, { useEffect, useRef, useState } from 'react'

const SHIMMER_STYLE = `
  @keyframes qly-funnel-shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
`

const skShimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%)',
  backgroundSize: '800px 100%',
  animation: 'qly-funnel-shimmer 1.4s ease-in-out infinite',
  borderRadius: 4,
}

export interface FunnelStep {
  /** Display label for the step */
  label: string
  /** Event type — 'page_view' for pageviews, or the custom event name passed to track() */
  type: string
  /** Optional path filter; only events on this exact path count for this step */
  path?: string
}

interface FunnelResult {
  label: string
  type: string
  path?: string
  count: number
  conversionRate: number | null
}

export interface FunnelChartProps {
  /** Lambda Function URL */
  endpoint: string
  appId: string
  /** Ordered list of steps — must have at least 2 */
  steps: FunnelStep[]
  from: string
  to: string
  /** Scope the funnel to a single visitor */
  visitorId?: string | null
}

export function FunnelChart({ endpoint, appId, steps, from, to, visitorId }: FunnelChartProps) {
  const [funnel, setFunnel]   = useState<FunnelResult[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef              = useRef<AbortController | null>(null)
  const stepsKey              = JSON.stringify(steps) + (visitorId ?? '')

  useEffect(() => {
    if (steps.length < 2) {
      setError('At least 2 funnel steps are required.')
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const url = new URL(endpoint)
    url.searchParams.set('appId', appId)
    url.searchParams.set('from', from)
    url.searchParams.set('to', to)
    url.searchParams.set('funnelSteps', JSON.stringify(steps))
    if (visitorId) url.searchParams.set('visitorId', visitorId)

    fetch(url.toString(), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ funnel?: FunnelResult[] }>
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setFunnel(data.funnel ?? null)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Failed to load funnel')
          setLoading(false)
        }
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, appId, from, to, stepsKey])

  if (loading) {
    return visitorId ? (
      <div style={styles.stepper}>
        <style>{SHIMMER_STYLE}</style>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            <div style={styles.stepperItem}>
              <div style={{ ...skShimmer, width: 20, height: 20, borderRadius: '50%' }} />
              <div style={{ ...skShimmer, width: 64, height: 12, marginTop: 2 }} />
            </div>
            {i < steps.length - 1 && (
              <svg width="20" height="20" viewBox="0 0 20 20" style={styles.stepperArrow} aria-hidden="true">
                <path d="M2 10h14M12 5l5 5-5 5" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
    ) : (
      <div style={styles.scroll}>
        <style>{SHIMMER_STYLE}</style>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            <div style={styles.row}>
              <div style={{ ...skShimmer, flexShrink: 0, width: 20, height: 20, borderRadius: '50%' }} />
              <div style={{ ...skShimmer, flexShrink: 0, width: 100, height: 14 }} />
              <div style={{ ...skShimmer, flex: 1, height: 24 }} />
              <div style={{ ...skShimmer, flexShrink: 0, width: 32, height: 14 }} />
            </div>
            {i < steps.length - 1 && (
              <div style={styles.connector}>
                <div style={{ ...skShimmer, width: 10, height: 16 }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  if (error) {
    return <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
  }

  if (!funnel || funnel[0]?.count === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13 }}>No data for this funnel in the selected range.</div>
  }

  const topCount = funnel[0].count

  if (visitorId) {
    return (
      <div style={styles.stepper}>
        {funnel.map((step, i) => {
          const completed    = step.count > 0
          const isNavigation = step.type === 'page_view'
          const circleStyle  = !completed
            ? styles.stepNumSkipped
            : isNavigation ? styles.stepNumDone : styles.stepNumAction
          return (
            <React.Fragment key={i}>
              <div style={styles.stepperItem}>
                <span style={{ ...styles.stepNum, ...circleStyle }}>
                  {i + 1}
                </span>
                <span style={{ ...styles.stepLabel, color: completed ? '#0f172a' : '#64748b' }}>
                  {step.label}
                </span>
                {step.path && <span style={styles.stepPath}>{step.path}</span>}
              </div>
              {funnel[i + 1] && (
                <svg width="20" height="20" viewBox="0 0 20 20" style={styles.stepperArrow} aria-hidden="true">
                  <path d="M2 10h14M12 5l5 5-5 5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  return (
    <div style={styles.scroll}>
      {funnel.map((step, i) => {
        const barPct   = topCount > 0 ? (step.count / topCount) * 100 : 0
        const nextStep = funnel[i + 1]
        return (
          <React.Fragment key={i}>
            <div style={styles.row}>
              <span style={styles.stepNum}>{i + 1}</span>
              <div style={styles.labelWrap}>
                <span style={styles.stepLabel}>{step.label}</span>
                {step.path && <span style={styles.stepPath}>{step.path}</span>}
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${barPct}%` }} />
              </div>
              <div style={styles.metaWrap}>
                <span style={styles.count}>{step.count.toLocaleString()}</span>
                {step.conversionRate !== null && (
                  <span style={styles.conversion}>
                    {Math.round(step.conversionRate * 100)}% from prev
                  </span>
                )}
              </div>
            </div>
            {nextStep && (
              <div style={styles.connector}>
                {nextStep.conversionRate !== null && (
                  <span style={styles.dropoff}>
                    ↓ {Math.round((1 - nextStep.conversionRate) * 100)}% drop-off
                  </span>
                )}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  // ── visitor mode: horizontal stepper ────────────────────────────────────────
  stepper: {
    display: 'flex',
    alignItems: 'flex-start',
    overflowX: 'auto',
    gap: 8,
    paddingBottom: 16,
  },
  stepperItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    flex: '1 0 88px',
    textAlign: 'center',
  },
  stepperArrow: {
    flexShrink: 0,
    marginTop: 0,
    alignSelf: 'center',
  },

  // ── funnel mode: vertical bars ───────────────────────────────────────────────
  scroll: {
    maxHeight: 300,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '4px 0',
  },
  stepNum: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#0f172a',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDone: {
    background: '#0f172a',
    color: '#fff',
  },
  stepNumAction: {
    background: 'transparent',
    color: '#0f172a',
    border: '1.5px solid #0f172a',
  },
  stepNumSkipped: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1.5px solid #cbd5e1',
  },
  labelWrap: {
    flexShrink: 0,
    width: 140,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflow: 'hidden',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  stepPath: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  barTrack: {
    flex: 1,
    height: 24,
    background: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: '#0f172a',
    borderRadius: 4,
    transition: 'width 0.4s ease',
  },
  metaWrap: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 1,
    minWidth: 72,
  },
  count: {
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    color: '#0f172a',
  },
  conversion: {
    fontSize: 11,
    color: '#64748b',
    fontVariantNumeric: 'tabular-nums',
  },
  connector: {
    padding: '2px 0 2px 30px',
    minHeight: 18,
  },
  dropoff: {
    fontSize: 16,
    color: '#94a3b8',
  },
}
