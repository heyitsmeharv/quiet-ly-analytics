import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  views: number
}

interface Props {
  data: DataPoint[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function aggregateWeekly(data: DataPoint[]): DataPoint[] {
  const weekly: DataPoint[] = []
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7)
    weekly.push({
      date: chunk[0].date,
      views: chunk.reduce((sum, d) => sum + d.views, 0),
    })
  }
  return weekly
}

export function PageViewsChart({ data }: Props) {
  if (data.length < 2) {
    return <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>Not enough data</div>
  }

  const isWeekly = data.length > 60
  const displayData = isWeekly ? aggregateWeekly(data) : data
  const tickFormatter = isWeekly
    ? (v: string) => { const p = v.split('-'); return `${MONTHS[+p[1] - 1]} ${+p[2]}` }
    : (v: string) => v.slice(5)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={displayData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
          interval="preserveStartEnd"
          minTickGap={40}
        />

        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />

        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            padding: '6px 10px',
          }}
          labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: 2 }}
          itemStyle={{ color: '#475569' }}
          formatter={(value: number) => [value, isWeekly ? 'Views (week)' : 'Views']}
        />

        <Area
          type="monotone"
          dataKey="views"
          stroke="#0f172a"
          strokeWidth={2}
          fill="url(#pvGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
