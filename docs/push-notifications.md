# Notificações push do Valora

O navegador se inscreve pelo botão na página **Alertas**. Quando uma linha de
`public.alerts` é criada com status `novo`, ou volta para `novo`, o trigger da
migration `026_create_push_subscriptions.sql` chama `send-alert-push` via `pg_net`.
A Edge Function envia uma mensagem genérica aos navegadores inscritos daquele
usuário. O service worker abre `/alertas` ao clicar na notificação.

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
