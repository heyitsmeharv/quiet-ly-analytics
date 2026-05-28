import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AnalyticsDashboard } from './AnalyticsDashboard'

const today = new Date().toISOString().slice(0, 10)

const recentEvents = [
  {
    appId: 'dashboard-test',
    type: 'page_view',
    path: '/home',
    referrer: 'https://google.com',
    sessionId: 's1',
    visitorId: 'aaaabbbb-1111-2222-3333-ccccddddeeee',
    timestamp: new Date().toISOString(),
    timezone: 'Europe/London',
    locale: 'en-GB',
    country: 'GB',
    device: 'desktop',
    browser: 'Chrome',
    params: {},
  },
  {
    appId: 'dashboard-test',
    type: 'page_view',
    path: '/about',
    referrer: 'https://example.com',
    sessionId: 's2',
    visitorId: 'ffffeeee-4444-5555-6666-aaaabbbbcccc',
    timestamp: new Date().toISOString(),
    timezone: 'America/New_York',
    locale: 'en-US',
    country: '',
    device: 'mobile',
    browser: 'Safari',
    params: {},
  },
]

const summary = {
  totalEvents: 2,
  pageViews: 2,
  uniqueVisitors: 2,
  dailyCounts: [{ date: today, views: 2 }],
  recentEvents,
  countryCounts: { GB: 1 },
  topPages: [
    { path: '/home',  count: 1 },
    { path: '/about', count: 1 },
  ],
  topReferrers: [
    { referrer: 'https://google.com',  count: 1 },
    { referrer: 'https://example.com', count: 1 },
  ],
  topLocations: [
    { location: 'GB',               count: 1 },
    { location: 'America/New_York', count: 1 },
  ],
  topDevices:  [{ device: 'desktop', count: 1 }, { device: 'mobile', count: 1 }],
  topBrowsers: [{ browser: 'Chrome', count: 1 }, { browser: 'Safari', count: 1 }],
}

function mockFetchWith(payload: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => payload })
}

describe('AnalyticsDashboard', () => {
  it('sends aggregate=true and renders page paths from the summary', async () => {
    const mockFetch = mockFetchWith({ summary })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    const url: string = mockFetch.mock.calls[0][0]
    expect(url).toContain('appId=dashboard-test')
    expect(url).toContain('aggregate=true')

    expect(screen.getByText('quiet-ly')).toBeTruthy()
    expect(screen.getByText('dashboard-test')).toBeTruthy()
    expect(screen.getAllByText('/home').length).toBeGreaterThan(0)
    expect(screen.getAllByText('/about').length).toBeGreaterThan(0)
  })

  it('shows preset buttons with full labels', async () => {
    const mockFetch = mockFetchWith({ summary })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)
    await waitFor(() => screen.getAllByText('1 Week'))

    expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 Week').length).toBeGreaterThan(0)
    expect(screen.getByText('1 Month')).toBeTruthy()
    expect(screen.getByText('1 Year')).toBeTruthy()
    expect(screen.getByText('Custom')).toBeTruthy()
  })

  it('shows the custom date picker when Custom is clicked', async () => {
    const mockFetch = mockFetchWith({ summary })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" />)
    await waitFor(() => screen.getByText('Custom'))

    fireEvent.click(screen.getByText('Custom'))
    expect(screen.getByText('Apply')).toBeTruthy()
  })

  it('renders topLocations including timezone fallback entries', async () => {
    const mockFetch = mockFetchWith({ summary })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => screen.getByText('Top Locations'))
    expect(screen.getAllByText('America/New_York').length).toBeGreaterThan(0)
  })

  it('renders device and browser breakdowns', async () => {
    const mockFetch = mockFetchWith({ summary })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => screen.getByText('Devices'))
    expect(screen.getByText('Desktop')).toBeTruthy()
    expect(screen.getByText('Mobile')).toBeTruthy()
    expect(screen.getByText('Chrome')).toBeTruthy()
    expect(screen.getByText('Safari')).toBeTruthy()
  })

  it('shows an error message with a retry button when the fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => screen.getByText(/HTTP 500/))
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })

  it('does not produce a validation error when switching to the 1 year preset', async () => {
    const mockFetch = mockFetchWith({ summary })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" />)
    await waitFor(() => screen.getByText('1 Year'))

    fireEvent.click(screen.getByText('1 Year'))

    expect(screen.queryByText('Date range must be 366 days or fewer.')).toBeNull()
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('blocks custom queries longer than 366 days before making a request', async () => {
    const mockFetch = mockFetchWith({ summary })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" />)
    await waitFor(() => screen.getByText('Custom'))

    fireEvent.click(screen.getByText('Custom'))
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('To date'),   { target: { value: '2025-01-02' } })

    const applyButton = screen.getByRole('button', { name: 'Apply custom date range' }) as HTMLButtonElement
    expect(screen.getByText('Date range must be 366 days or fewer.')).toBeTruthy()
    expect(applyButton.disabled).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('AnalyticsDashboard — User Journey / FunnelChart', () => {
  const funnelSteps = [
    { label: 'Home',  type: 'page_view', path: '/home'  },
    { label: 'About', type: 'page_view', path: '/about' },
  ]

  it('does not render User Journey when funnelSteps is not provided', async () => {
    ;(globalThis as any).fetch = mockFetchWith({ summary })

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)
    await waitFor(() => screen.getByText('Recent Events'))

    fireEvent.click(screen.getAllByText('aaaabbbb…')[0])

    expect(screen.queryByText('User Journey')).toBeNull()
  })

  it('does not render User Journey when no visitor is selected', async () => {
    ;(globalThis as any).fetch = mockFetchWith({ summary })

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} funnelSteps={funnelSteps} />)
    await waitFor(() => screen.getByText('Recent Events'))

    expect(screen.queryByText('User Journey')).toBeNull()
  })

  it('renders User Journey and issues a funnel fetch with funnelSteps and visitorId when a visitor is selected', async () => {
    const funnelResult = [
      { label: 'Home',  type: 'page_view', count: 1, conversionRate: null },
      { label: 'About', type: 'page_view', count: 0, conversionRate: null },
    ]
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('funnelSteps')) {
        return { ok: true, json: async () => ({ funnel: funnelResult }) }
      }
      return { ok: true, json: async () => ({ summary }) }
    })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} funnelSteps={funnelSteps} />)
    await waitFor(() => screen.getByText('Recent Events'))

    fireEvent.click(screen.getAllByText('aaaabbbb…')[0])

    await waitFor(() => expect(screen.getByText('User Journey')).toBeTruthy())

    const funnelCall = mockFetch.mock.calls.find(([url]: [string]) => String(url).includes('funnelSteps'))
    expect(funnelCall).toBeTruthy()
    const calledUrl = String(funnelCall[0])
    expect(calledUrl).toContain('funnelSteps')
    expect(calledUrl).toContain('visitorId=aaaabbbb-1111-2222-3333-ccccddddeeee')
  })
})
