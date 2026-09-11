export type AlertPosition = { ticker: string }
export type AlertTransaction = { ticker: string }
export type AlertQuote = { ticker: string; date: string; close?: number }

export type AlertCandidate = {
  type: 'position_no_transactions' | 'stale_quote' | 'opportunity' | 'overvalued'
  ticker: string
  title: string
  description: string
  last_quote_date?: string
}

export function findAlertCandidates(
  positions: AlertPosition[],
  transactions: AlertTransaction[],
  quotes: AlertQuote[],
  now = Date.now(),
): AlertCandidate[] {
  const transactionTickers = new Set(transactions.map((transaction) => transaction.ticker))
  const latestQuotes = new Map<string, AlertQuote>()

  for (const quote of quotes) {
    const current = latestQuotes.get(quote.ticker)
    if (!current || quote.date > current.date) latestQuotes.set(quote.ticker, quote)
  }

  return positions.flatMap((position) => {
    const candidates: AlertCandidate[] = []
    if (!transactionTickers.has(position.ticker)) {
      candidates.push({
        type: 'position_no_transactions',
        ticker: position.ticker,
        title: 'Posição sem transações',
        description: `A posição de ${position.ticker} não possui transações registradas.`,
      })
    }

    const quote = latestQuotes.get(position.ticker)
    const quoteDate = quote ? new Date(`${quote.date}T00:00:00Z`) : null
    if (quote && quoteDate && now - quoteDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
      candidates.push({
        type: 'stale_quote',
        ticker: position.ticker,
        title: 'Cotação desatualizada',
        description: `A última cotação de ${position.ticker} é de ${quote.date}.`,
        last_quote_date: quote.date,
      })
    }

    return candidates
  })
}

// ─── Alertas Bazin (Story 6.2) ───────────────────────────────────────────────

export type BazinDividend = { ticker: string; value_per_share: number }

/**
 * Gera candidatos a alerta de oportunidade/sobrevalorização via método Bazin.
 *
 * Regras:
 * - Preço-teto = annualDividend / minDY
 * - Oportunidade: margem > opportunityThreshold  (cotação > X% abaixo do teto)
 * - Sobrevalorizado: margem < overvaluedThreshold (cotação > Y% acima do teto)
 *
 * Skip silencioso quando:
 * - annualDividend <= 0 (sem dividendos no período)
 * - close ausente ou <= 0 (sem cotação válida)
 *
 * Função pura: sem I/O, sem efeitos colaterais.
 */
export function findBazinAlertCandidates(
  positions: AlertPosition[],
  dividends: BazinDividend[],
  quotes: AlertQuote[],
  minDY = 0.06,
  opportunityThreshold = 15,
  overvaluedThreshold = -20,
): AlertCandidate[] {
  // Somar dividendos por ticker
  const annualByTicker = new Map<string, number>()
  for (const d of dividends) {
    const v = Number(d.value_per_share)
    if (!Number.isFinite(v) || v <= 0) continue
    annualByTicker.set(d.ticker, (annualByTicker.get(d.ticker) ?? 0) + v)
  }

  // Indexar cotação mais recente por ticker (usa close do AlertQuote estendido)
  const closeByTicker = new Map<string, number>()
  for (const q of quotes) {
    const c = Number(q.close)
    if (Number.isFinite(c) && c > 0) closeByTicker.set(q.ticker, c)
  }

  const candidates: AlertCandidate[] = []

  for (const position of positions) {
    const annualDividend = annualByTicker.get(position.ticker) ?? 0
    if (annualDividend <= 0) continue

    const close = closeByTicker.get(position.ticker)
    if (!close || close <= 0) continue

    const ceilingPrice = annualDividend / minDY
    if (!Number.isFinite(ceilingPrice) || ceilingPrice <= 0) continue

    const margin = ((ceilingPrice - close) / close) * 100
    if (!Number.isFinite(margin)) continue

    const ceilingFmt = ceilingPrice.toFixed(2).replace('.', ',')
    const marginFmt = Math.abs(margin).toFixed(1).replace('.', ',')
    const dyPct = (minDY * 100).toFixed(0)

    if (margin > opportunityThreshold) {
      candidates.push({
        type: 'opportunity',
        ticker: position.ticker,
        title: `Oportunidade de compra: ${position.ticker}`,
        description:
          `${position.ticker} está ${marginFmt}% abaixo do preço-teto Bazin de R$ ${ceilingFmt} ` +
          `(DY mínimo ${dyPct}%). Margem de segurança: +${marginFmt}%.`,
      })
    } else if (margin < overvaluedThreshold) {
      candidates.push({
        type: 'overvalued',
        ticker: position.ticker,
        title: `Sobrevalorizado: ${position.ticker}`,
        description:
          `${position.ticker} está ${marginFmt}% acima do preço-teto Bazin de R$ ${ceilingFmt} ` +
          `(DY mínimo ${dyPct}%). Margem: -${marginFmt}%.`,
      })
    }
  }

  return candidates
}
