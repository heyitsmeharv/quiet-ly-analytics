import React, { useEffect } from 'react'
import { render, waitFor } from '@testing-library/react'
import { AnalyticsProvider } from './AnalyticsProvider'
import { useAnalytics } from './useAnalytics'

const config = { endpoint: 'https://example.lambda-url.aws', appId: 'react-provider' }

function Child() {
  const analytics = useAnalytics()

  useEffect(() => {
    analytics.track('provider_test')
  }, [analytics])

  return null
}

describe('AnalyticsProvider', () => {
  it('provides analytics through context', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    ;(globalThis as any).fetch = mockFetch

    render(
      <AnalyticsProvider config={config}>
        <Child />
      </AnalyticsProvider>,
    )

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockFetch.mock.calls[0][0]).toBe(config.endpoint)
  })
})
