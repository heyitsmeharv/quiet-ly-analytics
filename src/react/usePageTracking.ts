import { useEffect, useRef } from 'react'
import { useAnalytics } from './useAnalytics'

/**
 * Auto-tracks route changes. Place once in your router component.
 * Patches history.pushState / history.replaceState to detect SPA navigation.
 */
export function usePageTracking(): void {
  const analytics = useAnalytics()
  const lastPath = useRef<string>('')

  useEffect(() => {
    const track = () => {
      const path = window.location.pathname
      if (path !== lastPath.current) {
        lastPath.current = path
        analytics.pageview(path)
      }
    }

    track() // track initial page load

    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)

    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      originalPushState(...args)
      track()
    }

    history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
      originalReplaceState(...args)
      track()
    }

    window.addEventListener('popstate', track)

    return () => {
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      window.removeEventListener('popstate', track)
    }
  }, [analytics])
}
