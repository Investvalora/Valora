# Correções do levantamento — 24/10/2026

Branch: `fix/levantamento-valora`.

## Estado consolidado para revisão

As correções locais abrangem autenticação Google, confirmação de senha, normalização do nome, política de senhas autorizada, fonte compartilhada do patrimônio, percentuais de avaliação e alertas, histórico mensal paginado, filtros da evolução, composição por ativo e editor de colunas. Login Google e cancelamento foram homologados localmente. A função `generate-alerts` foi publicada via MCP, e as configurações de Auth foram ajustadas no painel; essas configurações externas não são reproduzidas automaticamente pelo merge. Publicação do frontend, teste real de confirmação de email e liberação pública do OAuth seguem como etapas de homologação. As seções abaixo preservam o histórico da execução e podem mencionar pendências já resolvidas em atualizações posteriores.

## Diagnóstico e implementação

| Item | Diagnóstico | Alteração e limite de validação |
| --- | --- | --- |
| Confirmação levando a localhost | O código já enviava a origem do navegador. Não foi reproduzido com conta real; Site URL, allowlist e template do Supabase podem substituir o destino solicitado. | `VITE_APP_URL` centraliza o destino de confirmação, Google e recuperação; rejeita localhost configurado em build de produção. Testes cobrem a origem configurada. Configuração remota e entrega do email ainda precisam de validação. |
| Patrimônio divergente | Dashboard, seletor e tabela tinham consultas/cache distintos para últimas cotações, além de regras diferentes para câmbio e valores ausentes. Isso permite valores de momentos diferentes. A carteira real do relatório não foi acessada. | Dashboard e seletor compartilham `useWalletTotals`, com a valorização de `derivePositionRows` e `useLatestQuotes`. Teste reproduz os valores R$ 12.524,60 e R$ 12.575,73 em atualizações distintas e exige igualdade entre os dois consumidores. Inclui renda fixa e isolamento por carteira. |
| Percentuais e textos | A diferença era dividida pela cotação e descrita como desconto sobre o teto. | Denominador passa a ser o teto/justo em alertas, Bazin e Graham. Ex.: referência 87,52 e cotação 40 dão 54,3% abaixo, em vez de 118,8%. Insights antigos são recalculados na leitura com os preços do snapshot. Alertas existentes têm a mensagem atualizada na próxima geração, preservando o status. Requer publicar a Edge Function. |
| Nome em branco | `min(3)` aceitava três espaços. | `trim()` antes de validar, também no serviço; espaços internos preservados. |
| Google | Ausência do botão e de chamada OAuth. | Botão, `signInWithOAuth`, retorno ao login e mensagens para falha/cancelamento. Testado com mocks; consentimento real depende do provedor. |
| Política de senha | Cadastro/reset só exigiam oito caracteres. | Regra compartilhada baseada no Entra conforme escolha do usuário: 8–256, ASCII imprimível, quatro categorias obrigatórias, proteção local contra padrões comuns. Login existente preservado. Veja restrição de backend abaixo. |
| Confirmar senha | `contexto.md` RF01, seção 5.1 e regras de negócio já exigiam o campo. | Campo acessível e validação de igualdade adicionados ao cadastro, sem enviar a confirmação ao Supabase. |

## Configuração e homologação pendentes

1. Definir `VITE_APP_URL=https://<dominio-publicado>` no ambiente de build e reconstruir o frontend. Deixar vazio no desenvolvimento para usar sua origem atual.
2. No Supabase, em Authentication → URL Configuration, definir **Site URL** para o domínio publicado e autorizar os destinos exatos `https://<dominio>/login` e `https://<dominio>/reset-password`. Autorizar localhost apenas para desenvolvimento. Conferir se os templates de confirmação/recuperação respeitam o destino solicitado; um link fixo para localhost precisa ser removido. Não há como o frontend corrigir uma substituição feita pelo provedor.
3. Habilitar Google no Supabase com credenciais do Google Cloud. Cadastrar no Google o callback de Auth do projeto Supabase; o retorno à aplicação é configurado na allowlist do Supabase. Não colocar client secret no frontend.
4. Configurar a política também no backend. A validação de cadastro/reset deste patch ocorre no frontend e na camada de serviço do cliente e pode ser contornada por chamada direta à API. O Supabase oferece comprimento mínimo e grupos obrigatórios, mas não representa diretamente a combinação exata de três de quatro categorias do Entra. Uma aplicação estrita dessa regra no servidor exige suporte adicional no fluxo de autenticação. Proteção contra senhas vazadas depende da configuração/plano Supabase; a pequena lista local não equivale ao Microsoft Entra Password Protection.
5. Publicar `generate-alerts` e executar novamente a geração para atualizar mensagens persistidas. Alertas que já não atendem aos critérios novos não são apagados automaticamente por este patch.
6. Com conta de homologação nova: cadastrar, receber email, confirmar e verificar domínio e sessão. Testar recuperação e login Google com sucesso, cancelamento e falha. Conferir os dois patrimônios da mesma carteira antes e depois de atualizar cotações e renda fixa. Estas etapas reais não foram executadas nesta sessão.

