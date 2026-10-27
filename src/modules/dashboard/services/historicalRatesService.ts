import { supabase } from '../../../shared/services/supabaseClient'
import type { DatedRate, MacroRate } from '../historicalValuation'

const PTAX = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)'
const ptaxDate = (date: string) => `${date.slice(5, 7)}-${date.slice(8, 10)}-${date.slice(0, 4)}`

export const historicalRatesService = {
  async usd(from: string, to: string): Promise<DatedRate[]> {
    const result = new Map<string, { stamp: string; value: number }>()
    for (let skip = 0; ; skip += 500) {
      const params = new URLSearchParams({ '@dataInicial': `'${ptaxDate(from)}'`, '@dataFinalCotacao': `'${ptaxDate(to)}'`, '$format': 'json', '$top': '500', '$skip': String(skip), '$orderby': 'dataHoraCotacao asc', '$select': 'cotacaoVenda,dataHoraCotacao' })
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      try {
        // Olinda exige %20 no orderby; rejeita o '+' de URLSearchParams.
        const response = await fetch(`${PTAX}?${params.toString().replace(/\+/g, '%20')}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Falha no câmbio histórico (${response.status})`)
        const payload = await response.json() as { value?: { dataHoraCotacao: string; cotacaoVenda: number }[] }
        if (!Array.isArray(payload.value)) throw new Error('Resposta de câmbio histórico inválida')
        for (const row of payload.value) {
          const date = row.dataHoraCotacao?.slice(0, 10)
          const value = Number(row.cotacaoVenda)
          if (!date || date < from || date > to || !Number.isFinite(value) || value <= 0) continue
          if (!result.has(date) || result.get(date)!.stamp < row.dataHoraCotacao) result.set(date, { stamp: row.dataHoraCotacao, value })
        }
        if (payload.value.length < 500) break
      } finally { clearTimeout(timeout) }
    }
    return [...result].map(([date, row]) => ({ date, value: row.value })).sort((a, b) => a.date.localeCompare(b.date))
  },
  async macro(from: string, to: string): Promise<MacroRate[]> {
    const rows: MacroRate[] = []
    for (let start = 0; ; start += 500) {
      const { data, error } = await supabase.from('macro_rates').select('series,date,value').gte('date', from).lte('date', to).order('date').order('series').range(start, start + 499)
      if (error) throw error
      rows.push(...(data ?? []) as MacroRate[])
      if (!data || data.length < 500) return rows
    }
  },
}
