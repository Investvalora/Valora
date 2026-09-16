import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FIXED_INCOME_TYPE_INDEXER,
  FIXED_INCOME_TYPE_LABEL,
  FIXED_INCOME_RATE_LABEL,
  FixedIncomeType,
  NewFixedIncomePosition,
} from '../types'
import { useAddFixedIncomePosition } from '../hooks/useFixedIncomePositions'
import { useCalcFixedIncome } from '../hooks/useCalcFixedIncome'

// ─── schema ────────────────────────────────────────────────────────────────

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function parseDecimal(v: string): number {
  return parseFloat(v.replace(',', '.'))
}

const fiSchema = z.object({
  name: z.string().min(1, 'Informe um nome').max(100, 'Máximo 100 caracteres'),
  type: z.enum([
    'tesouro_selic', 'tesouro_ipca', 'tesouro_pre',
    'cdb_cdi', 'cdb_pre', 'lci_cdi', 'lca_cdi', 'lci_pre', 'lca_pre',
  ] as const, { required_error: 'Selecione o tipo' }),
  rate: z
    .string()
    .min(1, 'Informe a taxa')
    .refine((v) => !isNaN(parseDecimal(v)) && parseDecimal(v) >= 0, 'Taxa inválida'),
  principal: z
    .string()
    .min(1, 'Informe o valor aplicado')
    .refine((v) => !isNaN(parseDecimal(v)) && parseDecimal(v) > 0, 'Valor deve ser maior que zero'),
  application_date: z
    .string()
    .min(1, 'Informe a data de aplicação')
    .refine((v) => v <= todayIso(), 'Data não pode estar no futuro'),
  maturity_date: z.string().optional(),
})

type FiFormValues = z.infer<typeof fiSchema>

// ─── estilos ───────────────────────────────────────────────────────────────

const INPUT =
  'w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL = 'block text-sm font-medium text-gray-300 mb-2'
const ERROR = 'mt-1 text-sm text-red-400'

// ─── componente ────────────────────────────────────────────────────────────

interface Props {
  onSuccess: () => void
  onCancel: () => void
  onBusyChange?: (busy: boolean) => void
}

