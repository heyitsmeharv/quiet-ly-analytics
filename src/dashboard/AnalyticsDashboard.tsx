import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MetricCard } from './MetricCard'
import { PageViewsChart } from './PageViewsChart'
import { TopPages } from './TopPages'
import { TopReferrers } from './TopReferrers'
import { TopLocations } from './TopLocations'
import { TopDevices } from './TopDevices'
import { TopBrowsers } from './TopBrowsers'
import { WorldMap } from './WorldMap'
import { FunnelChart } from './FunnelChart'
import type { FunnelStep } from './FunnelChart'

const ANIMATIONS = `
  @keyframes qly-shimmer {
    0%   { background-position: -800px 0; }
    100% { background-position:  800px 0; }
  }
  @keyframes qly-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .qly-btn {
    transition: filter 0.12s ease, transform 0.08s ease;
  }
  .qly-btn:hover { filter: brightness(1.12); }
  .qly-btn:active { filter: brightness(0.88); transform: scale(0.96); }
  .qly-visitor-btn:hover { background: #dbeafe !important; color: #1d4ed8 !important; }
  .qly-visitor-btn-active:hover { background: #bfdbfe !important; }
  .qly-expandable-row:hover td { background: #f8fafc; }
`

const skShimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%)',
  backgroundSize: '800px 100%',
  animation: 'qly-shimmer 1.4s ease-in-out infinite',
  borderRadius: 6,
}

function useWindowWidth(): number {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize, { passive: true } as AddEventListenerOptions)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

export interface AnalyticsDashboardProps {
  /** Lambda Function URL */
  endpoint: string
  appId: string
  /** Initial date range in days - maps to the nearest preset. Default 30. */
  dateRange?: number
  /** When provided, a User Journey section appears whenever a visitor is selected */
  funnelSteps?: FunnelStep[]
}

type Preset = '1d' | '7d' | '30d' | '1y' | 'custom'

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: '1d',     label: 'Today'   },
  { key: '7d',     label: '1 Week'  },
  { key: '30d',    label: '1 Month' },
  { key: '1y',     label: '1 Year'  },
  { key: 'custom', label: 'Custom'  },
]

interface SummaryEvent {
  appId: string
  type: string
  path: string
  referrer: string
  sessionId: string
  visitorId: string
  userId?: string
  timestamp: string
  timezone?: string
  locale?: string
  country?: string
  device?: string
  browser?: string
  params: Record<string, unknown>
  [key: string]: unknown
}

interface SummaryData {
  totalEvents: number
  pageViews: number
  uniqueVisitors: number
  dailyCounts: Array<{ date: string; views: number }>
  recentEvents: SummaryEvent[]
  countryCounts: Record<string, number>
  topPages: Array<{ path: string; count: number }>
  topReferrers: Array<{ referrer: string; count: number }>
  topLocations: Array<{ location: string; count: number }>
  topDevices: Array<{ device: string; count: number }>
  topBrowsers: Array<{ browser: string; count: number }>
}

