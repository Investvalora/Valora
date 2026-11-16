# Cobertura e filas internacionais — 16/11/2026

## Auditoria de produção, sem alterar carteiras

- Todas as tarefas das filas primária, SEC e fornecedores tiveram pelo menos uma tentativa (`last_attempt_at` nulo: zero em cada fila). Isso encerra a pendência de primeira passagem, mas não significa calendário completo.
- Fallback Supabase ativo em `11,31,51 * * * *`; cinco execuções cron recentes concluídas, com registros duráveis do job de fornecedores correspondentes. O retorno cron isolado confirma enfileiramento, não HTTP; o job durável confirma a execução.
- GitHub automático continua com atrasos entre execuções, apesar do cron de quinze minutos. A última coleta dirigida aprovada processou seis lotes públicos, enquanto ainda restaram 18 tarefas primárias e 31 SEC vencidas. Alpha chegou a 20 consultas/dia; não ampliar chamadas pagas nem contornar cotas.

## Implementação desta branch

O runner pode alternar até oito lotes por fila pública, antes eram três. Mantém os lotes originais de duas tarefas primárias/uma SEC, leases, bloqueio por erro ou fila vazia e janela de 120 segundos verificada entre lotes. Consultas em andamento terminam normalmente. Providers permanecem em uma coleta por execução, com seus orçamentos; o timeout do workflow continua cinco minutos. Não garante que o GitHub execute no horário solicitado.

Revisão primária de três conflitos: VG ex 15/12/2025, valor 0,017 USD, pagamento 31/12; VG ex 16/03/2026, valor 0,018 USD, pagamento 31/03; WMT ex 12/12/2025, valor 0,235 USD, pagamento 05/01/2026. Alpha já guarda os valores corretos; a Marketstack arredonda para 0,02/0,02/0,24. A migration usa o mecanismo privado existente de revisão e preserva snapshots e histórico de conflitos. Não modifica transações, posições ou recebimentos.

Fontes oficiais:

- [VG dezembro](https://ventureglobal.com/2025/12/01/venture-global-inc-announces-record-date-for-cash-dividend-3/)
- [VG março](https://investors.ventureglobal.com/news/news-details/2026/Venture-Global-Inc--Announces-Record-Date-for-Cash-Dividend/default.aspx)
- [WMT declaração 2025](https://corporate.walmart.com/content/corporate/en_us/news/2025/02/20/walmart-raises-annual-dividend-13-percent-to-0-94-per-share-marking-52nd-consecutive-year-of-dividen-increases.html)

Datas ex não inferidas de record: permanecem ancoradas nos eventos independentes existentes.

## Lacunas que exigem tratamento diferente

- **ITA:** [suplemento oficial iShares](https://www.ishares.com/us/literature/sai/sai-ishares-trust-3-31.pdf) confirma split 3:1, com negociação ajustada em 05/11/2026. Yahoo e Alpha divergem em aproximadamente três vezes nos eventos anteriores. A relação aproximada não comprova os valores brutos exatos: há diferenças adicionais de precisão. Não multiplicar dividendos, quantidades ou recebimentos automaticamente sem conferir a base histórica e os eventos oficiais.
- **SAP:** conflito 2,929075 Alpha contra 2,929 Yahoo e 2,93 Marketstack. O [FAQ oficial](https://www.sap.com/investors/en/financial-documents-and-events/events/agm/faq.html) separa pagamento ao depositário (08/05) do crédito de ADR. Buscar o aviso do [depositário Deutsche Bank](https://adr.db.com/drwebrebrand/dr-universe/dr_details.html?identifier=1109), com moeda, taxa bruta, câmbio e datas. Valor de ação europeia não comprova USD/ADR.
- **MRX:** fornecedores concordam com 0,16 USD, ex/record 16/11 e pagamento 02/12, mas divergem em declaração 03/11 versus 05/11. [Comunicado do próprio emissor](https://www.globenewswire.com/news-release/2026/11/05/3396282/0/en/marex-group-limited-announces-third-quarter-2026-results.html) confirma o anúncio em 05/11, sem estabelecer nesse trecho a data da deliberação. Preservar as duas evidências; não escolher uma data por recência.
- **PR:** Alpha retorna `provider_invalid_amount`; exige resposta real em nova janela de orçamento para identificar o campo. Não há payload privado bruto no diagnóstico e não se usa segredo no frontend.
- Ausência de calendário em AMZN/NU e outros tickers continua distinta de prova de ausência de dividendos. As fontes alternativas e as políticas já existentes permanecem válidas; nenhuma inferência de recebimento pessoal.

## Validação e publicação

23 baterias SQL do CI aprovadas no QA isolado, incluindo o replay dos três eventos revisados, preservação dos snapshots e precisão limitada sem sobrescrever o valor oficial. Vitest: 270 testes em 29 arquivos aprovados, incluindo alternância, limites, falha/fila vazia, janela de tempo e integração dos coletores com 11 leases únicas sem chamadas pagas. Nada desta branch foi aplicado em produção. Após merge: aplicar a migration, executar uma coleta limitada e verificar escoamento e logs; revisão oficial não deve ser confundida com nova consulta HTTP do fornecedor.