export function AddFixedIncomeForm({ onSuccess, onCancel, onBusyChange }: Props) {
  const addPosition = useAddFixedIncomePosition()
  const { calc: calcValues } = useCalcFixedIncome()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FiFormValues>({
    resolver: zodResolver(fiSchema),
    defaultValues: {
      name: '',
      type: undefined,
      rate: '',
      principal: '',
      application_date: '',
      maturity_date: '',
    },
  })

  const selectedType = watch('type') as FixedIncomeType | undefined
  const indexer = selectedType ? FIXED_INCOME_TYPE_INDEXER[selectedType] : null
  const rateLabel = indexer ? FIXED_INCOME_RATE_LABEL[indexer] : 'Taxa'
  const ratePlaceholder = indexer === 'cdi' ? '110' : indexer === 'ipca' ? '6.5' : '13.5'

  // Preenche nome sugerido automaticamente quando o tipo muda
  const currentName = watch('name')
  useEffect(() => {
    if (selectedType && !currentName) {
      setValue('name', FIXED_INCOME_TYPE_LABEL[selectedType])
    }
  }, [selectedType, currentName, setValue])

  const isSubmitting = addPosition.isPending
  useEffect(() => { onBusyChange?.(isSubmitting) }, [isSubmitting, onBusyChange])

  const onSubmit = async (values: FiFormValues) => {
    const indexer = FIXED_INCOME_TYPE_INDEXER[values.type]
    const payload: NewFixedIncomePosition = {
      name: values.name.trim(),
      type: values.type,
      indexer,
      rate: parseDecimal(values.rate),
      principal: parseDecimal(values.principal),
      application_date: values.application_date,
      maturity_date: values.maturity_date?.trim() || null,
    }

    addPosition.mutate(payload, {
      onSuccess: async () => {
        // Dispara cálculo imediato para já mostrar o valor estimado
        calcValues()
        onSuccess()
      },
      onError: (e) => {
        console.error('Erro ao salvar renda fixa:', e)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

      {/* Tipo */}
      <div>
        <label htmlFor="fi-type" className={LABEL}>Tipo de investimento</label>
        <select
          id="fi-type"
          {...register('type')}
          className={`${INPUT} appearance-none`}
        >
          <option value="">Selecione…</option>
          <optgroup label="Tesouro Direto">
            <option value="tesouro_selic">Tesouro Selic</option>
            <option value="tesouro_ipca">Tesouro IPCA+</option>
            <option value="tesouro_pre">Tesouro Prefixado</option>
          </optgroup>
          <optgroup label="CDB">
            <option value="cdb_cdi">CDB % CDI</option>
            <option value="cdb_pre">CDB Prefixado</option>
          </optgroup>
          <optgroup label="LCI / LCA">
            <option value="lci_cdi">LCI % CDI</option>
            <option value="lca_cdi">LCA % CDI</option>
            <option value="lci_pre">LCI Prefixado</option>
            <option value="lca_pre">LCA Prefixado</option>
          </optgroup>
        </select>
        {errors.type && <p className={ERROR}>{errors.type.message}</p>}
      </div>

      {/* Nome */}
      <div>
        <label htmlFor="fi-name" className={LABEL}>Nome</label>
        <input
          id="fi-name"
          type="text"
          autoComplete="off"
          {...register('name')}
          className={INPUT}
          placeholder='Ex: CDB Itaú 110% CDI'
        />
        {errors.name && <p className={ERROR}>{errors.name.message}</p>}
      </div>

      {/* Taxa */}
      <div>
        <label htmlFor="fi-rate" className={LABEL}>{rateLabel}</label>
        <input
          id="fi-rate"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          {...register('rate')}
          className={INPUT}
          placeholder={ratePlaceholder}
          disabled={!selectedType}
        />
        {errors.rate && <p className={ERROR}>{errors.rate.message}</p>}
        {indexer === 'cdi' && (
          <p className="mt-1 text-xs text-gray-500">
            110 = 110% do CDI. CDI atual ≈ 10,5% a.a. → rendimento ≈ 11,55% a.a.
          </p>
        )}
        {indexer === 'ipca' && (
          <p className="mt-1 text-xs text-gray-500">
            Informe apenas o spread (ex: 6.5 para IPCA+6,5% a.a.). O IPCA é somado automaticamente.
          </p>
        )}
      </div>

      {/* Valor aplicado + data de aplicação */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="fi-principal" className={LABEL}>Valor aplicado (R$)</label>
          <input
            id="fi-principal"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            {...register('principal')}
            className={INPUT}
            placeholder="10000,00"
          />
          {errors.principal && <p className={ERROR}>{errors.principal.message}</p>}
        </div>

        <div>
          <label htmlFor="fi-app-date" className={LABEL}>Data de aplicação</label>
          <input
            id="fi-app-date"
            type="date"
            {...register('application_date')}
            className={INPUT}
          />
          {errors.application_date && <p className={ERROR}>{errors.application_date.message}</p>}
        </div>
      </div>

      {/* Vencimento (opcional) */}
      <div>
        <label htmlFor="fi-maturity" className={LABEL}>
          Vencimento <span className="text-gray-500 font-normal">(opcional)</span>
        </label>
        <input
          id="fi-maturity"
          type="date"
          {...register('maturity_date')}
          className={INPUT}
        />
        {errors.maturity_date && <p className={ERROR}>{errors.maturity_date.message}</p>}
      </div>

      {/* Erro geral */}
      {addPosition.isError && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">
            Não foi possível salvar. Verifique os dados e tente novamente.
          </p>
        </div>
      )}

      {/* Aviso de estimativa */}
      <p className="text-xs text-gray-500">
        O valor atualizado é uma estimativa baseada nos índices oficiais (CDI, IPCA, Selic).
        Não inclui IR, IOF nem taxas da corretora.
      </p>

      {/* Botões */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-dark-border px-4 py-3 font-semibold text-gray-300 transition-colors hover:bg-dark-bg hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedType}
          className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          {isSubmitting ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
