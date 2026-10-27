import { BarChart3, BookOpen, ChevronRight, ExternalLink } from 'lucide-react'
import type { InsightStrategy } from '../types'

const methods = {
  bazin: {
    title: 'Bazin · foco em renda',
    formula: 'Preço-teto = proventos por ação (12M) ÷ DY mínimo',
    example: 'Com R$ 2,40 e DY de 6%: 2,40 ÷ 0,06 = R$ 40,00.',
    suitable: 'Ações brasileiras e stocks de empresas maduras, com distribuições recorrentes. Em FIIs e REITs é uma adaptação por rendimento. BDRs exigem proventos por recibo, na mesma moeda da cotação.',
    unsuitable: 'Criptomoedas, renda fixa e ativos sem distribuição. ETFs distribuidores permitem comparar renda, mas o cálculo não avalia a carteira do fundo.',
    note: 'No Valora, somamos os últimos 12 meses, sem projetar crescimento nem retirar pagamentos extraordinários. Os 6% são uma premissa ajustável, sem garantia de retorno; a conta não reproduz todos os filtros de qualidade do método original.',
    source: 'https://investidor10.com.br/conteudo/metodo-bazin/',
  },
  graham: {
    title: 'Graham · lucro e patrimônio',
    formula: 'Número de Graham = √(22,5 × LPA × VPA)',
    example: 'LPA é o lucro por ação; VPA, o patrimônio por ação. Com LPA de R$ 2 e VPA de R$ 20, a referência é R$ 30. O fator 22,5 vem de 15 × 1,5.',
    suitable: 'Ações e stocks de empresas com lucros estáveis e patrimônio contábil representativo. BDRs precisam de LPA e VPA ajustados por recibo e moeda.',
    unsuitable: 'FIIs, REITs, ETFs, criptomoedas e renda fixa. Perde utilidade com muitos intangíveis, lucros cíclicos ou crescimento elevado. Com LPA ou VPA zero, negativo ou ausente, não calculamos uma referência.',
    note: 'Referência simplificada, exibida como preço justo. Usamos o LPA dos últimos 12 meses e o VPA mais recente. O fator limita o produto dos múltiplos P/L e P/VP; não garante seus limites separadamente, nem substitui a análise do negócio.',
    source: 'https://download.sharescope.co.uk/doc/Chapter9_Sharevaluations.pdf',
  },
}

export function ValuationGuide({ strategy, onCalculate }: { strategy?: InsightStrategy; onCalculate?: (method: InsightStrategy) => void }) {
  return <section aria-label="Como usar os métodos de avaliação" className={`grid gap-5 ${strategy ? '' : 'md:grid-cols-2'}`}>
    {(['bazin', 'graham'] as const).filter((method) => !strategy || strategy === method).map((method) => {
      const content = methods[method]
      const bazin = method === 'bazin'
      const Icon = bazin ? BarChart3 : BookOpen
      return <article key={method} className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#1b1b1b] p-5 lg:p-6">
        <h2 className="mb-4 flex items-center gap-3 text-[15px] font-medium text-white"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${bazin ? 'bg-[#797fff]/15 text-[#969aff]' : 'bg-[#e477a7]/15 text-[#e477a7]'}`}><Icon className="h-[18px] w-[18px]" /></span>{content.title}</h2>
        <div className={`mb-4 rounded-lg border p-3.5 ${bazin ? 'border-[#797fff]/40 bg-[#797fff]/[0.07]' : 'border-[#e477a7]/35 bg-[#e477a7]/[0.07]'}`}>
          <p className="text-[13px] font-medium text-white">{content.formula}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">{content.example}</p>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-white/60">
          <div><h3 className="font-medium text-white/90">Faz mais sentido</h3><p>{content.suitable}</p></div>
          <div><h3 className="font-medium text-white/90">Não se aplica</h3><p>{content.unsuitable}</p></div>
          <p className="text-[11px] text-white/40">{content.note}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <a href={content.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-[#a0a7ff] hover:underline">Referência sobre {bazin ? 'Bazin' : 'Graham'}<ExternalLink className="h-3 w-3" /></a>
          {onCalculate && <button type="button" onClick={() => onCalculate(method)} aria-label={`Calcular insight ${bazin ? 'Bazin' : 'Graham'}`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#393939] px-4 py-2 text-xs text-white transition-colors hover:bg-[#484848]"><ChevronRight className="h-3 w-3" />Calcular insight</button>}
        </div>
      </article>
    })}
    <p className={`text-[11px] leading-relaxed text-white/40 ${strategy ? '' : 'md:col-span-2'}`}>Desconto = (referência − cotação) ÷ referência × 100. Positivo indica cotação abaixo; negativo indica acima; zero indica igualdade. Não representa valorização futura nem uma indicação de compra.</p>
  </section>
}
