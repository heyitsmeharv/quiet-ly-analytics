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
- device and browser breakdowns
- world heatmap by country (falls back gracefully when country data is absent)
- recent events table with click-to-filter by visitor
- preset and custom date ranges (Today, 1 Week, 1 Month, 1 Year, Custom)
- user journey timeline — shown automatically when a visitor is selected, rendering their actual event sequence in chronological order

The dashboard uses the `?aggregate=true` endpoint, which returns a pre-computed `{ summary }` object rather than raw events. This keeps response sizes small regardless of date range. Date ranges are validated client-side before any request is sent.

### User Journey

When a visitor is selected from the Recent Events table, a User Journey section appears automatically below it. It fetches that visitor's events for the active date range and renders them as a horizontal timeline — no configuration required.

The `VisitorJourney` component is also available standalone:

```tsx
import { VisitorJourney } from '@quiet-ly/analytics/dashboard'

<VisitorJourney
  endpoint="https://xxxx.lambda-url.eu-west-2.on.aws"
  appId="my-portfolio"
  visitorId="v-abc123"
  from="2026-05-01"
  to="2026-05-28"
/>
```

### Funnel analysis

The `FunnelChart` component is available for embedding aggregate conversion funnels outside the dashboard:

```tsx
import { FunnelChart } from '@quiet-ly/analytics/dashboard'

<FunnelChart
  endpoint="https://xxxx.lambda-url.eu-west-2.on.aws"
  appId="my-portfolio"
  from="2026-05-01"
  to="2026-05-28"
  steps={[
    { label: 'Home',          type: 'page_view', path: '/home'  },
    { label: 'CV Downloaded', type: 'cv_downloaded'              },
  ]}
  visitorId="v-abc123"   // omit for aggregate funnel across all visitors
/>
```

Without `visitorId` the chart shows a horizontal bar funnel with conversion rates. With `visitorId` it switches to a horizontal stepper showing which steps that specific visitor completed.

### Custom Dashboard Composition

The individual dashboard building blocks are also exported:

```tsx
import {
  MetricCard,
  PageViewsChart,
  TopPages,
  TopReferrers,
  TopLocations,
  TopDevices,
  TopBrowsers,
  WorldMap,
  FunnelChart,
} from '@quiet-ly/analytics/dashboard'
```

## Backend Contract

The package is designed for a single Lambda Function URL root.

- Ingest: `POST <endpoint>`
- Query (aggregate): `GET <endpoint>?appId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&aggregate=true`
- Query (visitor journey): `GET <endpoint>?appId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&visitorId=<id>`
- Query (funnel): `GET <endpoint>?appId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&funnelSteps=[...]`
- Browser usage assumptions: no cookies, no credentials, and no custom headers beyond `Content-Type`

The dashboard always adds `aggregate=true`, which returns a pre-aggregated summary instead of raw events:

```ts
{
  summary: {
    totalEvents:    number
    pageViews:      number
    uniqueVisitors: number
    dailyCounts:    Array<{ date: string; views: number }>       // page views per day, ascending
    recentEvents:   Array<Event>                                  // up to 20, newest first
    countryCounts:  Record<string, number>                        // ISO country code → page view count
    topPages:       Array<{ path: string;     count: number }>
    topReferrers:   Array<{ referrer: string; count: number }>
    topLocations:   Array<{ location: string; count: number }>   // country code, falls back to timezone
    topDevices:     Array<{ device: string;   count: number }>
    topBrowsers:    Array<{ browser: string;  count: number }>
  }
}
```

Each `top*` array contains up to 10 entries sorted by count descending. `dailyCounts` only includes dates with at least one page view — the dashboard zero-fills gaps for the chart. Date ranges are capped at 366 days.

#### Visitor journey query

Add `visitorId` (without `funnelSteps` or `aggregate`) to receive that visitor's events in chronological order:

```
GET <endpoint>?appId=...&from=...&to=...&visitorId=v-abc123
```

Response shape:

```ts
{
  events: Array<Event>   // all events for this visitor, sorted oldest → newest
}
```

This is what `VisitorJourney` and `AnalyticsDashboard`'s User Journey section use internally.

#### Funnel query

Replace `aggregate=true` with `funnelSteps` to compute a sequential funnel:

```
GET <endpoint>?appId=...&from=...&to=...&funnelSteps=[{"type":"page_view","path":"/"},{"type":"purchase"}]
```

Add `visitorId` to scope the result to a single visitor (used by the User Journey stepper):

```
GET <endpoint>?...&funnelSteps=[...]&visitorId=v-abc123
```

Response shape:

```ts
{
  funnel: Array<{
    label:          string          // display label
    type:           string          // event type
    path?:          string          // path filter, if specified in the step definition
    count:          number          // visitors who reached this step
    conversionRate: number | null   // count / previous step count; null for the first step
  }>
}
```

Steps are matched in chronological order per visitor. A visitor must trigger step _n_ before step _n+1_ counts. At least 2 steps are required.

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

The following fields are **not** sent by the browser SDK — they are added server-side by the Lambda before storing each event:

- `country` — two-letter ISO code derived from `CloudFront-Viewer-Country` (empty string when CloudFront is not in use)
- `device` — `"mobile"`, `"tablet"`, or `"desktop"`, parsed from the `User-Agent` header
- `browser` — `"Chrome"`, `"Firefox"`, `"Safari"`, `"Edge"`, `"Opera"`, `"Samsung"`, or `"Other"`, parsed from the `User-Agent` header

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

import { AnalyticsDashboard, FunnelChart, VisitorJourney } from '@quiet-ly/analytics/dashboard'
import type { FunnelStep, FunnelChartProps, VisitorJourneyProps } from '@quiet-ly/analytics/dashboard'
```

## Development

```bash
npm run build
npm run test
npm run release:check
npm run dev:preview
```
