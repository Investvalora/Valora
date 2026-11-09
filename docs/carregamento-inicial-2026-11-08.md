# Carregamento inicial — 08/11/2026

Branch codex/carregamento-inicial, base PR121 mergeada. RP-07 continua parcial. Sem migrations, mudança de cálculo, layout ou banco.

## Mudança

DeferredQuickTransactionModal adia o import e a montagem do formulário até o primeiro pedido. Usado no atalho global e no início mobile, evitando que o segundo caminho mantenha um import imediato. Durante o download, o Modal existente mostra Carregando formulário e permite fechar. Depois da primeira abertura, mantém o formulário montado com isOpen, preservando o ciclo anterior de limpeza/rascunhos. Falha de chunk continua sob a recuperação global existente. Não há reenvio automático.

## Peso de JavaScript

Mesma árvore e dependências, antes/depois; builds Vite com --manifest em output/perf-before e output/perf-after. Script reproduzível: `node scripts/report-build-size.mjs <diretorio-do-build>`. Soma recursivamente imports estáticos sem duplicação; não trata imports dinâmicos, CSS/fontes, chamadas de dados ou instalação como bytes iniciais. Gzip calculado por arquivo localmente, não tráfego observado na Vercel. Uso: gerar build com `node node_modules/vite/bin/vite.js build --manifest --outDir output/perf-after` e executar o relatório.

| Conjunto | Antes (bytes/gzip) | Depois (bytes/gzip) |
|---|---:|---:|
| Entrada | 737.686 / 219.056 | 705.515 / 209.739 |
| Entrada + início + imports estáticos | 809.875 / 247.098 | 790.744 / 243.326 |
| Entrada + posições + imports estáticos | 851.791 / 258.241 | 853.964 / 261.762 |
| Todo JS do manifest | 1.724.690 / 528.769 | 1.729.681 / 533.435 |

Entrada aproximadamente 4,4% menor em bytes e 4,3% em gzip. Início 1,5% menor em gzip. Posições aumentou 3.521 bytes gzip (1,4%) e total JS 4.666 bytes gzip (0,9%) por fragmentação/overhead. O service worker continua pré-armazenando todos os arquivos: esta mudança não reduz o tamanho da instalação completa nem garante acesso autenticado mais rápido em todas as rotas. Custo do formulário é transferido ao primeiro uso.

## Rede limitada e limites

Prévia local do login nos dois builds, sem autenticação: CDP com 93.750 bytes/s por direção (750 kbit/s), latência 150 ms, cache HTTP desativado e bypass do worker. Uma amostra observou DCL 12,585 s / FirstMeaningfulPaint 12,624 s antes e 2,860 s / 2,901 s depois. A preparação/instalação concorrente do cache PWA e histórico das prévias não foram isolados: **não usar essa diferença como ganho causal ou benchmark**. FirstMeaningfulPaint não é FCP, LCP nem tempo até interatividade. Sem limitação de CPU ou Android físico. Rede/cache/bypass restaurados ao fim. Medição estável de instalação, rotas autenticadas e aparelho continua pendente.

## Validação

20 testes em quatro arquivos aprovados: shell, início, formulário rápido e páginas públicas. Teste do shell confirma ausência de montagem antes do pedido, abertura pelos dois botões e fechar/reabrir. Formulário original mantém sua regressão de rascunhos/validações. Conferência autenticada em localhost: abriu o formulário real, digitou quantidade 2, cancelou, reabriu vazio e cancelou. Nenhum lançamento salvo; Investidor10 preservada. Evidência local não versionada: output/qa-carregamento/lancamento.png. Relatórios de tamanho em output/perf-before-report.json e perf-after-report.json.

## Homologação local repetida

Após solicitação do titular: recarga do início, primeira abertura pelo botão desktop, quantidade 2/preço 10 sem salvar, recarga e abertura pelo botão Novo lançamento da navegação em 390×844 px. Restaurar recuperou quantidade/preço e total R$20,00; Cancelar limpou o rascunho. Nova abertura sem opção de restauração e quantidade vazia; Fechar encerrou o formulário. Visual preservado e rodapé acessível; viewport restabelecido. Atalho do estado vazio do início sustentado pelo teste automatizado com mock, não acionado em carteira real vazia nesta rodada. Nenhum envio ao banco. Evidência: output/qa-carregamento/mobile-rascunho.png. TypeScript, lint e build/PWA anteriores aprovados; nenhum código mudou depois desses checks. Publicação ainda pendente.
