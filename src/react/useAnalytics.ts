import { useMemo } from 'react'
import { useAnalyticsContext } from './AnalyticsProvider'

export function useAnalytics() {
  const { analytics } = useAnalyticsContext()
  return useMemo(
    () => ({
      pageview: (path?: string) => analytics.pageview(path),
      track: (event: string, properties?: Record<string, unknown>) =>
        analytics.track(event, properties),
      identify: (userId: string) => analytics.identify(userId),
      reset: () => analytics.reset(),
    }),
    [analytics],
  )
}
