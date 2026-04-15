import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { AnalyticsProvider } from './AnalyticsProvider'
import { usePageTracking } from './usePageTracking'

const config = { endpoint: 'https://example.lambda-url.aws', appId: 'route-test' }

function Tracker() {
  usePageTracking()
  return null
}

describe('usePageTracking', () => {
  it('auto-tracks route changes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    ;(globalThis as any).fetch = mockFetch

    window.history.replaceState({}, '', '/initial')

    render(
      <AnalyticsProvider config={config}>
        <Tracker />
      </AnalyticsProvider>,
    )

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    window.history.pushState({}, '', '/next')

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })
})
