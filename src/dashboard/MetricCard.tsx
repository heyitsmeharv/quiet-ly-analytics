import React, { useEffect, useRef, useState } from 'react'

interface StatEntry { label: string; value: number }

interface Props {
  label: string
  stats: ReadonlyArray<StatEntry>
}

export function MetricCard({ label, stats }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.row}>
        {stats.map((s) => <Stat key={s.label} label={s.label} value={s.value} />)}
      </div>
    </div>
  )
}

function useAnimatedNumber(target: number, duration = 900): number {
  const [displayed, setDisplayed] = useState(0)
  const fromRef  = useRef(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    cancelAnimationFrame(frameRef.current)

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplayed(Math.round(from + (target - from) * eased))
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return displayed
}

function Stat({ label, value }: { label: string; value: number }) {
  const displayed = useAnimatedNumber(value)
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{displayed.toLocaleString()}</div>
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
  row: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  statValue: { fontSize: 28, fontWeight: 700, color: '#0f172a', lineHeight: '1' },
  statLabel: { fontSize: 12, color: '#94a3b8' },
}
