# Homologação PR165 — 16/11/2026, 15h29 Brasília

- Merge `7642286fee196ab9ad8ed7dfe7b196365e36b362`. Checks da PR e CI/main `43928307471` aprovados.
- Migration `review_vg_wmt_historical_dividends` aplicada em produção. VG ex 15/12/2025 em 0,017 USD e ex 16/03/2026 em 0,018 USD; WMT ex 12/12/2025 em 0,235 USD. Calendário com fonte `issuer_primary`, conflitos revisados sem apagar snapshots.
- [Rotina real 43928941088](https://github.com/Investvalora/Valora/actions/runs/43928941088) no merge aprovado: 16 lotes públicos, zero falhas, janela não atingida; duração total de dois minutos. Tarefas primárias vencidas 18 → 2; SEC 31 → 23. Nenhuma tarefa foi antecipada manualmente nesta rodada.
- Marketstack consultou VG: quatro eventos, `provider_precision_limited`, sem erro operacional ou substituição do valor oficial. Alpha pulada por orçamento/tarefa; Massive/Alpaca puladas por orçamento/tarefa. Não equivale a novo reteste HTTP WMT nem cobertura geral completa.
- Hashes antes da migration e depois da rotina idênticos: transações `2c719e7834e3874bd0a48b3b8b027276`; posições `8ab31fc81cd171db7f7cce6bf72c4058`; recebimentos `65c15fcfb4457c7eb242c40fe9fdf09c`.
- Restam seis conflitos não revisados em ITA, MRX e SAP, além de Alpha/PR inválida e demais lacunas de cobertura. Cadência contínua do GitHub ainda exige acompanhamento; execução manual não comprova regularidade automática.
