# Correções da bateria de testes - 29/10/2026

Escopo aprovado: validação de telefone (DEF01), sobreposição dos KPIs mobile (DEF07), reenvio de confirmação (DEF02) e edição de dados pessoais (DEF05). A regra dos gráficos e os alertas permanecem fora desta alteração; a alegação sobre HTML não motivou remoção de componentes.

## Comportamento

- Telefone opcional: números brasileiros com DDD (10/11 dígitos) ou internacional com `+DDI` (8 a 15 dígitos). Espaços, parênteses, ponto e hífen são removidos para armazenamento. Letras, símbolos impróprios, comprimento excessivo e número incompleto geram erro. O mesmo schema atende cadastro e perfil. Não há máscara obrigatória que impeça números internacionais.
- Reenvio disponível após cadastro pendente e após erro de email não confirmado no login. Só envia ao clicar, usa `resend(type: signup)` com retorno a `/login`, apresenta feedback genérico e impõe 60 segundos entre tentativas na tela. Limites e proteções do servidor Supabase permanecem ativos. Nenhum email real foi disparado durante a implementação; entrega/spam depende do SMTP existente.
- Perfil permite salvar nome e telefone, remover telefone e solicitar mudança de email separadamente. O endereço confirmado permanece apresentado durante a confirmação da troca. Cancelamento não salva alterações, e falhas não exibem sucesso.
- A migração `20261029181739_sync_user_profile_updates.sql` sincroniza metadados pessoais e email efetivo do Auth com `public.users`. Mudança pendente em `email_change` não é tratada como email confirmado. Metadados não são usados como autorização. A função é SECURITY DEFINER com search_path vazio e execução direta revogada aos clientes.
- KPIs suportam valores longos sem invadir outros cards. Valores extensos usam largura inteira abaixo de 640px; texto pode quebrar dentro do próprio card. A formatação de moeda mantém as duas casas. Valores normais preservam a disposição anterior.

## Verificações

- Testes dos schemas, serviços, login, reenvio, perfil, cancelamento, falhas e email pendente.
- Teste SQL remoto com usuários sintéticos, em transação revertida: sincronização de nome, remoção de telefone, isolamento do outro perfil, email pendente preservado, email confirmado propagado e função não executável por anon/authenticated.
- Migração aplicada no Supabase; alterações de frontend ainda dependem de publicação. Nenhum cadastro real, senha ou endereço de email de usuário foi alterado para teste.
- Conferência em navegador com o KpiCard real e dados sintéticos: 320, 360, 390 e 1280px, sem overflow. Exemplo do relatório: R$ 540.000.880.816,09. Evidência local: `output/valora-fixes-2026-10-29/mobile-320.png`.
- A migração já aplicada não deve ser executada manualmente de novo. O histórico remoto contém seu registro.
