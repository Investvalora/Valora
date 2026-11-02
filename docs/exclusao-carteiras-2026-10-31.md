# Exclusão de carteiras — implementação local

## Comportamento

Em Carteiras, as carteiras secundárias oferecem Excluir. A principal permanece sem essa ação e protegida no servidor. O diálogo informa a remoção permanente dos lançamentos, posições, aplicações/eventos de renda fixa, proventos importados e metas da carteira. Exige digitar seu nome; cancelar não altera dados. Estratégias, alertas da conta, catálogo e histórico público não são excluídos.

Após sucesso, carteira removida do cache e seleção volta à principal somente se a excluída ainda estiver selecionada. Totais e históricos são invalidados. Falha mantém o diálogo com orientação segura para conferir a lista antes de repetir.

## Backend e ordem de publicação

Migration local `20261031224122_delete_owned_wallet.sql`, gerada pelo CLI. **Ainda não aplicada em produção.** Aplicar antes de publicar o frontend que usa a exclusão.

- RPC `delete_owned_wallet(uuid,text)` SECURITY INVOKER, search_path vazio, execução apenas para authenticated; proprietário derivado de auth.uid(), sem parâmetro de usuário.
- Lock da carteira e verificação do nome atual evitam confirmação desatualizada e serializam com renomeação/escritas via FK.
- Nova política DELETE de wallets exige proprietário e carteira não principal. RLS das outras tabelas mantido.
- Lançamentos e renda fixa removidos explicitamente na transação, com triggers normais ativos. FK de positions passa a CASCADE, preservando revogação de DELETE direto para authenticated; eventos e proventos importados usam seus cascades existentes.
- Nenhum dado real é alterado ao aplicar a migration: cria função/política/permissão e ajusta a FK. A exclusão ocorre somente quando o usuário confirma a ação no app.
- Não modificar migration 018. Não executar os testes como uma aplicação permanente da migration.

## Validação

- Nove testes de frontend aprovados: confirmação, bloqueio da principal, cancelamento, mensagem segura/nova tentativa, bloqueio durante envio e seleção/cache somente após sucesso. Lint e build TypeScript/PWA aprovados.
- SQL `supabase/tests/delete_owned_wallet.sql`: migration e fixtures criadas dentro de BEGIN, seguida de ROLLBACK. Contas fictícias aleatórias `@wallet-delete-test.invalid`, nenhuma conta real usada. Validou exclusão completa incluindo posição manual legada, eventos e recebimentos; preservação de outra carteira/conta; nome errado; principal via RPC e DELETE direto; acesso anônimo. Falha forçada no fim da RPC restaurou lançamentos/posição/carteira.
- Primeira execução revelou DELETE direto de positions revogado. Solução final mantém a revogação e usa cascade da FK; teste repetido com sucesso. Uma fixture manual também precisou ser semeada pelo administrador do teste, sem conceder INSERT ao cliente.
- Consulta posterior confirmou função não publicada e zero contas fictícias restantes.
- Brave local autenticado: ação ausente na principal, diálogo de carteira secundária conferido em 390 px sem alargamento. Conferência cancelada sem confirmar nenhuma exclusão real. Tamanho do navegador restaurado.

Para homologação após aplicação/publicação, usar uma carteira descartável explicitamente autorizada. Não apagar carteiras reais apenas para testar o fluxo.
