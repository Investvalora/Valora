# Correções de segurança — 06/11/2026

Solicitação: corrigir os pontos do penteste e acrescentar proteção contra tentativas repetidas de login. Nenhuma credencial foi revelada ou rotacionada, nenhum acesso de colaborador foi revogado e nenhuma posição ou lançamento real foi alterado.

## Aplicado no servidor

- **Score de outra conta:** migration `20261107002352_security_score_ownership.sql`. A FK composta exige correspondência de `user_id` e regra; não depende apenas da visibilidade por RLS. Exclusão da própria regra continua limpando somente `default_score_rule_id`, preservando a preferência. Preflight encontrou zero referências inválidas existentes. Testes sintéticos com rollback confirmaram rejeição em INSERT/UPDATE de regra alheia e UUID inexistente, seleção própria e exclusão. O penteste original passou novamente com `foreign_score_reference_accepted=false`.
- **Jobs globais:** `sync-b3-prices` v18 e `sync-bolsai-fundamentals` v9 publicados. Verificação explícita antes do catálogo/provedor aceita somente credencial interna exata ou digest confirmado pelo RPC restrito `authorize_market_job`. Gateway JWT mantido. Testes locais cobrem sessão comum, token falso, runtime e credencial do Vault; quatro chamadas públicas sem credencial válida retornaram 401. O digest atual do Vault foi aceito pelo banco. Não foi disparado download/sync global extra para testar o caminho autorizado em produção; o agendamento B3 foi preservado.
- **Extensão de busca:** migration `20261107003051_relocate_trigram_extension.sql` moveu `pg_trgm` para `extensions`. Função de similaridade e índice existente válidos após aplicação. `pg_net` declara `extrelocatable=false`: não foi removida/recriada, pois os jobs dependem dela. O aviso residual foi documentado como limitação da extensão, sem ampliar acesso ao schema `net`.
- **Limite de autenticação:** configuração do Supabase alterada de 30 para **15 pedidos de cadastro/login por IP a cada cinco minutos**, confirmada após reabrir o painel. Renovação de sessão continua com 150/5 min; verificação de tokens e SMTP não foram alterados. Encaminhamento de IP por clientes permanece desligado. Pessoas na mesma rede compartilham o limite; reavaliar se houver falsos bloqueios. Não foi provocado esgotamento do limite em produção.

## Pronto localmente; depende de PR/deploy do frontend

- **Login desktop e PWA:** falhas de credenciais geram espera de 2, 4, 8, 16, 32 e até 60 segundos. HTTP 429 também gera espera de 60 segundos. Contagem visível e botão desabilitado; submissão por Enter e chamadas simultâneas também são bloqueadas. O serviço aplica o controle, além da interface. Sucesso limpa o contador; ele expira após 15 minutos sem falha. Armazenamento contém somente contadores/horários, sem email ou senha; eventos entre abas são observados e indisponibilidade do storage mantém proteção em memória. Erros de rede não são contados como senha incorreta. Login Google permanece disponível durante a espera por senha.
- **Cache por identidade:** cancelar consultas e limpar cache React Query antes de publicar saída/troca de conta; refresh da mesma identidade preserva o cache. Resposta inicial atrasada de `getSession` não restaura sessão após evento mais recente de logout.
- **CSV:** neutralização de prefixos de fórmula somente em células textuais, incluindo espaços/caracteres de controle. Quantidades, valores e variações numéricas preservados.
- **Cabeçalhos Vercel:** CSP com scripts locais, bloqueio de objetos/enquadramento, fontes e APIs usadas explicitamente permitidas; `nosniff`, referrer policy e permissions policy. Estilos inline continuam permitidos porque os gráficos os utilizam. CSP não autoriza scripts inline/eval. Login OAuth é navegação externa, não exige liberar scripts do Google. Retestar os cabeçalhos reais, Google, dados, gráficos e PWA após deploy; o preview Vite não aplica automaticamente `vercel.json`.
- **Dependências:** Vite 7.3.7, Vitest 4.1.12, plugin React 5.2.0, React Router DOM 7.18.5, Zod 4.6.7, resolvers 5.9.2, React Hook Form 7.91.0 e TypeScript 5.9.3. Adequados schemas/resolvers e tipo da chave pública de push para compatibilidade. Supabase fixado na versão já resolvida 2.115.0. Overrides específicos corrigem transitivas; `minimatch` 10 → 11 é limitado à cadeia das ferramentas TypeScript e foi validado por lint/build. Manifesto e lockfile reproduzíveis; Node >=22.12.0. Host de desenvolvimento passa a loopback; testes em rede continuam possíveis explicitamente com `--host`.
- **CI:** workflow com auditoria de dependências, scanner de padrões de segredos que não imprime valores, regressão, build/PWA e harness de RLS em Postgres temporário. Não usa credenciais do projeto. O harness existente cobre as matrizes básicas documentadas em seu script; não equivale a todas as migrations do Supabase. Primeira execução no GitHub depende de envio da branch.

