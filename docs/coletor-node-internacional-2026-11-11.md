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

Ainda não publicado. Abrir PR em rascunho para executar o probe público no runner; sucesso local não basta, como demonstrou a PR135. Se a fonte continuar falhando nesse ambiente, não ativar a coleta nem declarar a solução operacional.

Depois de revisar/mergear: aplicar migration e publicar a função com `githubOidc.ts` e os módulos necessários; executar primeiro o probe, depois um lote autenticado. O job da main usa a identidade temporária automática, sem configuração de chave. Conferir assinatura hospedada, gravações, replay e cobertura antes de considerar homologação completa.

Não resolve HTTP403 do RI Mastercard nem cria cobertura Nasdaq para MA/JPM. Essas pendências e o líquido pessoal de MA permanecem separados.
