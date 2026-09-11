import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useScoreRules } from '../hooks/useScoreRules'
import { useScorePreferences } from '../hooks/useScorePreferences'
import { ScoreRuleForm } from './ScoreRuleForm'
import { ScoreRuleList } from './ScoreRuleList'
import type { ScoreRule } from '../types'

export function ScorePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoreRule | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  const {
    data: rules = [],
    isLoading: rulesLoading,
    isError: rulesError,
    refetch: refetchRules,
  } = useScoreRules()

  const { data: preferences } = useScorePreferences()

  const activeRuleId = preferences?.default_score_rule_id ?? null

  const openCreateModal = () => {
    setEditingRule(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (rule: ScoreRule) => {
    setEditingRule(rule)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (isSaving) return
    setIsModalOpen(false)
    setEditingRule(undefined)
  }

  const handleFormSuccess = () => {
    setIsModalOpen(false)
    setEditingRule(undefined)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Score Fundamentalista</h1>
          <p className="text-gray-400 text-sm">
            Crie regras de análise fundamentalista e avalie os ativos da sua carteira.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm flex-shrink-0"
        >
          + Nova Regra
        </button>
      </div>

      {/* Score ativo */}
      {activeRuleId && rules.length > 0 && (
        <div className="mb-6 px-4 py-3 bg-blue-900/20 border border-blue-600/30 rounded-lg text-sm text-blue-300">
          <span className="font-medium">Score ativo:</span>{' '}
          {rules.find((r) => r.id === activeRuleId)?.name ?? '—'}
          {' — '}
          {rules.filter((r) => r.name === rules.find((r2) => r2.id === activeRuleId)?.name).length} regra(s)
        </div>
      )}

      {/* Estados de loading / erro / conteúdo */}
      {rulesLoading ? (
        <div className="text-gray-400 py-12 text-center" aria-live="polite">
          Carregando regras…
        </div>
      ) : rulesError ? (
        <div className="text-center py-12" aria-live="assertive">
          <p className="text-red-400 mb-3">Erro ao carregar as regras de score.</p>
          <button
            type="button"
            onClick={() => refetchRules()}
            className="px-4 py-2 text-sm border border-dark-border text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <ScoreRuleList rules={rules} activeRuleId={activeRuleId} onEdit={openEditModal} />
      )}

      {/* Modal de criação / edição */}
      <Modal
        isOpen={isModalOpen}
        title={editingRule ? 'Editar Regra' : 'Nova Regra de Score'}
        onClose={closeModal}
        dismissible={!isSaving}
      >
        <ScoreRuleForm
          editingRule={editingRule}
          onSuccess={handleFormSuccess}
          onCancel={closeModal}
          onBusyChange={setIsSaving}
        />
      </Modal>
    </div>
  )
}
