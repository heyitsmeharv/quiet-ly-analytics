import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MetricCard } from './MetricCard'
import { PageViewsChart } from './PageViewsChart'
import { TopPages } from './TopPages'
import { TopReferrers } from './TopReferrers'
import { TopLocations } from './TopLocations'

export interface AnalyticsDashboardProps {
  /** Lambda Function URL */
  endpoint: string
  appId: string
  /** Initial date range in days — maps to the nearest preset. Default 30. */
  dateRange?: number
}

type Preset = '1d' | '7d' | '30d' | '1y' | 'custom'

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: '1d',     label: 'Today'   },
  { key: '7d',     label: '1 Week'  },
  { key: '30d',    label: '1 Month' },
  { key: '1y',     label: '1 Year'  },
  { key: 'custom', label: 'Custom'  },
]

interface DashboardEvent {
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
  params: Record<string, unknown>
  [key: string]: unknown
}

interface QueryResponse {
  events?: DashboardEvent[]
  [key: string]: unknown
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
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
    case '1y':  return { from: toDateStr(daysAgo(364)), to: today }
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
  event: Pick<DashboardEvent, 'country' | 'timezone'>,
  fallback = '',
): string {
  return event.country?.trim() || event.timezone?.trim() || fallback
}

// ─── component ───────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ endpoint, appId, dateRange = 30 }: AnalyticsDashboardProps) {
  const initialPreset = dateRangeToPreset(dateRange)
  const initialRange  = presetToRange(initialPreset)

  const [events,        setEvents]        = useState<DashboardEvent[]>([])
  const [expandedRow,   setExpandedRow]   = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [visitorFilter, setVisitorFilter] = useState<string | null>(null)

  const [activePreset, setActivePreset] = useState<Preset>(initialPreset)
  const [from,         setFrom]         = useState(initialRange.from)
  const [to,           setTo]           = useState(initialRange.to)

  // Staging state for the custom picker — only committed on Apply
  const [customFrom, setCustomFrom] = useState(initialRange.from)
  const [customTo,   setCustomTo]   = useState(initialRange.to)
  const customRangeError = useMemo(
    () => getDateRangeError(customFrom, customTo),
    [customFrom, customTo],
  )

  // ─── fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (fromDate: string, toDate: string) => {
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

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: QueryResponse = await res.json()
      setEvents(Array.isArray(data.events) ? data.events : [])
      setVisitorFilter(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
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

  // ─── visitor filter ─────────────────────────────────────────────────────────

  const activeEvents = useMemo(
    () => visitorFilter ? events.filter((e) => e.visitorId === visitorFilter) : events,
    [events, visitorFilter],
  )

  // ─── aggregation ───────────────────────────────────────────────────────────

  const pageViews = useMemo(
    () => activeEvents.filter((e) => e.type === 'page_view'),
    [activeEvents],
  )

  const todayStr       = toDateStr(new Date())
  const sevenDaysAgoTs = daysAgo(7)

  const pvToday = pageViews.filter((e) => e.timestamp.slice(0, 10) === todayStr).length
  const pv7d    = pageViews.filter((e) => new Date(e.timestamp) >= sevenDaysAgoTs).length
  const pv30d   = pageViews.length

  const uvToday = new Set(pageViews.filter((e) => e.timestamp.slice(0, 10) === todayStr).map((e) => e.visitorId)).size
  const uv7d    = new Set(pageViews.filter((e) => new Date(e.timestamp) >= sevenDaysAgoTs).map((e) => e.visitorId)).size
  const uv30d   = new Set(pageViews.map((e) => e.visitorId)).size

  // Chart — day buckets for the active range
  const chartData = useMemo(() => {
    const pvByDay: Record<string, number> = {}
    daysBetween(from, to).forEach((d) => { pvByDay[d] = 0 })
    pageViews.forEach((e) => {
      const d = e.timestamp.slice(0, 10)
      if (d in pvByDay) pvByDay[d]++
    })
    return Object.entries(pvByDay).map(([date, views]) => ({ date, views }))
  }, [pageViews, from, to])

  // Chart section label
  const rangeLabel = useMemo(() => {
    if (activePreset === '1d')     return `Page Views · Today`
    if (activePreset === 'custom') return `Page Views · ${formatDateShort(from)} – ${formatDateShort(to)}`
    const name = PRESETS.find((p) => p.key === activePreset)!.label
    return `Page Views · Last ${name}`
  }, [activePreset, from, to])

  // Tables
  const topPages = useMemo(() => {
    const counts: Record<string, number> = {}
    pageViews.forEach((e) => { counts[e.path] = (counts[e.path] ?? 0) + 1 })
    return Object.entries(counts).map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views)
  }, [pageViews])

  const topReferrers = useMemo(() => {
    const counts: Record<string, number> = {}
    pageViews.forEach((e) => { const r = e.referrer ?? ''; counts[r] = (counts[r] ?? 0) + 1 })
    return Object.entries(counts).map(([referrer, count]) => ({ referrer, count })).sort((a, b) => b.count - a.count)
  }, [pageViews])

  const topLocations = useMemo(() => {
    const counts: Record<string, number> = {}
    pageViews.forEach((e) => {
      const location = getLocationLabel(e, 'Unknown')
      counts[location] = (counts[location] ?? 0) + 1
    })
    return Object.entries(counts).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count)
  }, [pageViews])

  const recentEvents = useMemo(
    () => [...activeEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20),
    [activeEvents],
  )

  // ─── render ────────────────────────────────────────────────────────────────

  if (loading) return <div style={styles.state}>Loading…</div>

  if (error) {
    return (
      <div style={styles.state}>
        <span style={{ color: '#ef4444' }}>Error: {error}</span>
        <button onClick={() => void fetchData(from, to)} style={styles.retryBtn}>Retry</button>
      </div>
    )
  }

  const today = toDateStr(new Date())

  return (
    <div style={styles.root}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={styles.wordmark}>quiet-ly</span>
          <h2 style={styles.appTitle}>{appId}</h2>
        </div>
        <button onClick={() => void fetchData(from, to)} style={styles.refreshBtn} aria-label="Refresh dashboard data">↻ Refresh</button>
      </div>

      {/* Date range bar */}
      <div style={styles.rangeBar}>
        <div style={styles.presetGroup}>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePresetClick(p.key)}
              style={activePreset === p.key ? styles.presetActive : styles.presetBtn}
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

      {/* Visitor filter banner */}
      {visitorFilter && (
        <div style={styles.filterBanner}>
          <span>
            Filtered to visitor <code style={styles.filterCode}>{visitorFilter.slice(0, 8)}…</code>
          </span>
          <button onClick={() => setVisitorFilter(null)} style={styles.clearFilterBtn}>
            ✕ clear filter
          </button>
        </div>
      )}

      {/* Metric cards */}
      <div style={styles.cards}>
        <MetricCard label="Page Views"      today={pvToday} last7d={pv7d} last30d={pv30d} />
        <MetricCard label="Unique Visitors" today={uvToday} last7d={uv7d} last30d={uv30d} />
      </div>

      {/* Chart */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{rangeLabel}</h3>
        <PageViewsChart data={chartData} />
      </div>

      {/* Tables */}
      <div style={styles.tables}>
        <div style={styles.tableSection}>
          <h3 style={styles.sectionTitle}>Top Pages</h3>
          <TopPages rows={topPages} />
        </div>
        <div style={styles.tableSection}>
          <h3 style={styles.sectionTitle}>Top Referrers</h3>
          <TopReferrers rows={topReferrers} />
        </div>
        <div style={styles.tableSection}>
          <h3 style={styles.sectionTitle}>Top Locations</h3>
          <TopLocations rows={topLocations} />
        </div>
      </div>

      {/* Recent events */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Events</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Time', 'Type', 'Path', 'Location', 'Visitor'].map((h) => (
                <th key={h} style={styles.recentTh}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentEvents.map((e) => {
              const rowKey      = `${e.visitorId}-${e.sessionId}-${e.timestamp}`
              const paramEntries = Object.entries(e.params ?? {})
              const isExpanded  = expandedRow === rowKey

              return (
                <React.Fragment key={rowKey}>
                  <tr
                    onClick={paramEntries.length > 0 ? () => setExpandedRow(isExpanded ? null : rowKey) : undefined}
                    style={paramEntries.length > 0 ? { cursor: 'pointer' } : {}}
                  >
                    <td style={styles.recentTd}>{new Date(e.timestamp).toLocaleString()}</td>
                    <td style={styles.recentTd}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <code style={styles.eventType}>{e.type}</code>
                        {paramEntries.length > 0 && (
                          <span style={styles.paramsToggle} aria-hidden="true">
                            {isExpanded ? '▾' : '▸'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.recentTd, fontFamily: 'monospace', fontSize: 11 }}>{e.path}</td>
                    <td style={{ ...styles.recentTd, color: '#64748b', fontSize: 11 }}>
                      {getLocationLabel(e, '—')}
                    </td>
                    <td style={styles.recentTd}>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setVisitorFilter(visitorFilter === e.visitorId ? null : e.visitorId) }}
                        style={{ ...styles.visitorBtn, ...(visitorFilter === e.visitorId ? styles.visitorBtnActive : {}) }}
                        aria-label={visitorFilter === e.visitorId ? 'Clear visitor filter' : `Filter to visitor ${e.visitorId.slice(0, 8)}`}
                        title={visitorFilter === e.visitorId ? 'Clear filter' : 'Filter to this visitor'}
                      >
                        {e.visitorId.slice(0, 8)}…
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} style={styles.paramsRow}>
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
  )
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#0f172a',
    maxWidth: 900,
    margin: '0 auto',
    padding: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleGroup: { display: 'flex', flexDirection: 'column', gap: 2 },
  wordmark: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#6366f1',
  },
  appTitle: { margin: 0, fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 },
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
  presetGroup: { display: 'flex', gap: 4 },
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
    background: '#6366f1',
    border: '1px solid #6366f1',
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
    background: '#6366f1',
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

  // Visitor filter banner
  filterBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: 6,
    padding: '8px 12px',
    marginBottom: 16,
    fontSize: 13,
    color: '#4338ca',
  },
  filterCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    background: '#e0e7ff',
    padding: '1px 5px',
    borderRadius: 3,
  },
  clearFilterBtn: {
    background: 'none',
    border: '1px solid #a5b4fc',
    borderRadius: 5,
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: 12,
    color: '#4338ca',
  },

  // Cards / sections
  cards:   { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  section: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginBottom: 16 },
  sectionTitle: { margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#374151' },
  tables: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  tableSection: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 },

  // States
  state: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: 48,
    color: '#64748b',
    fontSize: 14,
  },
  retryBtn: {
    background: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
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
  visitorBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 6px',
    cursor: 'pointer',
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  visitorBtnActive: {
    background: '#eef2ff',
    border: '1px solid #a5b4fc',
    color: '#4338ca',
  },

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
