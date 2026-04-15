import { getVisitorId, getSessionId, clearSession } from './Session'
import { Queue } from './Queue'

export interface AnalyticsConfig {
  /** Lambda Function URL */
  endpoint: string
  /** Namespaces events — use if you share infrastructure across projects */
  appId: string
  /** Log events to the console instead of sending them */
  debug?: boolean
}

export interface EventPayload {
  appId: string
  type: string
  path: string
  referrer: string
  sessionId: string
  visitorId: string
  userId?: string
  timestamp: string
  timezone: string
  locale: string
  /** Response-side enrichment from the Lambda when CloudFront country data is available */
  country?: string
  params: Record<string, unknown>
}

export type TrackEvent = string

export class Analytics {
  private readonly config: AnalyticsConfig
  private readonly queue: Queue
  private userId?: string

  constructor(config: AnalyticsConfig) {
    this.config = config
    this.queue = new Queue()
  }

  /** Tracks a page view. Defaults to window.location.pathname. */
  pageview(path?: string): void {
    const resolvedPath =
      path ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
    this.send('page_view', resolvedPath, {})
  }

  /** Tracks a custom event with optional properties. */
  track(event: TrackEvent, properties?: Record<string, unknown>): void {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/'
    this.send(event, path, properties ?? {})
  }

  /** Associates a user ID with subsequent events. */
  identify(userId: string): void {
    this.userId = userId
  }

  /** Clears the visitor ID and session — use on sign-out. */
  reset(): void {
    this.userId = undefined
    clearSession()
  }

  private send(type: string, path: string, params: Record<string, unknown>): void {
    const payload: EventPayload = {
      appId: this.config.appId,
      type,
      path,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      ...(this.userId ? { userId: this.userId } : {}),
      timestamp: new Date().toISOString(),
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      locale: typeof navigator !== 'undefined' ? navigator.language : '',
      params,
    }

    if (this.config.debug) {
      console.log('[quiet-ly]', payload)
      return
    }

    this.queue.enqueue({ payload, endpoint: this.config.endpoint })
  }
}
