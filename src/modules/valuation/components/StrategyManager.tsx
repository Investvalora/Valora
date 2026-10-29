import { Fragment, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../../shared/components/Modal'
import { useStrategies, type ValuationStrategy } from '../hooks/useStrategies'
import { StrategyForm } from './StrategyForm'
import { CUSTOM_METRICS } from '../utils/customStrategy'

export function StrategyManager({ initialDraft }: { initialDraft?: import('../hooks/useStrategies').StrategyInput } = {}) {
  const navigate = useNavigate()
  const { strategies, isLoading, isError, save, remove } = useStrategies()
  const [deleting, setDeleting] = useState<ValuationStrategy | null>(null)
  const [editing, setEditing] = useState<ValuationStrategy | null>(null)
  const [deleteError, setDeleteError] = useState('')

  // Se initialDraft foi passado (via InvestmentCalculators), abre a rota de nova estratégia
  // com os params pré-preenchidos — isso é tratado na EstrategiasPage

  async function toggle(strategy: ValuationStrategy) {
    try {
      await save.mutateAsync({ ...strategy, show_in_assets: !strategy.show_in_assets })
    } catch {
      // silencia — erro de toggle não precisa de alerta global
    }
  }

  return (
    <section aria-label="Minhas estratégias" className="rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-5 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-sm font-medium text-white">Minhas estratégias</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Crie sua estratégia do zero com indicadores e condições, ou use Bazin e Graham. As
            estratégias escolhidas aparecem em Ativos › Posições e nos cards do app.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/analise/estrategias/nova')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.14] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova estratégia
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Carregando estratégias…</p>}
      {isError && <p role="alert" className="text-sm text-red-300">Não foi possível carregar suas estratégias.</p>}
      {!isLoading && !isError && strategies.length === 0 && (
        <p className="text-sm text-gray-400">
          Você ainda não criou estratégias. Comece do zero, por exemplo combinando DY ≥ 6% e P/L ≤ 10.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {strategies.map((strategy) => (
          <article key={strategy.id} className="flex min-w-0 flex-col rounded-xl border border-white/[0.09] bg-[#222222] px-4 pt-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-medium text-white">{strategy.name}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                  {strategy.method === 'custom'
                    ? `Estratégia do zero · ${strategy.custom_rules?.length ?? 0} condições · ${strategy.rule_match === 'any' ? 'pelo menos uma deve ser atendida (OU)' : 'todas devem ser atendidas (E)'}`
                    : `${strategy.method === 'fii' ? 'Preço-teto de FIIs' : strategy.method === 'bazin' ? 'Bazin' : 'Graham'} · desconto adicional ${(strategy.safety_discount * 100).toLocaleString('pt-BR')}%`}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Editar ${strategy.name}`}
                onClick={() => setEditing(strategy)}
                className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Excluir ${strategy.name}`}
                onClick={() => setDeleting(strategy)}
                className="rounded-md p-1.5 text-[#e477a7] hover:bg-[#e477a7]/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-4 mt-3 flex flex-wrap items-center gap-1.5">
              {strategy.method === 'fii' && (
                <p className="w-full text-[10px] text-white/45">
                  Inflação {(100 * (strategy.fii_inflation ?? 0)).toLocaleString('pt-BR')}% ·
                  IPCA+ {(100 * (strategy.fii_treasury ?? 0)).toLocaleString('pt-BR')}% ·
                  imposto {(100 * (strategy.fii_tax ?? 0)).toLocaleString('pt-BR')}% ·
                  prêmio {(100 * (strategy.fii_premium ?? 0)).toLocaleString('pt-BR')}%
                </p>
              )}
              {strategy.method === 'custom'
                ? strategy.custom_rules?.map((rule, index) => (
                    <Fragment key={index}>
                      {index > 0 && (
                        <span className="text-[10px] text-white/40">
                          {strategy.rule_match === 'any' ? 'OU' : 'E'}
                        </span>
                      )}
                      <span className="rounded-md border border-[#797fff]/30 bg-[#797fff]/10 px-2 py-1 text-[10px] text-[#c2c5ff]">
                        {CUSTOM_METRICS[rule.metric]}{' '}
                        {rule.operator === 'between'
                          ? `${rule.min} a ${rule.max}`
                          : `${{ lt: '<', lte: '≤', gt: '>', gte: '≥' }[rule.operator]} ${rule.min}`}
                      </span>
                    </Fragment>
                  ))
                : (
                    <span className="rounded-md border border-[#797fff]/30 bg-[#797fff]/10 px-2 py-1 text-[10px] text-[#c2c5ff]">
                      {strategy.method === 'bazin'
                        ? `DY mínimo ${(strategy.min_dy * 100).toLocaleString('pt-BR')}%`
                        : strategy.method === 'fii'
                        ? 'IPCA+ líquido + prêmio de risco'
                        : '√(22,5 × LPA × VPA)'}
                    </span>
                  )}
            </div>

            <label className="mt-auto flex cursor-pointer items-center justify-between gap-3 border-t border-white/[0.06] py-3 text-[11px] text-white/60">
              <span>Exibir em Ativos › Posições</span>
              <input
                aria-label="Exibir em Ativos"
                type="checkbox"
                className="peer sr-only"
                checked={strategy.show_in_assets}
                disabled={save.isPending}
                onChange={() => void toggle(strategy)}
              />
              <span
                aria-hidden="true"
                className="relative h-[18px] w-8 shrink-0 rounded-full bg-[#555] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#347fcb] peer-checked:after:translate-x-[14px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#a0a7ff] peer-disabled:opacity-40"
              />
            </label>
          </article>
        ))}
      </div>

      {deleteError && <p role="alert" className="text-sm text-red-300">{deleteError}</p>}

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={Boolean(deleting)}
        title="Excluir estratégia"
        onClose={() => setDeleting(null)}
        dismissible={!remove?.isPending}
      >
        <p className="text-sm text-white/60">
          Excluir "{deleting?.name}"? Ela também deixará de aparecer em Ativos.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            disabled={remove?.isPending}
            onClick={() => setDeleting(null)}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={remove?.isPending}
            onClick={async () => {
              if (!deleting) return
              try {
                await remove.mutateAsync(deleting.id)
                setDeleting(null)
                setDeleteError('')
              } catch {
                setDeleteError('Não foi possível excluir a estratégia. Tente novamente.')
                setDeleting(null)
              }
            }}
            className="rounded-full bg-[#e477a7]/20 px-4 py-2 text-sm text-[#f29fc3]"
          >
            {remove?.isPending ? 'Excluindo…' : 'Excluir estratégia'}
          </button>
        </div>
      </Modal>

      {/* Modal de edição de estratégia existente */}
      <Modal
        isOpen={editing !== null}
        title="Editar estratégia"
        onClose={() => setEditing(null)}
        dismissible
        variant="score"
      >
        {editing && (
          <StrategyForm
            editing={editing}
            onSuccess={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </section>
  )
}
