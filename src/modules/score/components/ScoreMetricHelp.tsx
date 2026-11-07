import { INDICATOR_EXPLANATIONS } from '../../../shared/indicators/catalog'
import { scoreConditionText } from '../utils/scoreConditionText'
import { METRIC_LABELS, type ScoreMetric, type ScoreRule } from '../types'


export function ScoreMetricHelp({ metric, rule }: { metric: ScoreMetric; rule?: ScoreRule }) {
  const info = INDICATOR_EXPLANATIONS[metric]
  return <details className="mt-2 text-xs leading-relaxed text-white/65">
    <summary className="min-h-9 cursor-pointer py-2 text-nf-blue focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue">Entender {METRIC_LABELS[metric]}</summary>
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p>{info.meaning}</p><p><strong className="text-white/85">Fórmula: </strong>{info.formula}</p><p>{info.context}</p>
      {rule && <p><strong className="text-white/85">Efeito nesta regra: </strong>se o indicador estiver {scoreConditionText(rule)}, {rule.points < 0 ? `retira ${Math.abs(rule.points)}` : `soma ${rule.points}`} {Math.abs(rule.points) === 1 ? 'ponto' : 'pontos'}. Caso contrário, contribui com 0. Sem dado, não soma pontos e o critério fica indisponível.</p>}
    </div>
  </details>
}

export function ScoreCalculationHelp() {
  return <details className="rounded-xl border border-white/10 p-4 text-sm leading-relaxed text-white/65">
    <summary className="cursor-pointer font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nf-blue">Como cada campo afeta o score?</summary>
    <dl className="mt-3 space-y-3">
      <div><dt className="font-medium text-white/85">Nome do score</dt><dd>Agrupa as regras da mesma análise. O nome não adiciona pontos. “Usar este score” seleciona o grupo usado nos ativos e na média da carteira.</dd></div>
      <div><dt className="font-medium text-white/85">Métrica</dt><dd>Escolhe o indicador observado nos fundamentos mais recentes disponíveis.</dd></div>
      <div><dt className="font-medium text-white/85">Operador e valores de referência</dt><dd>Definem quando a regra é atendida. &lt; e &gt; excluem o limite; ≤ e ≥ o incluem. “Entre” inclui mínimo e máximo. Para percentuais, digite 7 para 7%; para múltiplos, 1,5 significa 1,5 vez. Confira a unidade da Dívida/PL na fonte.</dd></div>
      <div><dt className="font-medium text-white/85">Pontos</dt><dd>Entram somente quando a condição é atendida. Pontos negativos descontam; condição não atendida ou dado ausente contribui com 0. Não há pontuação proporcional à distância do limite.</dd></div>
      <div><dt className="font-medium text-white/85">Total do ativo</dt><dd>Somamos as contribuições e limitamos o resultado a 0–100. Não transformamos o total possível em 100: um grupo de até 6 pontos continua valendo até 6. O total do card é a soma dos pontos configurados, não o resultado de um ativo.</dd></div>
      <div><dt className="font-medium text-white/85">Média da carteira</dt><dd>Usa os scores elegíveis ponderados pelos valores de mercado em reais. Um ativo com mais valor pesa mais. A cobertura mostra quanto do patrimônio participa dessa média.</dd></div>
      <div><dt className="font-medium text-white/85">Escala e modelo inicial</dt><dd>A soma não é normalizada: se suas regras positivas somam 6 pontos, atender todas resulta em 6, não 100. Para usar toda a escala, distribua 100 pontos entre os critérios positivos. O modelo inicial é um exemplo opcional; suas regras existentes permanecem iguais.</dd></div>
    </dl>
  </details>
}
