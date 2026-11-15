# Homologação de produção PR160 — 15/11/2026

Merge `ce6db257302c76c2c5a9ad758ff97b9d1094db2c`. Checks da PR e CI/main `43759373743` aprovados. Migration `close_dividend_coverage_gaps` aplicada e função internacional ACTIVE v24. POST sem credenciais: 401. Tabela de revisão sem SELECT pelo cliente e RPC sem EXECUTE anônimo; health advisor sem achados.

## Calendário e conciliação

Cinco eventos publicados como `issuer_primary`: GOOGL USD 0,22, ex 07/12/pagamento 14/12; KO USD 0,53 e MCD USD 1,93, ex 01/12/pagamento 15/12; DIS USD 0,75, ex 15/12/2025 e pagamento corrigido para 15/01/2026, preservando a data anterior 29/12/2025 na auditoria; GGG USD 0,295, ex 20/07/pagamento 05/08.

DIS/GGG com conflitos revisados no campo próprio. Nova rodada real Alpha e Marketstack de DIS retornou dois eventos por fonte, zero erros. CR mantém 0,255 oficial e rejeição explícita de 0,435 da Alpha; nenhuma alteração no valor correto foi necessária.

## Rotas dirigidas

Requisição 9437: HTTP 200, auditoria salva; Alpaca/AMZN com zero observações e `supplemental_calendar_unavailable`, eliminando `supplemental_invalid_response` sem afirmar ausência comprovada de dividendos. Massive pulada sem tarefas vencidas. Requisição 9441, após intervalo mínimo de um minuto: NU com o mesmo diagnóstico correto, HTTP 200, auditoria salva, sem timeout. Duas consultas Alpaca limitadas; leases liberadas. APIs antigas corretamente puladas na segunda rodada por orçamento/sem tarefas vencidas.

JPM: payload público real obtido pelo coletor corrigido, dois filings lidos, zero eventos extraídos. Requisição autenticada 9439 à função publicada: HTTP 200, sem timeout/conflitos, lease liberada e último erro limpo. Resolve leitura, sem prometer cobertura completa da SEC.

WMT: payload real com quatro eventos completos e uma linha sem declaração. Requisição 9438 à nova rota publicada: HTTP 200, um evento salvo (ex 11/12/2026, USD 0,2475, pagamento 04/01/2027), três conflitos preservados. A rotina não perdeu as linhas válidas nem inventou a declaração ausente.

**Nova pendência WMT:** os três eventos históricos Yahoo de ex 20/03, 08/05 e 21/08/2026 têm 0,248. Nasdaq e Alpha têm 0,2475 nas três datas, com pagamento/registro completos. O armazenamento bloqueou a diferença com `nasdaq_event_conflict`; exige conciliação de precisão apoiada em RI. A PR160 corrigiu o parser, mas não contém revisão oficial desses três eventos. Não homologar a cobertura WMT como totalmente encerrada.

## Preservação

Hashes antes/depois de todas as verificações idênticos: transactions `f88fa98884ab110a7b5586e5a34acf7b`; positions `99ec048cc73ed73f84c1f3b08b999ec1`; wallet_income `14453d1c05f93ee28296f0cea79b5f17`. Nenhuma compra, posição ou recebimento pessoal alterado.
