import React from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsDashboard } from '../src/dashboard'

// ─── mock data ───────────────────────────────────────────────────────────────

const PAGES     = ['/home', '/about', '/projects', '/contact', '/blog/aws-s3', '/blog/react-hooks', '/blog/terraform-intro']
const REFERRERS = ['https://google.com', 'https://github.com', 'https://linkedin.com', '', '']
const TIMEZONES = [
  'Europe/London', 'Europe/London', 'Europe/London',   // weighted - portfolio owner's region
  'America/New_York', 'America/New_York',
  'America/Los_Angeles',
  'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
  'America/Chicago',
]
const LOCALES   = ['en-GB', 'en-US', 'en-US', 'fr-FR', 'de-DE', 'ja-JP', 'en-AU']
const COUNTRIES = ['GB', 'GB', 'GB', 'US', 'US', 'US', 'FR', 'DE', 'JP', 'AU', 'US']
const DEVICES   = ['desktop', 'desktop', 'desktop', 'mobile', 'mobile', 'tablet']
const BROWSERS  = ['Chrome', 'Chrome', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Firefox']
const VISITORS  = Array.from({ length: 50 }, (_, i) => `v-${String(i).padStart(4, '0')}`)

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateMockEvents() {
  const events: any[] = []

  // Page views across 366 days so all presets have realistic data.
  // Traffic grows gradually over the year to give the chart an interesting shape.
  for (let i = 365; i >= 0; i--) {
    const base   = daysAgo(i)
    const growth = 1 + (365 - i) / 365  // ramps from 1× to 2× over the year
    const count  = Math.round((5 + Math.floor(Math.random() * 15)) * growth)

    for (let j = 0; j < count; j++) {
      const ts      = new Date(base)
      const maxHour = i === 0 ? new Date().getHours() : 24
      ts.setHours(Math.floor(Math.random() * Math.max(maxHour, 1)), Math.floor(Math.random() * 60), 0, 0)
      events.push({
        appId:     'my-portfolio',
        type:      'page_view',
        path:      pick(PAGES),
        referrer:  pick(REFERRERS),
        sessionId: `s-${Math.random().toString(36).slice(2, 10)}`,
        visitorId: pick(VISITORS),
        timestamp: ts.toISOString(),
        timezone:  pick(TIMEZONES),
        locale:    pick(LOCALES),
        country:   pick(COUNTRIES),
        device:    pick(DEVICES),
        browser:   pick(BROWSERS),
        params:    {},
      })
    }
  }

  // Custom events - sprinkled across the last 366 days
  const customEvents = [
    { type: 'contact_submitted', path: '/contact',  params: { form: 'contact' } },
    { type: 'project_clicked',   path: '/projects', params: { project: 'aws-s3-uploader', source: 'card' } },
    { type: 'cv_downloaded',     path: '/about',    params: { format: 'pdf' } },
    { type: 'theme_changed',     path: '/home',     params: { theme: 'dark' } },
  ]
  for (let i = 0; i < 120; i++) {
    const custom = pick(customEvents)
    events.push({
      appId:     'my-portfolio',
      ...custom,
      referrer:  '',
      sessionId: `s-${Math.random().toString(36).slice(2, 10)}`,
      visitorId: pick(VISITORS),
      timestamp: new Date(Date.now() - Math.random() * 366 * 24 * 60 * 60 * 1000).toISOString(),
      timezone:  pick(TIMEZONES),
      locale:    pick(LOCALES),
      country:   pick(COUNTRIES),
      device:    pick(DEVICES),
      browser:   pick(BROWSERS),
    })
  }

  return events
}

// ─── aggregate helper (mirrors Lambda buildSummary) ──────────────────────────

function topN(items: any[], keyFn: (e: any) => string, label: string, n = 10) {
  const counts: Record<string, number> = {}
  items.forEach((e) => { const k = keyFn(e); counts[k] = (counts[k] ?? 0) + 1 })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ [label]: key, count }))
}

function buildSummary(allEvents: any[], from: string, to: string) {
  const start = new Date(from + 'T00:00:00').getTime()
  const end   = new Date(to   + 'T23:59:59').getTime()
  const rangeEvents = allEvents.filter((e) => {
    const t = new Date(e.timestamp).getTime()
    return t >= start && t <= end
  })

  const pageViews     = rangeEvents.filter((e) => e.type === 'page_view')
  const uniqueVisitors = new Set(rangeEvents.map((e) => e.visitorId).filter(Boolean)).size

  const dailyMap: Record<string, number> = {}
  pageViews.forEach((e) => {
    const date = e.timestamp.slice(0, 10)
    dailyMap[date] = (dailyMap[date] ?? 0) + 1
  })
  const dailyCounts = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, views]) => ({ date, views }))

  const countryCounts: Record<string, number> = {}
  pageViews.forEach((e) => {
    if (e.country) countryCounts[e.country] = (countryCounts[e.country] ?? 0) + 1
  })

  const recentEvents = [...rangeEvents]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20)

  return {
    totalEvents:   rangeEvents.length,
    pageViews:     pageViews.length,
    uniqueVisitors,
    dailyCounts,
    recentEvents,
    countryCounts,
    topPages:      topN(pageViews, (e) => e.path    || '(unknown)', 'path'),
    topReferrers:  topN(pageViews, (e) => e.referrer || '(direct)', 'referrer'),
    topLocations:  topN(pageViews, (e) => e.country || e.timezone || '(unknown)', 'location'),
    topDevices:    topN(pageViews, (e) => e.device  || 'unknown',   'device'),
    topBrowsers:   topN(pageViews, (e) => e.browser || 'Other',     'browser'),
  }
}

