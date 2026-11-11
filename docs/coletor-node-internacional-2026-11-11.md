# Coletor internacional Node — 11/11/2026

## Correção proposta para o bloqueio da PR135

Mover somente a consulta Nasdaq para Node24 em runner padrão GitHub Actions. Supabase continua responsável pelo catálogo, leases, validação de gravação, conflitos e proteção de dados. O repositório é público; runners padrão são gratuitos, conforme [documentação GitHub](https://docs.github.com/en/billing/concepts/product-billing/github-actions). Não cria endpoint de proxy público nem grava via frontend.

O workflow tem dois caminhos separados:

- PR ou despacho manual com `probe_only=true`: consulta apenas AAPL/COST para testar acesso à fonte. Sem credencial, OIDC, chamada de fila ou gravação.
- Agendamento de 15 minutos ou despacho não-probe, somente na main: requisita identidade OIDC temporária e reivindica até dois ativos do catálogo. Consulta identidade e anúncio na fonte; conclui os lotes com token de lease de dez minutos e uso único. Sucesso aguarda12h; ativo sem cobertura24h; falha transitória2h.

O runner mantém `contents:read`, não recebe `service_role`, segredo de banco, chave pessoal nem credencial persistente. Apenas o job da main possui `id-token:write`. O Supabase verifica assinatura RS256 via JWKS fixo GitHub, issuer/audience/expiração, IDs imutáveis do repo1228349930 e owner282645586, repo Investvalora/Valora, branchmain, caminho exato do workflow, evento schedule/workflow_dispatch e runner GitHub. O formato padrão de subject foi confirmado na API GitHub (`use_default=true`, `use_immutable_subject=false`). PRs/forks/outros workflows não podem gravar.

## Banco e preservação

Migration `20261111230331_international_collector_leases.sql` adiciona `claim_token` à fila e finalização atômica: lease errado, vencido ou já usado é recusado antes de gravar. Gravação continua passando pelo RPC anterior, preservando fontes primárias e recusando conflitos de valor/ex. Não cria recebimento pessoal. O antigo cron de Edge permanece desligado; não há duas rotinas concorrentes de coleta.

## Validação local

- Dez testes Deno de OIDC com assinaturas reais: identidade válida, repo/owner/branch/workflow/evento divergentes, token adulterado/expirado, issuer/audience incorretos.
- 28 testes Vitest de parser, coletor e endpoint aprovados.
- SQL em Docker com ROLLBACK aprovado: lease certo, errado, expirado, replay, status de falta de cobertura e privilégios privados.
- Probe real Node: AAPL5 eventos, COST4, sem erro e sem gravação.
- ESLint, TypeScript (`tsc -b`) e verificação Deno aprovados.

## Homologação hospedada e rollout

Probe hospedado aprovado na PR136, execução43117923711: runner Ubuntu24.04 com Node24 retornou AAPL5 eventos e COST4, sem erros. O job de gravação foi corretamente ignorado na PR. [Evidência no GitHub](https://github.com/Investvalora/Valora/actions/runs/43117923711). Isso confirma o acesso à fonte nesse ambiente; a função e a migration ainda não foram publicadas, e a identidade OIDC/gravação real precisam da homologação após merge.

Depois de revisar/mergear: aplicar migration e publicar a função com `githubOidc.ts` e os módulos necessários; executar primeiro o probe, depois um lote autenticado. O job da main usa a identidade temporária automática, sem configuração de chave. Conferir assinatura hospedada, gravações, replay e cobertura antes de considerar homologação completa.

Não resolve HTTP403 do RI Mastercard nem cria cobertura Nasdaq para MA/JPM. Essas pendências e o líquido pessoal de MA permanecem separados.


## Homologação em produção — PR136 mergeada

Merge confirmado: `b32adf49308ee9a8aaeba20b237e83fb7b6d585a`.
Migration aplicada como `20261111232926_international_collector_leases`; função `sync-international-announcements` versão5 ACTIVE.

- Probe na main aprovado: execução [43120234959](https://github.com/Investvalora/Valora/actions/runs/43120234959).
- OIDC real aprovado: execução [43120322405](https://github.com/Investvalora/Valora/actions/runs/43120322405). BB/BMN sem identidade compatível foram marcados sem cobertura, sem gravação nem falso sucesso.
- Lote de gravação aprovado: execução [43120442027](https://github.com/Investvalora/Valora/actions/runs/43120442027). COST4 eventos/3 gravações; AAPL5 eventos/4 gravações; zero conflitos, zero recebimentos pessoais criados. As duas tarefas foram priorizadas apenas na fila técnica para esse teste.
- Banco confirmou sete eventos Nasdaq, sucesso das duas tarefas e leases limpos.
- Endpoint sem autenticação retornou401; anon/authenticated sem EXECUTE no finalizador; tentativa de concluir AAPL sem lease válido recusada em transação com ROLLBACK.
- Advisor health sem lints. Cron antigo inativo. Workflow da main configurado a cada15min; execução agendada recorrente ainda precisa observação, embora o mesmo job tenha passado por despacho manual.

Homologação técnica da integração aprovada. Não altera posições, compras, vendas ou recebimentos pessoais. Cobertura Nasdaq continua limitada às identidades compatíveis; MA/JPM e descoberta de RI permanecem pendentes.
