/**
 * AnaliseVisaoGeral — sub-rota /analise/visao-geral.
 * Combina Score, Alertas e Proventos em três colunas, com tabela de pontuação por ativo.
 */
import { useState, useMemo } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { ScoreRuleForm } from '../../score/components/ScoreRuleForm'
import { KpiPillBar } from '../../../shared/components/KpiPillBar'
import { PanelCard } from '../../../shared/components/PanelCard'
import { useScoreRules, groupRulesByName } from '../../score/hooks/useScoreRules'
import { useScorePreferences } from '../../score/hooks/useScorePreferences'
import { useAlerts } from '../../alerts/hooks/useAlerts'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useCalculateScore } from '../../score/hooks/useCalculateScore'
import { usePositions } from '../../portfolio/hooks/usePositions'
import { useWallets } from '../../portfolio/hooks/useWallets'
import { ScoreCol } from './ScoreCol'
import { AlertasCol } from './AlertasCol'
import { ProventosCol } from './ProventosCol'
import type { ScoreRule } from '../../score/types'

export function AnaliseVisaoGeral() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoreRule | undefined>(undefined)
  const [modalBusy, setModalBusy] = useState(false)

  const { selectedWallet } = useWallets()
  const walletId = selectedWallet?.id ?? ''

  const { data: rules = [] } = useScoreRules()
  const { data: alerts = [] } = useAlerts()
  const { data: preferences } = useScorePreferences()

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

  // KPI counts
  const overvaluedCount = useMemo(
    () => alerts.filter((a) => a.type === 'overvalued' && a.status === 'novo').length,
    [alerts],
  )
  const opportunityCount = useMemo(
    () => alerts.filter((a) => a.type === 'opportunity' && a.status === 'novo').length,
    [alerts],
  )
  const novosCount = useMemo(
    () => alerts.filter((a) => a.status === 'novo').length,
    [alerts],
  )

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
      <h2 className="text-[18px] font-semibold text-white">Visão Geral</h2>

      {/* ── KPI pills ── */}
      {/* Mobile KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {[
          {
            label: 'Scores criados',
            value: String(groups.size),
            colorClass: 'text-white',
          },
          {
            label: 'Alertas novos',
            value: String(novosCount),
            colorClass: novosCount > 0 ? 'text-nf-pink' : 'text-white',
          },
          {
            label: 'Sobrevalorizados',
            value: String(overvaluedCount),
            colorClass: overvaluedCount > 0 ? 'text-nf-pink' : 'text-white',
          },
          {
            label: 'Oportunidades',
            value: String(opportunityCount),
            colorClass: opportunityCount > 0 ? 'text-nf-green' : 'text-white',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[10px] border border-white/[0.08] bg-[#1b1b1b] px-3 py-2.5"
          >
            <p className="text-[10px] text-[#8f8f8f]">{kpi.label}</p>
            <p className={`text-[16px] font-medium ${kpi.colorClass}`}>{kpi.value}</p>
          </div>
        ))}
      </div>
      {/* Desktop KpiPillBar */}
      <div className="hidden md:block">
        <KpiPillBar
          items={[
            {
              label: 'Scores criados',
              value: String(groups.size),
            },
            {
              label: 'Sobrevalorizados',
              value: String(overvaluedCount),
              colorClass: overvaluedCount > 0 ? 'text-nf-pink' : 'text-white',
            },
            {
              label: 'Oportunidades',
              value: String(opportunityCount),
              colorClass: opportunityCount > 0 ? 'text-nf-green' : 'text-white',
            },
            {
              label: 'Alertas novos',
              value: String(novosCount),
              colorClass: novosCount > 0 ? 'text-nf-blue' : 'text-white',
            },
          ]}
        />
      </div>

      {/* ── Grid de 3 colunas ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ScoreCol onNewRule={openNewRule} onEditRule={openEditRule} />
        <AlertasCol />
        <ProventosCol />
      </div>

      {/* ── Tabela de score por ativo ── */}
      <PanelCard>
        <h3 className="mb-4 text-[14px] font-semibold text-white">
          Score por ativo (score ativo)
        </h3>
        {scoreByTicker.size === 0 ? (
          <p className="text-center text-[13px] text-white/40">
            Selecione um score ativo na aba Score para visualizar
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="px-3 py-2 text-left font-medium text-white/50">Ativo</th>
                  <th className="px-3 py-2 text-right font-medium text-white/50">Score</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(scoreByTicker.entries())
                  .sort((a, b) => {
                    const va = a[1] ?? -Infinity
                    const vb = b[1] ?? -Infinity
                    return vb - va
                  })
                  .map(([ticker, score], i) => (
                    <tr
                      key={ticker}
                      className={`border-t border-white/[0.04] ${
                        i % 2 === 1 ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5 font-semibold text-white">{ticker}</td>
                      <td
                        className={`px-3 py-2.5 text-right tabular-nums font-medium ${
                          score == null
                            ? 'text-white/50'
                            : score > 0
                              ? 'text-nf-green'
                              : score < 0
                                ? 'text-nf-pink'
                                : 'text-white'
                        }`}
                      >
                        {score != null ? (score > 0 ? `+${score}` : String(score)) : '—'}
                      </td>
                    </tr>
                  ))}
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