// ─── funnel helper (mirrors Lambda computeFunnel) ────────────────────────────

function matchesStep(event: any, step: any) {
  return event.type === step.type && (!step.path || event.path === step.path)
}

function computeFunnel(allEvents: any[], from: string, to: string, steps: any[], visitorId?: string | null) {
  const start = new Date(from + 'T00:00:00').getTime()
  const end   = new Date(to   + 'T23:59:59').getTime()
  const rangeEvents = allEvents.filter((e) => {
    const t = new Date(e.timestamp).getTime()
    return t >= start && t <= end
  })

  const byVisitor: Record<string, any[]> = {}
  for (const event of rangeEvents) {
    if (!event.visitorId) continue
    if (visitorId && event.visitorId !== visitorId) continue
    ;(byVisitor[event.visitorId] ??= []).push(event)
  }
  for (const evs of Object.values(byVisitor)) {
    evs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  const stepCounts = new Array(steps.length).fill(0)
  for (const evs of Object.values(byVisitor)) {
    let idx = 0
    for (const event of evs) {
      if (idx >= steps.length) break
      if (matchesStep(event, steps[idx])) { stepCounts[idx]++; idx++ }
    }
  }

  return steps.map((step: any, i: number) => ({
    label: step.label || step.path || step.type,
    type: step.type,
    ...(step.path ? { path: step.path } : {}),
    count: stepCounts[i],
    conversionRate: i === 0 || stepCounts[i - 1] === 0
      ? null
      : stepCounts[i] / stepCounts[i - 1],
  }))
}

// ─── intercept fetch ─────────────────────────────────────────────────────────

// Fixed visitor whose journey covers all three stepper states:
// navigation (filled) → custom action (dark outline) → not reached (light outline)
const DEMO_VISITOR_ID = 'v-demo-journey'
const demoJourney = [
  { type: 'page_view',       path: '/home',     minutesAgo: 5   },
  { type: 'page_view',       path: '/about',    minutesAgo: 4   },
  { type: 'cv_downloaded',   path: '/about',    minutesAgo: 3.5 },
  { type: 'page_view',       path: '/projects', minutesAgo: 3   },
  { type: 'project_clicked', path: '/projects', minutesAgo: 2   },
  // stops here — steps 6-14 intentionally absent to show light-outline state
].map(({ type, path, minutesAgo }) => ({
  appId:     'my-portfolio',
  type,
  path,
  referrer:  '',
  sessionId: 's-demo',
  visitorId: DEMO_VISITOR_ID,
  timestamp: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  timezone:  'Europe/London',
  locale:    'en-GB',
  country:   'GB',
  device:    'desktop',
  browser:   'Chrome',
  params:    {},
}))

const mockEvents = [...generateMockEvents(), ...demoJourney]

const realFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url    = String(input)
  const method = init?.method?.toUpperCase() ?? 'GET'

  if (url.includes('lambda-url') || url.includes('mock-endpoint')) {
    if (method === 'POST') {
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Simulate network latency proportional to the queried date range
    const params = new URL(url).searchParams
    const from   = params.get('from') ?? ''
    const to     = params.get('to')   ?? ''
    const days   = from && to
      ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
      : 30
    const delay  = days >= 300 ? 2000 : days >= 28 ? 1000 : 400

    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, delay)
      init?.signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) })
    })

    const funnelStepsParam = params.get('funnelSteps')
    if (funnelStepsParam) {
      const steps = JSON.parse(funnelStepsParam)
      const funnel = computeFunnel(mockEvents, from, to, steps, params.get('visitorId'))
      return new Response(JSON.stringify({ funnel }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const summary = buildSummary(mockEvents, from, to)
    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return realFetch(input, init)
}

// ─── app ─────────────────────────────────────────────────────────────────────

const DEMO_FUNNEL = [
  { label: 'Home',              type: 'page_view',        path: '/home'                },
  { label: 'About',             type: 'page_view',        path: '/about'               },
  { label: 'CV Downloaded',     type: 'cv_downloaded'                                  },
  { label: 'Projects',          type: 'page_view',        path: '/projects'            },
  { label: 'Project Clicked',   type: 'project_clicked'                                },
  { label: 'AWS Blog',          type: 'page_view',        path: '/blog/aws-s3'         },
  { label: 'React Blog',        type: 'page_view',        path: '/blog/react-hooks'    },
  { label: 'Terraform Blog',    type: 'page_view',        path: '/blog/terraform-intro'},
  { label: 'Theme Changed',     type: 'theme_changed'                                  },
  { label: 'Contact',           type: 'page_view',        path: '/contact'             },
  { label: 'Form Submitted',    type: 'contact_submitted'                              },
  { label: 'Newsletter',        type: 'newsletter_signup'                              },
  { label: 'Referral Share',    type: 'referral_share'                                 },
  { label: 'Hired!',            type: 'job_offer_sent'                                 },
]

function App() {
  return (
    <div style={{ padding: '16px 0' }}>
      <AnalyticsDashboard
        endpoint="https://mock-endpoint.lambda-url.eu-west-2.on.aws"
        appId="my-portfolio"
        dateRange={30}
        funnelSteps={DEMO_FUNNEL}
      />
    </div>
  )
}

const root = document.getElementById('root')!
createRoot(root).render(<App />)
