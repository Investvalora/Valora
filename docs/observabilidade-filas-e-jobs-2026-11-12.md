# Observabilidade das filas e dos jobs — próxima PR

## Execução forçada e correção do cron — 12/11

Após pedido explícito do titular para forçar os jobs, macro foi executado com `recalculate=true` às12h59 Brasília. Resultado: 13 posições atualizadas, auditoria salva e estado `partial`/HTTP503 exclusivamente pelo cadastro Selic vencimento10/10/2027 sem PU correspondente. O diagnóstico esperado da v16 apareceu e o saldo desse cadastro foi preservado. Não é falha geral do cálculo ou da gravação da auditoria.

O teste direto do caminho Supabase revelou 401 no coletor internacional: a autorização aceitava chave de runtime/OIDC, mas não reconhecia a credencial legada já utilizada pelo cron e pelos demais jobs. Correção restrita em `githubOidc.ts`: depois da validação OIDC, validar o SHA-256 pela RPC backend `authorize_market_job`, que já compara com a entrada do Vault. Sem confiança em claims decodificados, alteração de chaves, exposição de segredo ou concessão de acesso público. Testes rejeitam hash divergente, HTTP503, erro de transporte e resposta não booleana; os testes de assinatura/identidade GitHub continuam aprovados.

Hotfix publicado como internacional v10. Repetição pela mesma rota/credencial do cron às13h03: HTTP200, Alpha JPM quatro eventos, Marketstack KO cinco, `audit_saved=true`, zero erros e nenhum recebimento pessoal criado. Requisição sem autenticação continua respondendo401.13 testes Deno de autorização e14 testes do endpoint aprovados, além de TypeScript/Deno check.

Transações e recebimentos mantiveram seus hashes anteriores. Hash dos campos de cadastro/entrada de renda fixa, excluindo somente valores e metadados calculados, permaneceu `dbc3362f6462902b34a0b63de2e9bf00`: principal, título, quantidades e datas preservados.

Homologação funcional dos jobs e diagnóstico Tesouro encerrados pelo teste forçado real. Isso não comprova pontualidade contínua do temporizador; o cron permanece ativo para acompanhamento normal. Selic sem extrato continua como dependência cadastral externa, sem correção por suposição.

## Publicação e homologação técnica — PR144

