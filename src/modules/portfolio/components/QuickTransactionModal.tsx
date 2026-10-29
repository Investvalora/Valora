import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../../shared/components/Modal'
import { useAddTransaction } from '../hooks/useTransactions'
import { useAddFixedIncomePosition } from '../hooks/useFixedIncomePositions'
import { useCalcFixedIncome } from '../hooks/useCalcFixedIncome'
import { usePositions } from '../hooks/usePositions'
import { useWallets } from '../hooks/useWallets'
import { positionService } from '../services/positionService'
import { useAssetSearch, useTickerLatestPrice } from '../hooks/useAssetSearch'
import { FIXED_INCOME_TYPE_INDEXER, FIXED_INCOME_RATE_LABEL } from '../types'
import type { Asset, AssetType, FixedIncomeType, NewFixedIncomePosition } from '../types'

interface QuickTransactionModalProps {
  isOpen: boolean
  onClose: () => void
}

type FormCategory = AssetType | 'tesouro_direto'

const ASSET_TYPES: [AssetType, string][] = [
  ['stock_br', 'Ações BR'],
  ['fii', 'FIIs'],
  ['bdr', 'BDRs'],
  ['stock_us', 'Stocks US'],
  ['etf_us', 'ETFs US'],
  ['etf_br', 'ETFs BR'],
  ['reit', 'REITs'],
  ['crypto', 'Criptomoedas'],
]

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}

type TesouroDiretoAtivo =
  | 'tesouro_selic' | 'tesouro_ipca' | 'tesouro_pre'
  | 'tesouro_ipca_juros' | 'tesouro_pre_juros'

const TD_NAME: Record<TesouroDiretoAtivo, string> = {
  tesouro_selic:      'Tesouro Selic',
  tesouro_ipca:       'Tesouro IPCA+',
  tesouro_pre:        'Tesouro Prefixado',
  tesouro_ipca_juros: 'Tesouro IPCA+ com Juros Semestrais',
  tesouro_pre_juros:  'Tesouro Prefixado com Juros Semestrais',
}

const TD_DB_TYPE: Record<TesouroDiretoAtivo, FixedIncomeType> = {
  tesouro_selic:      'tesouro_selic',
  tesouro_ipca:       'tesouro_ipca',
  tesouro_pre:        'tesouro_pre',
  tesouro_ipca_juros: 'tesouro_ipca',
  tesouro_pre_juros:  'tesouro_pre',
}

const RF_TYPES: { value: FixedIncomeType; label: string }[] = [
  { value: 'rdb_cdi', label: 'RDB CDI' },
  { value: 'rdb_pre', label: 'RDB Prefixado' },
  { value: 'cdb_cdi', label: 'CDB CDI' },
  { value: 'cdb_pre', label: 'CDB Pré' },
  { value: 'lci_cdi', label: 'LCI CDI' },
  { value: 'lca_cdi', label: 'LCA CDI' },
  { value: 'lci_pre', label: 'LCI Pré' },
  { value: 'lca_pre', label: 'LCA Pré' },
]

