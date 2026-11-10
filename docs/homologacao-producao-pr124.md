# Homologação PR124 — 09/11/2026

Merge19327c8264f214da75ee477609ee1c736c3bc647 confirmado; CI da main e Vercel aprovados. **Homologação parcial**, com defeito de cache PWA confirmado.

## Funcionalidades conferidas

- Criação com rede direta/bypass temporário: nome fictício, inflação4,5%, taxa real7,75%, imposto vazio; recarga e restauração explícita recuperaram valores. Imposto permaneceu vazio e inválido para envio. Voltar encerrou o teste sem salvar.
- Edição com cache normal: inflação alterada apenas no formulário para4,75%, recarga, reabertura e restauração explícita. Fechar pelo X limpou; nova abertura trouxe inflação original5%, sem oferta residual. Cancelar encerrou. Botões Salvar estratégia/Cancelar visíveis em390×844px.
- Nenhuma estratégia, posição, lançamento ou carteira alterada. Viewport original restaurado. Cache HTTP/bypass deixados no estado normal; nenhuma exclusão de cache executada.

## Defeito que bloqueia aprovação integral

Ao abrir Nova estratégia com cache normal, import dinâmico falha repetidamente. Network.responseReceived da aba registrou:

- URL: https://investvalora.vercel.app/assets/NovaEstrategiaPage-8fZHJVrF.js
- status200; mimeType text/html; fromServiceWorker true.

Consulta direta do mesmo asset retornou200 application/javascript. Com bypass do service worker, formulário carregou e rascunho funcionou. Restaurar cache normal e abrir em nova aba reproduziu a falha. Logo, não se trata somente de esperar o deploy.

O worker atual aceita qualquer resposta ok em /assets e usa caches.match sem validar MIME; a Vercel tem rewrite geral para index.html. Isso é compatível com armazenamento de fallback HTML como asset, mas o instante que produziu a entrada ruim não foi observado. Não afirmar causa histórica exata.

Próxima correção: validar tipo de resposta ao ler/gravar assets, recuperar entrada inválida por rede e impedir pré-cache inválido; testar troca de versão, offline e preservação de push. Não apagar sessão/rascunhos para corrigir cache. Ainda não implementado nesta homologação.

Evidências locais não versionadas: output/homologacao-pr124/criacao-mobile.png, edicao-mobile.png e erro-cache.png. Viewport simulado, não aparelho físico.

## Correção local — 10/11/2026

Implementada validação de MIME de JavaScript/CSS ao consultar e gravar assets. Entrada inválida é removida e refeita pela rede com `cache: reload`; HTML não é devolvido como chunk nem armazenado. A consulta fica restrita ao cache da versão atual. O pré-cache valida todos os arquivos antes de gravar/ativar, e o hash do cache passa a incluir o próprio código do worker, permitindo substituir o cache mesmo sem mudanças nos bundles.

Validação automatizada: 12 testes aprovados (cache contaminado, resposta HTML da rede, offline, CSS, instalação, remoção de caches antigos e clique em notificações); lint do teste e build TypeScript/Vite/PWA aprovados. Build gerou 98 arquivos no cache. A execução inicial restrita falhou por acesso ao diretório do compilador; repetição com permissões apropriadas passou. Os avisos de anotações da dependência Zod não impediram o build.

Ainda falta publicar e retestar no navegador com o cache real contaminado, sem bypass. Esta correção local não encerra a homologação em produção. Nenhuma alteração de dados financeiros, sessão ou rascunhos.
