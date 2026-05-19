import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AnalyticsDashboard } from './AnalyticsDashboard'

const makeEvent = (overrides: Partial<typeof baseEvent> = {}) => ({ ...baseEvent, ...overrides })

const baseEvent = {
  appId: 'dashboard-test',
  type: 'page_view',
  path: '/home',
  referrer: 'https://google.com',
  sessionId: 's1',
  visitorId: 'v1',
  timestamp: new Date().toISOString(),
  timezone: 'Europe/London',
  locale: 'en-GB',
  params: {},
}

const events = [
  makeEvent({ path: '/home', visitorId: 'v1', timezone: 'Europe/London', country: '' }),
  makeEvent({ path: '/about', visitorId: 'v2', timezone: 'America/New_York', sessionId: 's2', referrer: 'https://example.com' }),
]

describe('AnalyticsDashboard', () => {
  it('fetches dashboard data and renders metrics', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events }),
    })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    expect(mockFetch.mock.calls[0][0]).toContain('appId=dashboard-test')
    expect(screen.getByText('quiet-ly')).toBeTruthy()
    expect(screen.getByText('dashboard-test')).toBeTruthy()
    expect(screen.getAllByText('/home').length).toBeGreaterThan(0)
    expect(screen.getAllByText('/about').length).toBeGreaterThan(0)
  })

  it('shows preset buttons with full labels', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events }) })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)
    await waitFor(() => screen.getByText('1 Week'))

    expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
    expect(screen.getByText('1 Week')).toBeTruthy()
    expect(screen.getByText('1 Month')).toBeTruthy()
    expect(screen.getByText('1 Year')).toBeTruthy()
    expect(screen.getByText('Custom')).toBeTruthy()
  })

  it('shows the custom date picker when Custom is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events }) })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" />)
    await waitFor(() => screen.getByText('Custom'))

    fireEvent.click(screen.getByText('Custom'))
    expect(screen.getByText('Apply')).toBeTruthy()
  })

  it('falls back to timezone data when the backend returns an empty country', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events }) })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => screen.getByText('Top Locations'))
    expect(screen.getAllByText('Europe/London').length).toBeGreaterThan(0)
    expect(screen.getAllByText('America/New_York').length).toBeGreaterThan(0)
  })

  it('ignores extra backend fields on queried events', async () => {
    const backendEvents = [
      { ...events[0], PK: 'APP#dashboard-test#2026-04-15', SK: '2026-04-15T10:00:00.000Z#evt-1', GSI1PK: 'TYPE#page_view#2026-04-15', GSI2PK: 'PATH#/home#2026-04-15' },
      events[1],
    ]
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events: backendEvents }) })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => screen.getByText('Top Locations'))
    expect(screen.getAllByText('/home').length).toBeGreaterThan(0)
    expect(screen.getAllByText('/about').length).toBeGreaterThan(0)
  })

  it('filters events when a visitor button is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events }) })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => screen.getByText('Top Locations'))

    const visitorBtns = screen.getAllByTitle('Filter to this visitor')
    fireEvent.click(visitorBtns[0])
    expect(screen.getByText(/Filtered to visitor/)).toBeTruthy()

    fireEvent.click(screen.getByText('✕ clear filter'))
    expect(screen.queryByText(/Filtered to visitor/)).toBeNull()
  })
  it('shows an error message with a retry button when the fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" dateRange={7} />)

    await waitFor(() => screen.getByText(/HTTP 500/))
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })

  it('does not produce a validation error when switching to the 1 year preset', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events }) })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" />)
    await waitFor(() => screen.getByText('1 Year'))

    fireEvent.click(screen.getByText('1 Year'))

    expect(screen.queryByText('Date range must be 366 days or fewer.')).toBeNull()
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })

  it('blocks custom queries longer than 366 days before making a request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events }) })
    ;(globalThis as any).fetch = mockFetch

    render(<AnalyticsDashboard endpoint="https://example.lambda-url.aws" appId="dashboard-test" />)
    await waitFor(() => screen.getByText('Custom'))

    fireEvent.click(screen.getByText('Custom'))
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2025-01-02' } })

    const applyButton = screen.getByRole('button', { name: 'Apply custom date range' }) as HTMLButtonElement
    expect(screen.getByText('Date range must be 366 days or fewer.')).toBeTruthy()
    expect(applyButton.disabled).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
