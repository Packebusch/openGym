// A lift's last few sessions as a line, no axes: the shape is the point, the numbers are beside
// it. `invert` draws lower as better (an assistance machine), so up always means stronger.
export default function Sparkline({ points, w = 64, h = 24, invert = false }) {
  if (!points || points.length < 2) return <span className="spark" style={{ width: w, height: h }} aria-hidden="true" />
  const ys = points.map(p => p.y)
  const lo = Math.min(...ys), hi = Math.max(...ys)
  const span = hi - lo || 1
  const x = i => 2 + (i / (points.length - 1)) * (w - 4)
  const y = v => {
    const f = (v - lo) / span
    return 2 + (invert ? f : 1 - f) * (h - 4)
  }
  const d = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.y).toFixed(1)).join('')
  const last = points.length - 1
  return <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx={x(last)} cy={y(points[last].y)} r="2.5" fill="currentColor" />
  </svg>
}
