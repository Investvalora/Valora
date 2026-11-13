# Homologação de produção — PR152 — 12/11/2026

Merge `e8a2132de0af2ab0d5617a9744dea339635ae2b3`. Checks da PR/Vercel e CI/main `43333504314` aprovados.

Migration `provider_budget_diagnostics` aplicada via MCP em `20261113000656` UTC (arquivo versionado `20261112234211`). Função internacional v14 ACTIVE, incluindo o helper de auditoria. Autenticação própria/OIDC preservada: POST sem autenticação retornou 401. Nova tabela sem SELECT de anon; helper sem EXECUTE de authenticated. Health advisor sem achados.

## Execuções reais

Três dispatches na main, sem alterar tarefas ou sua prioridade manualmente, respeitaram a reserva das cotas e retomaram conflitos com evidência primária posterior:

- [43334461462](https://github.com/Investvalora/Valora/actions/runs/43334461462): sucesso. Alpha/META, quatro eventos sem erro. Marketstack/META, dois eventos e `provider_precision_limited`; auditoria parcial, sem declarar cobertura completa.
- [43334682185](https://github.com/Investvalora/Valora/actions/runs/43334682185): sucesso. Alpha/PRT, 12 eventos sem erro; Marketstack/MCD, quatro sem erro.
- [43334808695](https://github.com/Investvalora/Valora/actions/runs/43334808695): sucesso. Alpha/BMN, 12 eventos sem erro; Marketstack/NU, calendário indisponível explicitado e auditado como parcial.

META, PRT e BMN ficaram sem erro Alpha, com sucesso recente e lease liberado. Zero tarefas restantes elegíveis para nova tentativa pela mesma evidência. Os erros históricos desses três foram atualizados por consultas reais, sem apagar histórico artificialmente. Não significa cobertura universal dos fornecedores.

O fallback automático das 00:11 UTC (21h11 Brasília) executou após os dispatches: Alpha/GGG aprovado e Marketstack/CR com `provider_event_conflict`, mantendo auditoria failed. A divergência CR entre fontes continua aberta; não é falha do mecanismo de cotas/nova tentativa, mas impede declarar o pipeline inteiro sem pendências. O valor público não foi alterado.

## Diagnóstico de cotas e políticas

A virada do dia UTC restabeleceu o orçamento. O preflight real reconheceu cinco chaves Marketstack configuradas e gravou retrato agregado, com horário explícito. Esse é o orçamento no momento do preflight, não um contador instantâneo após cada HTTP.

Teste transacional adicional elevou temporariamente o uso diário das chaves rastreadas para o limite, verificou `key_budget_exhausted=true`, `effective_daily_remaining=0` e `stale=false`, e executou rollback integral. Não fez HTTP nem consumiu cota real. As verificações de adiamento na resposta/auditoria e retrato vencido/dia anterior também estão cobertas pela regressão local/CI.

AMZN aparece não expirada e sem renovação necessária, com validade até 12/12/2026. A política não foi prolongada. Primeira passagem das filas e cadência GitHub continuam em acompanhamento.

Recebimentos pessoais antes/depois: 208 registros, checksum `14453d1c05f93ee28296f0cea79b5f17` preservado. Nenhuma alteração de lançamentos, quantidades ou recebimentos pessoais nesta homologação.