## Referências

- Microsoft Entra: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-sspr-policy
- Destinos Supabase: https://supabase.com/docs/guides/auth/redirect-urls
- Google: https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- Senhas Supabase: https://supabase.com/docs/guides/auth/password-security

## Validação local

- `npm run build`: passou, incluindo TypeScript, Vite e geração do PWA.
- `npm run lint`: passou.
- `npx tsc -p tsconfig.test.json`: passou.
- Testes focados iniciais: 74 passaram; testes adicionais de Graham e leitura de insights também passaram.
- Última suíte completa com quatro workers: 588 de 589 testes passaram (47 de 48 arquivos). O arquivo CarteiraPage apresentou timeout intermitente; o caso afetado variou entre carregamento de linhas, gráfico lazy e conversão USD em execuções diferentes. Não considerar a suíte integralmente verde. A espera assíncrona desse arquivo foi ampliada, sem mudar o comportamento do produto.
- `git diff --check`: passou.
- Não foram feitos deploy, alteração de configuração remota, criação de conta real nem teste de email/consentimento Google em produção.

## Atualização via MCP Supabase — 24/10/2026

Após autorização para resolver as pendências pelo MCP:

- Projeto confirmado: `valorainvest` (`zawjqzekqfnmvwglahnk`), correspondente à URL usada no `.env` local.
- `generate-alerts` publicada da versão 2 para a **versão 3**, status `ACTIVE`. Os dois arquivos recuperados após o deploy correspondem exatamente aos arquivos locais. O modo `verify_jwt=false` já existente foi preservado: a função valida a sessão em `/auth/v1/user` antes de qualquer consulta ou gravação.
- Teste de acesso sem sessão: POST retornou **401**, como esperado. Os 13 testes de geração de alertas passaram antes da publicação.
- Um alerta de oportunidade não ignorado de PETR4 tinha a descrição antiga de 27,0% abaixo do teto. A mensagem histórica foi corrigida para **potencial de valorização de 27,0% até o teto**, que é a interpretação correta do cálculo original sobre a cotação. Valores históricos e status `lido` foram preservados. Não se recalculou um desconto exato com base em um percentual arredondado nem com cotações atuais. Alertas ignorados não foram alterados.
- Cópia da função anterior para eventual rollback: `scripts-temp/generate-alerts-before-2026-10-24.json` (arquivo local).
- Configuração pública de Auth consultada: email habilitado, cadastro habilitado, confirmação de email exigida e **Google desabilitado**. A consulta não expõe Site URL, allowlist nem política de senha.
- Advisor confirmou **proteção contra senhas vazadas desativada**. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Permanecem pendentes Site URL/allowlist/templates, credenciais e habilitação do Google, configuração da política no servidor e homologação com conta real. As ferramentas deste MCP não oferecem leitura/alteração da configuração de Auth; também não há navegador conectado, CLI Supabase instalada ou token da Management API no ambiente. Não foram solicitadas nem expostas credenciais. Para prosseguir, é necessário acesso ao painel/Management API e às credenciais OAuth do Google no serviço de destino. A combinação exata de três entre quatro categorias do Entra continua sem correspondência direta na configuração nativa de grupos obrigatórios do Supabase.

Os advisors também apontaram permissões e search_path em funções de banco e extensões em `public`. Nenhuma alteração de schema ou permissões foi feita nesta atualização, pois não é necessária para publicar a correção dos alertas.

## Atualização pelo Brave — 24/10/2026

- Site URL salva como https://investvalora.vercel.app; retorno exato /login adicionado à allowlist. /reset-password já estava autorizado.
- Templates de confirmação e recuperação conferidos: ambos usam {{ .ConfirmationURL }}, sem localhost fixo.
- Servidor configurado e conferido com mínimo de 8 caracteres e quatro categorias obrigatórias. O usuário autorizou essa adaptação mais restritiva que a regra original Microsoft. Cadastro e reset locais foram alinhados; 30 testes de autenticação e build passaram. O frontend ainda depende de publicação.
- Proteção contra senhas vazadas disponível apenas no plano Pro; projeto no Free, sem upgrade.
- Google Cloud: projeto Valora (valora-512619) criado na conta do Valora. Identidade OAuth Valora salva, público externo inicialmente em teste; políticas aceitas pelo usuário. Formulário do cliente Valora Web preparado com origem https://investvalora.vercel.app e callback https://zawjqzekqfnmvwglahnk.supabase.co/auth/v1/callback. Client ID e Client Secret gerados; segredo inserido diretamente pelo usuário no Supabase, sem registro no repositório. Google habilitado no Supabase e conferido no painel. Conta valorainvestbr@gmail.com adicionada e confirmada como usuário de teste após autorização. OAuth permanece em Testing; publicação pública depende de completar Branding. Login real ainda em homologação.

