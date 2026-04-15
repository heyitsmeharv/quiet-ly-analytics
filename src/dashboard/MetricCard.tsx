import React from 'react'

interface Props {
  label: string
  today: number
  last7d: number
  last30d: number
}

export function MetricCard({ label, today, last7d, last30d }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.row}>
        <Stat label="Today" value={today} />
        <Stat label="7 days" value={last7d} />
        <Stat label="30 days" value={last30d} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value.toLocaleString()}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '16px 20px',
    flex: 1,
    minWidth: 200,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  row: { display: 'flex', gap: 24 },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#0f172a', lineHeight: '1' },
  statLabel: { fontSize: 12, color: '#94a3b8' },
}
