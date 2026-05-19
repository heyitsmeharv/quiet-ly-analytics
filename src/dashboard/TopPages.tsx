import React from 'react'

interface Row {
  path: string
  views: number
}

interface Props {
  rows: Row[]
}

export function TopPages({ rows }: Props) {
  if (rows.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>
  }

  const max = rows[0].views

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Page</th>
          <th style={{ ...styles.th, textAlign: 'right', width: 64 }}>Views</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 10).map((row) => (
          <tr key={row.path}>
            <td style={styles.td}>
              <div style={styles.barWrap}>
                <div style={{ ...styles.bar, width: `${(row.views / max) * 100}%` }} />
                <span style={styles.path}>{row.path}</span>
              </div>
            </td>
            <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {row.views.toLocaleString()}
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
  path: { position: 'relative', zIndex: 1, fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
