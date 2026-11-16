# Homologação PR166 — 16/11/2026

- Merge `f966c3f76adebdc269b3553879ec9f410e89524f`; checks da PR aprovados.
- Migration `resolve_high_priority_cash_events` aplicada e Edge `sync-international-announcements` publicada ACTIVE v25, preservando autenticação própria.
- Sete revisões aplicadas: três ITA, SAP, MRX e dois PR. Valores públicos iguais ao catálogo, source issuer_primary. MRX mantém declaração null e anúncio 05/11.
- Tabelas privadas com RLS e sem SELECT para anon/authenticated. Advisor informa ausência intencional de políticas nessas tabelas; avisos gerais de pg_net em public e proteção de senhas vazadas desativada permanecem fora desta entrega.
- Execução real https://github.com/Investvalora/Valora/actions/runs/43935619538 aprovada. Duas filas públicas consultadas, vazias e sem falhas; deadline não atingido.
- Marketstack/SAP retornou uma observação com provider_primary_disagreement: taxa inicial do fornecedor foi preservada como divergência e não substituiu o bruto final do depositário. Não é cobertura completa do fornecedor.
- Alpha não foi consultada por orçamento diário esgotado (20/20). O reteste real Alpha/PR e a nova classificação parcial continuam pendentes de cota e elegibilidade agendada; não foram alteradas quotas ou datas de prioridade.
- Hashes anteriores e posteriores idênticos: transactions 2c719e7834e3874bd0a48b3b8b027276; positions 8ab31fc81cd171db7f7cce6bf72c4058; wallet_income 65c15fcfb4457c7eb242c40fe9fdf09c.
- Sem alterações de UI nesta entrega; homologação do backend realizada. Cobertura universal e pontualidade futura do cron não são afirmadas.
