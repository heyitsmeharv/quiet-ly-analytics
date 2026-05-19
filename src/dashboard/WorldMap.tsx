import React, { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import worldAtlasJson from 'world-atlas/countries-110m.json'

// ISO 3166-1 alpha-2 → numeric; matches world-atlas feature IDs (CloudFront uses alpha-2)
const ISO_A2_TO_NUMERIC: Record<string, number> = {
  AF: 4,   AL: 8,   DZ: 12,  AD: 20,  AO: 24,  AG: 28,  AR: 32,  AM: 51,
  AU: 36,  AT: 40,  AZ: 31,  BS: 44,  BH: 48,  BD: 50,  BB: 52,  BY: 112,
  BE: 56,  BZ: 84,  BJ: 204, BT: 64,  BO: 68,  BA: 70,  BW: 72,  BR: 76,
  BN: 96,  BG: 100, BF: 854, BI: 108, CV: 132, KH: 116, CM: 120, CA: 124,
  CF: 140, TD: 148, CL: 152, CN: 156, CO: 170, KM: 174, CG: 178, CD: 180,
  CR: 188, CI: 384, HR: 191, CU: 192, CY: 196, CZ: 203, DK: 208, DJ: 262,
  DM: 212, DO: 214, EC: 218, EG: 818, SV: 222, GQ: 226, ER: 232, EE: 233,
  SZ: 748, ET: 231, FJ: 242, FI: 246, FR: 250, GA: 266, GM: 270, GE: 268,
  DE: 276, GH: 288, GR: 300, GD: 308, GT: 320, GN: 324, GW: 624, GY: 328,
  HT: 332, HN: 340, HU: 348, IS: 352, IN: 356, ID: 360, IR: 364, IQ: 368,
  IE: 372, IL: 376, IT: 380, JM: 388, JP: 392, JO: 400, KZ: 398, KE: 404,
  KI: 296, KP: 408, KR: 410, KW: 414, KG: 417, LA: 418, LV: 428, LB: 422,
  LS: 426, LR: 430, LY: 434, LI: 438, LT: 440, LU: 442, MG: 450, MW: 454,
  MY: 458, MV: 462, ML: 466, MT: 470, MH: 584, MR: 478, MU: 480, MX: 484,
  FM: 583, MD: 498, MC: 492, MN: 496, ME: 499, MA: 504, MZ: 508, MM: 104,
  NA: 516, NR: 520, NP: 524, NL: 528, NZ: 554, NI: 558, NE: 562, NG: 566,
  MK: 807, NO: 578, OM: 512, PK: 586, PW: 585, PS: 275, PA: 591, PG: 598,
  PY: 600, PE: 604, PH: 608, PL: 616, PT: 620, QA: 634, RO: 642, RU: 643,
  RW: 646, KN: 659, LC: 662, VC: 670, WS: 882, SM: 674, ST: 678, SA: 682,
  SN: 686, RS: 688, SC: 690, SL: 694, SG: 702, SK: 703, SI: 705, SB: 90,
  SO: 706, ZA: 710, SS: 728, ES: 724, LK: 144, SD: 729, SR: 740, SE: 752,
  CH: 756, SY: 760, TW: 158, TJ: 762, TZ: 834, TH: 764, TL: 626, TG: 768,
  TO: 776, TT: 780, TN: 788, TR: 792, TM: 795, TV: 798, UG: 800, UA: 804,
  AE: 784, GB: 826, US: 840, UY: 858, UZ: 860, VU: 548, VE: 862, VN: 704,
  YE: 887, ZM: 894, ZW: 716, EH: 732,
}

function lerpColor(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): string {
  const r  = Math.round(a[0] + (b[0] - a[0]) * t)
  const g  = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

const C_EMPTY: readonly [number, number, number] = [203, 213, 225]  // slate-300
const C_LOW:   readonly [number, number, number] = [100, 116, 139]  // slate-500
const C_HIGH:  readonly [number, number, number] = [ 15,  23,  42]  // near-black

export interface WorldMapProps {
  /** Record of ISO 3166-1 alpha-2 country codes → visitor counts (as returned by CloudFront enrichment) */
  countryCounts: Record<string, number>
}

export function WorldMap({ countryCounts }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{ name: string; count: number } | null>(null)

  const { numericCounts, logMax } = useMemo(() => {
    const numericCounts: Record<number, number> = {}
    let max = 1
    for (const [alpha2, count] of Object.entries(countryCounts)) {
      const numeric = ISO_A2_TO_NUMERIC[alpha2.toUpperCase()]
      if (numeric !== undefined) {
        numericCounts[numeric] = count
        if (count > max) max = count
      }
    }
    return { numericCounts, logMax: Math.log(max + 1) }
  }, [countryCounts])

  if (Object.keys(numericCounts).length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>
        No country data yet - requires CloudFront country header enrichment on the Lambda.
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <ComposableMap
        projectionConfig={{ scale: 140, center: [0, 10] }}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <Geographies geography={worldAtlasJson as Record<string, unknown>}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const count    = numericCounts[Number(geo.id)] ?? 0
              const intensity = count > 0 ? Math.log(count + 1) / logMax : 0
              const fill     = count > 0
                ? lerpColor(C_LOW, C_HIGH, intensity)
                : `rgb(${C_EMPTY.join(',')})`

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none', opacity: 0.85 },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={() => {
                    if (count > 0) {
                      setTooltip({ name: geo.properties?.name as string ?? '', count })
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltip && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          zIndex: 1,
        }}>
          <strong style={{ color: '#0f172a' }}>{tooltip.name}</strong>
          <span style={{ color: '#64748b', marginLeft: 6 }}>{tooltip.count.toLocaleString()} visitors</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
        <span>Fewer</span>
        <div style={{
          width: 80,
          height: 8,
          borderRadius: 4,
          background: `linear-gradient(to right, rgb(${C_LOW.join(',')}), rgb(${C_HIGH.join(',')}))`,
        }} />
        <span>More</span>
      </div>
    </div>
  )
}
