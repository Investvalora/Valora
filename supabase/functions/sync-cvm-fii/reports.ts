import { csvRecords, validIso } from '../_shared/officialFiles.ts'

export interface FundReport { cnpj: string; isin: string; reference_date: string; delivered_at: string; version: number; vpa: number; source_url: string }

/** Exact CNPJ + competence + version join. Names/prefixes are never identity. */
export function fundReports(generalCsv: string, complementCsv: string, source: string, today: string, diagnostic: (conflicts: number) => void = () => {}): FundReport[] {
  const general = csvRecords(generalCsv), complement = csvRecords(complementCsv)
  const required = ['CNPJ_Fundo_Classe', 'Data_Referencia', 'Versao']
  if (!general.length || !complement.length || ![...required, 'Codigo_ISIN', 'Data_Entrega'].every(k => k in general[0]) || ![...required, 'Valor_Patrimonial_Cotas'].every(k => k in complement[0])) throw new Error('cvm_schema_changed')
  const identity = (r: Record<string, string>) => `${r.CNPJ_Fundo_Classe.replace(/\D/g, '')}:${r.Data_Referencia}:${r.Versao}`
  const byKey = new Map(general.map(r => [identity(r), r]))
  const reports: FundReport[] = []
  for (const c of complement) {
    const g = byKey.get(identity(c)); if (!g) continue
    const vpa = Number(c.Valor_Patrimonial_Cotas), version = Number(c.Versao)
    if (!/^BR[A-Z0-9]{9}[0-9]$/.test(g.Codigo_ISIN) || !/^\d{14}$/.test(g.CNPJ_Fundo_Classe.replace(/\D/g, '')) || !validIso(g.Data_Referencia) || !validIso(g.Data_Entrega) || g.Data_Entrega > today || g.Data_Referencia > g.Data_Entrega || !c.Valor_Patrimonial_Cotas || !Number.isFinite(vpa) || vpa <= 0 || !Number.isInteger(version) || version < 1) continue
    reports.push({ cnpj: g.CNPJ_Fundo_Classe.replace(/\D/g, ''), isin: g.Codigo_ISIN, reference_date: g.Data_Referencia, delivered_at: g.Data_Entrega, version, vpa, source_url: source })
  }
  if (!reports.length) throw new Error('cvm_no_valid_reports')
  const unique = new Map<string, FundReport>(), conflicts = new Set<string>()
  for (const report of reports) {
    const key = `${report.cnpj}:${report.reference_date}:${report.version}`
    const previous = unique.get(key)
    if (previous && JSON.stringify(previous) !== JSON.stringify(report)) conflicts.add(key)
    unique.set(key, report)
  }
  for (const key of conflicts) unique.delete(key)
  diagnostic(conflicts.size)
  return [...unique.values()]
}
