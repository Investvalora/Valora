# Homologação da PR169 — 17/11/2026, 22h18 Brasília

Merge `e6ff79a4dc78854a6731ddd465bcb0410c93f41b`, checks de app, isolamento, replay SQL, identidade, probe e Vercel aprovados.

- Migration `reviewed_nonpayer_coverage` aplicada em produção. TIC possui fonte oficial, observação fixa de 17/11 e vencimento em 17/12; `issuer_nonpayer_confirmed('TIC')=true`. RLS e ausência de SELECT para anon/authenticated conferidos.
- Função `sync-international-announcements` ACTIVE v28, com autenticação própria e configuração JWT anterior preservadas.
- Antecipada somente a tarefa PR/Alpha sem lease para validar a mudança publicada; sem reset de orçamento. Requisição real 12130, HTTP 200, quatro eventos válidos e `provider_partial_invalid_amount`; diagnóstico `{row:2,kind:zero,ex_date:2026-06-30,value_type:string,decimal_places:1}`. Auditoria persistida como partial, sem erro técnico e com lacuna Alpha/PR explícita. Nenhum recebimento criado.
- [Run de homologação 44214617886](https://github.com/Investvalora/Valora/actions/runs/44214617886) aprovada em 26 segundos, dois lotes públicos, zero falhas e sem interrupção por prazo.
- Filas primária, SEC e Marketstack sem tarefas vencidas. Alpha mantém contagem de uma tarefa AMZN inelegível pela política vigente; não representa bloqueio do pool. TIC saiu da contagem de lacunas: Alpha 14→13 e Marketstack 23→22, dois emissores com política confirmada.
- Hashes financeiros antes/depois iguais: transactions `2c719e7834e3874bd0a48b3b8b027276`; positions `8ab31fc81cd171db7f7cce6bf72c4058`; wallet_income `65c15fcfb4457c7eb242c40fe9fdf09c`.
- Advisor antes/depois sem novos achados: INFO de tabelas privadas com RLS sem políticas; avisos anteriores de [pg_net em public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) preservados fora do escopo.

Entrega homologada. Continuam em acompanhamento a cadência futura do GitHub, calendários ausentes dos demais emissores e a observação PR/Marketstack US$ 0,03 sem confirmação oficial. Não se afirma cobertura integral dos fornecedores.
