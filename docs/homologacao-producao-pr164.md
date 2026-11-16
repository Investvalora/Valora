# Homologação PR164 — 16/11/2026

- PR164 mesclada em `64c0be2342e792513f3cf6b97583aea35b2f642a`; checks da PR e CI/main `43924780019` aprovados.
- Migration `reconcile_pg_official_precision` aplicada em produção. Quatro eventos PG em `issuer_primary`: janeiro 1,0568 USD; abril/julho/outubro 1,0885 USD. Quatro conflitos revisados, nenhum pendente; snapshots e auditoria preservados.
- Apenas a tarefa Alpha/PG foi antecipada uma vez, sem mudar quotas ou outras tarefas. [Rotina real 43925490652](https://github.com/Investvalora/Valora/actions/runs/43925490652) na main mesclada aprovada em 54s.
- Alpha/PG consultado: quatro eventos, erro nulo, nova última execução bem-sucedida em 16/11 às 18:08:14 UTC. Marketstack/PG também foi consultado pela fila normal: quatro eventos, `provider_precision_limited`. O dado arredondado continua explícito e não substitui o oficial.
- Seis lotes públicos, zero falhas. Massive/Alpaca pulados por orçamento ou ausência de tarefa vencida; não contam como reteste de cobertura.
- Hashes antes da migration e depois da rotina idênticos: transações `2c719e7834e3874bd0a48b3b8b027276`; posições `8ab31fc81cd171db7f7cce6bf72c4058`; recebimentos `65c15fcfb4457c7eb242c40fe9fdf09c`.
- Função de revisão e catálogo privado sem acesso anon/authenticated. Advisor sinaliza informações de RLS sem políticas nas tabelas privadas (negação intencional por padrão), além de avisos gerais sobre pg_net no schema public e proteção de senhas vazadas desativada; estes avisos não foram alterados nesta entrega. [pg_net](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Encerra a causa PG da run 43788678050. Cobertura geral permanece parcial: Alpha chegou ao limite diário (20 consultas); há tarefas de cobertura sem calendário completo e evidências suplementares ainda não confirmadas. Não foram forçadas chamadas além das quotas nem declarada cobertura total.
