# Filas, cotas por chave e reconciliação — 12/11/2026

Branch `codex/diagnostico-cotas-reconciliacao`. Implementação local, sem publicação ou alteração financeira em produção.

## Diagnóstico confirmado

Às 20h40 Brasília, Alpha tinha 18/20 consultas globais consumidas e 30 ativos sem primeira tentativa; Marketstack tinha 10/16 e 37 ativos sem primeira tentativa. As cinco chaves Marketstack rastreadas já haviam consumido duas consultas no dia cada uma. Portanto as seis consultas globais restantes não eram utilizáveis com essas chaves. O health anterior chamava a fila de parada por considerar somente a cota global.

O fallback Supabase executou às 19h51, 20h11 e 20h31, respeitando os intervalos do cron; a execução intermediária falhou por conflito de CR. O workflow GitHub está ativo, mas as últimas execuções observadas são dispatch/PR; não há evidência de cadência automática contínua a cada 15 minutos. A primeira passagem do catálogo continua incompleta. Não aumentar cotas para compensar esse atraso.

## Correções locais

- O preflight já existente passa a salvar um retrato agregado das chaves efetivamente configuradas: quantidade disponível, consultas restantes e próxima liberação. Não guarda chaves ou seus hashes nessa tabela de diagnóstico.
- Health distingue orçamento global, orçamento por chave e limite efetivo. Retrato válido somente no mesmo dia e por 90 minutos; evidência vencida não suprime o diagnóstico de fila parada.
- O coletor e a auditoria registram adiamento por cota das chaves, chave ausente ou ausência de tarefa/cota global. Um job adiado fica parcial, sem fingir consulta ou cobertura completa. Erros de dados continuam falhando.
- Uma tarefa com conflito pode voltar antes do prazo se recebeu evidência primária posterior à última tentativa. Reutiliza a reserva atômica da cota e respeita lease ativa. Após tentar, a mesma evidência não causa loop. Isso permite retestar BMN/META/PRT após conciliação sem apagar erros antigos nem falsificar sucesso recente.
- O health informa validade e necessidade de renovação das políticas de ausência de dividendos, com aviso a partir dos sete dias anteriores ao vencimento.

## CR, GOOGL e AMZN

CR: o RI confirma USD 0,255, pagamento 09/09/2026 e record 31/08. O valor público do Valora concorda; Alpha contém USD 0,435. É divergência real do fornecedor, não arredondamento. Preservar o registro público correto e a observação privada para investigação; não mudar o valor para tornar o job verde.

Fonte: https://investors.craneco.com/news/news-details/2026/Crane-Company-Reports-Second-Quarter-2026-Results-and-Raises-Full-Year-Adjusted-EPS-Guidance/default.aspx.

GOOGL: registros persistidos de Alpha/Marketstack consultados concordam nos eventos em comum. Há erro histórico Marketstack e um evento Alpha sem observação Marketstack; a ausência de uma nova resposta não permite concluir que o feed atual está corrigido. Reteste real depende da liberação de cota.

AMZN: FAQ oficial continua declarando ausência histórica de dividendos em dinheiro. Evidência vigente observada em 12/11 expira em 12/12/2026. Não é necessário renovar no mesmo dia; não prolongar automaticamente uma evidência que o coletor direto não conseguiu consultar. Diagnóstico de renovação torna esse limite visível; anúncio positivo posterior continua invalidando a política.

Fonte: https://ir.aboutamazon.com/faqs/default.aspx.

## Validação e publicação

Testes direcionados, TypeScript e lint dos testes alterados aprovados. Replay integral das migrations no banco QA isolado e seis testes SQL aprovados. Fixtures cobrem esgotamento por chave com cota global sobrando, retrato vencido, sigilo, renovação de política, prioridade da conciliação, lease concorrente, limite diário e ausência de loop.

A primeira regressão completa teve uma expectativa do contrato antigo de resposta (atualizada para os motivos de adiamento, mantendo a verificação de sigilo) e dois timeouts de interface de cinco segundos. A repetição com dois workers passou: 200 arquivos, 1.368 testes, sem alterar testes/implementação dessas telas nem aumentar timeouts. Teste SQL complementar também confirmou que cota do dia anterior não suspende a fila do novo dia.

Publicação posterior ao merge: migration `20261112234211_provider_budget_diagnostics.sql` e função internacional incluindo `_shared/jobRuns.ts`. Homologar diagnóstico Marketstack e próxima consulta BMN respeitando a cota real. Nenhum reteste real Alpha/BMN foi antecipado em produção nesta rodada.
