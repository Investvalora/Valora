# Aplicação das pendências técnicas

Status: migration aplicada e quatro funções publicadas em produção em 30/10, após autorização explícita do responsável. Frontend aguarda integração desta PR.

Migration: `supabase/migrations/20261030225247_technical_alerts_and_partial_fundamentals.sql`. Arquivo criado pela CLI oficial e versão alinhada ao registro gerado pela aplicação via MCP. A migration 018 permanece intocada.

## Mudanças concretas

- Permitir NULL nos indicadores ausentes e VPA negativo real. Não preencher métricas ausentes com zero. Graham continua exigindo LPA/VPA positivos.
- Criar `authorize_market_job(text)`, executável somente por service_role, que compara SHA-256 com a credencial já no Vault. Não retorna o segredo, não troca/revoga credenciais e não aceita claims JWT como prova.
- Adicionar controle de geração automática dos alertas. Registros antigos começam não gerenciados; edições e decisões do usuário retiram o controle automático. Somente alertas conhecidos como gerenciados podem ter mensagem recalculada ou ser encerrados automaticamente.
- Criar `monitor_price_targets()`, sem SECURITY DEFINER, inacessível a anon/authenticated, e job por minuto. Avalia alertas lidos, com cotação positiva de até sete dias, sem datas futuras; mudança de status usa os triggers existentes de push. Não repete o mesmo fechamento nem reativa ignorados.

## Roteiro de aplicação e homologação

1. Aplicar a migration e conferir permissões, coluna e job.
2. Publicar `sync-yahoo-fundamentals`, `sync-asset-data` e `sync-dividends-yahoo` com o helper de autorização atualizado; publicar `generate-alerts` com a lógica nova.
3. Conferir a chamada interna com o segredo existente no Vault, consultando somente status e contagens. Nunca imprimir o valor do segredo. Uma resposta 200 com fonte indisponível não comprova carga bem-sucedida.
4. Testar a atualização de fundamentos de MCD e FIIs; ausências na fonte continuam indisponíveis. Conferir que Graham não usa VPA negativo.
5. Testar o monitor em transação com rollback: condição satisfeita/não satisfeita, ignorado, fechamento repetido e isolamento de contas; confirmar que o rollback não entrega push.
6. Publicar o frontend por PR e merge pelo responsável. Homologar dois clientes, foco, falha/recuperação e entrega com app fechado em conta de teste. Verificar separadamente o gatilho de sincronização após compra.

## Limites

Alertas Bazin legados não têm procedência suficiente para distinguir mensagem gerada e edição humana. Não serão excluídos ou reescritos em massa. Dados públicos e lançamentos do usuário não são apagados por esta migration.

A sintaxe da migration foi executada em transação com rollback antes da tentativa de aplicação. Essa execução não comprova o funcionamento do job persistente ou entrega push. Esses testes dependem da aplicação aprovada.

## Validação local concluída

- Regressão completa: **855 testes aprovados em 116 arquivos** (`output/pendencias-tecnicas-regressao.log`).
- TypeScript, Vite e geração PWA aprovados (`output/pendencias-tecnicas-build-final.log`).
- Lint de todos os arquivos frontend/testes alterados aprovado (`output/pendencias-tecnicas-lint.log`).
- Cobertura nova: dois clientes recebendo mudanças externas; monitor ao recuperar foco com configuração global desabilitada; falha/recuperação sem bloquear página; Bazin incompatível e USD; preservação de alerta editado e encerramento de automático conhecido; fundamentos parciais/VPA negativo; autorização do job por digest verificado.
- Antes da aprovação explícita, a tentativa rejeitada não criou o job nem a função. Ambos foram aplicados na etapa autorizada abaixo.

## Resultado da aplicação autorizada

- Migration registrada como `20261030225247`; job `monitor-price-targets` ativo, a cada minuto. Três execuções consecutivas conferidas como `succeeded`.
- Publicadas: `sync-yahoo-fundamentals` v8, `sync-asset-data` v2, `sync-dividends-yahoo` v5 e `generate-alerts` v5.
- Permissões conferidas: anon não executa `authorize_market_job`; authenticated não executa `monitor_price_targets`; service_role executa. Digest da credencial do Vault confirmado sem exibir o segredo.
- Chamada interna pg_net nº 207 retornou HTTP 200, `processados=5`, `gravados=5`, `falhas=0`. CPTS11, GARE11, VGHF11, XPSF11 e MCD agora têm os fundamentos disponíveis. MCD mantém VPA real negativo; métricas ausentes permanecem NULL.
- Condições satisfeita/não satisfeita, ignorados, fechamento repetido, cotação antiga/futura e contas distintas passaram em tabelas temporárias com cópia do corpo da função, revertidas no final. Nenhum alerta fictício foi inserido em contas reais.
- O ensaio com alertas fictícios em contas reais foi rejeitado pela aprovação automática por possível entrega externa de push e não foi executado. O teste isolado substitui a validação da lógica; não comprova entrega push fim a fim com app fechado.
- Frontend, teste após compra e entrega push com app fechado ainda aguardam homologação. Alertas Bazin legados são preservados.