interface AggregateResponse {
  summary?: SummaryData
  [key: string]: unknown
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  const cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (cur <= end && days.length < 400) {
    days.push(toDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function presetToRange(preset: Preset): { from: string; to: string } {
  const today = toDateStr(new Date())
  switch (preset) {
    case '1d':  return { from: today, to: today }
    case '7d':  return { from: toDateStr(daysAgo(6)),   to: today }
    case '30d': return { from: toDateStr(daysAgo(29)),  to: today }
    case '1y':  return { from: toDateStr(daysAgo(365)), to: today }
    default:    return { from: toDateStr(daysAgo(29)),  to: today }
  }
}

function dateRangeToPreset(days: number): Preset {
  if (days <= 1)  return '1d'
  if (days <= 7)  return '7d'
  if (days <= 30) return '30d'
  return '1y'
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m - 1]} ${+d}`
}

function parseDateStr(iso: string): number | null {
  if (!DATE_RE.test(iso)) return null

  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date.getTime()
}

function getDateRangeError(from: string, to: string): string | null {
  if (!from || !to) return 'Both from and to dates are required.'

  const start = parseDateStr(from)
  const end = parseDateStr(to)

  if (start === null || end === null) {
    return 'Dates must use strict YYYY-MM-DD values.'
  }

  if (start > end) return 'From date must be on or before to date.'

  const rangeDays = Math.floor((end - start) / DAY_MS) + 1
  if (rangeDays > 366) return 'Date range must be 366 days or fewer.'

  return null
}

function getLocationLabel(
  event: Pick<SummaryEvent, 'country' | 'timezone'>,
  fallback = '',
): string {
  return event.country?.trim() || event.timezone?.trim() || fallback
}

// ─── component ───────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ endpoint, appId, dateRange = 30, funnelSteps }: AnalyticsDashboardProps) {
  const isMobile = useWindowWidth() < 640
  const initialPreset = dateRangeToPreset(dateRange)
  const initialRange  = presetToRange(initialPreset)

  const [summary,       setSummary]       = useState<SummaryData | null>(null)
  const [expandedRow,   setExpandedRow]   = useState<string | null>(null)
  const [visitorFilter, setVisitorFilter] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [hasLoaded,     setHasLoaded]     = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const [activePreset, setActivePreset] = useState<Preset>(initialPreset)
  const [from,         setFrom]         = useState(initialRange.from)
  const [to,           setTo]           = useState(initialRange.to)

  // Staging state for the custom picker - only committed on Apply
  const [customFrom, setCustomFrom] = useState(initialRange.from)
  const [customTo,   setCustomTo]   = useState(initialRange.to)
  const customRangeError = useMemo(
    () => getDateRangeError(customFrom, customTo),
    [customFrom, customTo],
  )

  // ─── fetch ─────────────────────────────────────────────────────────────────

  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (fromDate: string, toDate: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const rangeError = getDateRangeError(fromDate, toDate)
    if (rangeError) {
      setError(rangeError)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const url = new URL(endpoint)
      url.searchParams.set('appId', appId)
      url.searchParams.set('from', fromDate)
      url.searchParams.set('to', toDate)
      url.searchParams.set('aggregate', 'true')

      const res = await fetch(url.toString(), { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AggregateResponse = await res.json()
      setSummary(data.summary ?? null)
      setHasLoaded(true)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [endpoint, appId])

  useEffect(() => {
    void fetchData(from, to)
  }, [fetchData, from, to])

  // ─── preset / date range handlers ──────────────────────────────────────────

  const handlePresetClick = (preset: Preset) => {
    setActivePreset(preset)
    if (preset !== 'custom') {
      const range = presetToRange(preset)
      setFrom(range.from)
      setTo(range.to)
      setCustomFrom(range.from)
      setCustomTo(range.to)
    }
  }

  const handleApplyCustom = () => {
    if (customRangeError) {
      setError(customRangeError)
      return
    }
    setFrom(customFrom)
    setTo(customTo)
  }

  // ─── derived data ──────────────────────────────────────────────────────────

  const rangeStatLabel = useMemo(() => {
    if (activePreset === '1d')     return 'Today'
    if (activePreset === 'custom') return `${formatDateShort(from)} – ${formatDateShort(to)}`
    return PRESETS.find((p) => p.key === activePreset)!.label
  }, [activePreset, from, to])

  const rangeLabel = useMemo(() => {
    if (activePreset === '1d')     return 'Page Views · Today'
    if (activePreset === 'custom') return `Page Views · ${formatDateShort(from)} – ${formatDateShort(to)}`
    const name = PRESETS.find((p) => p.key === activePreset)!.label
    return `Page Views · Last ${name}`
  }, [activePreset, from, to])

  // Zero-fill all dates in range so the chart shows gaps correctly
  const chartData = useMemo(() => {
    const byDay = Object.fromEntries((summary?.dailyCounts ?? []).map((d) => [d.date, d.views]))
    return daysBetween(from, to).map((date) => ({ date, views: byDay[date] ?? 0 }))
  }, [summary, from, to])

  // ─── render ────────────────────────────────────────────────────────────────

  const sectionPad = isMobile ? 12 : 20
  const today      = toDateStr(new Date())
  const hdrPad     = isMobile ? '14px 16px' : '20px 24px'
  const bodyPad    = isMobile ? 16 : 24

  const sharedHeader = (
    <div style={{ ...styles.header, padding: hdrPad }}>
      <div style={styles.titleGroup}>
        <span style={styles.wordmark}>quiet-ly</span>
        <h2 style={styles.appTitle}>{appId}</h2>
      </div>
    </div>
  )

  if (loading && !hasLoaded) {
    return (
      <div style={styles.root}>
        <style>{ANIMATIONS}</style>
        {sharedHeader}
        <div style={{ padding: bodyPad }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[64, 72, 80, 70, 68].map((w, i) => (
              <div key={i} style={{ ...skShimmer, width: w, height: 32 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' as const }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ ...styles.card, flex: 1, minWidth: 200, padding: sectionPad }}>
                <div style={{ ...skShimmer, width: '55%', height: 11, marginBottom: 16 }} />
                <div style={{ display: 'flex', gap: 24 }}>
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      <div style={{ ...skShimmer, width: 38, height: 28, marginBottom: 6 }} />
                      <div style={{ ...skShimmer, width: 46, height: 10 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {[220, 190].map((h, i) => (
            <div key={i} style={{ ...styles.card, padding: sectionPad, marginBottom: 16 }}>
              <div style={{ ...skShimmer, width: '40%', height: 13, marginBottom: 16 }} />
              <div style={{ ...skShimmer, height: h, borderRadius: 8 }} />
            </div>
          ))}
          <div style={styles.tables}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...styles.card, padding: sectionPad }}>
                <div style={{ ...skShimmer, width: '50%', height: 13, marginBottom: 16 }} />
                {Array.from({ length: 5 }, (_, j) => (
                  <div key={j} style={{ ...skShimmer, height: 22, marginBottom: 10 }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.root}>
        <style>{ANIMATIONS}</style>
        {sharedHeader}
        <div style={{ padding: bodyPad }}>
          <div style={{ ...styles.card, padding: 32, textAlign: 'center' as const }}>
            <p style={{ color: '#ef4444', fontSize: 14, margin: '0 0 12px' }}>Error: {error}</p>
            <button onClick={() => void fetchData(from, to)} style={styles.retryBtn} className="qly-btn">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      <style>{ANIMATIONS}</style>

      {/* Branded header */}
      <div style={{ ...styles.header, padding: hdrPad }}>
        <div style={styles.titleGroup}>
          <span style={styles.wordmark}>quiet-ly</span>
          <h2 style={styles.appTitle}>{appId}</h2>
        </div>
        <button
          onClick={() => void fetchData(from, to)}
          style={styles.refreshBtn}
          className="qly-btn"
          aria-label="Refresh dashboard data"
        >
          <span style={loading ? { display: 'inline-block', animation: 'qly-spin 0.7s linear infinite' } : {}}>↻</span>
          {' '}Refresh
        </button>
      </div>

      {/* Loading bar - visible on subsequent fetches while stale content is shown */}
      {loading && (
        <div style={{ ...skShimmer, height: 3, borderRadius: 0, marginBottom: 0 }} />
      )}

      {/* Body */}
      <div style={{ padding: bodyPad, opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : undefined }}>

        {/* Date range bar */}
        <div style={styles.rangeBar}>
          <div style={styles.presetGroup}>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePresetClick(p.key)}
                style={activePreset === p.key ? styles.presetActive : styles.presetBtn}
                className="qly-btn"
                aria-pressed={activePreset === p.key}
              >
                {p.label}
              </button>
            ))}
          </div>

          {activePreset === 'custom' && (
            <div style={styles.customPicker}>
              <input
                type="date"
                value={customFrom}
                max={customTo || today}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={styles.dateInput}
                aria-label="From date"
              />
              <span style={styles.dateSep}>→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
                style={styles.dateInput}
                aria-label="To date"
              />
              <button
                onClick={handleApplyCustom}
                disabled={customRangeError !== null}
                style={styles.applyBtn}
                className="qly-btn"
                aria-label="Apply custom date range"
              >
                Apply
              </button>
              {customRangeError && (
                <span style={styles.customRangeError}>{customRangeError}</span>
              )}
            </div>
          )}
        </div>

        {/* Metric cards */}
        <div style={styles.cards}>
          <MetricCard label="Page Views"      stats={[{ label: rangeStatLabel, value: summary?.pageViews      ?? 0 }]} />
          <MetricCard label="Unique Visitors" stats={[{ label: rangeStatLabel, value: summary?.uniqueVisitors ?? 0 }]} />
        </div>

        {/* Chart */}
        <div style={{ ...styles.section, padding: sectionPad }}>
          <h3 style={styles.sectionTitle}>{rangeLabel}</h3>
          <PageViewsChart data={chartData} rangeKey={`${from}-${to}`} />
        </div>

        {/* World map */}
        <div style={{ ...styles.section, padding: sectionPad }}>
          <h3 style={styles.sectionTitle}>Traffic by Country</h3>
          <WorldMap countryCounts={summary?.countryCounts ?? {}} />
        </div>

        {/* Tables */}
        <div style={styles.tables}>
          <div style={{ ...styles.tableSection, padding: sectionPad }}>
            <h3 style={styles.sectionTitle}>Top Pages</h3>
            <TopPages rows={summary?.topPages ?? []} />
          </div>
          <div style={{ ...styles.tableSection, padding: sectionPad }}>
            <h3 style={styles.sectionTitle}>Top Referrers</h3>
            <TopReferrers rows={summary?.topReferrers ?? []} />
          </div>
          <div style={{ ...styles.tableSection, padding: sectionPad }}>
            <h3 style={styles.sectionTitle}>Top Locations</h3>
            <TopLocations rows={summary?.topLocations ?? []} />
          </div>
          <div style={{ ...styles.tableSection, padding: sectionPad }}>
            <h3 style={styles.sectionTitle}>Devices</h3>
            <TopDevices rows={summary?.topDevices ?? []} />
          </div>
          <div style={{ ...styles.tableSection, padding: sectionPad }}>
            <h3 style={styles.sectionTitle}>Browsers</h3>
            <TopBrowsers rows={summary?.topBrowsers ?? []} />
          </div>
        </div>

        {/* Recent events */}
        <div style={{ ...styles.section, padding: sectionPad }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Recent Events</h3>
            {visitorFilter && (
              <div style={styles.filterBanner}>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{visitorFilter.slice(0, 8)}…</span>
                <button onClick={() => setVisitorFilter(null)} style={styles.clearFilterBtn} className="qly-btn" aria-label="Clear visitor filter">✕ Clear</button>
              </div>
            )}
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: isMobile ? 480 : undefined }}>
              <thead>
                <tr>
                  <th style={styles.recentTh}>Time</th>
                  <th style={styles.recentTh}>Type</th>
                  <th style={styles.recentTh}>Path</th>
                  {!isMobile && <th style={styles.recentTh}>Location</th>}
                  <th style={styles.recentTh}>
                    <span title="Click a visitor ID to filter" style={{ cursor: 'default' }}>Visitor <span style={{ color: '#94a3b8', fontSize: 10 }}>▼</span></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recentEvents ?? [])
                  .filter((e) => !visitorFilter || e.visitorId === visitorFilter)
                  .map((e) => {
                    const rowKey       = `${e.visitorId}-${e.sessionId}-${e.timestamp}`
                    const paramEntries = Object.entries(e.params ?? {})
                    const isExpanded   = expandedRow === rowKey
                    const isFiltered   = visitorFilter === e.visitorId

                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          onClick={paramEntries.length > 0 ? () => setExpandedRow(isExpanded ? null : rowKey) : undefined}
                          style={paramEntries.length > 0 ? { cursor: 'pointer' } : {}}
                          className={paramEntries.length > 0 ? 'qly-expandable-row' : undefined}
                        >
                          <td style={styles.recentTd}>{new Date(e.timestamp).toLocaleString()}</td>
                          <td style={styles.recentTd}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <code style={styles.eventType}>{e.type}</code>
                              {paramEntries.length > 0 && (
                                <span
                                  style={{
                                    ...styles.paramsToggle,
                                    display: 'inline-block',
                                    transform: isExpanded ? 'none' : 'rotate(-90deg)',
                                    transition: 'transform 0.15s ease',
                                  }}
                                  aria-hidden="true"
                                >▼</span>
                              )}
                            </div>
                          </td>
                          <td style={{ ...styles.recentTd, fontFamily: 'monospace', fontSize: 11 }}>{e.path}</td>
                          {!isMobile && (
                            <td style={{ ...styles.recentTd, color: '#64748b', fontSize: 11 }}>
                              {getLocationLabel(e, '-')}
                            </td>
                          )}
                          <td style={styles.recentTd}>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); setVisitorFilter(isFiltered ? null : e.visitorId) }}
                              style={{ ...styles.visitorBtn, ...(isFiltered ? styles.visitorBtnActive : {}) }}
                              className={isFiltered ? 'qly-visitor-btn-active' : 'qly-visitor-btn'}
                              title={isFiltered ? 'Clear filter' : 'Filter by this visitor'}
                            >
                              {e.visitorId.slice(0, 8)}…
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={isMobile ? 4 : 5} style={styles.paramsRow}>
                              {paramEntries.map(([k, v]) => (
                                <span key={k} style={styles.paramPair}>
                                  <span style={styles.paramKey}>{k}</span>
                                  <span style={styles.paramVal}>
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </span>
                                </span>
                              ))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Journey — visible only when a visitor is selected and funnelSteps provided */}
        {visitorFilter && funnelSteps && funnelSteps.length >= 2 && (
          <div style={{ ...styles.section, padding: sectionPad }}>
            <h3 style={styles.sectionTitle}>User Journey</h3>
            <FunnelChart
              endpoint={endpoint}
              appId={appId}
              steps={funnelSteps}
              from={from}
              to={to}
              visitorId={visitorFilter}
            />
          </div>
        )}

      </div>{/* /body */}
    </div>
  )
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#0f172a',
    maxWidth: 900,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: 2 },
  wordmark: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#0f172a',
  },
  appTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 },
  refreshBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },

  // Range bar
  rangeBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetGroup: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  presetBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 13,
    color: '#475569',
    fontWeight: 500,
  },
  presetActive: {
    background: '#0f172a',
    border: '1px solid #0f172a',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 13,
    color: '#fff',
    fontWeight: 600,
  },
  customPicker: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 4,
  },
  dateInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 13,
    color: '#374151',
    outline: 'none',
    cursor: 'pointer',
  },
  dateSep: { fontSize: 13, color: '#94a3b8' },
  applyBtn: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  customRangeError: {
    color: '#b91c1c',
    fontSize: 12,
  },

  // Cards / sections
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
  },
  cards:   { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  section: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: { margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#374151' },
  tables: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  tableSection: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 20,
  },

  // States
  retryBtn: {
    background: '#0f172a',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
  },

  // Visitor filter
  filterBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 12,
    color: '#475569',
  },
  clearFilterBtn: {
    background: 'none',
    border: 'none',
    padding: '1px 4px',
    cursor: 'pointer',
    fontSize: 11,
    color: '#64748b',
    borderRadius: 4,
  },
  visitorBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '1px 4px',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#94a3b8',
  } as React.CSSProperties,
  visitorBtnActive: {
    color: '#0f172a',
    background: '#e2e8f0',
  },

  // Recent events table
  recentTh: {
    padding: '6px 8px',
    color: '#64748b',
    fontWeight: 600,
    textAlign: 'left' as const,
    borderBottom: '1px solid #e2e8f0',
  },
  recentTd: { padding: '6px 8px', borderBottom: '1px solid #f8fafc', whiteSpace: 'nowrap' as const },
  eventType: { fontSize: 11, background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 },

  // Params expansion
  paramsToggle: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 1,
    userSelect: 'none' as const,
  },
  paramsRow: {
    padding: '6px 8px 8px 20px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  paramPair: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    marginRight: 8,
    marginBottom: 2,
    borderRadius: 4,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    fontSize: 11,
  },
  paramKey: {
    background: '#e2e8f0',
    color: '#475569',
    padding: '1px 5px',
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  paramVal: {
    background: '#fff',
    color: '#0f172a',
    padding: '1px 5px',
    fontFamily: 'monospace',
  },
}
