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

export function PageViewsChart({ data }: Props) {
  if (data.length < 2) {
    return <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>Not enough data</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => v.slice(5)}
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
          itemStyle={{ color: '#6366f1' }}
          formatter={(value: number) => [value, 'Views']}
        />

        <Area
          type="monotone"
          dataKey="views"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#pvGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