Merge `bd68e29bdfacc86798b8b67b7d7c39ee419c7947`, CI da main [43251847647](https://github.com/Investvalora/Valora/actions/runs/43251847647) aprovada. Migration `queue_health_and_scheduled_results` aplicada; `sync-macro-rates` v14 e `sync-international-announcements` v9 ACTIVE, configurações de autenticação preservadas. Estado abaixo substitui a publicação pendente nas seções históricas.

- Teste autenticado [43252524542](https://github.com/Investvalora/Valora/actions/runs/43252524542) aprovado às12h53 Brasília: Alpha GOOGL cinco eventos, Marketstack JPM dois, auditoria gravada e zero erros nas APIs. FAST teve quatro anúncios públicos gravados, sem conflitos; DIS foi diagnosticada como identidade não suportada. Não se trata de cobertura integral da fila.
- Sincronização macro manual, expressamente com `recalculate=false`: HTTP200, `audit_saved=true`, CDI500/Selic500/IPCA24 linhas retornadas. Início/término/status persistidos. Nenhum recálculo de saldo provocado no teste.
- RPC de saúde retornou pendências primária37, SEC43 e45 em cada API, todas com avanço recente. Mensagens/IDs privados dos lotes não foram publicados no log GitHub. Tabela de auditoria e RPC de saúde inacessíveis a `authenticated`.
- Cron `international-provider-fallback` ativo em `11 * * * *`. Conferência realizada antes das13h11 Brasília: execução automática do cron novo ainda não observada. Resultado do Tesouro v16 continua aguardando macro das17h (repetição20h). Não confundir dispatch e teste manual com disparo automático.
- Antes/depois: 258 transações/hash `9f8b4b5c9054abba35c53717c12d94ab`; 208 recebimentos/hash `be7d8c15d31326a5ce429486e075884e`; renda fixa/hash `b209be3e1c6a662170f3ed6a845d3ef9`. Todos preservados.
- Navegador integrado de produção recarregado sem falha: proventos1A R$637,21/152 registros, novembro R$36,13 recebidos eR$35,26 previstos. Igual aos valores antes desta entrega.
- Advisors sem achado adicional crítico: aviso informativo esperado nas tabelas exclusivas do backend. Persistem os avisos já conhecidos de [pg_net em public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [senha vazada dependente de plano](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Pendências restantes de homologação operacional: observar o cron novo e o diagnóstico do próximo recálculo automático. Selic sem extrato continua preservado. Nenhum agendamento de acompanhamento no app Codex foi criado.

Objetivo: tornar verificável a execução automática, o resultado parcial do Tesouro e o avanço dos calendários internacionais. Não depende de contratar serviço nem acrescenta credenciais ao GitHub.

## Auditoria de produção anterior à implementação

Em 12/11, 12h32 Brasília: 47 tarefas por API, uma concluída em cada fornecedor, 46 vencidas em cada fila. Sem erros nas novas APIs. GitHub mostra uma execução `schedule` internacional às08h29 e o dispatch homologado da PR143 às12h21; não comprova frequência de15min. Três tarefas primárias registram falha de fonte (AMZN, AS e BA); apenas AMZN está em posições. Sete identidades não suportadas são de ativos sem posição nesta consulta. Não foram desativados ativos nem apagados anúncios para alterar esses indicadores.

Cron macro/Tesouro ativo às17h e20h Brasília em dias úteis. Os registros `cron.job_run_details` anteriores duram milissegundos porque comprovam apenas o enfileiramento HTTP. A resposta `pg_net` expira e não é um histórico durável do cálculo. Antes das17h não é possível comprovar a execução automática do diagnóstico v16 naquele dia.

Selic desconhecido: criado06/11/2026 às15h23 Brasília em outra conta, carteira Minha Carteira, vencimento10/10/2027 e quantidade100. Busca no código não identificou fixture com essa data. Nome da conta não comprova ser dado de teste. Mantido sem alterar nome, quantidade, saldo ou titularidade; extrato/identificação pelo responsável continuam necessários.

## Implementação

- Tabela `operational_job_runs`, exclusiva do backend: início, término, sucesso/falha/parcial e resultado limitado. Execução interrompida deixa registro `running`; não se transforma em sucesso por falta de retorno. Falha de gravação é exposta viaHTTP503 e `audit_saved=false`.
- `sync-macro-rates` preserva o resultado do recálculo, inclusive diagnóstico do lote Tesouro, antes de retornar. Não muda fórmulas, taxas, principal ou a identidade dos títulos.
- Mesmo registro para o modo `providers`. O novo cron Supabase `international-provider-fallback`, minuto11 de cada hora, chama somente Alpha/Marketstack. Continua usando Vault e autorização de serviço existente; não envia chave para runner ou frontend. Cotas e leases existentes impedem consumir novamente o mesmo trabalho quando coincidir com GitHub.
- O fallback independe do disparo GitHub para as duas APIs. Nasdaq/RI/SEC continuam no runner Node; o novo cron não comprova o funcionamento contínuo dessas fontes.
- Prévia de orçamento Marketstack antes de reservar tarefa evita adiar ativos e poluir a fila quando todas as chaves estiverem sem cota. Reserva transacional continua obrigatória antes da chamada HTTP, inclusive em concorrência.
- Fila prioriza ativos realmente em posições, depois calendários incompletos e anúncios SEC pendentes. Outros ativos continuam no catálogo e podem ser processados; não existe lista fixa da Investidor10.
- RPC de saúde exclusiva do coletor mostra pendências, último avanço, erros e sinais de atraso. Logs GitHub recebem somente agregados; IDs/mensagens privadas dos lotes ficam exclusivamente na tabela de auditoria e não são publicados no repositório.
- TODO reorganizado com estado atual no topo e separação explícita do histórico. ALT01–03 não continuam como defeitos de implementação abertos após as entregas homologadas.

## Homologação e publicação

Testes locais: contratos macro/registro parcial/Tesouro, escrita confirmada ou falha, credenciais ausentes no corpo persistido, acesso autenticado ao diagnóstico e prévia de cotas; TypeScript e Deno. Fixture SQL com rollback valida prioridade do ativo em carteira, resultado parcial, ausência de diagnóstico privado na saída do coletor, orçamento e cron independente. Dados sintéticos não foram usados em produção.

Ordem após merge: aplicar migration `20261112153329_queue_health_and_scheduled_results.sql`, publicar `sync-macro-rates` e `sync-international-announcements` incluindo `_shared/jobRuns.ts`, então conferir o coletor atualizado. O cron novo é criado ativo pela migration; publicar as funções logo em seguida. Confirmar um início/término reais, a próxima chamada horária e a execução macro às17h/20h antes de marcar observação automática concluída. Manter autenticação atual das funções.

A implementação e os testes locais não substituem a observação futura. Permanecem dependências: extrato do Selic e cobertura das fontes que não publicam calendário compatível. Nenhum título/preço/recebimento foi inventado para encerrar essas pendências.

Referência: [agendamento oficial de Edge Functions com cron/Vault](https://supabase.com/docs/guides/functions/schedule-functions).