## Validação e evidências

- Auditoria final: **zero avisos conhecidos** nas dependências instaladas, contra 27 ocorrências iniciais. Não representa garantia sobre dependências externas Deno ou vulnerabilidades ainda não catalogadas.
- Regressão completa: **999 testes / 146 arquivos passaram**. Depois, **37 testes direcionados** de login, identidade/cache e CSV passaram, incluindo os novos cenários de interface desktop/PWA e serviço. Há sobreposição; não somar os números.
- Tipos, build/PWA, lint dos arquivos de segurança e `git diff --check` passaram. Instalação com `--frozen-lockfile` passou.
- Navegador integrado: versão compilada abriu; duas tentativas usando email fictício reservado `.invalid` retornaram mensagem genérica. Na segunda, contador de quatro segundos e botão bloqueado foram observados. Nenhuma conta real foi utilizada.
- Testes SQL sintéticos com rollback passaram; zero contas de fixture permaneceram. Nenhum push foi criado.
- Harness Docker local não iniciou porque o daemon Docker Desktop Linux não está disponível. A validação SQL hospedada descrita acima foi executada; o job Docker da CI permanece aguardando sua primeira execução.
- Evidências locais em `output/security-2026-11-06/`: auditoria final, logs de testes/build/tipos/lint, `login-cooldown.png` e `auth-rate-limit.png`. Artefatos ficam fora do commit.

## Limites que permanecem

### Complemento da CI na PR #108

A primeira execução remota encontrou duas lacunas no ambiente de testes: o teste de patrimônio ainda consultava carteiras e proventos importados pela rede, e o harness não aplicava `010_create_benchmarks.sql` antes do seed compartilhado. Foram completados os mocks e adicionada uma asserção de nenhuma chamada de rede; os 11 testes passaram com as variáveis fictícias da CI. O harness passou a incluir a migration existente e verificar leitura restrita, bloqueio de escrita pelo cliente e unicidade dos benchmarks após duas aplicações do seed. Nenhuma regra de produto ou migration de produção foi alterada por esse ajuste; a nova execução no GitHub valida o conjunto.

Execução remota `42321229897`: jobs `app` e `database-isolation` aprovados. O harness Docker foi efetivamente executado no runner. As actions de checkout/setup-node foram atualizadas para versões oficiais com runtime Node 24, checkout sem persistência de credenciais e imagem Ubuntu 24.04 explícita, eliminando a dependência de runtime obsoleto e da mudança automática de imagem do runner.

### Proteções adicionais e serviços externos

O intervalo no navegador é contornável e **não constitui proteção contra DDoS**. O limite de IP é imposto pelo Supabase Auth; ataques distribuídos exigem proteção do provedor e camadas adicionais. Um proxy no frontend não impediria chamadas diretas ao Auth público. Não se deve criar bloqueio global pelo email, que permitiria a terceiros impedir o acesso de uma pessoa.

CAPTCHA validado no Supabase pode acrescentar proteção usando o Turnstile gratuito. Exige site key no frontend, secret somente no Supabase e atualização conjunta de cadastro, login e recuperação antes de habilitar a configuração. Não foi ativado sem essas chaves, para não interromper esses fluxos. Não enviar secrets no chat.

O painel informa que prevenção nativa de senhas vazadas exige **Pro ou superior**. A ativação permanece pendente, sem contratar plano. Requisitos atuais de composição de senha foram preservados; eles não equivalem a consulta de senhas vazadas.

Referências: [limites do Supabase Auth](https://supabase.com/docs/guides/auth/rate-limits), [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) e [FK composta com SET NULL parcial no PostgreSQL](https://www.postgresql.org/docs/15/ddl-constraints.html).
