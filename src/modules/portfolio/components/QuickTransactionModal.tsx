import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useAddTransaction } from '../hooks/useTransactions'
import { useAddFixedIncomePosition } from '../hooks/useFixedIncomePositions'
import { useCalcFixedIncome } from '../hooks/useCalcFixedIncome'
import { usePositions } from '../hooks/usePositions'
import { useWallets } from '../hooks/useWallets'
import { positionService } from '../services/positionService'
import { ASSET_CLASS_LABEL } from '../composition'
import {
  FIXED_INCOME_TYPE_INDEXER,
  FIXED_INCOME_TYPE_LABEL,
  FIXED_INCOME_RATE_LABEL,
} from '../types'
import type { AssetType, FixedIncomeType, NewFixedIncomePosition } from '../types'

interface QuickTransactionModalProps {
  isOpen: boolean
  onClose: () => void
}

// Tipos de ativo de renda variável (excluindo fixed_income que tem form próprio)
const VARIABLE_ASSET_TYPES = (Object.entries(ASSET_CLASS_LABEL) as [AssetType, string][]).filter(
  ([key]) => key !== 'fixed_income',
)

// Categoria selecionada: renda variável, renda fixa ou tesouro direto
type FormCategory = AssetType | 'fixed_income' | 'tesouro_direto'

/** Variantes de Tesouro Direto — as `_juros` mapeiam para o tipo-base no banco */
type TesouroDiretoAtivo =
  | 'tesouro_selic'
  | 'tesouro_ipca'
  | 'tesouro_pre'
  | 'tesouro_ipca_juros'
  | 'tesouro_pre_juros'

const TD_NAME: Record<TesouroDiretoAtivo, string> = {
  tesouro_selic: 'Tesouro Selic',
  tesouro_ipca: 'Tesouro IPCA+',
  tesouro_pre: 'Tesouro Prefixado',
  tesouro_ipca_juros: 'Tesouro IPCA+ com Juros Semestrais',
  tesouro_pre_juros: 'Tesouro Prefixado com Juros Semestrais',
}

const TD_DB_TYPE: Record<TesouroDiretoAtivo, FixedIncomeType> = {
  tesouro_selic: 'tesouro_selic',
  tesouro_ipca: 'tesouro_ipca',
  tesouro_pre: 'tesouro_pre',
  tesouro_ipca_juros: 'tesouro_ipca',
  tesouro_pre_juros: 'tesouro_pre',
}

const RF_TYPES: { value: FixedIncomeType; label: string }[] = [
  { value: 'cdb_cdi',  label: 'CDB CDI'  },
  { value: 'cdb_pre',  label: 'CDB Pré'  },
  { value: 'lci_cdi',  label: 'LCI CDI'  },
  { value: 'lca_cdi',  label: 'LCA CDI'  },
  { value: 'lci_pre',  label: 'LCI Pré'  },
  { value: 'lca_pre',  label: 'LCA Pré'  },
]

