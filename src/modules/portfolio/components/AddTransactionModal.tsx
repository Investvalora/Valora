import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../../shared/components/Modal'
import { useAddTransaction } from '../hooks/useTransactions'
import { useAddFixedIncomePosition } from '../hooks/useFixedIncomePositions'
import { useCalcFixedIncome } from '../hooks/useCalcFixedIncome'
import type {
  AssetType,
  FixedIncomeIndexer,
  FixedIncomeType,
  NewFixedIncomePosition,
} from '../types'
import {
  FIXED_INCOME_TYPE_INDEXER,
  FIXED_INCOME_RATE_LABEL,
} from '../types'

// ─── UI-only category discriminator ──────────────────────────────────────────

type FormCategory = AssetType | 'tesouro_direto'

const CATEGORY_LABELS: Record<FormCategory, string> = {
  stock_br: 'Ações BR',
  fii: 'FIIs',
  bdr: 'BDRs',
  stock_us: 'Stocks US',
  etf_us: 'ETFs',
  etf_br: 'ETF BR',
  reit: 'REITs',
  crypto: 'Criptomoedas',
  fixed_income: 'Renda Fixa',
  tesouro_direto: 'Tesouro Direto',
}

/** Indexador exibido em modo somente leitura — derivado do tipo do título
 *  via FIXED_INCOME_TYPE_INDEXER (não é um campo de formulário). */
const INDEXER_DISPLAY: Record<FixedIncomeIndexer, string> = {
  cdi: 'CDI',
  ipca: 'IPCA',
  pre: 'Prefixado',
  selic: 'SELIC',
}

// ─── equity schema ────────────────────────────────────────────────────────────

const schema = z.object({
  type: z.enum(['buy', 'sell']),
  transaction_date: z.string().min(1, 'Data obrigatória'),
  quantity: z
    .number({ invalid_type_error: 'Informe um número', required_error: 'Obrigatório' })
    .positive('Deve ser maior que zero'),
  price: z
    .number({ invalid_type_error: 'Informe um número', required_error: 'Obrigatório' })
    .min(0, 'Deve ser ≥ 0'),
  brokerage_fee: z
    .number({ invalid_type_error: 'Informe um número' })
    .min(0)
    .optional()
    .default(0),
})

type FormValues = z.infer<typeof schema>

// ─── renda fixa schema ────────────────────────────────────────────────────────

const rendaFixaSchema = z.object({
  emissor: z.string().min(1, 'Informe o emissor'),
  tipo_titulo: z.string().min(1, 'Selecione o tipo').refine(
    (v) => ['cdb_cdi', 'cdb_pre', 'lci_cdi', 'lca_cdi', 'lci_pre', 'lca_pre'].includes(v),
    { message: 'Selecione o tipo' },
  ),
  taxa: z
    .number({ invalid_type_error: 'Informe um número' })
    .min(0, 'Deve ser ≥ 0'),
  valor: z
    .number({
      invalid_type_error: 'Informe um número',
      required_error: 'Informe o valor aplicado',
    })
    .positive('Deve ser maior que zero'),
  transaction_date: z.string().min(1, 'Data obrigatória'),
  maturity_date: z.string().optional(),
})

type RendaFixaValues = z.infer<typeof rendaFixaSchema>

// ─── tesouro direto schema ────────────────────────────────────────────────────

const tesouroDiretoSchema = z.object({
  ativo: z.string().min(1, 'Selecione o ativo').refine(
    (v) => ['tesouro_selic', 'tesouro_ipca', 'tesouro_pre', 'tesouro_ipca_juros', 'tesouro_pre_juros'].includes(v),
    { message: 'Selecione o ativo' },
  ),
  taxa: z
    .number({ invalid_type_error: 'Informe um número', required_error: 'Informe a taxa' })
    .min(0, 'Deve ser ≥ 0'),
  transaction_date: z.string().min(1, 'Data obrigatória'),
  maturity_date: z.string().optional(),
  quantity: z
    .number({ invalid_type_error: 'Informe um número' })
    .min(0.01, 'Mínimo 0,01'),
  price: z
    .number({ invalid_type_error: 'Informe um número' })
    .min(0, 'Deve ser ≥ 0'),
  outros_custos: z
    .number({ invalid_type_error: 'Informe um número' })
    .min(0)
    .optional()
    .default(0),
})

