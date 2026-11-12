# Revisão de cobertura internacional — 11/11/2026

## Mastercard: bloqueio ainda confirmado

Os índices canônicos `/investor-news/` e `/overview/` do RI responderam HTTP403 em consulta direta. A tabela `/stock-information/dividend-history/default.aspx` também respondeu403 via Node HTTPS, sem proxy, credenciais ou identidade de navegador. O comunicado original distribuído em Business Wire não concluiu a leitura no limite de15s. Não há fonte alternativa automática homologada nesta rodada.

O índice gratuito SEC `https://data.sec.gov/submissions/CIK0001141391.json` respondeu200 e confirmou Mastercard Inc/MA. Os8-K recentes de2026 não incluem comunicados próprios nas datas das declarações trimestrais de fevereiro, junho e setembro. Submissions permite descobrir filings, mas não basta para prometer antecipação do calendário de dividendos. A ausência nesses8-K não prova ausência de dividendo nem impede um documento futuro de conter essa informação.

Conclusão: preservar a proteção de identidade Nasdaq e as datas já confirmadas. MA continua aberta por falta de descoberta automática acessível; não usar um PDF fixo como feed e não completar datas por padrão trimestral. Nenhum evento MA alterado.

## COST: divergência de outubro conciliada, sem correção de dados

Consulta real ao endpoint Nasdaq `quote/COST/dividends?assetclass=stocks` retornou:

- declaração14/10/2026, ex30/10/2026, corte30/10/2026, pagamento13/11/2026, USD1,47.
- eventos anteriores24/07,01/05 e30/01/2026 também com calendário confirmado.

O cadastro Valora contém exatamente o primeiro conjunto, com origem primária `costco_ri`; nenhuma duplicata na data29/10. O [8-K original de14/10/2026](https://www.sec.gov/Archives/edgar/data/909832/000090983226000096/cost-20261014.htm), descoberto pelo índice SEC da Costco/CIK909832 e lido diretamente com HTTP200, confirma declaração, valor, corte30/10 e pagamento13/11. O8-K não declara ex-date; a ex30/10 vem da Nasdaq, não de inferência a partir do corte.

A referência histórica a29/10 não justifica mudar o dado atual. A divergência antiga fica encerrada para esse evento com as evidências atuais. Não muda lançamentos, elegibilidade ou créditos pessoais.

## Novo evento: especial COST ainda sem ex independente

O [8-K original apresentado em10/11/2026](https://www.sec.gov/Archives/edgar/data/909832/000090983226000134/cost-20261107.htm), descoberto pelo mesmo índice oficial e lido diretamente com HTTP200, informa dividendo especial de USD30 por ação, corte24/11/2026 e pagamento04/12/2026.

Esse evento não veio na resposta Nasdaq consultada; o Valora também não o contém. O documento não confirma a ex-date. Nenhum evento foi inserido e nenhum imposto ou líquido presumido.

Nova prioridade: descoberta SEC por identidade CIK/ticker, parsing estrito dos8-K elegíveis e armazenamento separado de anúncio pendente de ex independente. Só integrar ao cálculo de elegibilidade quando houver data ex comprovada. Identificar especial separadamente para não tratar USD30 como dividendo recorrente em DY/Bazin. Não dividir datas nem substituir o dividendo ordinário de USD1,47.

## Recorrência do coletor

A API GitHub mostrou workflow ativo, Actions habilitadas, repositório público não arquivado e branch padrão main. A consulta de runs com `event=schedule` ainda retornou vazia; os testes manuais aprovados não comprovam recorrência. Pendência mantida para observação e diagnóstico. Não foi alterado agendamento ou criada credencial nesta rodada.

## Preservação

Todas as consultas desta investigação foram de leitura. Sem migration, deploy, alteração de carteira, recebimentos, datas ou cotações. Documentos baixados somente em output local; nenhuma credencial necessária para essas fontes públicas.
