/** HTML share strips (no chart library): seat distributions and age structure. */
export interface StripSegment {
  key: string
  label: string
  value: number
  color: string
  detail: string
}

/** A 100% strip in HTML: proportional segments with 2px gaps, a legend with values, an optional marker. */
export function ShareStrip({
  segments,
  total,
  marker,
  label,
}: {
  segments: StripSegment[]
  total: number
  marker?: { at: number; label: string }
  label: string
}) {
  const markerPct = marker ? (marker.at / total) * 100 : 0
  return (
    <div>
      <div className="strip-wrap" role="img" aria-label={label}>
        {marker && (
          <div className={`strip-marker ${markerPct > 70 ? 'flip' : ''}`} style={{ left: `${markerPct}%` }}>
            <span>{marker.label}</span>
          </div>
        )}
        <div className="strip">
          {segments.map((segment) => (
            <div
              key={segment.key}
              className="strip-seg"
              style={{ flex: `${segment.value} 1 0`, background: segment.color }}
            />
          ))}
        </div>
      </div>
      <ul className="strip-legend" style={{ marginTop: 14 }}>
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="swatch" style={{ background: segment.color }} aria-hidden="true" />
            <span>{segment.label}</span>
            <strong className="num">{segment.detail}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
