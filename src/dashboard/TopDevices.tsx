import React from 'react'

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  mobile: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2"/>
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  tablet: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
}

interface Row {
  device: string
  count: number
}

interface Props {
  rows: Row[]
}

const LABELS: Record<string, string> = {
  mobile:  'Mobile',
  tablet:  'Tablet',
  desktop: 'Desktop',
}

export function TopDevices({ rows }: Props) {
  if (rows.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>
  }

  const max = rows[0].count

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Device</th>
          <th style={{ ...styles.th, textAlign: 'right', width: 64 }}>Visitors</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 10).map((row) => (
          <tr key={row.device}>
            <td style={styles.td}>
              <div style={styles.barWrap}>
                <div style={{ ...styles.bar, width: `${(row.count / max) * 100}%` }} />
                {DEVICE_ICONS[row.device] && (
                  <span style={styles.icon}>{DEVICE_ICONS[row.device]}</span>
                )}
                <span style={styles.label}>{LABELS[row.device] ?? (row.device || '(unknown)')}</span>
              </div>
            </td>
            <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {row.count.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const styles: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' },
  th: {
    padding: '6px 8px',
    color: '#64748b',
    fontWeight: 600,
    textAlign: 'left',
    borderBottom: '1px solid #e2e8f0',
  },
  td: { padding: '8px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle', overflow: 'hidden' },
  barWrap: { position: 'relative', display: 'flex', alignItems: 'center', minHeight: 24, overflow: 'hidden' },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    zIndex: 0,
  },
  icon: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 6, color: '#64748b' },
  label: { position: 'relative', zIndex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
