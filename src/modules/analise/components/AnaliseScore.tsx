/**
 * AnaliseScore — sub-rota /analise/score.
 * Tabela flat de regras de score com ações Usar/Editar/Excluir e modal Nova regra.
 */
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { ScoreRuleForm } from '../../score/components/ScoreRuleForm'
import { PanelCard } from '../../../shared/components/PanelCard'
import {
  useScoreRules,
  useDeleteScoreRule,
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

export function AnaliseScore() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoreRule | undefined>(undefined)
  const [modalBusy, setModalBusy] = useState(false)

  const { data: rules = [], isLoading } = useScoreRules()
  const { data: preferences } = useScorePreferences()
  const upsertPrefs = useUpsertScorePreferences()
  const deleteRule = useDeleteScoreRule()

  const activeRuleId = preferences?.default_score_rule_id ?? null

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

      {/* ── Tabela de regras ── */}
      <PanelCard>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-white">
            Regras de score
            {!isLoading && (
              <span className="ml-2 text-[12px] font-normal text-white/40">
                ({rules.length})
              </span>
            )}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="px-3 py-2.5 text-left font-medium text-white/50">Nome</th>
                  <th className="px-3 py-2.5 text-left font-medium text-white/50">Métrica</th>
                  <th className="px-3 py-2.5 text-left font-medium text-white/50">Condição</th>
                  <th className="px-3 py-2.5 text-right font-medium text-white/50">Pontos</th>
                  <th className="px-3 py-2.5 text-center font-medium text-white/50" colSpan={3}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => {
                  const isActive = rule.id === activeRuleId
                  return (
                    <tr
                      key={rule.id}
                      className={`border-t border-white/[0.04] ${
                        i % 2 === 1 ? 'bg-white/[0.02]' : ''
                      } ${isActive ? 'bg-nf-blue/[0.04]' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{rule.name}</span>
                          {isActive && (
                            <span className="rounded-full border border-nf-blue/40 bg-nf-blue/12 px-1.5 py-0.5 text-[9px] font-medium text-nf-blue">
                              Ativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-white/70">
                        {METRIC_LABELS[rule.metric] ?? rule.metric}
                      </td>
                      <td className="px-3 py-2.5 text-white/70">
                        {formatCondition(rule)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span
                          className={`font-semibold ${
                            rule.points > 0 ? 'text-nf-green' : rule.points < 0 ? 'text-nf-pink' : 'text-white'
                          }`}
                        >
                          {rule.points > 0 ? `+${rule.points}` : rule.points}
                        </span>
                      </td>
                      {/* Usar este score */}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isActive || upsertPrefs.isPending}
                          onClick={() =>
                            upsertPrefs.mutate({ default_score_rule_id: rule.id })
                          }
                          className="rounded-full border border-white/[0.15] px-2.5 py-1 text-[10px] font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-default disabled:opacity-40"
                        >
                          {isActive ? 'Em uso' : 'Usar este score'}
                        </button>
                      </td>
                      {/* Editar */}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => openEditRule(rule)}
                          className="text-[10px] font-medium text-white/60 transition-colors hover:text-white"
                        >
                          Editar
                        </button>
                      </td>
                      {/* Excluir */}
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={deleteRule.isPending}
                          onClick={() => deleteRule.mutate(rule.id)}
                          className="text-[10px] font-medium text-nf-pink transition-colors hover:text-nf-pink/70 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

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