export function QuickTransactionModal({ isOpen, onClose }: QuickTransactionModalProps) {
  const { selectedWallet } = useWallets()
  const { data: positions = [] } = usePositions(selectedWallet?.id ?? '')
  const addTransaction = useAddTransaction()
  const addFI = useAddFixedIncomePosition()
  const { calc: calcValues } = useCalcFixedIncome()

  // ── estado comum ──────────────────────────────────────────────────────────
  const [category, setCategory] = useState<FormCategory | ''>('')
  const [error, setError] = useState('')

  // ── estado renda variável ─────────────────────────────────────────────────
  const [type, setType]           = useState<'buy' | 'sell'>('buy')
  const [ticker, setTicker]       = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity]   = useState('')
  const [price, setPrice]         = useState('')
  const [otherCosts, setOtherCosts] = useState('')

  // ── estado renda fixa ─────────────────────────────────────────────────────
  const [rfEmissor, setRfEmissor]       = useState('')
  const [rfTipo, setRfTipo]             = useState<FixedIncomeType | ''>('')
  const [rfTaxa, setRfTaxa]             = useState('')
  const [rfValor, setRfValor]           = useState('')
  const [rfDate, setRfDate]             = useState(new Date().toISOString().slice(0, 10))
  const [rfMaturity, setRfMaturity]     = useState('')

  // ── estado tesouro direto ─────────────────────────────────────────────────
  const [tdAtivo, setTdAtivo]           = useState<TesouroDiretoAtivo | ''>('')
  const [tdTaxa, setTdTaxa]             = useState('')
  const [tdDate, setTdDate]             = useState(new Date().toISOString().slice(0, 10))
  const [tdMaturity, setTdMaturity]     = useState('')
  const [tdQuantity, setTdQuantity]     = useState('')
  const [tdPrice, setTdPrice]           = useState('')
  const [tdOtherCosts, setTdOtherCosts] = useState('')

  const isSaving = addTransaction.isPending || addFI.isPending

  // ── derivados renda variável ──────────────────────────────────────────────
  const parsedQuantity  = Number(quantity.replace(',', '.'))
  const parsedPrice     = Number(price.replace(',', '.'))
  const parsedOtherCosts = Number(otherCosts.replace(',', '.')) || 0
  const totalValue =
    Number.isFinite(parsedQuantity) && Number.isFinite(parsedPrice)
      ? parsedQuantity * parsedPrice + parsedOtherCosts
      : 0

  // ── derivados tesouro direto ──────────────────────────────────────────────
  const tdParsedQty    = Number(tdQuantity.replace(',', '.'))
  const tdParsedPrice  = Number(tdPrice.replace(',', '.'))
  const tdParsedOther  = Number(tdOtherCosts.replace(',', '.')) || 0
  const tdTotal =
    Number.isFinite(tdParsedQty) && Number.isFinite(tdParsedPrice)
      ? tdParsedQty * tdParsedPrice + tdParsedOther
      : 0

  // ── derivados renda fixa (indexador e label da taxa) ──────────────────────
  const rfIndexer  = rfTipo ? FIXED_INCOME_TYPE_INDEXER[rfTipo] : null
  const rfTaxaLabel = rfIndexer ? FIXED_INCOME_RATE_LABEL[rfIndexer] : 'Taxa'

  // ── derivados tesouro direto (label da taxa) ──────────────────────────────
  const tdDbType   = tdAtivo ? TD_DB_TYPE[tdAtivo] : null
  const tdIndexer  = tdDbType ? FIXED_INCOME_TYPE_INDEXER[tdDbType] : null
  const tdTaxaLabel = tdIndexer ? FIXED_INCOME_RATE_LABEL[tdIndexer] : 'Taxa'

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  function resetAll() {
    setCategory('')
    setError('')
    setType('buy')
    setTicker(''); setDate(new Date().toISOString().slice(0, 10))
    setQuantity(''); setPrice(''); setOtherCosts('')
    setRfEmissor(''); setRfTipo(''); setRfTaxa('')
    setRfValor(''); setRfDate(new Date().toISOString().slice(0, 10)); setRfMaturity('')
    setTdAtivo(''); setTdTaxa(''); setTdDate(new Date().toISOString().slice(0, 10))
    setTdMaturity(''); setTdQuantity(''); setTdPrice(''); setTdOtherCosts('')
  }

  function handleClose() {
    resetAll()
    onClose()
  }

  // ── submit renda variável ─────────────────────────────────────────────────
  async function submitVariavel(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const normalizedTicker = ticker.trim().toUpperCase()
    if (!normalizedTicker || !date || parsedQuantity <= 0 || parsedPrice < 0) {
      setError('Preencha ativo, data, quantidade e preço válidos.')
      return
    }
    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedPrice)) {
      setError('Quantidade e preço precisam ser números válidos.')
      return
    }
    if (type === 'sell') {
      const position = positions.find((item) => item.ticker === normalizedTicker)
      if (!position || parsedQuantity > Number(position.quantity)) {
        setError('A venda não pode superar a quantidade desta carteira.')
        return
      }
    }
    try {
      const asset = await positionService.findAssetByTicker(normalizedTicker)
      if (!asset) { setError('Ativo não encontrado no catálogo.'); return }
      await addTransaction.mutateAsync({
        ticker: normalizedTicker, type,
        transaction_date: date,
        quantity: parsedQuantity,
        price: parsedPrice,
      })
      resetAll()
      onClose()
    } catch {
      setError('Não foi possível salvar o lançamento. Tente novamente.')
    }
  }

  // ── submit renda fixa ─────────────────────────────────────────────────────
  function submitRendaFixa(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!rfEmissor.trim()) { setError('Informe o emissor.'); return }
    if (!rfTipo) { setError('Selecione o tipo de título.'); return }
    const taxa = Number(rfTaxa.replace(',', '.'))
    if (isNaN(taxa) || taxa < 0) { setError('Informe uma taxa válida.'); return }
    const valor = Number(rfValor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) { setError('Informe o valor aplicado.'); return }
    if (!rfDate) { setError('Informe a data da transação.'); return }

    const payload: NewFixedIncomePosition = {
      name: rfEmissor.trim(),
      type: rfTipo,
      indexer: FIXED_INCOME_TYPE_INDEXER[rfTipo],
      rate: taxa,
      principal: valor,
      application_date: rfDate,
      maturity_date: rfMaturity.trim() || null,
    }
    addFI.mutate(payload, {
      onSuccess: () => { calcValues(); resetAll(); onClose() },
      onError: () => setError('Não foi possível salvar. Tente novamente.'),
    })
  }

  // ── submit tesouro direto ─────────────────────────────────────────────────
  function submitTesouroDireto(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!tdAtivo) { setError('Selecione o ativo.'); return }
    const taxa = Number(tdTaxa.replace(',', '.'))
    if (isNaN(taxa) || taxa < 0) { setError('Informe uma taxa válida.'); return }
    if (!tdDate) { setError('Informe a data da transação.'); return }
    if (tdParsedQty <= 0 || !Number.isFinite(tdParsedQty)) { setError('Informe a quantidade (mín. 0,01).'); return }
    if (tdParsedPrice < 0 || !Number.isFinite(tdParsedPrice)) { setError('Informe o preço.'); return }

    const dbType = TD_DB_TYPE[tdAtivo]
    const payload: NewFixedIncomePosition = {
      name: TD_NAME[tdAtivo],
      type: dbType,
      indexer: FIXED_INCOME_TYPE_INDEXER[dbType],
      rate: taxa,
      principal: tdParsedQty * tdParsedPrice + tdParsedOther,
      application_date: tdDate,
      maturity_date: tdMaturity.trim() || null,
    }
    addFI.mutate(payload, {
      onSuccess: () => { calcValues(); resetAll(); onClose() },
      onError: () => setError('Não foi possível salvar. Tente novamente.'),
    })
  }

  // ── estilos ───────────────────────────────────────────────────────────────
  const inputClass =
    'w-full rounded-xl border border-white/[0.12] bg-[#2A2A2A] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.3]'
  const labelClass = 'block text-xs text-white/50 mb-1'

  const isVariavel = category !== '' && category !== 'fixed_income' && category !== 'tesouro_direto'
  const isRendaFixa = category === 'fixed_income'
  const isTesouroDireto = category === 'tesouro_direto'

  return (
    <Modal
      isOpen={isOpen}
      title="Adicionar Lançamento"
      onClose={handleClose}
      dismissible={!isSaving}
    >
      {/* Seletor de categoria */}
      <div className="mb-5">
        <label htmlFor="qt-asset-class" className={labelClass}>Tipo de ativo</label>
        <select
          id="qt-asset-class"
          value={category}
          onChange={(e) => { setCategory(e.target.value as FormCategory | ''); setError('') }}
          className={`${inputClass} appearance-none`}
        >
          <option value="" disabled>Selecione</option>
          {VARIABLE_ASSET_TYPES.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
          <option value="fixed_income">Renda Fixa</option>
          <option value="tesouro_direto">Tesouro Direto</option>
        </select>
      </div>

      {/* ── Formulário Renda Variável ──────────────────────────────────── */}
      {isVariavel && (
        <form onSubmit={submitVariavel} className="space-y-5">
          {/* Toggle Compra / Venda */}
          <div className="flex rounded-xl bg-[#2A2A2A] p-1 gap-1">
            {(['buy', 'sell'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? 'bg-[#3A3A3A] border border-white/[0.15] text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                {t === 'buy' ? 'Compra' : 'Venda'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="qt-ticker" className={labelClass}>Ativo</label>
              <input
                id="qt-ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className={inputClass}
                placeholder="PETR4"
                autoCapitalize="characters"
                maxLength={20}
              />
            </div>
            <div>
              <label htmlFor="qt-date" className={labelClass}>Data da transação</label>
              <input id="qt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="qt-qty" className={labelClass}>Quantidade</label>
              <input id="qt-qty" type="number" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} placeholder="0" min={0} />
            </div>
            <div>
              <label htmlFor="qt-price" className={labelClass}>Preço</label>
              <input id="qt-price" type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
            </div>
            <div className="col-span-2">
              <label htmlFor="qt-other-costs" className={labelClass}>Outros custos <span className="text-white/30">OPCIONAL</span></label>
              <input id="qt-other-costs" type="number" inputMode="decimal" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-white/50">Valor total</p>
            <p className="text-xl font-semibold text-white">{fmt(totalValue)}</p>
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancelar</button>
            <button type="submit" disabled={isSaving || !selectedWallet} className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {addTransaction.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* ── Formulário Renda Fixa ──────────────────────────────────────── */}
      {isRendaFixa && (
        <form onSubmit={submitRendaFixa} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="qt-rf-emissor" className={labelClass}>Emissor</label>
              <input id="qt-rf-emissor" type="text" autoComplete="off" value={rfEmissor} onChange={(e) => setRfEmissor(e.target.value)} className={inputClass} placeholder="Ex: Banco Itaú" />
            </div>
            <div>
              <label htmlFor="qt-rf-tipo" className={labelClass}>Tipo de título</label>
              <select id="qt-rf-tipo" value={rfTipo} onChange={(e) => setRfTipo(e.target.value as FixedIncomeType)} className={`${inputClass} appearance-none`}>
                <option value="">Selecione</option>
                {RF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="qt-rf-indexador" className={labelClass}>Indexador</label>
              <div className="rounded-xl border border-white/[0.12] bg-[#2A2A2A] px-3 py-2.5 text-sm text-white/50">
                {rfIndexer ? { cdi: 'CDI', ipca: 'IPCA', pre: 'Prefixado', selic: 'SELIC' }[rfIndexer] : '—'}
              </div>
            </div>
            <div>
              <label htmlFor="qt-rf-taxa" className={labelClass}>{rfTaxaLabel}</label>
              <input id="qt-rf-taxa" type="number" inputMode="decimal" value={rfTaxa} onChange={(e) => setRfTaxa(e.target.value)} className={inputClass} placeholder="110" min={0} disabled={!rfTipo} />
            </div>
            <div>
              <label htmlFor="qt-rf-valor" className={labelClass}>Valor (R$)</label>
              <input id="qt-rf-valor" type="number" inputMode="decimal" value={rfValor} onChange={(e) => setRfValor(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
            </div>
            <div>
              <label htmlFor="qt-rf-date" className={labelClass}>Data da transação</label>
              <input id="qt-rf-date" type="date" value={rfDate} onChange={(e) => setRfDate(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label htmlFor="qt-rf-maturity" className={labelClass}>Data de vencimento <span className="text-white/30">OPCIONAL</span></label>
              <input id="qt-rf-maturity" type="date" value={rfMaturity} onChange={(e) => setRfMaturity(e.target.value)} className={inputClass} />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancelar</button>
            <button type="submit" disabled={isSaving || !selectedWallet} className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {addFI.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* ── Formulário Tesouro Direto ──────────────────────────────────── */}
      {isTesouroDireto && (
        <form onSubmit={submitTesouroDireto} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="qt-td-ativo" className={labelClass}>Ativo</label>
              <select id="qt-td-ativo" value={tdAtivo} onChange={(e) => setTdAtivo(e.target.value as TesouroDiretoAtivo)} className={`${inputClass} appearance-none`}>
                <option value="">Selecione</option>
                <option value="tesouro_selic">Tesouro Selic</option>
                <option value="tesouro_ipca">Tesouro IPCA+</option>
                <option value="tesouro_pre">Tesouro Prefixado</option>
                <option value="tesouro_ipca_juros">Tesouro IPCA+ com Juros Semestrais</option>
                <option value="tesouro_pre_juros">Tesouro Prefixado com Juros Semestrais</option>
              </select>
            </div>
            <div>
              <label htmlFor="qt-td-taxa" className={labelClass}>{tdTaxaLabel}</label>
              <input id="qt-td-taxa" type="number" inputMode="decimal" value={tdTaxa} onChange={(e) => setTdTaxa(e.target.value)} className={inputClass} placeholder="13.5" min={0} disabled={!tdAtivo} />
            </div>
            <div>
              <label htmlFor="qt-td-maturity" className={labelClass}>Vencimento <span className="text-white/30">OPCIONAL</span></label>
              <input id="qt-td-maturity" type="date" value={tdMaturity} onChange={(e) => setTdMaturity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="qt-td-date" className={labelClass}>Data da transação</label>
              <input id="qt-td-date" type="date" value={tdDate} onChange={(e) => setTdDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="qt-td-qty" className={labelClass}>Quantidade</label>
              <input id="qt-td-qty" type="number" inputMode="decimal" value={tdQuantity} onChange={(e) => setTdQuantity(e.target.value)} className={inputClass} placeholder="0,01" min={0.01} step={0.01} />
            </div>
            <div>
              <label htmlFor="qt-td-price" className={labelClass}>Preço (R$)</label>
              <input id="qt-td-price" type="number" inputMode="decimal" value={tdPrice} onChange={(e) => setTdPrice(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
            </div>
            <div>
              <label htmlFor="qt-td-other" className={labelClass}>Outros custos <span className="text-white/30">OPCIONAL</span></label>
              <input id="qt-td-other" type="number" inputMode="decimal" value={tdOtherCosts} onChange={(e) => setTdOtherCosts(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-white/50">Valor total</p>
            <p className="text-xl font-semibold text-white">{fmt(tdTotal)}</p>
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancelar</button>
            <button type="submit" disabled={isSaving || !selectedWallet} className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
              {addFI.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
