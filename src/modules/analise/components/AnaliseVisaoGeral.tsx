/**
 * AnaliseVisaoGeral — sub-rota /analise/visao-geral.
 * Combina Score, Alertas e Proventos em três colunas, com tabela de pontuação por ativo.
 */
import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { METRIC_LABELS } from '../../score/types'
import type { ScoreRule } from '../../score/types'
import type { Alert } from '../../alerts/types'

export function AnaliseVisaoGeral() {
  const navigate = useNavigate()
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
  const priceTargetCount = useMemo(
    () => alerts.filter((a) => a.type === 'price_target').length,
    [alerts],
  )

  // Alertas sobrevalorizados para seção mobile
  const overvaluedAlerts = useMemo(
    () => alerts.filter((a) => a.type === 'overvalued'),
    [alerts],
  )

  function openNewRule() {
    navigate('/analise/score/nova')
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
            label: 'Alertas de preço',
            value: String(priceTargetCount),
            colorClass: 'text-nf-blue',
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

      {/* ── Grid de 3 colunas (desktop lg+) ── */}
      <div className="hidden lg:grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ScoreCol onNewRule={openNewRule} onEditRule={openEditRule} />
        <AlertasCol />
        <ProventosCol />
      </div>

      {/* ── Seções inline mobile (< lg) ── */}
      <div className="block lg:hidden flex flex-col gap-6">
        {/* Score Fundamentalista */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-white">Score Fundamentalista</h3>
            <Link to="/analise/score" className="text-[12px] text-nf-blue">
              Ver score →
            </Link>
          </div>
          {rules.length === 0 ? (
            <p className="text-[13px] text-white/40">Nenhuma regra criada ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from(groups.entries()).map(([name, groupRules]) => {
                const isActive = groupRules.some((r) => r.id === activeRuleId)
                const totalPoints = groupRules.reduce((s: number, r: ScoreRule) => s + r.points, 0)
                return (
                  <div
                    key={name}
                    className="rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-white">{name}</span>
                        {isActive && (
                          <span className="rounded-full border border-nf-blue/40 bg-nf-blue/12 px-1.5 py-0.5 text-[9px] font-medium text-nf-blue">
                            Ativo
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[12px] font-semibold tabular-nums ${
                          totalPoints > 0 ? 'text-nf-green' : totalPoints < 0 ? 'text-nf-pink' : 'text-white/50'
                        }`}
                      >
                        {totalPoints > 0 ? `+${totalPoints}` : totalPoints} pt
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {groupRules.map((rule: ScoreRule) => (
                        <div key={rule.id} className="flex items-center justify-between">
                          <span className="text-[11px] text-white/60 min-w-0 flex-1">
                            {METRIC_LABELS[rule.metric] ?? rule.metric}
                          </span>
                          <span
                            className={`text-[11px] font-semibold tabular-nums ml-2 shrink-0 ${
                              rule.points > 0 ? 'text-nf-green' : rule.points < 0 ? 'text-nf-pink' : 'text-white/40'
                            }`}
                          >
                            {rule.points > 0 ? `+${rule.points}` : rule.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Alertas recentes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-white">Alertas recentes</h3>
              {novosCount > 0 && (
                <span className="rounded-full border border-nf-pink/50 bg-nf-pink/12 px-2 py-0.5 text-[10px] text-nf-pink">
                  {novosCount} novos
                </span>
              )}
            </div>
            <Link to="/analise/alertas" className="text-[12px] text-nf-blue">
              Ver alertas →
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-[13px] text-white/40">Nenhum alerta gerado.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[...alerts]
                .sort((a: Alert, b: Alert) => {
                  const order: Record<string, number> = { novo: 0, lido: 1, ignorado: 2 }
                  const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3)
                  if (diff !== 0) return diff
                  return b.created_at.localeCompare(a.created_at)
                })
                .slice(0, 4)
                .map((alert: Alert) => (
                  <div
                    key={alert.id}
                    className="rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13px] font-semibold text-white">{alert.ticker}</span>
                        {alert.status === 'novo' && (
                          <span className="shrink-0 rounded-full border border-nf-blue/50 bg-nf-blue/12 px-1.5 py-0.5 text-[10px] text-nf-blue">
                            Novo
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/50 line-clamp-2">{alert.description}</p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Preço-teto */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-white">Preço-teto</h3>
            <Link to="/analise/alertas" className="text-[12px] text-nf-blue">
              Ver análise →
            </Link>
          </div>
          {overvaluedAlerts.length === 0 ? (
            <p className="text-[13px] text-white/40">Nenhum ativo acima do teto.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {overvaluedAlerts.map((alert: Alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between gap-2 rounded-[10px] border border-white/[0.06] bg-[#1B1B1B] px-3 py-2.5"
                >
                  <span className="text-[13px] font-bold text-white">{alert.ticker}</span>
                  <div className="text-right">
                    <p className="text-[12px] text-white/70">{alert.title}</p>
                    <p className="text-[11px] text-nf-pink">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
