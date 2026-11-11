# Tooltip e conciliação dos proventos de novembro

Investigação de 11/11/2026, após a PR130. O print do responsável mostrava Valora: R$34,89 a receber, R$30,92 recebidos e R$65,81 total. Comparação com a [carteira pública do Investidor10](https://investidor10.com.br/wallet/public/1782570/earnings), sem alterações em dados pessoais.

## Tooltip

Causa confirmada: `ProventosChart` posicionava todo tooltip com `left-2 top-2`, independentemente da barra. Correção local acompanha o apontador e ancora na barra para foco/clique, limitando a posição ao gráfico/viewport. Fecha ao redimensionar e ao rolar horizontalmente, preservando Escape e saída do gráfico. Desktop: tooltip de novembro próximo à última barra, em vez do canto esquerdo. Layout de 390 px: tooltip entre x=83 e x=313, dentro da viewport, sem transbordamento horizontal da página.

## Eventos ausentes na previsão

| Ativo | Diagnóstico | Correção |
| --- | --- | --- |
| KLBN4 | Quatro parcelas oficiais já estavam em `b3_cash_announcements`, todas com data COM 15/12/2025. `dividends` continha o anúncio agregado Yahoo de 16/12/2025 sem data de pagamento; a tela não consultava as parcelas. | Integração local consome a tabela B3, mantém a data ex real do catálogo e substitui o agregado pelas parcelas oficiais. Novembro: R$0,04559717224 × 116 = R$5,28927197984, pagamento 12/11/2026. |
| COST | Evento Yahoo de 30/10/2026, US$1,47, sem pagamento. | Calendário público atualizado pontualmente: record date 30/10 e pagamento 13/11, fonte RI Costco. Preservada a data ex existente. |
| AAPL | Anúncio de novembro ainda não existia no catálogo; o histórico Yahoo terminava em agosto. | Inserido anúncio público confirmado: US$0,27, ex/record 12/11 e pagamento 16/11. Fonte Apple RI, ex corroborado pela bolsa de Viena. |

Fontes primárias: [Klabin RI](https://ri.klabin.com.br/dividendos-e-jcp/), [B3 Klabin](https://sistemaswebb3-listados.b3.com.br/listedCompaniesPage/main/12653/KLBN/corporate-actions?language=pt-BR), [Costco RI](https://investor.costco.com/stock-info/dividend-history/default.aspx), [Apple RI](https://investor.apple.com/dividend-history/) e [bolsa de Viena](https://www.wienerborse.at/en/news/vienna-stock-exchange-news/apple-resmed-dividends-global-market-11122026/).

O RI Klabin apresenta R$0,18238868899 por ação distribuído em quatro parcelas; a parcela oficial da B3 confirma o valor de novembro. Não confundir o total anual com o pagamento individual. A integração não inventa uma data ex: exige um único evento real do mesmo ticker/tipo nos sete dias após a data COM; ausente ou ambíguo, mantém o anúncio original sem preenchimento por suposição.

Parcelas de aprovações diferentes no mesmo dia são somadas por pagamento. A leitura é paginada e propaga erros. Pagamento muda da previsão para pagos na data registrada. Um recebimento importado de fevereiro com a mesma data COM não suprime a parcela de novembro; para parcelas, a deduplicação do crédito exige o mesmo pagamento. A data efetiva de liquidação de uma parcela que divirja da data pública exige conciliação específica, sem presumir que um crédito de outra parcela corresponde a ela.

As duas correções pontuais de COST/AAPL foram aplicadas e relidas em `public.dividends`; não houve alteração de posições, compras, vendas ou `wallet_income`. A atualização Yahoo existente preserva eventos com fonte/data confirmadas. COST mantém uma divergência de data ex entre catálogo Yahoo (30/10) e tabela RI (29/10): apenas o pagamento foi enriquecido nesta rodada, sem mudar elegibilidade global por suposição. O cadastro de AAPL usa a data ex explicitamente publicada pela bolsa.

## Comparação após recuperar os eventos

| Novembro/2026 | Valora local corrigido | Investidor10 |
| --- | ---: | ---: |
| A receber | R$40,55 | R$40,41 |
| Recebidos | R$30,92 | R$30,11 |
| Total | R$71,47 | R$70,52 |

Corrigido também o centavo de apresentação: o total do gráfico soma os dois subtotais mensais visíveis, já arredondados em centavos. O arredondamento acontece após agregar cada parcela do mês; não altera a precisão dos eventos, os registros recebidos nem os KPIs.

A diferença restante não comprova erro de quantidade:

- A receber: os cinco eventos BRL coincidem com a base do Investidor10. COST e AAPL são estimativas **brutas** no Valora, com PTAX disponível hoje; o Investidor10 exibe líquidos estimados e outro câmbio. O Valora conserva os valores originais USD, sem aplicar retenção presumida como crédito real.
- JPM: o extrato Nomad confirmou crédito líquido US$0,09 em **02/11**, enquanto o Investidor10 o aloca em **31/10**. O Valora mantém a data da corretora, incluindo cerca de R$0,49 em novembro.
- TFLO: líquido Nomad confirmado US$0,41 em 05/11, convertido no Valora para cerca de R$2,24; Investidor10 mostra R$2,03. Não substituir o crédito confirmado por uma estimativa externa.
- MA: Valora ainda estima o bruto (aproximadamente R$0,31); Investidor10 mostra líquido estimado R$0,20. Falta comprovação pessoal de retenção/crédito de MA para conciliar o líquido.

## Validação e pendências

- 90 testes aprovados em 15 arquivos: parcelas, data ex ausente/ambígua, transição para pagos, preservação dos recebimentos importados, serviço, tooltip e soma dos valores visíveis.
- Interface local autenticada conferida em desktop e 390 px. Anunciados mostra KLBN4, COST e AAPL com quantidades elegíveis/estimadas e moedas originais. Carteira Investidor10 preservada.
- Homologação final antes da PR: Escape fecha o tooltip; novembro mostra R$40,55 + R$30,92 = R$71,47. Em viewport de 390 px, tooltip entre x=83 e x=313 e largura da página de 390 px. Build e lint aprovados. Evidências locais em `output/qa-semana4/proventos-tooltip-corrigido-desktop.png` e `proventos-tooltip-corrigido-mobile.png`.
- Tooltip e leitura das parcelas B3 dependem da próxima publicação do frontend. As atualizações públicas de COST/AAPL já estão no banco compartilhado.
- A integração B3 é genérica para os tickers consultados, sem lista fixa de carteira. As correções pontuais de COST/AAPL **não** representam novos adaptadores automáticos de RI para anúncios dos próximos trimestres. Essa cobertura permanece pendente.
- Reteste em produção após merge e interação por toque físico continuam pendentes.
