# quiet-ly

`@quiet-ly/analytics` is a lightweight analytics package for self-hosted AWS deployments. It provides a browser SDK, React bindings, and dashboard components for teams that want first-party analytics without sending data to a third-party collector.

## Overview

The package includes three entry points:

- `@quiet-ly/analytics` - core browser SDK
- `@quiet-ly/analytics/react` - React provider and hooks
- `@quiet-ly/analytics/dashboard` - analytics dashboard components

## Infrastructure

The intended backend is a Lambda Function URL with DynamoDB storage. The package sends data to your endpoint directly and does not require cookies.

The recommended way to provision the required Lambda Function URL and DynamoDB
table is the [terraform-aws-quietly](https://github.com/heyitsmeharv/terraform-aws-quiet-ly) Terraform module.

## Installation

```bash
npm install @quiet-ly/analytics
```

If you use the React or dashboard entry points, make sure your application provides compatible `react` and `react-dom` versions. `recharts` and `react-simple-maps` are bundled as dependencies and install automatically.

## Quick Start

```ts
import { Analytics } from '@quiet-ly/analytics'

const analytics = new Analytics({
  endpoint: 'https://xxxx.lambda-url.eu-west-2.on.aws',
  appId: 'my-portfolio',
})

analytics.pageview()
analytics.track('contact_submitted', { form: 'contact' })
analytics.identify('user-123')
analytics.reset()
```

## Configuration

| Option     | Type      | Required | Description                                    |
| ---------- | --------- | -------- | ---------------------------------------------- |
| `endpoint` | `string`  | Yes      | Lambda Function URL                            |
| `appId`    | `string`  | Yes      | Application identifier used to namespace events |
| `debug`    | `boolean` | No       | Logs payloads locally instead of sending them  |

## React Integration

```tsx
import { AnalyticsProvider, useAnalytics, usePageTracking } from '@quiet-ly/analytics/react'

<AnalyticsProvider config={{ endpoint, appId }}>
  <App />
</AnalyticsProvider>

function RouterShell() {
  usePageTracking()

  const { track } = useAnalytics()

  return (
    <button onClick={() => track('theme_changed', { theme: 'dark' })}>
      Toggle theme
    </button>
  )
}
```

## Dashboard

```tsx
import { AnalyticsDashboard } from '@quiet-ly/analytics/dashboard'

<AnalyticsDashboard
  endpoint="https://xxxx.lambda-url.eu-west-2.on.aws"
  appId="my-portfolio"
  dateRange={30}
/>
```

The dashboard includes:

- page view and unique visitor summary cards
- page view trend chart
- top pages, referrers, and locations
- world heatmap by country (falls back gracefully when country data is absent)
- recent events with visitor filtering
- preset and custom date ranges (Today, 1 Week, 1 Month, 1 Year, Custom)

The dashboard supports visitor-level filtering from the recent events table. It relies only on the top-level `{ events: [...] }` response shape, ignores additional backend fields such as DynamoDB keys, and validates date ranges client-side before sending queries.

### Custom Dashboard Composition

The individual dashboard building blocks are also exported:

```tsx
import {
  MetricCard,
  PageViewsChart,
  TopPages,
  TopReferrers,
  TopLocations,
  WorldMap,
} from '@quiet-ly/analytics/dashboard'
```

## Backend Contract

The package is designed for a single Lambda Function URL root.

- Ingest: `POST <endpoint>`
- Query: `GET <endpoint>?appId=...&from=YYYY-MM-DD&to=YYYY-MM-DD`
- Optional filtering: `type=<eventType>`
- Browser usage assumptions: no cookies, no credentials, and no custom headers beyond `Content-Type`

The dashboard expects a top-level response shaped like:

```ts
{
  events: Array<{
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
  }>
}
```

Unknown event fields are ignored, which allows the backend to return additional storage metadata without breaking the UI.

## Event Payload

Events sent by the SDK use this shape:

```ts
{
  appId:     'my-portfolio',
  type:      'page_view',
  path:      '/blog/aws-s3',
  referrer:  'https://google.com',
  sessionId: '550e8400-...',
  visitorId: '6ba7b810-...',
  userId:    'user-123',
  timestamp: '2026-04-15T10:23:00.000Z',
  timezone:  'Europe/London',
  locale:    'en-GB',
  params:    {}
}
```

`country` is not sent by the browser SDK. If your backend adds country information, it should be treated as optional response-side enrichment. The current AWS implementation derives it from `CloudFront-Viewer-Country` when available.

## Operational Notes

- Visitor identity is stored in `localStorage` under `qly_vid`.
- Session identity is stored in `sessionStorage` under `qly_sid`.
- Failed network sends are retried once and then dropped silently.
- The dashboard prefers `country` for location display and falls back to `timezone` when country enrichment is missing or empty.
- The package is tree-shakeable. Importing the core SDK does not bundle React or dashboard code.

This package does not set cookies. You are still responsible for evaluating notice, consent, and data governance requirements for your implementation and jurisdiction.

## Exports

```ts
import { Analytics } from '@quiet-ly/analytics'
import type { AnalyticsConfig, EventPayload, TrackEvent } from '@quiet-ly/analytics'

import { AnalyticsProvider, useAnalytics, usePageTracking } from '@quiet-ly/analytics/react'

import { AnalyticsDashboard } from '@quiet-ly/analytics/dashboard'
```

## Development

```bash
npm run build
npm run test
npm run release:check
npm run dev:preview
```
