import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../../../shared/components/Modal'
import { useScoreRules } from '../hooks/useScoreRules'
import { useScorePreferences } from '../hooks/useScorePreferences'
import { useUpsertScorePreferences } from '../hooks/useScorePreferences'
import { useAuth } from '../../auth/hooks/useAuth'
import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import { ScoreRuleForm } from './ScoreRuleForm'
import { ScoreRuleList } from './ScoreRuleList'
import type { ScoreRule } from '../types'
import { METRIC_LABELS } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatThreshold(rule: ScoreRule): string {
  const op = rule.operator
  const min = rule.threshold_min
  const max = rule.threshold_max
  if (op === 'between' && max != null) return `entre ${min} e ${max}`
  const symbols: Record<string, string> = { lt: '<', lte: '≤', gt: '>', gte: '≥' }
  return `${symbols[op] ?? op} ${min}`
}

/** Agrupa regras por `name` (nome do score) */
function groupByName(rules: ScoreRule[]): Map<string, ScoreRule[]> {
  const map = new Map<string, ScoreRule[]>()
  for (const rule of rules) {
    const group = map.get(rule.name) ?? []
    group.push(rule)
    map.set(rule.name, group)
  }
  return map
}

// ── ScoreCard mobile ──────────────────────────────────────────────────────────

interface ScoreCardProps {
  name: string
  rules: ScoreRule[]
  isActive: boolean
  onActivate: () => void
  onEdit: (rule: ScoreRule) => void
}

function ScoreCard({ name, rules, isActive, onActivate, onEdit }: ScoreCardProps) {
  const totalPoints = rules.reduce((s, r) => s + r.points, 0)

  return (
    <div className="rounded-[10px] border border-white/[0.22] bg-[#131313] px-3.5 pb-1.5 pt-3.5">
      {/* Topo */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-white">{name}</p>
          <p className="text-[10px] text-[#8f8f8f]">
            {rules.length} regra{rules.length !== 1 ? 's' : ''} · {totalPoints} pontos
          </p>
        </div>
        {isActive ? (
          <span className="rounded-[8px] border border-blue-500/50 bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium text-blue-300">
            Ativo
          </span>
        ) : (
          <button
            type="button"
            onClick={onActivate}
            className="rounded-[8px] border border-[rgba(121,135,255,0.5)] bg-[rgba(121,135,255,0.1)] px-2.5 py-1 text-[10px] font-medium text-[#7987ff] transition-colors hover:bg-[rgba(121,135,255,0.2)]"
          >
            Usar este score
          </button>
        )}
      </div>

      {/* Divisor */}
      <div className="h-px bg-white/[0.08]" />

      {/* Regras */}
      {rules.map((rule, idx) => (
        <div
          key={rule.id}
          className={`flex items-center justify-between py-2.5 ${
            idx < rules.length - 1 ? 'border-b border-white/[0.08]' : ''
          }`}
        >
          <div>
            <p className="text-[12px] font-medium text-white">
              {METRIC_LABELS[rule.metric] ?? rule.metric}
            </p>
            <p className="text-[10px] text-[#8f8f8f]">{formatThreshold(rule)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-[6px] bg-[rgba(51,170,59,0.16)] px-2 py-0.5 text-[11px] font-semibold text-[#63d16b]">
              +{rule.points}
            </span>
            <button
              type="button"
              onClick={() => onEdit(rule)}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              Editar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── ScorePage ─────────────────────────────────────────────────────────────────

export function ScorePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoreRule | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)

  const isMobile = useIsMobile()
  const { user } = useAuth()
  const upsertPreferences = useUpsertScorePreferences()

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

  const fullName = user?.user_metadata?.full_name
  const initial = (
    typeof fullName === 'string' && fullName.trim()
      ? fullName.trim()[0]
      : user?.email?.[0] ?? 'S'
  ).toUpperCase()

  // Agrupa regras por nome para o layout mobile em cards
  const grouped = groupByName(rules)
  // Determina o nome do grupo do score ativo (para verificar isActive por grupo)
  const activeGroupName = rules.find((r) => r.id === activeRuleId)?.name ?? null

  // ── Layout mobile ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
        {/* Header mobile */}
        <div className="flex items-center justify-between">
          <Link
            to="/conta"
            aria-label="Minha conta"
            className="grid h-[26px] w-[26px] place-items-center rounded-[13px] bg-[#a66af4] text-[14px] font-medium text-white"
          >
            {initial}
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-full bg-[#393939] px-5 py-1.5 text-[10px] font-medium text-white hover:bg-[#454545] transition-colors"
          >
            + Nova Regra
          </button>
        </div>

        {/* Título */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold text-white">Score Fundamentalista</h1>
          <p className="text-[11px] text-[#8f8f8f]">
            Crie regras de análise fundamentalista e avalie os ativos da sua carteira.
          </p>
        </div>

        {/* Conteúdo */}
        {rulesLoading ? (
          <p className="py-8 text-center text-sm text-zinc-400 animate-pulse">Carregando regras…</p>
        ) : rulesError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center">
            <p className="mb-3 text-sm text-red-400">Erro ao carregar as regras.</p>
            <button
              type="button"
              onClick={() => refetchRules()}
              className="text-sm text-zinc-300 underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : grouped.size === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">Nenhuma regra cadastrada</p>
            <p className="mt-1 text-xs text-zinc-500">
              Toque em "+ Nova Regra" para começar.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...grouped.entries()].map(([name, groupRules]) => (
              <ScoreCard
                key={name}
                name={name}
                rules={groupRules}
                isActive={name === activeGroupName}
                onActivate={() =>
                  upsertPreferences.mutate({ default_score_rule_id: groupRules[0].id })
                }
                onEdit={openEditModal}
              />
            ))}
          </div>
        )}

        {/* Modal */}
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

  // ── Layout desktop ─────────────────────────────────────────────────────────
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
