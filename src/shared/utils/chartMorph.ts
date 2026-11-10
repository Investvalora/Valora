export function sampleCurve<T>(points: T[], ratio: number, value: (point: T) => number | null): number | null {
  if (!points.length) return null
  const position = Math.max(0, Math.min(1, ratio)) * (points.length - 1)
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const start = value(points[lower])
  const end = value(points[upper])
  if (start == null || !Number.isFinite(start)) return end != null && Number.isFinite(end) ? end : null
  if (end == null || !Number.isFinite(end)) return start
  return start + (end - start) * (position - lower)
}

export function blendValue(from: number | null, to: number | null, progress: number): number | null {
  if (from == null || !Number.isFinite(from)) return to
  if (to == null || !Number.isFinite(to)) return progress === 1 ? to : from
  return from + (to - from) * progress
}
