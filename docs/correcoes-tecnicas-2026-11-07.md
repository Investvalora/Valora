# Pendências técnicas — rodada local de 07/11/2026

Branch: `codex/recuperacao-sessao-pwa`. Implementação local; sem publicação, migration ou alteração de carteiras. Os documentos e artefatos anteriores foram preservados.

## Implementado

- RP-09: verificação de sessão pelo Auth (`getUser` com o token da sessão), na montagem, retorno à aba e reconexão. Apenas códigos explícitos de sessão revogada geram orientação para reautenticação. Rede/indisponibilidade têm nova tentativa e não apagam a sessão. Respostas antigas são descartadas após troca de sessão. Login explícito em outra aba (`/login?reauth=1`) permite recuperar acesso sem mudar o escopo do logout e sem desmontar o formulário na aba original. Modal reutiliza foco e navegação acessível existentes. Autorizações no servidor permanecem necessárias; a verificação visual não as substitui.
- RP-06: boundary global com tratamento distinto para offline, falha de chunk e renderização, com ação explícita de recuperação. Suspense oferece orientação offline e, após 15 segundos, aviso de demora e recarregamento explícito. Não reenvia operações automaticamente. O formulário permanece montado durante a verificação de sessão; uma falha fatal de renderização ou recarregamento ainda pode perder campos não salvos, com aviso explícito. Persistência de rascunhos ainda não está implementada.
- RP-05: acesso por “Importar CSV” em Ativos › Lançamentos, rota `/ativos/importar`, destino e nome do arquivo explícitos. Troca de carteira após selecionar arquivo bloqueia confirmação até nova seleção. Coincidências entre linhas e histórico geram aviso e conferência explícita, permitindo compras iguais legítimas. Confirmação bloqueada durante leitura/validação, importação ou erro. Versão antiga de validação não substitui mensagem da edição mais recente; desmarcação durante validação é preservada. Falha no envio pede conferir o histórico antes de repetir, pois a resposta pode se perder após gravar. Não foram importados registros reais. Persistência do lote/arquivo ainda pendente.
- RP-04: catálogo compartilhado dos seis indicadores atuais, com rótulos, unidade, classes, operadores, origem e referência de dados e explicações. Usado em tipos/validação/ajuda do score, fundamentos, seleção de alertas e rótulos de estratégias. Dívida/PL Yahoo continua em percentual; nenhum limite antigo foi convertido. Adaptadores da tabela e contratos do backend ainda precisam ser consolidados antes de encerrar o item.
- RP-07: treze páginas antes importadas estaticamente agora são carregadas sob demanda. Rotas e links existentes preservados com Suspense. Build final: entrada JS **726,14 kB / 215,82 kB gzip**, contra **1.461,52 kB / 413,47 kB gzip** no build de referência desta rodada. Isso mede o arquivo de entrada, não o total de bytes nem o tempo até interatividade. A rota inicial e suas dependências acrescentam tráfego. O service worker continua pré-armazenando os recursos da aplicação; a instalação completa não ficou 50% menor.

## Validação e limites

- TypeScript e build/PWA aprovados; lint dos arquivos alterados sem erros ou avisos.
- Scanner dos arquivos versionados: zero achados. Não substitui auditoria dos arquivos novos ou penteste.
- Testes de sessão incluem revogação, indisponibilidade, troca de identidade e preservação do campo montado. Testes de rotas preservam a cobertura anterior e acrescentam reautenticação.
- Testes de boundary cobrem recuperação explícita e chunk, sem exibir detalhes internos. Testes de catálogo cobrem unidades e classes incompatíveis.
- Regressão anterior: 1.031 testes/153 arquivos aprovados; testes adicionais de duplicatas, destino e demora/offline passaram. Build/PWA aprovado após integrar a rota, entrada aproximadamente 726 kB / 216 kB gzip. Lint e build finais conferidos nesta rodada.
- Conferência autenticada local: início, lançamentos e link de importação, destino Minha Carteira, CSV sintético de duas compras iguais sinalizadas e confirmação bloqueada. Prévia descartada sem gravação. Score e ajuda Dívida/PL preservam limite 1,5 e explicam percentual Yahoo. Detalhe AAPL mostra fundamentos e referência, sem erros de console capturados. Produção e medição em aparelho/rede limitados ainda pendentes. Nenhuma sessão real foi revogada para testar.

## O que ainda não encerra os itens da TODO

- RP-04: consolidar adaptadores de tabela/backend e validar fonte/unidade dos registros legados antes de qualquer mudança de limites.
- RP-05: metadados de arquivo/lote persistidos e garantia de idempotência entre dispositivos. A prévia de duplicatas é consultiva, não impede duas importações concorrentes.
- RP-06: persistência/restauração de rascunhos; a boundary não captura erros assíncronos arbitrários ou os já tratados localmente.
- RP-07: medições de navegação e instalação em rede limitada/aparelho.
- RP-09: reteste autenticado e publicação. A verificação usa montagem/visibilidade/reconexão, não polling contínuo.
