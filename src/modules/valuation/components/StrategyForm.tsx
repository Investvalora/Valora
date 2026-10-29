/**
 * StrategyForm — formulário de criação/edição de estratégia.
 *
 * Usado em dois contextos:
 *   - NovaEstrategiaPage  (mobile: tela cheia; desktop: painel lateral)
 *   - StrategyManager     (modal de edição de estratégia existente)
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useStrategies, type ValuationStrategy, type StrategyInput } from '../hooks/useStrategies'
import { CustomRuleEditor } from './CustomRuleEditor'
import { validCustomRules } from '../utils/customStrategy'
import { STRATEGY_ASSET_LABELS, strategyAssetTypes } from '../utils/strategyAssetTypes'

export const STRATEGY_DEFAULTS: StrategyInput = {
  name: '',
  method: 'custom',
  min_dy: 0.06,
  safety_discount: 0,
  show_in_assets: true,
  custom_rules: [],
  rule_match: 'all',
}

const inputClass =
  'mt-1 w-full rounded-lg border border-white/15 bg-[#393939] px-3 py-2.5 text-sm text-white focus:border-[#9299ff] focus:outline-none focus:ring-1 focus:ring-[#9299ff]/30'

interface StrategyFormProps {
  /** Estratégia sendo editada (undefined = criação) */
  editing?: ValuationStrategy | null
  initialDraft?: StrategyInput
  onSuccess: () => void
  onCancel: () => void
  /** Quando true, renderiza os botões de ação numa barra fixa no fundo (mobile) */
  fixedActions?: boolean
  /** Aguarda a entrada da tela antes de abrir o teclado no primeiro campo. */
  autoFocusDelay?: number
}

