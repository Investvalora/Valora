# Homologação PR170 — 17/11/2026, 22h42 Brasília

- Merge `f1b67e43acb567edeec97f69a45e58b223d9e57c`. Checks de app, replay, isolamento, identidade, probe e Vercel aprovados.
- Migrations `eligible_provider_queue_health` e `reviewed_issuer_cash_policies` aplicadas e registradas. Nenhum deploy de Edge necessário.
- Alpha antes: due=1, oldest_due em 13/11. Depois: due=0, scheduled_due=1, oldest_due=null, stale=false e backlog_overdue=false. A AMZN inelegível permanece rastreável sem produzir falso atraso.
- Onze novas políticas confirmadas: AS, BA, BNC, BRK.B, GO, IT, KN, MX, TSLA, NU e SA. Datas fixas 18/11 01:25 UTC a 18/12 01:25 UTC. Com AMZN/TIC, 13 emissores classificados. Lacunas do health Alpha 13→2; Marketstack 22→11. Redução por classificação oficial, não pela criação de novos dividendos.
- Health e wrapper anterior continuam privados, sem EXECUTE para anon/authenticated. Advisors antes/depois iguais: INFO intencional de tabelas privadas; avisos prévios de [pg_net em public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção de senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- [Run 44217755215](https://github.com/Investvalora/Valora/actions/runs/44217755215) no merge correto, aprovada em aproximadamente 28 segundos. Dois lotes públicos, nenhuma falha nem deadline atingido.
- Passo de cadência executado com `available=true`, doze runs agendados, maior intervalo de criação 37.091s, idade do último schedule 21.386s e espera do run atual por runner zero. A limitação do agendador continua explicitamente visível; o diagnóstico não garante pontualidade.
- PR/Marketstack: um hold privado preservado; zero eventos públicos US$ 0,03 com ex 30/06. Não antecipadas tarefas dos fornecedores nem alteradas cotas nesta homologação.
- Hashes financeiros iguais antes/depois: transactions `2c719e7834e3874bd0a48b3b8b027276`; positions `8ab31fc81cd171db7f7cce6bf72c4058`; wallet_income `65c15fcfb4457c7eb242c40fe9fdf09c`.

Entrega homologada. Continuam pendentes BB/PERT, fontes com dados divergentes/incompletos e a decisão sobre disparador independente se for exigida periodicidade previsível. PR/Marketstack segue retido até confirmação oficial.
