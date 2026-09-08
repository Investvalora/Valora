import { KeyboardEvent, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PositionSchema, positionSchema, toNewPosition } from '../schemas/positionSchema'
import { MISSING_SESSION_CODE, useAddPosition } from '../hooks/useAddPosition'
import { useAssetLookup, useAssetSearch } from '../hooks/useAssetSearch'
import { Asset } from '../types'

interface AddPositionFormProps {
  /** Chamada com o ticker gravado; a página fecha o modal e avisa o usuário. */
  onSuccess: (ticker: string) => void
  onCancel: () => void
  /**
   * Avisa a página quando há escrita em voo, para que ela impeça o modal de
   * fechar no meio: fechar desmonta este componente, e com ele o aviso de
   * sucesso e a revalidação da lista.
   */
  onBusyChange?: (isBusy: boolean) => void
}

// Mesma composição dos campos do módulo `auth`, com `placeholder-gray-400` em
// vez de `gray-500`: sobre `dark-bg`, gray-500 fica em 3,7:1 e reprova o AA de
// texto normal.
const INPUT_CLASS =
  'w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const LABEL_CLASS = 'block text-sm font-medium text-gray-300 mb-2'

/** Atrasa o termo de busca para não consultar o catálogo a cada tecla. */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}

/**
 * `PostgrestError` não é instância de `Error` — é objeto simples com `code`,
 * `message`, `details` e `hint`. Só o `code` é estável o bastante para decidir
 * mensagem; `message` nunca é exibido cru ao usuário.
 */
function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined

  const { code } = error as { code?: unknown }
  return typeof code === 'string' ? code : undefined
}

/**
 * Texto de diagnóstico do erro, concatenado só para *inspeção*: é onde o
 * Postgres nomeia a constraint violada. Nada daqui vai para a tela.
 */
function getErrorDiagnostics(error: unknown): string {
  if (typeof error !== 'object' || error === null) return ''

  const { message, details, hint } = error as {
    message?: unknown
    details?: unknown
    hint?: unknown
  }

  return [message, details, hint].filter((part) => typeof part === 'string').join(' ')
}

/**
 * `positions` tem duas foreign keys — `ticker` para `assets` e `user_id` para
 * `public.users` —, e as duas produzem 23503. Culpar o ticker sem olhar qual
 * delas falhou manda o usuário corrigir um campo correto quando o problema é a
 * conta dele não ter linha em `public.users`.
 */
function describeForeignKeyError(error: unknown, ticker: string): string {
  const diagnostics = getErrorDiagnostics(error)

  if (/positions_ticker_fkey|\bassets\b|\(ticker\)/i.test(diagnostics)) {
    return `O ativo ${ticker} não está no catálogo.`
  }

  if (/positions_user_id_fkey|\busers\b|\(user_id\)/i.test(diagnostics)) {
    return 'Sua conta não está pronta para receber posições. Entre novamente e, se persistir, fale com o suporte.'
  }

  // Constraint não identificada: não atribuir culpa a campo algum.
  return 'Não foi possível salvar a posição: um dos dados informados não corresponde a um registro existente.'
}

function describeInsertError(error: unknown, ticker: string): string {
  switch (getErrorCode(error)) {
    case '23505':
      return `Você já tem uma posição em ${ticker}. Edite a posição existente em vez de cadastrar outra.`
    case '23503':
      return describeForeignKeyError(error, ticker)
    case '23514':
      return 'Valores fora do permitido: quantidade precisa ser maior que zero e preço médio não pode ser negativo.'
    case '42501':
      // RLS recusou a escrita. Na prática é sessão vencida ou trocada entre o
      // carregamento da tela e o submit, e não falta de permissão do usuário.
      return 'Sua sessão não está mais válida. Entre novamente e repita o cadastro.'
    case MISSING_SESSION_CODE:
      return 'Sessão expirada. Entre novamente para cadastrar posições.'
    default:
      return 'Não foi possível salvar a posição. Tente novamente.'
  }
}

