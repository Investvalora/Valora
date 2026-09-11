import { useCallback, useMemo, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { Tooltip } from '../../../shared/components/Tooltip'
import { useUSDRate } from '../../../shared/hooks/useUSDRate'
import type { USDRateSource } from '../../../shared/services/usdRateService'
import { useLatestQuotes } from '../hooks/useLatestQuotes'
import { usePositions } from '../hooks/usePositions'
import { downloadPositionsCsv } from '../export/positionsCsv'
import {
  DEFAULT_POSITION_SORT,
  derivePositionRows,
  nextSort,
  sortPositionRows,
} from '../positionRows'
import type { PositionRow, PositionSort, PositionSortColumn } from '../types'
import { AddPositionForm } from './AddPositionForm'
import { CompositionCard } from './CompositionCard'
import { PositionsTable } from './PositionsTable'
import { useScoreRules, groupRulesByName } from '../../score/hooks/useScoreRules'
import { useFundamentals } from '../../score/hooks/useFundamentals'
import { useCalculateScore } from '../../score/hooks/useCalculateScore'

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const usdRateFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

/** Cada elo da cadeia de AD-12 dito em português, para o tooltip da taxa. */
const USD_SOURCE_LABEL: Record<USDRateSource, string> = {
  bcb: 'Banco Central do Brasil (PTAX)',
  awesomeapi: 'AwesomeAPI',
  cache: 'Última taxa obtida neste navegador',
  default: 'Taxa fixa de referência do app',
}

export function CarteiraPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [sort, setSort] = useState<PositionSort>(DEFAULT_POSITION_SORT)
  // Nome do score ativo selecionado na Carteira (estado local da sessão).
  const [activeScoreName, setActiveScoreName] = useState<string | null>(null)

  const { data: positions = [], isLoading, isError, refetch } = usePositions()

  const tickers = useMemo(() => positions.map((position) => position.ticker), [positions])

  const quotesQuery = useLatestQuotes(tickers)

  const hasPositions = positions.length > 0
  const hasUSDPosition = useMemo(
    () => positions.some((position) => position.asset?.currency === 'USD'),
    [positions],
  )

  // Carteira sem ativo em dólar não precisa da taxa: a query fica parada em vez
  // de bater numa API de terceiro para um número que ninguém usaria.
  const usdRateQuery = useUSDRate({ enabled: hasUSDPosition })

  // Referência estável: um `[]` recriado a cada render invalidaria o `useMemo`
  // da derivação em todo ciclo, e com ele a identidade das linhas.
  const quotes = useMemo(() => quotesQuery.data ?? [], [quotesQuery.data])
  const usdRate = usdRateQuery.data ?? null

  // Peso e valor de mercado dependem do total da carteira, então a derivação é
  // do pai: a tabela recebe linhas prontas e continua apresentacional.
  const derived = useMemo(
    () =>
      derivePositionRows({
        positions,
        quotes,
        usdRate: usdRate?.rate ?? null,
      }),
    [positions, quotes, usdRate],
  )

  // ── Score Fundamentalista ──────────────────────────────────────────────────

  // Regras do usuário — carregadas apenas uma vez (staleTime 5min).
  const { data: allRules = [] } = useScoreRules()

  // Nomes únicos de scores disponíveis para o seletor.
  const scoreNames = useMemo(() => {
    const names = Array.from(groupRulesByName(allRules).keys())
    return names.sort()
  }, [allRules])

  // Regras do score ativo (todas com o mesmo nome).
  const activeRules = useMemo(() => {
    if (!activeScoreName) return []
    return allRules.filter((r) => r.name === activeScoreName)
  }, [allRules, activeScoreName])

  // Fundamentals carregados apenas quando há score ativo.
  const fundamentalsQuery = useFundamentals(activeScoreName ? tickers : [])
  const fundamentals = useMemo(() => fundamentalsQuery.data ?? [], [fundamentalsQuery.data])

  // Map de updated_at por ticker para o tooltip "⚠️ Dados antigos".
  const fundamentalsUpdatedAt = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of fundamentals) {
      map.set(row.ticker, row.updated_at)
    }
    return map
  }, [fundamentals])

  // Cálculo síncrono via useMemo — sem chamada ao banco (AD-5, AD-9).
  const scoreByTicker = useCalculateScore(activeRules, fundamentals)

  // Enriquece as linhas derivadas com o campo `score` opcional ANTES de ordenar,
  // para que sortPositionRows veja o campo score quando column === 'score'.
  const enrichedRows = useMemo((): PositionRow[] => {
    if (!activeScoreName || scoreByTicker.size === 0) return derived.rows
    return derived.rows.map((row) => ({
      ...row,
      score: scoreByTicker.has(row.ticker) ? (scoreByTicker.get(row.ticker) ?? null) : null,
    }))
  }, [derived.rows, activeScoreName, scoreByTicker])

  // Ordena após o enriquecimento para que a coluna score seja válida no sort.
  const scoredRows = useMemo(() => sortPositionRows(enrichedRows, sort), [enrichedRows, sort])

  const handleSortChange = useCallback((column: PositionSortColumn) => {
    setSort((current) => nextSort(current, column))
  }, [])

  const handleExport = () => {
    setSuccessMessage('')
    setErrorMessage('')

    try {
      downloadPositionsCsv(scoredRows)
      setSuccessMessage('Relatório CSV baixado.')
    } catch {
      setErrorMessage('Não foi possível baixar o relatório CSV.')
    }
  }

  const showComingSoon = (action: string) => {
    setErrorMessage('')
    setSuccessMessage(`${action}: Em breve.`)
  }

  const openModal = () => {
    setSuccessMessage('')
    setIsModalOpen(true)
  }

  // Fechar no meio da escrita desmonta o formulário: o aviso de sucesso e a
  // revalidação da lista se perdem e a posição gravada só aparece no próximo
  // carregamento. Enquanto `isSaving`, nada fecha o modal.
  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsModalOpen(false)
  }, [isSaving])

  const handleSuccess = (ticker: string) => {
    setIsSaving(false)
    setIsModalOpen(false)
    setSuccessMessage(`Posição em ${ticker} cadastrada.`)
  }

  // Contagem só quando é verdade: com erro e sem cache, "0 posições" afirmaria
  // que a carteira está vazia quando ninguém conseguiu consultá-la.
  const summary = isLoading
    ? 'Carregando posições...'
    : isError && !hasPositions
      ? 'Não foi possível carregar as posições.'
      : `${positions.length} ${positions.length === 1 ? 'posição cadastrada' : 'posições cadastradas'}`

  // Total zerado por falta de cotação não é patrimônio zero: sem nenhuma linha
  // avaliada, o card mostra lacuna em vez de afirmar R$ 0,00.
  const hasAnyValue = derived.rows.length > derived.missingValueCount
  const totalLabel = hasAnyValue ? brlFormatter.format(derived.totalBRL) : '—'

  return (
    <div className="p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Carteira</h1>
          <p className="mt-1 text-sm text-gray-400">{summary}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="/carteira/importar-transacoes" className="rounded-lg border border-blue-500 px-4 py-3 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-500/10">Importar transações</a>
          <button
            type="button"
            onClick={handleExport}
            disabled={scoredRows.length === 0}
            className="rounded-lg border border-green-500 px-4 py-3 text-sm font-semibold text-green-200 transition-colors hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => showComingSoon('Sincronizar dados')}
            className="rounded-lg border border-gray-600 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700/50"
          >
            Sincronizar dados
          </button>
          <button
            type="button"
            onClick={() => showComingSoon('Gerar insights')}
            className="rounded-lg border border-gray-600 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700/50"
          >
            Gerar insights
          </button>
          <button type="button" onClick={openModal} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">+ adicionar posição</button>
        </div>
      </header>

      {hasPositions && (
        <section
          aria-label="Patrimônio total"
          className="mb-6 rounded-lg border border-dark-border bg-dark-surface p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Patrimônio total
          </p>
          <p className="mt-1 text-3xl font-bold text-white">{totalLabel}</p>

          {/* Enquanto a taxa USD carrega, uma posição em dólar com cotação boa
              ainda não tem valor de mercado — mas a causa é a taxa, não a
              cotação. Só afirmamos "sem cotação" quando nem cotação nem taxa
              estão em voo, para o número não acusar o motivo errado. */}
          {(quotesQuery.isLoading || usdRateQuery.isLoading) && (
            <p className="mt-2 text-sm text-gray-400">Carregando cotações...</p>
          )}

          {/* A ressalva é parte do número: um total que ignora posições sem
              cotação e não diz isso vira patrimônio subestimado com cara de
              exato. */}
          {derived.missingValueCount > 0 && !quotesQuery.isLoading && !usdRateQuery.isLoading && (
            <p className="mt-2 text-sm text-amber-300">
              {derived.missingValueCount === 1
                ? '1 posição sem cotação disponível não entra no total.'
                : `${derived.missingValueCount} posições sem cotação disponível não entram no total.`}
            </p>
          )}

          {hasUSDPosition && usdRate && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-300">
              <span className="inline-flex items-center gap-2">
                Dólar usado na conversão: US$ 1,00 = R$ {usdRateFormatter.format(usdRate.rate)}
                <Tooltip label="Procedência da taxa de câmbio USD/BRL">
                  <span className="block font-semibold text-white">Taxa USD/BRL</span>
                  <span className="mt-1 block">Fonte: {USD_SOURCE_LABEL[usdRate.source]}</span>
                  <span className="block">
                    Data: {usdRate.date ? usdRate.date : 'não informada pela fonte'}
                  </span>
                </Tooltip>
              </span>

              {usdRate.isFallback && (
                <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                  taxa USD aproximada
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* Composição consome o mesmo `derived` do card acima: com uma derivação
          própria os dois totais poderiam divergir na mesma tela. O estado de
          carregamento e a contagem de excluídas também vêm de cima, para o card
          não afirmar "sem cotação" enquanto as cotações estão em voo. */}
      {hasPositions && (
        <CompositionCard
          rows={derived.rows}
          totalBRL={derived.totalBRL}
          isQuotesLoading={quotesQuery.isLoading || usdRateQuery.isLoading}
          missingValueCount={derived.missingValueCount}
        />
      )}

      {/* Seletor de score — visível apenas quando o usuário tem regras cadastradas. */}
      {scoreNames.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label htmlFor="score-selector" className="text-sm font-medium text-gray-300 flex-shrink-0">
            Score ativo:
          </label>
          <select
            id="score-selector"
            value={activeScoreName ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setActiveScoreName(value || null)
              // Ao desselecionar o score, resetar ordenação apenas se a coluna
              // ativa for 'score' — preservar o sort do usuário nas demais colunas.
              if (!value && sort.column === 'score') setSort(DEFAULT_POSITION_SORT)
            }}
            className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Nenhum —</option>
            {scoreNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {activeScoreName && fundamentalsQuery.isLoading && (
            <span className="text-xs text-gray-400">Carregando fundamentals…</span>
          )}
          {activeScoreName && fundamentalsQuery.isError && (
            <span className="inline-flex items-center gap-2 text-xs text-red-400">
              Erro ao carregar fundamentals.
              <button
                type="button"
                onClick={() => fundamentalsQuery.refetch()}
                className="underline hover:text-red-300"
              >
                Tentar novamente
              </button>
            </span>
          )}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-4" role="status">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      {isError && (
        <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4" role="alert">
          <p className="text-sm text-red-400">
            {hasPositions
              ? 'Não foi possível atualizar suas posições. A lista abaixo é a última carregada.'
              : 'Não foi possível carregar suas posições.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-red-300 underline hover:text-red-200"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Cotação falha por conta própria e degrada só a si mesma: a lista de
          posições não depende dela para existir. */}
      {quotesQuery.isError && hasPositions && (
        <div
          className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4"
          role="alert"
        >
          <p className="text-sm text-amber-300">
            Não foi possível carregar as cotações. As posições continuam listadas, sem valor de
            mercado.
          </p>
          <button
            type="button"
            onClick={() => quotesQuery.refetch()}
            className="mt-2 text-sm font-medium text-amber-200 underline hover:text-amber-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Falha de revalidação não apaga o que já estava na tela: esconder a
          lista carregada por causa de um refetch perdido é regressão de
          informação. Sem cache algum, só o banner acima aparece — o estado
          vazio afirmaria uma carteira vazia que não foi verificada. */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : hasPositions || !isError ? (
        <PositionsTable
          rows={scoredRows}
          sort={sort}
          onSortChange={handleSortChange}
          scoreByTicker={activeScoreName ? scoreByTicker : undefined}
          fundamentalsUpdatedAt={activeScoreName ? fundamentalsUpdatedAt : undefined}
        />
      ) : null}

      <Modal
        isOpen={isModalOpen}
        title="Adicionar posição"
        onClose={closeModal}
        dismissible={!isSaving}
      >
        <AddPositionForm
          onSuccess={handleSuccess}
          onCancel={closeModal}
          onBusyChange={setIsSaving}
        />
      </Modal>
    </div>
  )
}
