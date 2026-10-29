import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Modal } from '../../../shared/components/Modal'
import { useIsMobile } from '../../../shared/hooks/useIsMobile'
import { StrategyForm, STRATEGY_DEFAULTS } from './StrategyForm'
import { EstrategiasPage } from './EstrategiasPage'
import type { StrategyInput } from '../hooks/useStrategies'

/**
 * NovaEstrategiaPage
 *
 * - Mobile  → tela cheia com header fixo + barra de ações fixed no fundo
 * - Desktop → painel lateral (Modal variant="score") sobre EstrategiasPage
 *
 * Aceita searchParams para pré-preencher o formulário via InvestmentCalculators:
 *   ?method=fii&name=...&fii_inflation=...&fii_treasury=...&fii_tax=...&fii_premium=...&min_dy=...
 */
export function NovaEstrategiaPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchParams] = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  const closeTimer = useRef<number | null>(null)

  // Montar initialDraft a partir dos searchParams (vindo de InvestmentCalculators)
  const initialDraft: StrategyInput = (() => {
    const method = (searchParams.get('method') ?? 'custom') as StrategyInput['method']
    const name = searchParams.get('name') ?? ''
    const base = { ...STRATEGY_DEFAULTS, method, name }

    if (method === 'fii') {
      return {
        ...base,
        fii_inflation: parseFloatParam(searchParams.get('fii_inflation')) ?? 0.05,
        fii_treasury: parseFloatParam(searchParams.get('fii_treasury')) ?? 0.08,
        fii_tax: parseFloatParam(searchParams.get('fii_tax')) ?? 0.15,
        fii_premium: parseFloatParam(searchParams.get('fii_premium')) ?? 0.01,
        min_dy: parseFloatParam(searchParams.get('min_dy')) ?? 0.06,
        safety_discount: 0,
      }
    }
    if (method === 'bazin') {
      return {
        ...base,
        min_dy: parseFloatParam(searchParams.get('min_dy')) ?? 0.06,
        safety_discount: 0,
      }
    }
    return base
  })()

  function handleClose() {
    if (!isMobile) {
      setIsOpen(false)
      closeTimer.current = window.setTimeout(() => {
        navigate('/analise/estrategias', { replace: true })
      }, 300)
    } else {
      navigate('/analise/estrategias', { replace: true })
    }
  }

  function handleSuccess() {
    handleClose()
  }

  // ── Desktop: painel lateral sobre EstrategiasPage ──────────────────────
  if (!isMobile) {
    return (
      <>
        <EstrategiasPage />
        <Modal
          isOpen={isOpen}
          title="Nova estratégia"
          onClose={handleClose}
          dismissible={isOpen}
          variant="score"
          closing={!isOpen}
        >
          <StrategyForm
            initialDraft={initialDraft}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </Modal>
      </>
    )
  }

  // ── Mobile: tela cheia com header fixo ────────────────────────────────
  return createPortal(
    <div
      className="valuation-route-enter fixed inset-0 z-50 flex flex-col bg-[#121212] text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Header fixo no topo real da tela */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#121212] px-4 py-4">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Voltar"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-white transition-colors hover:bg-white/[0.14]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] text-white/40">Análise › Estratégias</p>
          <h1 className="text-[18px] font-semibold leading-tight text-white">Nova estratégia</h1>
        </div>
      </header>

      {/* Conteúdo scrollável */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <StrategyForm
          initialDraft={initialDraft}
          onSuccess={handleSuccess}
          onCancel={handleClose}
          fixedActions
          autoFocusDelay={280}
        />
      </div>
    </div>,
    document.body,
  )
}

function parseFloatParam(value: string | null): number | null {
  if (value === null) return null
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}
