/**
 * AlocacaoDonut
 * Gráfico de rosca SVG que mostra a composição da carteira por classe de ativo.
 * Usa os dados já derivados por deriveComposition — sem estado próprio.
 */
import type { AssetClassSlice } from '../../portfolio/types'
import { assetClassColor, assetClassLabel } from '../../portfolio/composition'
import { fmtPct } from '../utils/fmt'

type Props = {
  slices: AssetClassSlice[]
}

// ── geometria ──────────────────────────────────────────────────────────────

const CX = 85
const CY = 85
const R_OUTER = 78
const R_INNER = 53
const GAP_DEG = 2.5

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sectorPath(startDeg: number, endDeg: number): string {
  const s1 = polar(CX, CY, R_OUTER, startDeg)
  const e1 = polar(CX, CY, R_OUTER, endDeg)
  const s2 = polar(CX, CY, R_INNER, endDeg)
  const e2 = polar(CX, CY, R_INNER, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  const f = (n: number) => n.toFixed(3)
  return [
    `M${f(s1.x)},${f(s1.y)}`,
    `A${R_OUTER},${R_OUTER} 0 ${large},1 ${f(e1.x)},${f(e1.y)}`,
    `L${f(s2.x)},${f(s2.y)}`,
    `A${R_INNER},${R_INNER} 0 ${large},0 ${f(e2.x)},${f(e2.y)}`,
    'Z',
  ].join(' ')
}

export function AlocacaoDonut({ slices }: Props) {
  if (slices.length === 0) {
    return (
      <div className="flex h-[170px] items-center justify-center">
        <p className="text-[12px] text-[#8F8F8F]">Sem dados</p>
      </div>
    )
  }

  // Calcular ângulos acumulados
  const total = slices.reduce((acc, s) => acc + s.percent, 0)
  let angle = 0
  const sectors = slices.map((s) => {
    const pct = (s.percent / total) * 100 // normalizar para 100%
    const startDeg = angle + GAP_DEG / 2
    const sweep = (pct / 100) * 360
    const endDeg = angle + sweep - GAP_DEG / 2
    angle += sweep
    return { slice: s, startDeg, endDeg: Math.max(startDeg + 0.1, endDeg) }
  })

  return (
    <div className="flex flex-col gap-4">
      {/* SVG rosca */}
      <div className="flex justify-center">
        <svg
          width="170"
          height="170"
          viewBox="0 0 170 170"
          aria-label="Gráfico de composição da carteira"
          role="img"
        >
          {/* Fundo */}
          <circle
            cx={CX}
            cy={CY}
            r={(R_OUTER + R_INNER) / 2}
            fill="none"
            stroke="#252525"
            strokeWidth={R_OUTER - R_INNER}
          />
          {/* Fatias */}
          {sectors.map(({ slice, startDeg, endDeg }) => (
            <path
              key={slice.type}
              d={sectorPath(startDeg, endDeg)}
              fill={assetClassColor(slice.type)}
              fillOpacity={0.88}
              aria-label={`${assetClassLabel(slice.type)}: ${fmtPct(slice.percent)}`}
            />
          ))}
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex flex-col gap-2.5">
        {slices.map((s) => (
          <div key={s.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: assetClassColor(s.type) }}
                aria-hidden="true"
              />
              <span className="text-[12px] text-[#C8C8C8]">{assetClassLabel(s.type)}</span>
            </div>
            <span className="text-[12px] font-medium text-white">
              {fmtPct(s.percent)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
