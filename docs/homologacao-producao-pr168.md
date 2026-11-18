# Homologação PR168 — 17/11/2026

- Merge `ae58ac0c80ba482a0af1b52d7c31579e4e3c54fc`. Checks da PR aprovados, incluindo app, 209 arquivos de teste, replay SQL, isolamento, identidade, probe e Vercel.
- Migration `alpha_per_key_budget` aplicada em produção. Edge international ACTIVE v27, autenticação própria preservada.
- Antes: agregado Alpha 20, uma chave usada com 20; depois: agregado 21, duas chaves com distribuição [20,1]. Nenhum contador zerado. Rotação por esgotamento local efetivamente observada em chamada HTTP real.
- Execução [44192878864](https://github.com/Investvalora/Valora/actions/runs/44192878864) aprovada em 30s; nove lotes públicos, zero falhas, deadline não atingido.
- Alpha/TIC respondeu `provider_calendar_unavailable`; não houve chave inválida ou bloqueio de quota nessa resposta. Cobertura de TIC continua incompleta; não confundir uso real da nova credencial com disponibilidade de calendário para todo ticker.
- Health: seis chaves configuradas, cinco disponíveis, saldo local efetivo 99, per_key_daily_limit 20, budget_exhausted false. Dois itens Alpha ainda devidos. Não foram antecipadas tarefas MRX/PR.
- Tabela alpha_key_pool com RLS e sem SELECT para anon/authenticated; claim_alpha_provider privado. Advisor sem novas advertências: apenas INFO intencional das tabelas privadas sem políticas e avisos gerais anteriores de pg_net em public/proteção de senhas vazadas desativada.
- Hashes antes/depois idênticos: transactions `2c719e7834e3874bd0a48b3b8b027276`; positions `8ab31fc81cd171db7f7cce6bf72c4058`; wallet_income `65c15fcfb4457c7eb242c40fe9fdf09c`.
- Rodízio após consumo de 20 homologado. Permanecem as lacunas de fornecedores e retestes MRX/PR conforme elegibilidade. Não se afirma que todas as credenciais possuem cotas independentes no provedor.
