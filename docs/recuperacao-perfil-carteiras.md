# Recuperação de perfis necessários às carteiras

Aplicada em produção em 31/10/2026, por solicitação do responsável para prevenir a falha em outras contas. Migration `20261031171016_recover_missing_account_profiles.sql`.

Uma conta antiga existia em Auth, mas não em `public.users`. A chave estrangeira de carteiras impedia o salvamento. O perfil dessa conta foi recuperado separadamente e sua carteira padrão foi conferida na web.

## Prevenção

- Ao atualizar `last_sign_in_at`, recuperar somente o perfil ausente, usando email e dados de exibição já presentes em Auth.
- Antes de inserir uma carteira, repetir essa verificação para clientes já conectados. O trigger existente cria a carteira padrão; a carteira solicitada é preservada.
- Funções internas com `search_path` vazio e execução revogada para PUBLIC, anon e authenticated. O trigger impede recuperação para outra conta autenticada; as políticas RLS de carteiras continuam ativas.
- `ON CONFLICT (id) DO NOTHING`: não sobrescrever perfis nem duplicar a carteira padrão em recuperações repetidas.
- Migration também recupera perfis legados ausentes com email no Auth. A consulta anterior já encontrou zero pendências, após a correção pontual. Contas sem email não recebem endereço inventado.

## Verificação

`supabase/tests/profile_recovery.sql` executado com rollback antes e depois da aplicação. Cobre login de conta sem perfil, criação com cliente já conectado, login repetido, preservação de perfil existente, uma carteira padrão, duas carteiras solicitadas, bloqueio de tentativa entre contas, bloqueio de carteira padrão forjada, acesso anônimo e execução direta das funções.

Consulta final: dois triggers ativos, zero perfis de contas com email pendentes, zero contas fictícias remanescentes. Nenhum lançamento ou posição real alterado. Não foi criado frontend novo nem necessário deploy Vercel para esta proteção.

Advisor de segurança sem novos avisos. Permanecem os avisos anteriores de extensões em `public` e proteção de senhas vazadas desativada; não fazem parte desta correção. Referências: [extensões](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Arquivo de migration gerado pela CLI oficial, com versão alinhada ao registro aplicado por MCP. Não houve commit, PR ou merge nesta etapa.