export function AddPositionForm({ onSuccess, onCancel, onBusyChange }: AddPositionFormProps) {
  const [errorMessage, setErrorMessage] = useState('')
  const [notFoundTicker, setNotFoundTicker] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isCheckingTicker, setIsCheckingTicker] = useState(false)

  const addPosition = useAddPosition()
  const lookupAsset = useAssetLookup()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    setFocus,
    clearErrors,
    formState: { errors },
  } = useForm<PositionSchema>({
    resolver: zodResolver(positionSchema),
    defaultValues: { ticker: '', quantity: '', averagePrice: '', acquisitionDate: '' },
  })

  const tickerValue = watch('ticker')
  const debouncedTicker = useDebouncedValue(tickerValue, 250)
  const { data: suggestions = [], isFetching: isSearching } = useAssetSearch(debouncedTicker)

  const typedTicker = tickerValue.trim().toUpperCase()
  const exactMatch = suggestions.find((asset) => asset.ticker === typedTicker) ?? null
  const isSuggestionsOpen = showSuggestions && suggestions.length > 0

  // A lista é debounceada: entre a última tecla e a resposta do catálogo ela
  // encurta sem que nada zere o índice realçado — as setas não passam por
  // `onChange`. Sem este ajuste, `suggestions[highlightedIndex]` fica
  // `undefined` e o Enter seguinte quebra a tela.
  useEffect(() => {
    setHighlightedIndex((current) => Math.min(current, suggestions.length - 1))
  }, [suggestions.length])

  /**
   * Escolhe o ativo. Aceita `undefined` de propósito: é a segunda barreira
   * contra o índice defasado, para que um realce fora de faixa não vire crash.
   */
  const selectAsset = (asset: Asset | undefined) => {
    if (!asset) return

    setValue('ticker', asset.ticker, { shouldValidate: true })
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    setNotFoundTicker('')
  }

  const handleTickerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && isSuggestionsOpen) {
      // Escape fecha só a lista; sem isto o modal inteiro fecharia.
      event.stopPropagation()
      setShowSuggestions(false)
      setHighlightedIndex(-1)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (suggestions.length === 0) return
      event.preventDefault()
      setShowSuggestions(true)

      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlightedIndex((current) => {
        const next = current + step
        if (next < 0) return suggestions.length - 1
        if (next >= suggestions.length) return 0
        return next
      })
      return
    }

    if (event.key === 'Enter' && isSuggestionsOpen && highlightedIndex >= 0) {
      // Enter sobre uma sugestão a escolhe, em vez de submeter o formulário.
      event.preventDefault()
      selectAsset(suggestions[highlightedIndex])
    }
  }

  const onSubmit = async (values: PositionSchema) => {
    setErrorMessage('')
    setNotFoundTicker('')

    const payload = toNewPosition(values)

    // Bloqueio no cliente antes do INSERT: a FK contra `assets` nunca é
    // violada, e a mensagem é a do AC em vez de um erro de banco.
    setIsCheckingTicker(true)
    let asset: Asset | null
    try {
      asset = await lookupAsset(payload.ticker)
    } catch {
      setErrorMessage('Não foi possível validar o ticker agora. Verifique sua conexão e tente novamente.')
      return
    } finally {
      setIsCheckingTicker(false)
    }

    if (!asset) {
      setError('ticker', { type: 'manual', message: 'Ativo não encontrado' })
      setNotFoundTicker(payload.ticker)
      setShowSuggestions(true)
      setFocus('ticker')
      return
    }

    addPosition.mutate(payload, {
      onSuccess: () => onSuccess(payload.ticker),
      onError: (error) => {
        console.error('Add position error:', error)
        setErrorMessage(describeInsertError(error, payload.ticker))
      },
    })
  }

  const isSubmitting = isCheckingTicker || addPosition.isPending
  const tickerErrorId = errors.ticker ? 'ticker-error' : undefined

  // A página é a dona do modal, então é ela quem precisa saber que há escrita
  // em voo para não deixar o modal ser fechado.
  useEffect(() => {
    onBusyChange?.(isSubmitting)
  }, [isSubmitting, onBusyChange])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div>
        <label htmlFor="ticker" className={LABEL_CLASS}>
          Ativo
        </label>
        <div className="relative">
          <input
            id="ticker"
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={isSuggestionsOpen}
            aria-controls="ticker-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={
              isSuggestionsOpen && highlightedIndex >= 0
                ? `ticker-option-${highlightedIndex}`
                : undefined
            }
            aria-invalid={errors.ticker ? true : undefined}
            aria-describedby={tickerErrorId}
            {...register('ticker', {
              onChange: () => {
                setShowSuggestions(true)
                setHighlightedIndex(-1)
                setNotFoundTicker('')
                // "Ativo não encontrado" é erro manual: a validação só roda no
                // submit, então sem isto a mensagem ficaria colada na tela
                // enquanto o usuário corrige o ticker.
                clearErrors('ticker')
              },
              // Sair do campo fecha a lista. Clicar numa sugestão não dispara
              // blur porque a opção cancela o `mousedown`.
              onBlur: () => setShowSuggestions(false),
            })}
            onKeyDown={handleTickerKeyDown}
            className={INPUT_CLASS}
            placeholder="Ticker ou nome, ex.: PETR4"
          />

          {isSuggestionsOpen && (
            <ul
              id="ticker-suggestions"
              role="listbox"
              aria-label="Ativos do catálogo"
              className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-dark-border bg-dark-bg shadow-xl"
            >
              {/* Opções não são foco de teclado: navegação é por setas com
                  `aria-activedescendant`, o que mantém o Tab indo do ticker
                  direto para Quantidade. */}
              {suggestions.map((asset, index) => (
                <li
                  key={asset.ticker}
                  id={`ticker-option-${index}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectAsset(asset)}
                  className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2 transition-colors ${
                    index === highlightedIndex ? 'bg-blue-600 text-white' : 'text-gray-200'
                  }`}
                >
                  <span className="font-semibold">{asset.ticker}</span>
                  {/* Sobre o azul do realce, gray-400 cai para 2:1. */}
                  <span
                    className={`truncate text-sm ${
                      index === highlightedIndex ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {asset.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {errors.ticker && (
          <p id={tickerErrorId} className="mt-1 text-sm text-red-400">
            {errors.ticker.message}
          </p>
        )}

        {notFoundTicker && (
          <p className="mt-1 text-sm text-gray-400">
            {isSearching
              ? `Buscando ativos parecidos com ${notFoundTicker}...`
              : suggestions.length > 0
                ? 'Escolha um dos ativos sugeridos acima.'
                : `Nenhum ativo do catálogo corresponde a ${notFoundTicker}. Busque por ticker ou por nome, ex.: "Petrobras".`}
          </p>
        )}

        {!errors.ticker && !notFoundTicker && exactMatch && (
          <p className="mt-1 text-sm text-gray-400">
            {exactMatch.name} · {exactMatch.currency}
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="quantity" className={LABEL_CLASS}>
            Quantidade
          </label>
          <input
            id="quantity"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby={errors.quantity ? 'quantity-error' : undefined}
            {...register('quantity')}
            className={INPUT_CLASS}
            placeholder="100"
          />
          {errors.quantity && (
            <p id="quantity-error" className="mt-1 text-sm text-red-400">
              {errors.quantity.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="averagePrice" className={LABEL_CLASS}>
            Preço médio
          </label>
          <input
            id="averagePrice"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={errors.averagePrice ? true : undefined}
            aria-describedby={errors.averagePrice ? 'averagePrice-error' : undefined}
            {...register('averagePrice')}
            className={INPUT_CLASS}
            placeholder="32,10"
          />
          {errors.averagePrice && (
            <p id="averagePrice-error" className="mt-1 text-sm text-red-400">
              {errors.averagePrice.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="acquisitionDate" className={LABEL_CLASS}>
          Data de aquisição
        </label>
        <input
          id="acquisitionDate"
          type="date"
          aria-invalid={errors.acquisitionDate ? true : undefined}
          aria-describedby={errors.acquisitionDate ? 'acquisitionDate-error' : undefined}
          {...register('acquisitionDate')}
          className={INPUT_CLASS}
        />
        {errors.acquisitionDate && (
          <p id="acquisitionDate-error" className="mt-1 text-sm text-red-400">
            {errors.acquisitionDate.message}
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-dark-border px-4 py-3 font-semibold text-gray-300 transition-colors hover:bg-dark-bg hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:bg-transparent"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          {isSubmitting ? 'Salvando...' : 'Adicionar posição'}
        </button>
      </div>
    </form>
  )
}
