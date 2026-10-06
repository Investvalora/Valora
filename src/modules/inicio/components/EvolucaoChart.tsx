/**
 * Gráfico de barras empilhadas — Evolução do patrimônio
 * Usa SVG puro para não adicionar dependências.
 */

const MONTHS = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set']
const APLICADO = [8900, 9600, 10300, 11000, 11700, 12300, 12949]
const GANHO    = [ 240,  360,   280,   420,   510,   590,   717]

const H = 180        // altura útil do gráfico
const PAD_L = 46     // espaço para labels do eixo Y
const PAD_B = 20     // espaço para labels do eixo X
const BAR_W = 38
const GRID_LINES = [0, 5000, 10000, 15000]
const MAX_VAL = 15000

function toY(val: number) {
  return H - (val / MAX_VAL) * H
}

export function EvolucaoChart() {
  const N = MONTHS.length
  const totalW = 640  // largura SVG
  const colW = (totalW - PAD_L) / N

  return (
    <svg
      viewBox={`0 0 ${totalW} ${H + PAD_B}`}
      className="w-full"
      aria-label="Gráfico de evolução do patrimônio"
      role="img"
    >
      {/* Grade horizontal */}
      {GRID_LINES.map((v) => {
        const y = toY(v)
        return (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={y}
              x2={totalW}
              y2={y}
              stroke={v === 0 ? '#555' : 'rgba(255,255,255,0.08)'}
              strokeWidth={1}
              strokeDasharray={v === 0 ? undefined : '3 4'}
            />
            <text
              x={PAD_L - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#8F8F8F"
            >
              {v === 0 ? 'R$ 0' : `R$ ${v / 1000}K`}
            </text>
          </g>
        )
      })}

      {/* Barras */}
      {MONTHS.map((m, i) => {
        const cx = PAD_L + i * colW + colW / 2
        const ha = (APLICADO[i] / MAX_VAL) * H
        const hg = (GANHO[i] / MAX_VAL) * H
        const yBase = toY(0)

        return (
          <g key={m} aria-label={`${m}: Aplicado R$ ${APLICADO[i].toLocaleString('pt-BR')}, Ganho R$ ${GANHO[i].toLocaleString('pt-BR')}`}>
            {/* Barra Aplicado */}
            <rect
              x={cx - BAR_W / 2}
              y={yBase - ha}
              width={BAR_W}
              height={ha}
              fill="rgba(51,170,59,0.8)"
            />
            {/* Barra Ganho (topo) */}
            <rect
              x={cx - BAR_W / 2}
              y={yBase - ha - hg}
              width={BAR_W}
              height={hg}
              rx={3}
              fill="rgba(169,224,172,0.8)"
            />
            {/* Label do último mês */}
            {i === N - 1 && (
              <text
                x={cx}
                y={yBase - ha - hg - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={500}
                fill="white"
              >
                R$ 13.666
              </text>
            )}
            {/* Label do eixo X */}
            <text
              x={cx}
              y={H + PAD_B - 2}
              textAnchor="middle"
              fontSize={11}
              fill="#8F8F8F"
            >
              {m}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
