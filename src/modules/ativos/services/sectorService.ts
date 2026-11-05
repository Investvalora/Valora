/** Listagem pública gratuita, sem enviar chaves ou dados da carteira ao provedor. */
export interface AssetSector { ticker: string; sector: string; source: 'brapi' }
const SECTOR_LABELS: Record<string, string> = {
  'Retail Trade': 'Comércio varejista', 'Energy Minerals': 'Petróleo, gás e combustíveis',
  'Health Services': 'Serviços de saúde', Utilities: 'Utilidade pública', Finance: 'Financeiro',
  'Consumer Services': 'Serviços ao consumidor', 'Consumer Non-Durables': 'Consumo não durável',
  'Non-Energy Minerals': 'Mineração e metais', 'Commercial Services': 'Serviços comerciais',
  'Distribution Services': 'Distribuição', Transportation: 'Transportes',
  'Technology Services': 'Serviços de tecnologia', 'Process Industries': 'Indústrias de transformação',
  Communications: 'Comunicações', 'Producer Manufacturing': 'Máquinas e equipamentos',
  Miscellaneous: 'Diversos', 'Electronic Technology': 'Tecnologia eletrônica',
  'Industrial Services': 'Serviços industriais', 'Health Technology': 'Tecnologia de saúde',
  'Consumer Durables': 'Consumo durável',
}

export const sectorService = {
  async list(): Promise<AssetSector[]> {
    const batches = await Promise.all(['stock', 'bdr'].map(async type => {
      const rows: AssetSector[] = []
      for (let page = 1; page <= 10; page++) {
        const response = await fetch(`https://brapi.dev/api/quote/list?type=${type}&limit=2000&page=${page}`, { signal: AbortSignal.timeout(15000) })
        if (!response.ok) throw new Error('Classificação por setor indisponível')
        const data = await response.json() as { stocks?: { stock?: string; sector?: string; type?: string }[]; hasNextPage?: boolean }
        if (!Array.isArray(data.stocks)) throw new Error('Classificação por setor inválida')
        for (const row of data.stocks) {
          if (row.type !== type || !row.stock || typeof row.sector !== 'string' || !row.sector.trim()) continue
          rows.push({ ticker: row.stock.toUpperCase(), sector: SECTOR_LABELS[row.sector] ?? row.sector.trim(), source: 'brapi' })
        }
        if (!data.hasNextPage) return rows
      }
      throw new Error('Classificação por setor incompleta')
    }))
    return batches.flat()
  },
}
