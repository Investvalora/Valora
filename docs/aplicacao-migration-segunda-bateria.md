# Aplicação da migration da segunda bateria

**Aplicada em produção em 30/10/2026 às 14:58 de Brasília**, após autorização do responsável. Versão registrada pelo Supabase: `20261030175828`. Arquivo alinhado ao registro: `supabase/migrations/20261030175828_validate_movement_dates_and_distinct_price_alerts.sql`. A migration 018 permanece intocada. Não reaplicar neste projeto.

Pós-aplicação: três triggers habilitados; dois índices únicos e válidos, com os predicados esperados; função SECURITY INVOKER, search_path vazio e sem EXECUTE para anon/authenticated; RLS habilitado nas quatro tabelas. Advisors de segurança mantiveram os mesmos avisos anteriores. Nenhum lançamento ou alerta existente foi alterado/excluído. O responsável integrou a PR #95 e o frontend publicado foi retestado; resultados e limites no [registro de correções](correcoes-segunda-bateria-2026-10-30.md).

## Pré-condições

Executar [second_battery_preflight.sql](../supabase/tests/second_battery_preflight.sql) por conexão administrativa no projeto correto, imediatamente antes da aplicação. A consulta é somente de leitura e não retorna identidades nem dados financeiros individuais.

Na preparação de 30/10/2026, antes da aplicação, foram confirmados:

- Migration ainda não registrada, função de validação e novo índice ainda ausentes.
- Índice antigo é único por usuário/tipo/ticker, para alertas não ignorados.
- Zero grupos duplicados de configuração manual ativa; zero configurações ativas sem condição/preço.
- Zero datas futuras nas três tabelas; RLS habilitado nas quatro tabelas envolvidas.

Se o estado mudar, revisar antes de executar. Nenhum dado deve ser apagado para fazer a verificação passar. Se o novo índice/função existir sem a versão registrada, reconciliar a aplicação anterior antes de repetir a migration.

## Sequência de referência para outros ambientes

1. Revisar/integrar a PR pelo responsável. A abertura da PR não faz merge nem aplica SQL.
2. Aplicar **somente esta migration**, pelo mecanismo de migrations conectado ao projeto correto, registrando a versão `20261030175828`. Não executar uma carga indiscriminada do histórico legado. Caso se use o SQL Editor, é necessário reconciliar também o histórico de migrations pelo processo da equipe; executar o texto sozinho não registra a versão automaticamente.
3. Executar [second_battery_postflight.sql](../supabase/tests/second_battery_postflight.sql). Conferir três triggers habilitados, dois índices únicos/válidos, função sem SECURITY DEFINER e sem EXECUTE para clientes, e RLS preservado.
4. Publicar o frontend e retestar, com conta de teste: operação futura rejeitada; hoje/histórico aceitos; vencimento futuro permitido; dois alertas com condições diferentes coexistem; configuração idêntica recebe feedback de duplicidade. Preservar o isolamento entre usuários.

A migration usa transação: se uma criação falhar, as alterações daquele arquivo são revertidas juntas. A criação dos índices adquire locks; aplicar em janela de baixa atividade e observar a execução. A mudança no banco é compatível com o frontend anterior, mas sua interface só mostrará o feedback novo depois da publicação.

## Reversão

Não há rollback automático destrutivo. Os triggers/função podem ser retirados numa migration corretiva específica se necessário. Para restaurar o índice antigo de alertas, primeiro contar grupos ativos por usuário/tipo/ticker: depois da nova regra podem existir vários alertas manuais legítimos do mesmo ativo, e o índice antigo falharia. Nesse caso, manter os dados e decidir a reversão; nunca eliminar alertas do usuário automaticamente. A reversão do frontend é independente e não exige descartar os novos alertas.

## Verificações existentes

18 verificações SQL passaram em PostgreSQL isolado, incluindo as duas condições de um ticker, duplicidade exata, deduplicação automática, inserções/alterações futuras e vencimento futuro. Em produção foram conferidos o registro e as definições de triggers, índices, função, permissões e RLS; não foram criadas operações financeiras para o ensaio. Registro funcional e limites: [correcoes-segunda-bateria-2026-10-30.md](correcoes-segunda-bateria-2026-10-30.md).

Advisors consultados na preparação: os avisos existentes de extensões no schema público e proteção contra senhas vazadas não pertencem a esta migration; não houve alteração de extensões, políticas, privilégios de tabelas ou configuração de Auth para silenciá-los. Referências: [extensões no schema público](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
