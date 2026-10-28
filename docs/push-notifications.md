# Notificações push do Valora

Após o login, desktop e PWA mostram o convite **Receba seus alertas** para
dispositivos compatíveis sem inscrição ativa. A permissão do navegador só é
solicitada ao clicar em **Ativar notificações**. **Agora não**, Escape e fechar
adiam o convite por sete dias neste navegador, por conta. Permissão bloqueada,
ambiente sem chave pública e dispositivos incompatíveis não exibem o convite.
O controle na página **Alertas** continua disponível para ativar ou desativar.
Quando uma linha de
`public.alerts` é criada com status `novo`, ou volta para `novo`, o trigger da
migration `026_create_push_subscriptions.sql` chama `send-alert-push` via `pg_net`.
A Edge Function envia uma mensagem genérica aos navegadores inscritos daquele
usuário. O service worker abre `/alertas` ao clicar na notificação.

## Integração aplicada em 28/10/2026

- Estrutura da migration `026_create_push_subscriptions.sql` aplicada: inscrições com RLS e triggers para alertas novos e mudanças para `novo`.
- `send-alert-push` v3 mantém a verificação JWT do gateway e autoriza a chave interna exata do runtime ou a chave exata do agendador no Vault. A migration `20261028150726_authorize_alert_push_vault.sql` permite somente ao backend validar SHA-256 da credencial, sem devolver o segredo e sem confiar em claims de usuário.
- A variável pública da Vercel foi corrigida de `VAPID_PUBLIC_KEY` para `VITE_VAPID_PUBLIC_KEY`, mantendo o valor e os ambientes Production/Preview. O hash confere com o secret público do Supabase; a chave privada não foi revelada nem alterada.
- Redeploy de produção do mesmo commit já publicado (`d2f52d3`), sem merge de PR: deployment `C5p9Fqm34hKGgsXLnKo8zhoLv2vw`. A tela de Alertas passou a habilitar “Ativar push”.
- Teste banco → trigger → função retornou HTTP 200 e `{sent:0,failed:0}` sem navegadores inscritos. Alerta temporário de teste removido ao concluir. Testes SQL com rollback validaram inscrição/leitura/exclusão da própria conta e bloqueio entre contas; quatro testes de autorização, TypeScript e Deno passaram.
- Entrega real confirmada pelo responsável no Brave em 28/10/2026, após habilitar o serviço de mensagens push do Google: HTTP 200, `sent:1,failed:0`, com exibição da notificação. Alerta temporário removido. A integração não cria monitoramento automático de preços com o app fechado.

## Configuração

1. Gere **um único par** de chaves VAPID para o ambiente:

   ```sh
   npx --yes web-push generate-vapid-keys
   ```

2. Defina `VITE_VAPID_PUBLIC_KEY=<chave pública>` no ambiente do Vite e no
   deploy do frontend. A chave pública também vai para os secrets da Edge
   Function. A chave privada só vai para os secrets, nunca para `VITE_*`:

   ```sh
   supabase secrets set VAPID_PUBLIC_KEY=<chave pública> VAPID_PRIVATE_KEY=<chave privada> VAPID_SUBJECT=mailto:contato@seu-dominio.com
   ```

3. Publique a função e depois aplique a migration:

   ```sh
   supabase functions deploy send-alert-push
   supabase db push
   ```

   O trigger usa os secrets `project_url` e `service_role_key` do Vault, já
   usados pelos agendamentos do projeto. Confira que ambos existem no ambiente.

4. Abra o Valora por HTTPS ou localhost, entre na conta, acesse **Alertas** e
   clique em **Ativar push**. Conceda a permissão no navegador. O controle
   **Desativar push** remove a inscrição do banco e do navegador atual.

## Verificação manual

- Com a página aberta, crie um alerta novo por **Atualizar alertas** e confirme
  o aviso do sistema.
- Feche a aba e gere outro alerta novo para a mesma conta; o aviso deve abrir
  `/alertas` ao ser clicado.
- Desative push e gere outro alerta; esse navegador não deve recebê-lo.
- Teste uma segunda conta e confira que ela não recebe alertas da primeira.

O push depende da criação ou atualização de um alerta no banco. Hoje os alertas
de análise são gerados sob demanda, e os de preço-alvo são verificados pelo
botão **Verificar preços-alvo**. Esta entrega não agenda essas verificações.
Falhas de entrega e inscrições expiradas são tratadas pela função; endpoints
inválidos (HTTP 404/410) são removidos.

Cada instalação do navegador precisa ser ativada separadamente. Para evitar
mostrar dados financeiros na tela bloqueada, o aviso contém apenas um texto
genérico. Em dispositivo compartilhado, desative push antes de sair da conta.
