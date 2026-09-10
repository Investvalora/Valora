export type AlertPosition = { ticker: string }
export type AlertTransaction = { ticker: string }
export type AlertQuote = { ticker: string; date: string }

export type AlertCandidate = {
  type: 'position_no_transactions' | 'stale_quote'
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