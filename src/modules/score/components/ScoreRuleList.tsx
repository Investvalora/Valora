import { useState } from 'react'
import { useDeleteScoreRule } from '../hooks/useScoreRules'
import { useUpsertScorePreferences } from '../hooks/useScorePreferences'
import { METRIC_LABELS, OPERATOR_LABELS, type ScoreRule } from '../types'

interface ScoreRuleListProps {
  rules: ScoreRule[]
  activeRuleId: string | null
  onEdit: (rule: ScoreRule) => void
}

/** Formata o limiar de forma legível: "≥ 10" ou "entre 5 e 15". */
function formatThreshold(rule: ScoreRule): string {
  const op = rule.operator
  const min = rule.threshold_min
  const max = rule.threshold_max

  if (op === 'between' && max != null) return `entre ${min} e ${max}`

  const opSymbols: Record<string, string> = {
    lt: '<',
    lte: '≤',
    gt: '>',
    gte: '≥',
  }
  return `${opSymbols[op] ?? op} ${min}`
}

export function ScoreRuleList({ rules, activeRuleId, onEdit }: ScoreRuleListProps) {
  const deleteRule = useDeleteScoreRule()
  const upsertPreferences = useUpsertScorePreferences()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [activateError, setActivateError] = useState('')

  const handleDelete = async (id: string) => {
    setDeleteError('')
    try {
      await deleteRule.mutateAsync(id)
      setConfirmDeleteId(null)
    } catch {
      setDeleteError('Erro ao excluir a regra. Tente novamente.')
    }
  }

  const handleActivate = async (id: string) => {
    setActivateError('')
    try {
      await upsertPreferences.mutateAsync({ default_score_rule_id: id })
    } catch {
      setActivateError('Erro ao definir score ativo. Tente novamente.')
    }
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-2">Nenhuma regra cadastrada</p>
        <p className="text-sm">Crie sua primeira regra de score usando o botão acima.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {(deleteError || activateError) && (
        <p className="text-red-400 text-sm" role="alert">
          {deleteError || activateError}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-dark-border">
        <table className="w-full text-sm text-left">
          <thead className="bg-dark-surface text-gray-400 uppercase text-xs">
            <tr>
              <th scope="col" className="px-4 py-3">Nome</th>
              <th scope="col" className="px-4 py-3">Métrica</th>
              <th scope="col" className="px-4 py-3">Condição</th>
              <th scope="col" className="px-4 py-3 text-right">Pontos</th>
              <th scope="col" className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {rules.map((rule) => {
              const isActive = rule.id === activeRuleId
              const isConfirmingDelete = confirmDeleteId === rule.id

              return (
                <tr
                  key={rule.id}
                  className={`transition-colors ${isActive ? 'bg-blue-900/20' : 'hover:bg-dark-surface/50'}`}
                >
                  {/* Nome + badge ativo */}
                  <td className="px-4 py-3 font-medium text-white">
                    <span className="flex items-center gap-2 flex-wrap">
                      {rule.name}
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                          ativo
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Métrica */}
                  <td className="px-4 py-3 text-gray-300">
                    {METRIC_LABELS[rule.metric] ?? rule.metric}
                  </td>

                  {/* Condição */}
                  <td className="px-4 py-3 text-gray-300">
                    {OPERATOR_LABELS[rule.operator] !== rule.operator
                      ? formatThreshold(rule)
                      : '—'}
                  </td>

                  {/* Pontos */}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                    {rule.points > 0 ? `+${rule.points}` : rule.points}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3 text-right">
                    {isConfirmingDelete ? (
                      <span className="flex items-center justify-end gap-2">
                        <span className="text-xs text-gray-400">Confirmar exclusão?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id)}
                          disabled={deleteRule.isPending}
                          className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded transition-colors"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-2 py-1 bg-dark-bg border border-dark-border text-gray-300 hover:text-white rounded transition-colors"
                        >
                          Não
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center justify-end gap-2">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivate(rule.id)}
                            disabled={upsertPreferences.isPending}
                            className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/40 text-blue-400 hover:text-blue-300 rounded transition-colors disabled:opacity-50"
                          >
                            Usar este score
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(rule)}
                          className="text-xs px-2 py-1 text-gray-400 hover:text-white border border-transparent hover:border-dark-border rounded transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(rule.id)}
                          className="text-xs px-2 py-1 text-red-400 hover:text-red-300 border border-transparent hover:border-red-900 rounded transition-colors"
                        >
                          Excluir
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
