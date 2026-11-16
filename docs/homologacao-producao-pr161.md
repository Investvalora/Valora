# Homologação PR161 — 15/11/2026

Merge `b3cf385e273a649629a92a46a45bc25bbd670e2c`; checks da PR e CI/main `43760638419` aprovados. Migration `reconcile_wmt_official_precision` aplicada em produção, sem necessidade de novo deploy Edge (v24 preservada).

Quatro eventos WMT passaram a `issuer_primary` com USD 0,2475, fonte oficial Walmart e datas independentes: ex/registro 20/03/2026 → pagamento 06/04; 08/05 → 26/05; 21/08 → 08/09; 11/12 → 04/01/2027. Três históricos 0,248 preservados em `prior_row`; valor anterior do futuro 0,2475 também preservado. Nenhum snapshot de fornecedor foi alterado.

Lote público real obtido novamente: quatro linhas completas, uma linha histórica sem declaração. WMT reencaminhado uma vez para a primeira posição da fila e workflow `43760979726` disparado em `main`, no merge da PR161, para testar o caminho real respeitando leases e cotas.

Health advisor sem achados. Baseline financeiro anterior à migration: transactions `f88fa98884ab110a7b5586e5a34acf7b`; positions `99ec048cc73ed73f84c1f3b08b999ec1`; wallet_income `14453d1c05f93ee28296f0cea79b5f17`.

Workflow real `43760979726`: **success em 58 segundos**. Seis lotes públicos, zero falhas. Nasdaq/WMT retornou quatro eventos completos, uma linha sem declaração, zero conflitos e `nasdaq_partial_coverage` corretamente não fatal. Lease liberada; nenhuma duplicação. Alpha/WMT retornou cinco eventos sem erro; Marketstack pulada por orçamento das chaves; Massive/Alpaca puladas sem tarefas vencidas. Auditoria salva.

Hashes financeiros finais idênticos ao baseline acima. Quatro eventos oficiais WMT presentes; três históricos anteriores preservados. Homologação concluída para a correção de precisão e o workflow na versão mergeada. A declaração histórica ausente permanece lacuna explícita; a cadência automática futura e a cobertura dos demais ativos não são comprovadas por esta execução manual.
