import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { assetClassColor } from '../composition'
import type { AssetClassSlice } from '../types'

/**
 * Pizza da composição — módulo separado de propósito: é ele que o
 * `CompositionCard` carrega por `React.lazy`, e é essa fronteira de módulo que
 * mantém o Recharts fora do bundle inicial da Carteira (gráficos lazy é padrão
 * do épico).
 *
 * Enriquecimento visual, não fonte de informação: o SVG fica fora da árvore de
 * acessibilidade (o pai o marca `aria-hidden`) e a legenda textual do card
 * carrega os mesmos números. Em jsdom o `ResponsiveContainer` mede 0×0 e nada é
 * desenhado — daí os testes se apoiarem na legenda, não em `path`s.
 */

interface CompositionPieChartProps {
  slices: AssetClassSlice[]
  /**
   * Formatação vem do card em vez de ser recriada aqui: tooltip e legenda
   * mostrando o mesmo valor com casas diferentes é contradição na mesma tela.
   */
  formatBRL: (value: number) => string
  formatPercent: (value: number) => string
}

const CHART_HEIGHT = 220

interface CompositionSliceTooltipProps {
  active?: boolean
  /** Fatia sob o cursor; ausente quando o Recharts não resolveu o alvo. */
  slice?: AssetClassSlice
  formatBRL: (value: number) => string
  formatPercent: (value: number) => string
}

/**
 * Conteúdo do tooltip de uma fatia: valor em R$ da classe e o ticker principal.
 *
 * Componente próprio e não um closure dentro do `<Tooltip>` porque em jsdom a
 * pizza mede 0×0 e nunca recebe hover — sem esta fronteira, o único requisito
 * que depende do gesto de mouse ficaria sem verificação alguma.
 */
export function CompositionSliceTooltip({
  active,
  slice,
  formatBRL,
  formatPercent,
}: CompositionSliceTooltipProps) {
  if (!active || !slice) return null

  return (
    <div className="rounded-lg border border-dark-border bg-dark-surface p-3 text-xs leading-relaxed text-gray-200 shadow-xl">
      <span className="block font-semibold text-white">{slice.label}</span>
      <span className="mt-1 block">
        {formatBRL(slice.valueBRL)} · {formatPercent(slice.percent)}
      </span>
      <span className="block">Maior posição: {slice.topTicker}</span>
    </div>
  )
}

export default function CompositionPieChart({
  slices,
  formatBRL,
  formatPercent,
}: CompositionPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="valueBRL"
          nameKey="label"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          // Sem animação: o valor não muda enquanto a pizza cresce, e a
          // animação ainda deixaria timers pendurados no runner de teste.
          isAnimationActive={false}
          stroke="#0f172a"
        >
          {slices.map((slice) => (
            <Cell key={slice.type} fill={assetClassColor(slice.type)} />
          ))}
        </Pie>

        <Tooltip
          content={({ active, payload }) => (
            <CompositionSliceTooltip
              active={active}
              slice={payload?.[0]?.payload as AssetClassSlice | undefined}
              formatBRL={formatBRL}
              formatPercent={formatPercent}
            />
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
