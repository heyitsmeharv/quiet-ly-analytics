import React from 'react'

const BASE = 'https://cdn.jsdelivr.net/gh/alrra/browser-logos@main/src'

const BROWSER_ICONS: Record<string, { src: string; src2x: string }> = {
  Chrome:  { src: `${BASE}/chrome/chrome_32x32.png`,                       src2x: `${BASE}/chrome/chrome_64x64.png` },
  Firefox: { src: `${BASE}/firefox/firefox_32x32.png`,                     src2x: `${BASE}/firefox/firefox_64x64.png` },
  Safari:  { src: `${BASE}/safari/safari_32x32.png`,                       src2x: `${BASE}/safari/safari_64x64.png` },
  Edge:    { src: `${BASE}/edge/edge_32x32.png`,                           src2x: `${BASE}/edge/edge_64x64.png` },
  Opera:   { src: `${BASE}/opera/opera_32x32.png`,                         src2x: `${BASE}/opera/opera_64x64.png` },
  Samsung: { src: `${BASE}/samsung-internet/samsung-internet_32x32.png`,   src2x: `${BASE}/samsung-internet/samsung-internet_64x64.png` },
}

function BrowserIcon({ browser }: { browser: string }) {
  const icon = BROWSER_ICONS[browser]
  if (!icon) return null
  return (
    <img
      src={icon.src}
      srcSet={`${icon.src2x} 2x`}
      alt={browser}
      width={20}
      height={20}
      style={{ flexShrink: 0, marginRight: 6, borderRadius: 3, display: 'block' }}
    />
  )
}

interface Row {
  browser: string
  count: number
}

interface Props {
  rows: Row[]
}

export function TopBrowsers({ rows }: Props) {
  if (rows.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>
  }

  const max = rows[0].count

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Browser</th>
          <th style={{ ...styles.th, textAlign: 'right', width: 64 }}>Visitors</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 10).map((row) => (
          <tr key={row.browser}>
            <td style={styles.td}>
              <div style={styles.barWrap}>
                <div style={{ ...styles.bar, width: `${(row.count / max) * 100}%` }} />
                <span style={styles.icon}>
                  <BrowserIcon browser={row.browser} />
                </span>
                <span style={styles.label}>{row.browser || '(unknown)'}</span>
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
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' },
  th:      { padding: '6px 8px', color: '#64748b', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid #e2e8f0' },
  td:      { padding: '8px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle', overflow: 'hidden' },
  barWrap: { position: 'relative', display: 'flex', alignItems: 'center', minHeight: 24, overflow: 'hidden' },
  bar:     { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: '#e2e8f0', borderRadius: 3, zIndex: 0 },
  icon:    { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', flexShrink: 0 },
  label:   { position: 'relative', zIndex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
