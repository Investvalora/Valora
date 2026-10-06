/**
 * ScoreCol — coluna de Score Fundamentalista da tela Análise.
 * Mostra os grupos de score (agrupados por name) com progress bar
 * e as regras individuais com check/x.
 */
import { Check, Edit2, Target, Trash2, X } from 'lucide-react'
import { useScoreRules, groupRulesByName } from '../../score/hooks/useScoreRules'
import { useScorePreferences, useUpsertScorePreferences } from '../../score/hooks/useScorePreferences'
import { useDeleteScoreRule } from '../../score/hooks/useScoreRules'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useCalculateScore } from '../../score/hooks/useCalculateScore'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { METRIC_LABELS, OPERATOR_LABELS } from '../../score/types'
import type { ScoreRule } from '../../score/types'
import { useMemo } from 'react'

const GROUP_COLORS = ['#7987FF', '#C084FC', '#63D16B', '#FFD95A', '#FF8FBE']

function scoreColor(idx: number): string {
  return GROUP_COLORS[idx % GROUP_COLORS.length]
}

function formatThreshold(rule: ScoreRule): string {
  if (rule.operator === 'between' && rule.threshold_max !== null) {
    return `entre ${rule.threshold_min} e ${rule.threshold_max}`
  }
  const opLabel: Record<string, string> = { lt: '<', lte: '≤', gt: '>', gte: '≥' }
  return `${opLabel[rule.operator] ?? rule.operator} ${rule.threshold_min}`
}

type ScoreGroupProps = {
  groupName: string
  rules: ScoreRule[]
  isActive: boolean
  color: string
  onActivate: () => void
  onEdit: (rule: ScoreRule) => void
  onDelete: (id: string) => void
}

function ScoreGroup({ groupName, rules, isActive, color, onActivate, onEdit, onDelete }: ScoreGroupProps) {
  const totalPoints = rules.reduce((s, r) => s + r.points, 0)
  const maxPositivePoints = rules.filter((r) => r.points > 0).reduce((s, r) => s + r.points, 0)
  const progress = maxPositivePoints > 0 ? (Math.min(totalPoints, maxPositivePoints) / maxPositivePoints) * 100 : 0

  return (
    <div
      className={`border-t border-white/[0.07] px-5 py-4 ${
        isActive ? 'bg-white/[0.025]' : ''
      }`}
    >
      {/* Header do grupo */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: color }}
            aria-hidden="true"
          />
          <span className="text-[13px] font-semibold text-white">{groupName}</span>
          {isActive && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: `${color}22`, color }}
            >
              Ativo
            </span>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
          style={{ background: `${color}18`, color }}
        >
          {rules.length}/{rules.length} regras
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: color, opacity: 0.7 }}
        />
      </div>

      {/* Regras */}
      <div className="mb-3 flex flex-col gap-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2.5">
            <span
              className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
              style={{ background: `${color}1A` }}
              aria-hidden="true"
            >
              <Check className="h-3 w-3" style={{ color }} strokeWidth={2.5} />
            </span>
            <span className="min-w-0 flex-1 text-[12px] text-[#E0E0E0]">
              {METRIC_LABELS[rule.metric]} {formatThreshold(rule)}
              <span className="ml-1.5 text-[11px] text-[#8F8F8F]">
                ({rule.points > 0 ? `+${rule.points}` : rule.points} pt)
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 pt-1">
        {!isActive && (
          <button
            type="button"
            onClick={onActivate}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
            style={{ background: `${color}18`, color }}
          >
            <Target className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            Usar este score
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(rules[0])}
          className="flex items-center gap-1.5 rounded-lg border border-nf-blue/40 bg-nf-blue/12 px-2.5 py-1.5 text-[11px] font-medium text-nf-blue transition-colors hover:bg-nf-blue/20"
        >
          <Edit2 className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(rules[0].id)}
          className="flex items-center gap-1.5 rounded-lg border border-nf-pink/40 bg-nf-pink/12 px-2.5 py-1.5 text-[11px] font-medium text-nf-pink transition-colors hover:bg-nf-pink/20"
        >
          <Trash2 className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          Excluir
        </button>
      </div>
    </div>
  )
}

type Props = {
  onNewRule: () => void
  onEditRule: (rule: ScoreRule) => void
}

export function ScoreCol({ onNewRule, onEditRule }: Props) {
  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  const { data: rules = [], isLoading } = useScoreRules()
  const { data: preferences } = useScorePreferences()
  const upsertPrefs = useUpsertScorePreferences()
  const deleteRule = useDeleteScoreRule()

  const { data: positions = [] } = usePositions(walletId)
  const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])
  const { data: fundamentals = [] } = useFundamentals(tickers)

  const groups = useMemo(() => groupRulesByName(rules), [rules])
  const activeRuleId = preferences?.default_score_rule_id ?? null
  const activeGroupName = useMemo(
    () => rules.find((r) => r.id === activeRuleId)?.name ?? null,
    [rules, activeRuleId],
  )

  const activeRules = useMemo(
    () => (activeGroupName ? (groups.get(activeGroupName) ?? []) : []),
    [groups, activeGroupName],
  )
  const scoreByTicker = useCalculateScore(activeRules, fundamentals)
  const scoreCount = groups.size

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#1B1B1B]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <div>
          <h2 className="text-[14px] font-semibold text-white/85">Score Fundamentalista</h2>
          <p className="text-[11px] text-[#8F8F8F]">
            {isLoading ? 'Carregando…' : `${scoreCount} ${scoreCount === 1 ? 'score' : 'scores'} criados`}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewRule}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12]"
        >
          + Nova regra
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-3 p-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        )}

        {!isLoading && groups.size === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-[13px] text-[#8F8F8F]">Nenhuma regra criada ainda.</p>
            <button
              type="button"
              onClick={onNewRule}
              className="text-[12px] font-medium text-nf-blue hover:underline"
            >
              Criar primeira regra →
            </button>
          </div>
        )}

        {!isLoading && Array.from(groups.entries()).map(([name, groupRules], idx) => (
          <ScoreGroup
            key={name}
            groupName={name}
            rules={groupRules}
            isActive={name === activeGroupName}
            color={scoreColor(idx)}
            onActivate={() => upsertPrefs.mutate({ default_score_rule_id: groupRules[0].id })}
            onEdit={onEditRule}
            onDelete={(id) => deleteRule.mutate(id)}
          />
        ))}
      </div>

      {/* Footer — resumo do score ativo */}
      {activeGroupName && scoreByTicker.size > 0 && (
        <div className="border-t border-white/[0.07] px-5 py-3">
          <p className="text-[11px] text-[#8F8F8F]">
            Score ativo: <span className="font-medium text-white">{activeGroupName}</span>
            {' · '}{scoreByTicker.size} ativos avaliados
          </p>
        </div>
      )}
    </div>
  )
}