type TesouroDiretoValues = z.infer<typeof tesouroDiretoSchema>

/** Variantes de Tesouro Direto oferecidas no seletor. As variantes `_juros`
 *  mapeiam para o tipo-base (a coluna `type` só aceita os três títulos-base),
 *  mas o `name` carrega a distinção "com Juros Semestrais". */
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

// ─── helpers ─────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

const LABEL_CLASS = 'block text-xs font-medium text-gray-400 mb-1'

const ERROR_CLASS = 'text-red-400 text-xs mt-1'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock_br: 'Ações BR',
  fii: 'FIIs',
  bdr: 'BDRs',
  stock_us: 'Stocks',
  etf_us: 'ETF US',
  reit: 'REITs',
  crypto: 'Criptomoedas',
  etf_br: 'ETF BR',
  fixed_income: 'Renda Fixa',
}

// ─── componente ──────────────────────────────────────────────────────────────

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  ticker: string
  assetType?: AssetType | null
  assetName?: string | null
}

// ─── RendaFixaForm ────────────────────────────────────────────────────────────

interface RendaFixaFormProps {
  addFI: ReturnType<typeof useAddFixedIncomePosition>
  calcValues: () => Promise<void>
  onClose: () => void
}

function RendaFixaForm({ addFI, calcValues, onClose }: RendaFixaFormProps) {
  const [globalError, setGlobalError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RendaFixaValues>({
    resolver: zodResolver(rendaFixaSchema),
    defaultValues: {
      emissor: '',
      tipo_titulo: undefined,
      taxa: undefined,
      valor: undefined,
      transaction_date: new Date().toISOString().slice(0, 10),
      maturity_date: '',
    },
  })

  // isSaving lido da prop addFI para que o componente pai (AddTransactionModal)
  // controle corretamente o estado dismissible do Modal.
  const isSaving = addFI.isPending

  // Indexador derivado do tipo de título — exibido em modo somente leitura.
  const tipoTitulo = watch('tipo_titulo')
  const indexer = tipoTitulo
    ? FIXED_INCOME_TYPE_INDEXER[tipoTitulo as FixedIncomeType]
    : null

  const onSubmit = handleSubmit(async (values) => {
    setGlobalError('')
    const payload: NewFixedIncomePosition = {
      name: values.emissor,
      type: values.tipo_titulo as FixedIncomeType,
      indexer: FIXED_INCOME_TYPE_INDEXER[values.tipo_titulo as FixedIncomeType],
      rate: values.taxa,
      principal: values.valor,
      application_date: values.transaction_date,
      maturity_date: values.maturity_date?.trim() || null,
    }
    addFI.mutate(payload, {
      onSuccess: () => {
        calcValues()
        onClose()
      },
      onError: () => {
        setGlobalError('Erro ao salvar. Verifique os dados e tente novamente.')
      },
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* Row 1: Emissor + Tipo de título */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rf-emissor" className={LABEL_CLASS}>Emissor</label>
          <input
            id="rf-emissor"
            type="text"
            autoComplete="off"
            placeholder="Ex: Banco Itaú"
            className={INPUT_CLASS}
            aria-invalid={!!errors.emissor}
            {...register('emissor')}
          />
          {errors.emissor && <p className={ERROR_CLASS} role="alert">{errors.emissor.message}</p>}
        </div>
        <div>
          <label htmlFor="rf-tipo" className={LABEL_CLASS}>Tipo de título</label>
          <select
            id="rf-tipo"
            className={`${INPUT_CLASS} appearance-none`}
            aria-invalid={!!errors.tipo_titulo}
            {...register('tipo_titulo')}
          >
            <option value="">Selecione</option>
            <option value="cdb_cdi">CDB CDI</option>
            <option value="cdb_pre">CDB Pré</option>
            <option value="lci_cdi">LCI CDI</option>
            <option value="lca_cdi">LCA CDI</option>
            <option value="lci_pre">LCI Pré</option>
            <option value="lca_pre">LCA Pré</option>
          </select>
          {errors.tipo_titulo && <p className={ERROR_CLASS} role="alert">{errors.tipo_titulo.message}</p>}
        </div>
      </div>

      {/* Row 2: Indexador (somente leitura, derivado do tipo) + Taxa */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={LABEL_CLASS}>Indexador</p>
          <div className="px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-sm text-gray-300">
            {indexer ? INDEXER_DISPLAY[indexer] : '—'}
          </div>
        </div>
        <div>
          <label htmlFor="rf-taxa" className={LABEL_CLASS}>
            {indexer ? FIXED_INCOME_RATE_LABEL[indexer] : 'Taxa'}
          </label>
          <input
            id="rf-taxa"
            type="number"
            step="any"
            min="0"
            placeholder="110"
            className={INPUT_CLASS}
            aria-invalid={!!errors.taxa}
            {...register('taxa', { valueAsNumber: true })}
          />
          {errors.taxa && <p className={ERROR_CLASS} role="alert">{errors.taxa.message}</p>}
        </div>
      </div>

      {/* Row 3: Valor */}
      <div>
        <label htmlFor="rf-valor" className={LABEL_CLASS}>Valor</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">R$</span>
          <input
            id="rf-valor"
            type="number"
            step="any"
            min="0"
            placeholder="0,00"
            className={INPUT_CLASS}
            aria-invalid={!!errors.valor}
            {...register('valor', { valueAsNumber: true })}
          />
        </div>
        {errors.valor && <p className={ERROR_CLASS} role="alert">{errors.valor.message}</p>}
      </div>

      {/* Row 4: Data da transação + Data de vencimento */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="rf-date" className={LABEL_CLASS}>Data da transação</label>
          <input
            id="rf-date"
            type="date"
            className={INPUT_CLASS}
            aria-invalid={!!errors.transaction_date}
            {...register('transaction_date')}
          />
          {errors.transaction_date && <p className={ERROR_CLASS} role="alert">{errors.transaction_date.message}</p>}
        </div>
        <div>
          <label htmlFor="rf-maturity" className={LABEL_CLASS}>
            Data de vencimento <span className="text-gray-500">(Opcional)</span>
          </label>
          <input
            id="rf-maturity"
            type="date"
            className={INPUT_CLASS}
            {...register('maturity_date')}
          />
        </div>
      </div>

      {/* Erro global */}
      {globalError && (
        <p className="text-sm text-red-400" role="alert">{globalError}</p>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-dark-surface border border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 transition-colors"
        >
          {isSaving ? 'Salvando…' : 'Salvar alteração'}
        </button>
      </div>
    </form>
  )
}

// ─── TesouroDiretoForm ────────────────────────────────────────────────────────

interface TesouroDiretoFormProps {
  addFI: ReturnType<typeof useAddFixedIncomePosition>
  calcValues: () => Promise<void>
  onClose: () => void
}

function TesouroDiretoForm({ addFI, calcValues, onClose }: TesouroDiretoFormProps) {
  const [globalError, setGlobalError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TesouroDiretoValues>({
    resolver: zodResolver(tesouroDiretoSchema),
    defaultValues: {
      ativo: undefined,
      taxa: undefined,
      transaction_date: new Date().toISOString().slice(0, 10),
      maturity_date: '',
      quantity: undefined,
      price: undefined,
      outros_custos: 0,
    },
  })

  // isSaving lido da prop addFI para que o componente pai (AddTransactionModal)
  // controle corretamente o estado dismissible do Modal.
  const isSaving = addFI.isPending

  // ativo → tipo-base (a coluna `type` só aceita os três títulos-base).
  const dbTypeMap: Record<string, FixedIncomeType> = {
    tesouro_selic: 'tesouro_selic',
    tesouro_ipca: 'tesouro_ipca',
    tesouro_pre: 'tesouro_pre',
    tesouro_ipca_juros: 'tesouro_ipca',
    tesouro_pre_juros: 'tesouro_pre',
  }

  const ativo = watch('ativo')
  const quantity = watch('quantity')
  const price = watch('price')
  const outrosCustos = watch('outros_custos') ?? 0

  // Label/placeholder da taxa derivados do indexador do ativo (igual ao AddFixedIncomeForm).
  const tdIndexer = ativo ? FIXED_INCOME_TYPE_INDEXER[dbTypeMap[ativo]] : null
  const taxaLabel = tdIndexer ? FIXED_INCOME_RATE_LABEL[tdIndexer] : 'Taxa'
  const taxaPlaceholder = tdIndexer === 'ipca' ? '6.5' : '13.5'

  const totalValue =
    Number.isFinite(quantity) && Number.isFinite(price) && quantity > 0 && price >= 0
      ? quantity * price + outrosCustos
      : null

  const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const onSubmit = handleSubmit(async (values) => {
    setGlobalError('')
    const dbType = dbTypeMap[values.ativo]
    const payload: NewFixedIncomePosition = {
      name: TD_NAME[values.ativo],
      type: dbType,
      indexer: FIXED_INCOME_TYPE_INDEXER[dbType],
      rate: values.taxa,
      principal: values.quantity * values.price + (values.outros_custos ?? 0),
      application_date: values.transaction_date,
      maturity_date: values.maturity_date?.trim() || null,
    }
    addFI.mutate(payload, {
      onSuccess: () => {
        calcValues()
        onClose()
      },
      onError: () => {
        setGlobalError('Erro ao salvar. Verifique os dados e tente novamente.')
      },
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* Row 1: Ativo (full width) */}
      <div>
        <label htmlFor="td-ativo" className={LABEL_CLASS}>Ativo</label>
        <select
          id="td-ativo"
          className={`${INPUT_CLASS} appearance-none`}
          aria-invalid={!!errors.ativo}
          {...register('ativo')}
        >
          <option value="">Selecione</option>
          <option value="tesouro_selic">Tesouro Selic</option>
          <option value="tesouro_ipca">Tesouro IPCA+</option>
          <option value="tesouro_pre">Tesouro Prefixado</option>
          <option value="tesouro_ipca_juros">Tesouro IPCA+ com Juros Semestrais</option>
          <option value="tesouro_pre_juros">Tesouro Prefixado com Juros Semestrais</option>
        </select>
        {errors.ativo && <p className={ERROR_CLASS} role="alert">{errors.ativo.message}</p>}
      </div>

      {/* Row 2: Taxa + Vencimento */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="td-taxa" className={LABEL_CLASS}>{taxaLabel}</label>
          <input
            id="td-taxa"
            type="number"
            step="any"
            min="0"
            placeholder={taxaPlaceholder}
            className={INPUT_CLASS}
            aria-invalid={!!errors.taxa}
            disabled={!ativo}
            {...register('taxa', { valueAsNumber: true })}
          />
          {errors.taxa && <p className={ERROR_CLASS} role="alert">{errors.taxa.message}</p>}
        </div>
        <div>
          <label htmlFor="td-maturity" className={LABEL_CLASS}>
            Vencimento <span className="text-gray-500">(Opcional)</span>
          </label>
          <input
            id="td-maturity"
            type="date"
            className={INPUT_CLASS}
            {...register('maturity_date')}
          />
        </div>
      </div>

      {/* Row 3: Data + Quantidade */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="td-date" className={LABEL_CLASS}>Data da transação</label>
          <input
            id="td-date"
            type="date"
            className={INPUT_CLASS}
            aria-invalid={!!errors.transaction_date}
            {...register('transaction_date')}
          />
          {errors.transaction_date && <p className={ERROR_CLASS} role="alert">{errors.transaction_date.message}</p>}
        </div>
        <div>
          <label htmlFor="td-qty" className={LABEL_CLASS}>Quantidade</label>
          <input
            id="td-qty"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,01"
            className={INPUT_CLASS}
            aria-invalid={!!errors.quantity}
            {...register('quantity', { valueAsNumber: true })}
          />
          {errors.quantity && <p className={ERROR_CLASS} role="alert">{errors.quantity.message}</p>}
        </div>
      </div>

      {/* Row 4: Preço + Outros custos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="td-price" className={LABEL_CLASS}>Preço</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">R$</span>
            <input
              id="td-price"
              type="number"
              step="any"
              min="0"
              placeholder="0,00"
              className={INPUT_CLASS}
              aria-invalid={!!errors.price}
              {...register('price', { valueAsNumber: true })}
            />
          </div>
          {errors.price && <p className={ERROR_CLASS} role="alert">{errors.price.message}</p>}
        </div>
        <div>
          <label htmlFor="td-outros" className={LABEL_CLASS}>
            Outros custos <span className="text-gray-500">(Opcional)</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">R$</span>
            <input
              id="td-outros"
              type="number"
              step="any"
              min="0"
              placeholder="0,00"
              className={INPUT_CLASS}
              {...register('outros_custos', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* Row 5: Valor total (read-only) */}
      <div className="flex items-center justify-between rounded-lg bg-dark-bg px-4 py-3 border border-dark-border">
        <span className="text-sm font-semibold text-gray-200">Valor total</span>
        <span className="text-sm font-bold text-white tabular-nums">
          {totalValue !== null ? brlFormatter.format(totalValue) : 'R$ 0,00'}
        </span>
      </div>

      {/* Erro global */}
      {globalError && (
        <p className="text-sm text-red-400" role="alert">{globalError}</p>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-dark-surface border border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 transition-colors"
        >
          {isSaving ? 'Salvando…' : 'Salvar alteração'}
        </button>
      </div>
    </form>
  )
}

// ─── main modal ───────────────────────────────────────────────────────────────

export function AddTransactionModal({
  isOpen,
  onClose,
  ticker,
  assetType,
  assetName,
}: AddTransactionModalProps) {
  const [globalError, setGlobalError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<FormCategory | ''>('')
  const addTransaction = useAddTransaction()
  const addFI = useAddFixedIncomePosition()
  const { calc: calcValues } = useCalcFixedIncome()
  const isSaving = addTransaction.isPending || addFI.isPending

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'buy',
      transaction_date: new Date().toISOString().slice(0, 10),
      quantity: undefined,
      price: undefined,
      brokerage_fee: 0,
    },
  })

  // Resetar quando abre com ticker diferente
  useEffect(() => {
    if (isOpen) {
      reset({
        type: 'buy',
        transaction_date: new Date().toISOString().slice(0, 10),
        quantity: undefined,
        price: undefined,
        brokerage_fee: 0,
      })
      setGlobalError('')
      setSelectedCategory('')
    }
  }, [isOpen, ticker, reset])

  const transactionType = watch('type')
  const quantity = watch('quantity')
  const price = watch('price')
  const brokerageFee = watch('brokerage_fee') ?? 0

  const totalValue =
    Number.isFinite(quantity) && Number.isFinite(price) && quantity > 0 && price >= 0
      ? quantity * price + brokerageFee
      : null

  const brlFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const onSubmit = handleSubmit(async (values) => {
    setGlobalError('')
    try {
      await addTransaction.mutateAsync({
        ticker,
        type: values.type,
        quantity: values.quantity,
        price: values.price,
        brokerage_fee: values.brokerage_fee ?? 0,
        transaction_date: values.transaction_date,
      })
      onClose()
    } catch {
      setGlobalError('Erro ao salvar o lançamento. Tente novamente.')
    }
  })

  // When ticker is pre-filled, always use the equity form. The empty-ticker
  // selector only offers Renda Fixa and Tesouro Direto, so there is no
  // variable-income branch here.
  const showEquityForm = ticker !== ''
  const showRendaFixa = ticker === '' && selectedCategory === 'fixed_income'
  const showTesouroDireto = ticker === '' && selectedCategory === 'tesouro_direto'

  return (
    <Modal
      isOpen={isOpen}
      title="Adicionar Lançamento"
      onClose={onClose}
      dismissible={!isSaving}
    >
      {/* Category selector — only when ticker is empty */}
      {ticker === '' && (
        <div className="mb-4">
          <label htmlFor="cat-select" className={LABEL_CLASS}>Tipo de ativo</label>
          <select
            id="cat-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FormCategory | '')}
            className={`${INPUT_CLASS} appearance-none`}
          >
            <option value="">Selecione</option>
            <option value="fixed_income">Renda Fixa</option>
            <option value="tesouro_direto">Tesouro Direto</option>
          </select>
        </div>
      )}

      {/* Renda Fixa form */}
      {showRendaFixa && (
        <RendaFixaForm addFI={addFI} calcValues={calcValues} onClose={onClose} />
      )}

      {/* Tesouro Direto form */}
      {showTesouroDireto && (
        <TesouroDiretoForm addFI={addFI} calcValues={calcValues} onClose={onClose} />
      )}

      {/* Equity / variable-income form */}
      {showEquityForm && (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {/* Tabs Compra / Venda */}
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-dark-border bg-dark-bg p-1">
            {(['buy', 'sell'] as const).map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors ${
                  transactionType === t
                    ? 'bg-dark-surface text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  value={t}
                  className="sr-only"
                  {...register('type')}
                />
                {t === 'buy' ? '🟢 Compra' : '🔴 Venda'}
              </label>
            ))}
          </div>

          {/* Ativo info (read-only) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={LABEL_CLASS}>Tipo de ativo</p>
              <div className="px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-sm text-gray-300">
                {ticker !== ''
                  ? (assetType ? ASSET_TYPE_LABELS[assetType] : '—')
                  : (selectedCategory ? CATEGORY_LABELS[selectedCategory as FormCategory] : '—')}
              </div>
            </div>
            <div>
              <p className={LABEL_CLASS}>Ativo</p>
              <div className="px-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-sm font-semibold text-white">
                {ticker}
                {assetName && (
                  <span className="ml-1 text-xs font-normal text-gray-400 truncate">
                    {assetName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Data e Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="txn-date" className={LABEL_CLASS}>
                Data da transação
              </label>
              <input
                id="txn-date"
                type="date"
                className={INPUT_CLASS}
                aria-invalid={!!errors.transaction_date}
                {...register('transaction_date')}
              />
              {errors.transaction_date && (
                <p className={ERROR_CLASS} role="alert">
                  {errors.transaction_date.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="txn-qty" className={LABEL_CLASS}>
                Quantidade
              </label>
              <input
                id="txn-qty"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                className={INPUT_CLASS}
                aria-invalid={!!errors.quantity}
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className={ERROR_CLASS} role="alert">
                  {errors.quantity.message}
                </p>
              )}
            </div>
          </div>

          {/* Preço e Outros custos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="txn-price" className={LABEL_CLASS}>
                Preço
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">R$</span>
                <input
                  id="txn-price"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0,00"
                  className={INPUT_CLASS}
                  aria-invalid={!!errors.price}
                  {...register('price', { valueAsNumber: true })}
                />
              </div>
              {errors.price && (
                <p className={ERROR_CLASS} role="alert">
                  {errors.price.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="txn-fee" className={LABEL_CLASS}>
                Outros custos{' '}
                <span className="text-gray-500">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">R$</span>
                <input
                  id="txn-fee"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0,00"
                  className={INPUT_CLASS}
                  {...register('brokerage_fee', { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Valor total */}
          <div className="flex items-center justify-between rounded-lg bg-dark-bg px-4 py-3 border border-dark-border">
            <span className="text-sm font-semibold text-gray-200">Valor total</span>
            <span className="text-sm font-bold text-white tabular-nums">
              {totalValue !== null ? brlFormatter.format(totalValue) : 'R$ 0,00'}
            </span>
          </div>

          {/* Erro global */}
          {globalError && (
            <p className="text-sm text-red-400" role="alert">
              {globalError}
            </p>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-dark-surface border border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 transition-colors"
            >
              {isSaving ? 'Salvando…' : 'Salvar alteração'}
            </button>
          </div>
        </form>
      )}

      {/* Placeholder when no category selected and ticker is empty */}
      {ticker === '' && !showEquityForm && !showRendaFixa && !showTesouroDireto && (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </Modal>
  )
}
