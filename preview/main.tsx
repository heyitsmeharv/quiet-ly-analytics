import React from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsDashboard } from '../src/dashboard'

// ─── mock data ───────────────────────────────────────────────────────────────

const PAGES = ['/home', '/about', '/projects', '/contact', '/blog/aws-s3', '/blog/react-hooks', '/blog/terraform-intro']
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
const LOCALES = ['en-GB', 'en-US', 'en-US', 'fr-FR', 'de-DE', 'ja-JP', 'en-AU']
// ISO 3166-1 alpha-2 codes matching the timezones above (weighted accordingly)
const COUNTRIES = ['GB', 'GB', 'GB', 'US', 'US', 'US', 'FR', 'DE', 'JP', 'AU', 'US']
// 50 synthetic visitor IDs - some will repeat across days to look realistic
const VISITORS = Array.from({ length: 50 }, (_, i) => `v-${String(i).padStart(4, '0')}`)

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateMockEvents() {
  const events = []

  // Page views - 8 to 28 per day for 30 days
  for (let i = 29; i >= 0; i--) {
    const base = daysAgo(i)
    const count = 8 + Math.floor(Math.random() * 20)

    for (let j = 0; j < count; j++) {
      const ts = new Date(base)
      ts.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0)
      events.push({
        appId: 'my-portfolio',
        type: 'page_view',
        path: pick(PAGES),
        referrer: pick(REFERRERS),
        sessionId: `s-${Math.random().toString(36).slice(2, 10)}`,
        visitorId: pick(VISITORS),
        timestamp: ts.toISOString(),
        timezone: pick(TIMEZONES),
        locale: pick(LOCALES),
        country: pick(COUNTRIES),
        params: {},
      })
    }
  }

  // Custom events - sprinkled across the last 30 days
  const customEvents = [
    { type: 'contact_submitted', path: '/contact',  params: { form: 'contact' } },
    { type: 'project_clicked',   path: '/projects', params: { project: 'aws-s3-uploader', source: 'card' } },
    { type: 'cv_downloaded',     path: '/about',    params: { format: 'pdf' } },
    { type: 'theme_changed',     path: '/home',     params: { theme: 'dark' } },
  ]
  for (let i = 0; i < 40; i++) {
    const custom = pick(customEvents)
    events.push({
      appId: 'my-portfolio',
      ...custom,
      referrer: '',
      sessionId: `s-${Math.random().toString(36).slice(2, 10)}`,
      visitorId: pick(VISITORS),
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: pick(TIMEZONES),
      locale: pick(LOCALES),
    })
  }

  return events
}

// ─── intercept fetch ─────────────────────────────────────────────────────────

const mockEvents = generateMockEvents()

const realFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = String(input)
  const method = init?.method?.toUpperCase() ?? 'GET'

  if (url.includes('lambda-url') || url.includes('mock-endpoint')) {
    if (method === 'POST') {
      // Ingest - echo back 200
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    // Query - return mock events
    return new Response(JSON.stringify({ events: mockEvents }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return realFetch(input, init)
}

// ─── app ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <div style={{ padding: '16px 0' }}>
      <AnalyticsDashboard
        endpoint="https://mock-endpoint.lambda-url.eu-west-2.on.aws"
        appId="my-portfolio"
        dateRange={30}
      />
    </div>
  )
}

const root = document.getElementById('root')!
createRoot(root).render(<App />)
