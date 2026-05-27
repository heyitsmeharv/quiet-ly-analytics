import React from 'react'

function FlagImage({ code }: { code: string }) {
  if (!/^[A-Z]{2}$/i.test(code.trim())) return null
  const lower = code.toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/20x15/${lower}.png`}
      srcSet={`https://flagcdn.com/40x30/${lower}.png 2x`}
      width={20}
      height={15}
      alt={code}
      style={{ flexShrink: 0, marginRight: 6, borderRadius: 2, display: 'block', objectFit: 'cover' }}
    />
  )
}

interface Row {
  location: string
  count: number
}

interface Props {
  rows: Row[]
}

export function TopLocations({ rows }: Props) {
  if (rows.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>
  }

  const max = rows[0].count

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Location</th>
          <th style={{ ...styles.th, textAlign: 'right', width: 64 }}>Visitors</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 10).map((row) => (
          <tr key={row.location}>
            <td style={styles.td}>
              <div style={styles.barWrap}>
                <div style={{ ...styles.bar, width: `${(row.count / max) * 100}%` }} />
                <span style={styles.flag}>
                  <FlagImage code={row.location} />
                </span>
                <span style={styles.location}>{row.location || '(unknown)'}</span>
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
  table:    { width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' },
  th:       { padding: '6px 8px', color: '#64748b', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid #e2e8f0' },
  td:       { padding: '8px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle', overflow: 'hidden' },
  barWrap:  { position: 'relative', display: 'flex', alignItems: 'center', minHeight: 24, overflow: 'hidden' },
  bar:      { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: '#e2e8f0', borderRadius: 3, zIndex: 0 },
  flag:     { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', flexShrink: 0 },
  location: { position: 'relative', zIndex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