## Homologação local com pnpm dev

- Servidor iniciado em http://localhost:5174 porque 5173 já estava ocupada.
- Botão Google abriu o seletor e a tela de consentimento para a conta Valora.
- Cancelamento real retornou ao site publicado: falta autorizar http://localhost:5174/login na allowlist Supabase. Sessão do painel expirou; aguardando login do usuário para corrigir.
- Retorno simulado access_denied exibiu a mensagem de cancelamento no frontend local. Cadastro local rejeitou nome com espaços e exigiu confirmação de senha. Nenhuma conta foi criada nesse teste.
- pnpm exec vitest run src/modules/auth --maxWorkers=2 --minWorkers=1: 30 testes passaram em 4 arquivos.
- Sucesso OAuth completo ainda não validado; consentimento Google e retorno à porta local pendentes.

### Resultado do teste real Google local

- Adicionado e conferido o retorno exato http://localhost:5174/login no Supabase (16 URLs). Site URL de produção preservada.
- Cancelamento real no Google retornou ao login local com a mensagem esperada.
- Após consentimento autorizado pelo usuário, login com valorainvestbr@gmail.com concluiu em http://localhost:5174/inicio, com perfil Valora. Sessão permaneceu autenticada após recarregar a página.
- Servidor pnpm dev mantido em execução na porta 5174. Publicação do frontend e liberação pública do OAuth continuam pendentes.

### Ajuste do gráfico de evolução

O mês atual agora usa o patrimônio atualizado compartilhado pelo resumo e seletor. Antes, o gráfico conservava um total histórico parcial/defasado menor que o custo, zerando o ganho visual. Meses anteriores foram preservados. Conferência no navegador: outubro exibe aplicado R$ 12.601,95 e ganho R$ 1.165,94 em verde claro no topo. Quatro testes do hook passaram, incluindo regressão para histórico parcial, atualização de cotações e preservação dos meses fechados.

### Complemento: ganho nos meses fechados

Substituída a agregação de totais diários parciais por fechamento mensal por ativo, usando somente preços até o mês e posições com aquisição já realizada. A consulta de price_history agora pagina 500 linhas por vez com ordem estável, evitando truncamento no PostgREST. USD é convertido pela moeda, incluindo cripto. Conferência visual local: setembro com R$ 601,88 de ganho e outubro com R$ 1.165,94. 32 testes passaram. Este cálculo usa posições cadastradas e o câmbio disponível hoje; não reconstrói posições já vendidas, câmbio histórico ou rendimentos passados de renda fixa sem snapshots. O principal de renda fixa entra a partir da aplicação. O ajuste anterior que preservava todos os meses históricos foi substituído por esta correção.

### Filtros da evolução do patrimônio

O seletor 1A no topo estava sem ação. Agora compartilha o período com os controles do gráfico de início: 1M/3M/6M/1A/2A/5A/10A, desde o início e intervalo personalizado validado. Tipo de ativo filtra custo, patrimônio histórico e valor atual das barras; KPIs de patrimônio atual continuam representando a carteira. Consultas incluem o início na chave de cache e permitem buscar além de 365 dias quando solicitado. Removido corte visual fixo de sete meses. Intervalos encerrados no passado não recebem barra de hoje. Navegador: FIIs + 1M mostrou somente outubro (R$ 5.329,47); personalizado 01/09 a 30/09 mostrou somente setembro (R$ 5.014,81). O topo controla o gráfico de evolução, sem alterar os filtros próprios de outras telas.

### Editor de colunas em Ativos

Adicionado painel lateral Editar colunas na tabela desktop de posições, com 20 opções agrupadas, Ativo e Quantidade obrigatórios, rascunho até Salvar, Cancelar e Restaurar padrão. A escolha persiste no navegador por usuário. Cabeçalhos, células, skeleton e colSpan seguem a seleção; ticker fica fixo na rolagem horizontal. Inclui indicadores já disponíveis, ROE e margem líquida vindos dos fundamentos. Não foram criadas fontes para CAGR, margem bruta, DY médio em cinco anos, avaliações ou metas de rebalanceamento da referência. Testes cobrem aplicar/cancelar/restaurar/persistir e isolamento entre usuários. Verificado no navegador ao ativar ROE, ocultar Nome e recarregar; padrão restaurado após teste. TypeScript e lint passaram.
