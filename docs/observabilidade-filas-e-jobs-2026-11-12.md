# Observabilidade das filas e dos jobs — próxima PR

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
