/**
 * AnaliseScore — sub-rota /analise/score.
 * Regras agrupadas por nome de score em cards, com ações Usar/Editar/Excluir e modal Nova regra.
 */
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { ScoreRuleForm } from '../../score/components/ScoreRuleForm'
import {
  useScoreRules,
  useDeleteScoreRule,
  groupRulesByName,
} from '../../score/hooks/useScoreRules'
import { useScorePreferences, useUpsertScorePreferences } from '../../score/hooks/useScorePreferences'
import { METRIC_LABELS, OPERATOR_LABELS } from '../../score/types'
import type { ScoreRule } from '../../score/types'

function formatCondition(rule: ScoreRule): string {
  if (rule.operator === 'between' && rule.threshold_max !== null) {
    return `entre ${rule.threshold_min} e ${rule.threshold_max}`
  }
  const opLabel: Record<string, string> = { lt: '<', lte: '≤', gt: '>', gte: '≥' }
  return `${opLabel[rule.operator] ?? OPERATOR_LABELS[rule.operator] ?? rule.operator} ${rule.threshold_min}`
}

// ── Card de um grupo de score ─────────────────────────────────────────────
type ScoreGroupCardProps = {
  name: string
  groupRules: ScoreRule[]
  isActive: boolean
  onUseScore: () => void
  onEdit: (rule: ScoreRule) => void
  onDelete: (rule: ScoreRule) => void
  upsertPending: boolean
  deletePending: boolean
}

function ScoreGroupCard({
  name,
  groupRules,
  isActive,
  onUseScore,
  onEdit,
  onDelete,
  upsertPending,
  deletePending,
}: ScoreGroupCardProps) {
  const totalPoints = groupRules.reduce((sum, r) => sum + r.points, 0)

  return (
    <div className="rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] overflow-hidden">
      {/* Header do card */}
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-white">{name}</span>
              {isActive && (
                <span className="rounded-full border border-nf-blue/40 bg-nf-blue/12 px-1.5 py-0.5 text-[9px] font-medium text-nf-blue">
                  Ativo
                </span>
              )}
            </div>
            <span className="mt-0.5 text-[11px] text-white/40">
              {groupRules.length} {groupRules.length === 1 ? 'regra' : 'regras'} ·{' '}
              <span
                className={
                  totalPoints > 0
                    ? 'text-nf-green'
                    : totalPoints < 0
                      ? 'text-nf-pink'
                      : 'text-white/40'
                }
              >
                {totalPoints > 0 ? `+${totalPoints}` : totalPoints} pontos
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          disabled={isActive || upsertPending}
          onClick={onUseScore}
          className="shrink-0 rounded-full border border-[rgba(121,135,255,0.5)] bg-[rgba(121,135,255,0.1)] px-3 py-1.5 text-[11px] font-medium text-nf-blue transition-colors hover:bg-[rgba(121,135,255,0.2)] disabled:cursor-default disabled:opacity-40"
        >
          {isActive ? 'Em uso' : 'Usar este score'}
        </button>
      </div>

      {/* Linhas de regra */}
      <div className="border-t border-white/[0.06]">
        {groupRules.map((rule, i) => (
          <div
            key={rule.id}
            className={`flex items-center gap-3 px-5 py-3 ${
              i < groupRules.length - 1 ? 'border-b border-white/[0.04]' : ''
            }`}
          >
            {/* Métrica + condição */}
            <div className="min-w-0 flex-1">
              <span className="text-[12px] text-white/80">
                {METRIC_LABELS[rule.metric] ?? rule.metric}
              </span>
              <span className="mx-1.5 text-[11px] text-white/30">·</span>
              <span className="text-[11px] text-white/50">{formatCondition(rule)}</span>
            </div>

            {/* Ações */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Badge pontos */}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  rule.points > 0
                    ? 'bg-nf-green/12 text-nf-green'
                    : rule.points < 0
                      ? 'bg-nf-pink/12 text-nf-pink'
                      : 'bg-white/[0.06] text-white/50'
                }`}
              >
                {rule.points > 0 ? `+${rule.points}` : rule.points}
              </span>

              {/* Editar */}
              <button
                type="button"
                onClick={() => onEdit(rule)}
                aria-label={`Editar regra ${rule.name}`}
                className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </button>

              {/* Excluir */}
              <button
                type="button"
                disabled={deletePending}
                onClick={() => onDelete(rule)}
                aria-label={`Excluir regra ${rule.name}`}
                className="grid h-7 w-7 place-items-center rounded-lg border border-nf-pink/20 bg-nf-pink/[0.04] text-nf-pink/70 transition-colors hover:bg-nf-pink/12 hover:text-nf-pink disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export function AnaliseScore() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoreRule | undefined>(undefined)
  const [modalBusy, setModalBusy] = useState(false)

  const { data: rules = [], isLoading } = useScoreRules()
  const { data: preferences } = useScorePreferences()
  const upsertPrefs = useUpsertScorePreferences()
  const deleteRule = useDeleteScoreRule()

  const activeRuleId = preferences?.default_score_rule_id ?? null

  // Agrupa regras por name
  const groups = groupRulesByName(rules)

  function openNewRule() {
    setEditingRule(undefined)
    setIsModalOpen(true)
  }

  function openEditRule(rule: ScoreRule) {
    setEditingRule(rule)
    setIsModalOpen(true)
  }

  function closeModal() {
    if (modalBusy) return
    setIsModalOpen(false)
    setEditingRule(undefined)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-white">Score Fundamentalista</h2>
        <button
          type="button"
          onClick={openNewRule}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#393939] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.12]"
        >
          + Nova regra
        </button>
      </div>

      {/* ── Grupos de score ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-[14px] bg-white/[0.04]" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-[13px] text-white/40">Nenhuma regra criada ainda.</p>
          <button
            type="button"
            onClick={openNewRule}
            className="text-[12px] font-medium text-nf-blue hover:underline"
          >
            Criar primeira regra →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(groups.entries()).map(([name, groupRules]) => {
            // O grupo está ativo se qualquer regra do grupo for a regra ativa
            const isActive = groupRules.some((r) => r.id === activeRuleId)
            // Para "Usar este score", usa a primeira regra do grupo como representante
            const representativeId = groupRules[0]?.id ?? ''
            return (
              <ScoreGroupCard
                key={name}
                name={name}
                groupRules={groupRules}
                isActive={isActive}
                onUseScore={() =>
                  upsertPrefs.mutate({ default_score_rule_id: representativeId })
                }
                onEdit={openEditRule}
                onDelete={(rule) => deleteRule.mutate(rule.id)}
                upsertPending={upsertPrefs.isPending}
                deletePending={deleteRule.isPending}
              />
            )
          })}
        </div>
      )}

      {/* ── Modal Nova/Editar regra ── */}
      <Modal
        isOpen={isModalOpen}
        title={editingRule ? 'Editar regra' : 'Nova regra de score'}
        onClose={closeModal}
        dismissible={!modalBusy}
      >
        <ScoreRuleForm
          editingRule={editingRule}
          onSuccess={closeModal}
          onCancel={closeModal}
          onBusyChange={setModalBusy}
        />
      </Modal>
    </div>
  )
}