export function QuickTransactionModal({ isOpen, onClose }: QuickTransactionModalProps) {
  const { selectedWallet } = useWallets()
  const { data: positions = [] } = usePositions(selectedWallet?.id ?? '')
  const addTransaction = useAddTransaction()
  const addFI = useAddFixedIncomePosition()
  const { calc: calcValues } = useCalcFixedIncome()

  // Abre com FIIs por padrão (igual ao original, mas com valor inicial)
  const [assetClass, setAssetClass] = useState<FormCategory>('fii')

  // Campos renda variável
  const [type, setType]             = useState<'buy' | 'sell'>('buy')
  const [ticker, setTicker]         = useState('')
  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10))
  const [quantity, setQuantity]     = useState('')
  const [price, setPrice]           = useState('')
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false)
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false)
  const [highlightedAssetIndex, setHighlightedAssetIndex] = useState(-1)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [otherCosts, setOtherCosts] = useState('')

  // Campos renda fixa
  const [rfEmissor, setRfEmissor]   = useState('')
  const [rfTipo, setRfTipo]         = useState<FixedIncomeType | ''>('')
  const [rfTaxa, setRfTaxa]         = useState('')
  const [rfValor, setRfValor]       = useState('')
  const [rfDate, setRfDate]         = useState(new Date().toISOString().slice(0, 10))
  const [rfMaturity, setRfMaturity] = useState('')

  // Campos tesouro direto
  const [tdAtivo, setTdAtivo]           = useState<TesouroDiretoAtivo | ''>('')
  const [tdTaxa, setTdTaxa]             = useState('')
  const [tdDate, setTdDate]             = useState(new Date().toISOString().slice(0, 10))
  const [tdMaturity, setTdMaturity]     = useState('')
  const [tdQty, setTdQty]               = useState('')
  const [tdPrice, setTdPrice]           = useState('')
  const [tdOther, setTdOther]           = useState('')

  const [error, setError] = useState('')
  const [changingCurrency, setChangingCurrency] = useState(false)

  const isSaving = addTransaction.isPending || addFI.isPending

  const isRendaFixa     = assetClass === 'fixed_income'
  const isTesouroDireto = assetClass === 'tesouro_direto'
  const isVariavel      = !isRendaFixa && !isTesouroDireto
  const debouncedTicker = useDebouncedValue(ticker, 250)
  const { data: assetSuggestions = [], isFetching: isSearchingAssets } = useAssetSearch(debouncedTicker)
  const filteredAssetSuggestions = assetSuggestions.filter((asset) => asset.type === assetClass)
  const latestPrice = useTickerLatestPrice(ticker)
  const { data: catalogAsset } = useQuery({
    queryKey: ['portfolio', 'asset', ticker],
    queryFn: () => positionService.findAssetByTicker(ticker),
    enabled: isOpen && isVariavel && ticker.trim().length >= 2,
  })

  useEffect(() => {
    if (isVariavel && latestPrice !== null && !priceManuallyEdited && ticker.trim().length >= 2) {
      setPrice(String(latestPrice))
    }
  }, [isVariavel, latestPrice, priceManuallyEdited, ticker])

  useEffect(() => {
    setHighlightedAssetIndex((current) => Math.min(current, filteredAssetSuggestions.length - 1))
  }, [filteredAssetSuggestions.length])

  // Derivados renda variável
  const parsedQty    = Number(quantity.replace(',', '.'))
  const parsedPrice  = Number(price.replace(',', '.'))
  const parsedOther  = Number(otherCosts.replace(',', '.')) || 0
  const totalVar     = parsedQty > 0 && parsedPrice >= 0 ? parsedQty * parsedPrice + parsedOther : 0

  // Derivados tesouro direto
  const tdParsedQty   = Number(tdQty.replace(',', '.'))
  const tdParsedPrice = Number(tdPrice.replace(',', '.'))
  const tdParsedOther = Number(tdOther.replace(',', '.')) || 0
  const totalTD       = tdParsedQty > 0 && tdParsedPrice >= 0 ? tdParsedQty * tdParsedPrice + tdParsedOther : 0

  // Derivados renda fixa
  const rfIndexer   = rfTipo ? FIXED_INCOME_TYPE_INDEXER[rfTipo] : null
  const rfTaxaLabel = rfIndexer ? FIXED_INCOME_RATE_LABEL[rfIndexer] : 'Taxa'
  const rfIndexerLabel = rfIndexer
    ? ({ cdi: 'CDI', ipca: 'IPCA', pre: 'Prefixado', selic: 'SELIC' } as const)[rfIndexer]
    : '—'

  // Derivados tesouro direto
  const tdDbType    = tdAtivo ? TD_DB_TYPE[tdAtivo] : null
  const tdIndexer   = tdDbType ? FIXED_INCOME_TYPE_INDEXER[tdDbType] : null
  const tdTaxaLabel = tdIndexer ? FIXED_INCOME_RATE_LABEL[tdIndexer] : 'Taxa'

  const quoteCurrency = isVariavel ? (selectedAsset?.currency ?? catalogAsset?.currency ?? 'BRL') : 'BRL'
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: quoteCurrency })

  function resetFields() {
    setError('')
    setType('buy'); setTicker(''); setDate(new Date().toISOString().slice(0, 10))
    setQuantity(''); setPrice(''); setPriceManuallyEdited(false); setOtherCosts('')
    setShowAssetSuggestions(false); setHighlightedAssetIndex(-1); setSelectedAsset(null)
    setRfEmissor(''); setRfTipo(''); setRfTaxa('')
    setRfValor(''); setRfDate(new Date().toISOString().slice(0, 10)); setRfMaturity('')
    setTdAtivo(''); setTdTaxa(''); setTdDate(new Date().toISOString().slice(0, 10))
    setTdMaturity(''); setTdQty(''); setTdPrice(''); setTdOther('')
  }

  function selectAsset(asset: Asset) {
    setTicker(asset.ticker)
    setSelectedAsset(asset)
    setShowAssetSuggestions(false)
    setHighlightedAssetIndex(-1)
    setPriceManuallyEdited(false)
  }

  async function changeCryptoCurrency(currency: string) {
    setChangingCurrency(true)
    setError('')
    try {
      const base = ticker.replace(/-BRL$/, '')
      const asset = await positionService.findAssetByTicker(currency === 'BRL' ? `${base}-BRL` : base)
      if (!asset) { setError('Esta moeda não está disponível para o ativo.'); return }
      setPrice('')
      setOtherCosts('')
      selectAsset(asset)
    } catch {
      setError('Não foi possível consultar a moeda. Tente novamente.')
    } finally {
      setChangingCurrency(false)
    }
  }

  function handleTickerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setShowAssetSuggestions(false)
      setHighlightedAssetIndex(-1)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (filteredAssetSuggestions.length === 0) return
      event.preventDefault()
      setShowAssetSuggestions(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlightedAssetIndex((current) => {
        const next = current + step
        if (next < 0) return filteredAssetSuggestions.length - 1
        if (next >= filteredAssetSuggestions.length) return 0
        return next
      })
      return
    }

    if (event.key === 'Enter' && showAssetSuggestions && highlightedAssetIndex >= 0) {
      event.preventDefault()
      selectAsset(filteredAssetSuggestions[highlightedAssetIndex])
    }
  }

  function handleClose() {
    setAssetClass('fii')
    resetFields()
    onClose()
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    // ── Renda Fixa ────────────────────────────────────────────────────────
    if (isRendaFixa) {
      if (!rfEmissor.trim()) { setError('Informe o emissor.'); return }
      if (!rfTipo) { setError('Selecione o tipo de título.'); return }
      const taxa = Number(rfTaxa.replace(',', '.'))
      if (isNaN(taxa) || taxa < 0) { setError('Informe uma taxa válida.'); return }
      const valor = Number(rfValor.replace(',', '.'))
      if (isNaN(valor) || valor <= 0) { setError('Informe o valor aplicado.'); return }

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
        onSuccess: () => { calcValues(); setAssetClass('fii'); resetFields(); onClose() },
        onError: () => setError('Não foi possível salvar. Tente novamente.'),
      })
      return
    }

    // ── Tesouro Direto ────────────────────────────────────────────────────
    if (isTesouroDireto) {
      if (!tdAtivo) { setError('Selecione o ativo.'); return }
      const taxa = Number(tdTaxa.replace(',', '.'))
      if (isNaN(taxa) || taxa < 0) { setError('Informe uma taxa válida.'); return }
      if (tdParsedQty < 0.01) { setError('Quantidade mínima: 0,01.'); return }
      if (tdParsedPrice < 0)  { setError('Informe o preço.'); return }

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
        onSuccess: () => { calcValues(); setAssetClass('fii'); resetFields(); onClose() },
        onError: () => setError('Não foi possível salvar. Tente novamente.'),
      })
      return
    }

    // ── Renda Variável ────────────────────────────────────────────────────
    const norm = ticker.trim().toUpperCase()
    if (!norm || !date || parsedQty <= 0 || parsedPrice < 0) {
      setError('Preencha ativo, data, quantidade e preço válidos.')
      return
    }
    if (type === 'sell') {
      const pos = positions.find((p) => p.ticker === norm)
      if (!pos || parsedQty > Number(pos.quantity)) {
        setError('A venda não pode superar a quantidade desta carteira.')
        return
      }
    }
    try {
      const asset = selectedAsset?.ticker === norm
        ? selectedAsset
        : await positionService.findAssetByTicker(norm)
      if (!asset) { setError('Ativo não encontrado no catálogo.'); return }
      await addTransaction.mutateAsync({
        ticker: norm, type, transaction_date: date,
        quantity: parsedQty, price: parsedPrice, brokerage_fee: parsedOther,
      })
      setAssetClass('fii')
      resetFields()
      onClose()
    } catch {
      setError('Não foi possível salvar o lançamento. Tente novamente.')
    }
  }

  const inputClass =
    'w-full min-w-0 rounded-xl border border-white/[0.12] bg-[#2A2A2A] px-3 py-3 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30'
  const labelClass = 'block text-xs text-white/50 mb-1'

  return (
    <Modal
      isOpen={isOpen}
      title="Adicionar Lançamento"
      onClose={handleClose}
      dismissible={!isSaving}
      variant="transaction"
      footer={
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleClose} disabled={isSaving}
            className="min-h-11 flex-1 rounded-xl px-4 py-2 text-base font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" form="quick-transaction-form"
            disabled={isSaving || changingCurrency || !selectedWallet}
            className="min-h-11 flex-[1.5] rounded-xl bg-blue-600 px-6 py-2 text-base font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
            {isSaving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      }
    >
      <form id="quick-transaction-form" onSubmit={submit} className="space-y-5">

        {/* Toggle Compra / Venda — apenas renda variável */}
        {isVariavel && (
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
        )}

        {/* Uma coluna nos celulares evita que campos nativos de data invadam o campo vizinho. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">

          {/* Linha 1: Tipo de ativo */}
          <div>
            <label htmlFor="qt-asset-class" className={labelClass}>Tipo de ativo</label>
            <select
              id="qt-asset-class"
              value={assetClass}
              onChange={(e) => {
                setAssetClass(e.target.value as FormCategory)
                resetFields()
              }}
              className={`${inputClass} appearance-none`}
            >
              {ASSET_TYPES.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
              <option value="fixed_income">Renda Fixa</option>
              <option value="tesouro_direto">Tesouro Direto</option>
            </select>
          </div>

          {/* Coluna direita linha 1 */}
          {isVariavel && (
            <div>
              <label htmlFor="qt-ticker" className={labelClass}>Ativo</label>
              <input
                id="qt-ticker"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value.toUpperCase())
                  setPriceManuallyEdited(false)
                  setSelectedAsset(null)
                  setShowAssetSuggestions(true)
                  setHighlightedAssetIndex(-1)
                }}
                onFocus={() => setShowAssetSuggestions(true)}
                onKeyDown={handleTickerKeyDown}
                className={inputClass}
                placeholder="PETR4"
                autoCapitalize="characters"
                maxLength={20}
              />
              {isVariavel && showAssetSuggestions && ticker.trim().length >= 2 && (
                <div className="relative z-20">
                  <div className="absolute left-0 right-0 top-1 max-h-52 overflow-y-auto rounded-xl border border-white/[0.14] bg-[#242424] p-1 shadow-2xl">
                    {isSearchingAssets && <p className="px-3 py-2 text-xs text-white/50">Buscando ativos...</p>}
                    {!isSearchingAssets && filteredAssetSuggestions.length === 0 && (
                      <p className="px-3 py-2 text-xs text-white/50">Nenhum ativo encontrado</p>
                    )}
                    {filteredAssetSuggestions.map((asset, index) => (
                      <button
                        key={`${asset.type}-${asset.ticker}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectAsset(asset)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${index === highlightedAssetIndex ? 'bg-white/[0.12]' : 'hover:bg-white/[0.08]'}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-white">{asset.ticker}</span>
                          <span className="block truncate text-xs text-white/50">{asset.name}</span>
                        </span>
                        <span className="ml-2 shrink-0 text-[10px] uppercase text-white/40">{asset.currency}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {isRendaFixa && (
            <div>
              <label htmlFor="qt-rf-tipo" className={labelClass}>Tipo de título</label>
              <select
                id="qt-rf-tipo"
                value={rfTipo}
                onChange={(e) => setRfTipo(e.target.value as FixedIncomeType)}
                className={`${inputClass} appearance-none`}
              >
                <option value="">Selecione</option>
                {RF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}
          {isTesouroDireto && (
            <div>
              <label htmlFor="qt-td-ativo" className={labelClass}>Ativo</label>
              <select
                id="qt-td-ativo"
                value={tdAtivo}
                onChange={(e) => setTdAtivo(e.target.value as TesouroDiretoAtivo)}
                className={`${inputClass} appearance-none`}
              >
                <option value="">Selecione</option>
                <option value="tesouro_selic">Tesouro Selic</option>
                <option value="tesouro_ipca">Tesouro IPCA+</option>
                <option value="tesouro_pre">Tesouro Prefixado</option>
                <option value="tesouro_ipca_juros">Tesouro IPCA+ c/ Juros Semestrais</option>
                <option value="tesouro_pre_juros">Tesouro Prefixado c/ Juros Semestrais</option>
              </select>
            </div>
          )}

          {/* Campos renda variável */}
          {isVariavel && (
            <>
              {assetClass === 'crypto' && (
                <div className="sm:col-span-2">
                  <label htmlFor="qt-crypto-currency" className={labelClass}>Moeda do lançamento</label>
                  <select id="qt-crypto-currency" value={quoteCurrency} disabled={!catalogAsset || changingCurrency}
                    className={inputClass} onChange={event => { void changeCryptoCurrency(event.target.value) }}>
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                  </select>
                  <p className="mt-1 text-xs text-white/50">Informe preço e custos na moeda escolhida. Posições em BRL e USD são acompanhadas separadamente.</p>
                </div>
              )}
              <div>
                <label htmlFor="qt-date" className={labelClass}>Data da transação</label>
                <input id="qt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="qt-qty" className={labelClass}>Quantidade</label>
                <input id="qt-qty" type="number" step="any" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} placeholder="0" min={0} />
              </div>
              <div>
                <label htmlFor="qt-price" className={labelClass}>Preço ({quoteCurrency})</label>
                <input id="qt-price" type="number" step="any" inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value); setPriceManuallyEdited(true) }} className={inputClass} placeholder="0,00" min={0} />
              </div>
              <div>
                <label htmlFor="qt-other-costs" className={labelClass}>
                  Outros custos ({quoteCurrency}) <span className="text-white/30">OPCIONAL</span>
                </label>
                <input id="qt-other-costs" type="number" step="any" inputMode="decimal" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
              </div>
            </>
          )}

          {/* Campos renda fixa */}
          {isRendaFixa && (
            <>
              <div>
                <label htmlFor="qt-rf-emissor" className={labelClass}>Emissor</label>
                <input id="qt-rf-emissor" type="text" autoComplete="off" value={rfEmissor} onChange={(e) => setRfEmissor(e.target.value)} className={inputClass} placeholder="Ex: Banco Itaú" />
              </div>
              <div>
                <label htmlFor="qt-rf-indexador" className={labelClass}>Indexador</label>
                <div className="rounded-xl border border-white/[0.12] bg-[#2A2A2A] px-3 py-2.5 text-sm text-white/50">
                  {rfIndexerLabel}
                </div>
              </div>
              <div>
                <label htmlFor="qt-rf-taxa" className={labelClass}>{rfTaxaLabel}</label>
                <input id="qt-rf-taxa" type="number" step="any" inputMode="decimal" value={rfTaxa} onChange={(e) => setRfTaxa(e.target.value)} className={inputClass} placeholder="110" min={0} disabled={!rfTipo} />
              </div>
              <div>
                <label htmlFor="qt-rf-valor" className={labelClass}>Valor (R$)</label>
                <input id="qt-rf-valor" type="number" step="any" inputMode="decimal" value={rfValor} onChange={(e) => setRfValor(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
              </div>
              <div>
                <label htmlFor="qt-rf-date" className={labelClass}>Data da transação</label>
                <input id="qt-rf-date" type="date" value={rfDate} onChange={(e) => setRfDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="qt-rf-maturity" className={labelClass}>
                  Vencimento <span className="text-white/30">OPCIONAL</span>
                </label>
                <input id="qt-rf-maturity" type="date" value={rfMaturity} onChange={(e) => setRfMaturity(e.target.value)} className={inputClass} />
              </div>
            </>
          )}

          {/* Campos tesouro direto */}
          {isTesouroDireto && (
            <>
              <div>
                <label htmlFor="qt-td-taxa" className={labelClass}>{tdTaxaLabel}</label>
                <input id="qt-td-taxa" type="number" step="any" inputMode="decimal" value={tdTaxa} onChange={(e) => setTdTaxa(e.target.value)} className={inputClass} placeholder="13.5" min={0} disabled={!tdAtivo} />
              </div>
              <div>
                <label htmlFor="qt-td-maturity" className={labelClass}>
                  Vencimento <span className="text-white/30">OPCIONAL</span>
                </label>
                <input id="qt-td-maturity" type="date" value={tdMaturity} onChange={(e) => setTdMaturity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="qt-td-date" className={labelClass}>Data da transação</label>
                <input id="qt-td-date" type="date" value={tdDate} onChange={(e) => setTdDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="qt-td-qty" className={labelClass}>Quantidade</label>
                <input id="qt-td-qty" type="number" step={0.01} inputMode="decimal" value={tdQty} onChange={(e) => setTdQty(e.target.value)} className={inputClass} placeholder="0,01" min={0.01} />
              </div>
              <div>
                <label htmlFor="qt-td-price" className={labelClass}>Preço (R$)</label>
                <input id="qt-td-price" type="number" step="any" inputMode="decimal" value={tdPrice} onChange={(e) => setTdPrice(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
              </div>
              <div>
                <label htmlFor="qt-td-other" className={labelClass}>
                  Outros custos ({quoteCurrency}) <span className="text-white/30">OPCIONAL</span>
                </label>
                <input id="qt-td-other" type="number" step="any" inputMode="decimal" value={tdOther} onChange={(e) => setTdOther(e.target.value)} className={inputClass} placeholder="0,00" min={0} />
              </div>
            </>
          )}

        </div>

        {/* Valor total — variável e TD */}
        {(isVariavel || isTesouroDireto) && (
          <div className="text-right">
            <p className="text-xs text-white/50">Valor total</p>
            <p className="text-xl font-semibold text-white">{fmt(isVariavel ? totalVar : totalTD)}</p>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      </form>
    </Modal>
  )
}