export function StrategyForm({
  editing,
  initialDraft,
  onSuccess,
  onCancel,
  fixedActions = false,
  autoFocusDelay = 0,
}: StrategyFormProps) {
  const { save } = useStrategies()
  const [draft, setDraft] = useState<StrategyInput>(
    editing ?? initialDraft ?? STRATEGY_DEFAULTS,
  )
  const [error, setError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = window.setTimeout(() => nameInputRef.current?.focus(), autoFocusDelay)
    return () => window.clearTimeout(id)
  }, [autoFocusDelay])

  const isCreating = !editing

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await save.mutateAsync({ ...draft, ...(editing ? { id: editing.id } : {}) })
      onSuccess()
    } catch {
      setError(
        'Não foi possível salvar. Confira os campos e use um nome diferente das outras estratégias.',
      )
    }
  }

  const canSubmit =
    !save.isPending &&
    draft.name.trim().length > 0 &&
    (draft.asset_types?.length ?? 1) > 0 &&
    !(draft.method === 'custom' && !validCustomRules(draft.custom_rules ?? []))

  const actionBar = (
    <div
      className={
        fixedActions
          ? 'fixed bottom-0 left-0 right-0 z-10 flex gap-3 border-t border-white/[0.08] bg-[#1C1C1C] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:hidden'
          : 'hidden'
      }
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={save.isPending}
        className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/5 disabled:opacity-40"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={!canSubmit}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {save.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
          </>
        ) : isCreating ? (
          'Criar estratégia'
        ) : (
          'Salvar estratégia'
        )}
      </button>
    </div>
  )

  const desktopActionBar = (
    <div className="flex gap-3 md:flex hidden">
      <button
        type="button"
        onClick={onCancel}
        disabled={save.isPending}
        className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/5 disabled:opacity-40"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={!canSubmit}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {save.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
          </>
        ) : isCreating ? (
          'Criar estratégia'
        ) : (
          'Salvar estratégia'
        )}
      </button>
    </div>
  )

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 px-5 pb-32 pt-5 text-sm text-gray-300 md:px-6 md:pb-8"
    >
      {/* Nome */}
      <label className="block">
        <span className="text-xs font-medium text-white/60">Nome da estratégia</span>
        <input
          ref={nameInputRef}
          className={inputClass}
          required
          maxLength={60}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>

      {/* Método */}
      <label className="block">
        <span className="text-xs font-medium text-white/60">Método</span>
        <select
          className={inputClass}
          value={draft.method}
          onChange={(e) =>
            setDraft({
              ...draft,
              method: e.target.value as StrategyInput['method'],
              asset_types: null,
              fii_inflation: draft.fii_inflation ?? 0.05,
              fii_treasury: draft.fii_treasury ?? 0.08,
              fii_tax: draft.fii_tax ?? 0.15,
              fii_premium: draft.fii_premium ?? 0.01,
            })
          }
        >
          <option value="custom">Estratégia do zero</option>
          <option value="bazin">Bazin</option>
          <option value="graham">Graham</option>
          <option value="fii">Preço-teto de FIIs</option>
        </select>
      </label>

      {/* FII: taxas */}
      {draft.method === 'fii' && (
        <>
          {(
            [
              ['fii_inflation', 'Inflação anual estimada (%)'],
              ['fii_treasury', 'Taxa real do Tesouro IPCA+ (% a.a.)'],
              ['fii_tax', 'Imposto estimado sobre o rendimento (%)'],
              ['fii_premium', 'Prêmio de risco adicional (%)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs font-medium text-white/60">{label}</span>
              <input
                className={inputClass}
                type="number"
                required
                min="0"
                max={key === 'fii_tax' ? '99' : '100'}
                step="any"
                value={
                  draft[key] == null || !Number.isFinite(draft[key])
                    ? ''
                    : Number((draft[key]! * 100).toFixed(4))
                }
                onChange={(e) => setDraft({ ...draft, [key]: e.target.valueAsNumber / 100 })}
              />
            </label>
          ))}
          <p className="text-xs leading-relaxed text-white/45">
            A coluna calcula o teto com os proventos de 12 meses de cada FII. Outros tipos de ativo
            ficam sem referência. Estas taxas são premissas fixas, editáveis aqui; não acompanham o
            mercado automaticamente.
          </p>
        </>
      )}

      {/* Custom: combinar condições + regras */}
      {draft.method === 'custom' && (
        <>
          <label className="block">
            <span className="text-xs font-medium text-white/60">Combinar condições</span>
            <select
              className={inputClass}
              value={draft.rule_match ?? 'all'}
              onChange={(e) =>
                setDraft({ ...draft, rule_match: e.target.value as 'all' | 'any' })
              }
            >
              <option value="all">Todas devem ser atendidas (E)</option>
              <option value="any">Pelo menos uma deve ser atendida (OU)</option>
            </select>
          </label>
          <CustomRuleEditor
            rules={draft.custom_rules ?? []}
            onChange={(custom_rules) => setDraft({ ...draft, custom_rules })}
          />
          <p className="text-xs text-gray-400">
            A coluna mostra "Atende", "Não atende" ou "Dados insuficientes". Você define os
            critérios; não é necessário usar Bazin ou Graham.
          </p>
        </>
      )}

      {/* Bazin: DY mínimo */}
      {draft.method === 'bazin' && (
        <label className="block">
          <span className="text-xs font-medium text-white/60">DY mínimo (%)</span>
          <input
            className={inputClass}
            type="number"
            required
            min="0.1"
            max="100"
            step="any"
            value={
              Number.isFinite(draft.min_dy)
                ? Number((draft.min_dy * 100).toFixed(4))
                : ''
            }
            onChange={(e) => setDraft({ ...draft, min_dy: e.target.valueAsNumber / 100 })}
          />
        </label>
      )}

      {/* Bazin/Graham/FII: desconto adicional */}
      {draft.method !== 'custom' && (
        <>
          <label className="block">
            <span className="text-xs font-medium text-white/60">
              Desconto adicional sobre a referência (%)
            </span>
            <input
              className={inputClass}
              type="number"
              required
              min="0"
              max="99"
              step="0.1"
              value={
                Number.isFinite(draft.safety_discount)
                  ? Number((draft.safety_discount * 100).toFixed(4))
                  : ''
              }
              onChange={(e) =>
                setDraft({ ...draft, safety_discount: e.target.valueAsNumber / 100 })
              }
            />
          </label>
          <p className="text-xs text-gray-400">
            Exemplo: referência de R$ 100 com desconto de 20% resulta em R$ 80. O cálculo usa os
            dados disponíveis de cada ativo, respeitando a adequação do método.
          </p>
        </>
      )}

      {/* Classes de ativo */}
      <fieldset className="rounded-xl border border-white/10 p-3">
        <legend className="px-1 text-xs text-white/60">Aplicar estratégia em</legend>
        <div className="grid grid-cols-2 gap-3">
          {strategyAssetTypes(draft.method).map((type) => {
            const selected = draft.asset_types ?? strategyAssetTypes(draft.method)
            return (
              <label key={type} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(type)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      asset_types: e.target.checked
                        ? [...selected, type]
                        : selected.filter((v) => v !== type),
                    })
                  }
                />
                {STRATEGY_ASSET_LABELS[type]}
              </label>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-white/40">
          Selecione pelo menos uma classe. Cada método mostra somente os tipos de ativo
          compatíveis.
        </p>
      </fieldset>

      {/* Exibir em Ativos */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.show_in_assets}
          onChange={(e) => setDraft({ ...draft, show_in_assets: e.target.checked })}
        />
        Exibir esta estratégia em Ativos
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Ações desktop (dentro do painel / modal) */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={save.isPending}
          className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/5 disabled:opacity-40 md:flex hidden"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 md:flex hidden"
        >
          {save.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : isCreating ? (
            'Criar estratégia'
          ) : (
            'Salvar estratégia'
          )}
        </button>
      </div>

      {/* Ações mobile fixas no fundo */}
      {fixedActions && (
        <div className="fixed bottom-0 left-0 right-0 z-10 flex gap-3 border-t border-white/[0.08] bg-[#1C1C1C] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <button
            type="button"
            onClick={onCancel}
            disabled={save.isPending}
            className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : isCreating ? (
              'Criar estratégia'
            ) : (
              'Salvar estratégia'
            )}
          </button>
        </div>
      )}
    </form>
  )
}
