# Painel de atualização dos dados — 24/11/2026

## Entrega
- Análise > Ferramentas > Saúde dos dados: cards de Cotações, Proventos, Fundamentos e Tesouro.
- Início: indicação discreta de gravação/referência das cotações e link direto para o painel.
- Intervalos preservam a data mais antiga e a mais recente. Horários em Brasília; datas civis não sofrem deslocamento de fuso.
- Conferência dos dados salvos a cada cinco minutos apenas com painel visível e conexão, sem sobreposição. Retorno à tela/rede confere novamente.
- Ícone de informação explica a diferença entre gravação, referência, coleta e conferência.

## Limitações explícitas
A API atual não disponibiliza ao painel a próxima coleta dos fornecedores nem uma data unificada de ingestão dos proventos. Esses campos ficam sem informação, sem inferir horário a partir de pagamento/data ex ou prometer atualização nova. A conferência local não dispara rotinas de coleta.

## Validação
- 42 testes direcionados passaram (planejamento, resumo, totais e ajuda); teste adicional de link direto e nova rodada de planejamento: 19 testes passaram.
- TypeScript e build de produção aprovados. Lint dos arquivos alterados aprovado; helper de datas extraído para preservar Fast Refresh.
- Secret scan: zero achados; diff sem erros de whitespace.
- Homologação visual pendente: navegador integrado sem conteúdo no servidor existente; navegação para servidor Vite isolado em 5182 expirou. Nenhuma carteira ou dado financeiro foi alterado.

## Homologação visual concluída
Sessão autenticada em localhost:5175: indicação do Início, link direto para Saúde dos dados, quatro cards, datas/fontes, consulta manual com estado de carregamento e retorno, ajuda com regras/exemplos. Layout observado em largura estreita de 319 px e desktop 1280 x 900; cards em uma/duas colunas. Nenhum erro de console capturado. A cadência de cinco minutos e pausa/retomada foram verificadas pelos testes automatizados, sem aguardar cinco minutos nesta conferência visual. Evidência local: output/qa-data-update-status/desktop.png no workspace principal. Sem alteração financeira.

## Status compacto no Início
Adicionado ao topo, antes do sino no desktop, e dentro da página no celular. Abre por hover, foco e toque; Escape/saída de foco fecham. Exibe gravação/referência das cotações e próxima conferência local, sem inventar próxima coleta do fornecedor. Reutiliza queries de posições/cotações e consulta salva a cada cinco minutos. Conferência visual desktop aprovada; evidência output/qa-data-update-status/status-topo.png. Oito testes de card/Início/shell, tipagem e lint aprovados.

## Datas previstas de coleta
Agendas ativas conferidas por consulta somente leitura a cron.job em produção em 24/11/2026. A interface agora projeta o próximo lote por categoria em Brasília, incluindo janelas de dias úteis do Tesouro/fundamentos e coleta contínua de cripto/proventos. É uma projeção do cron configurado, não ETA por ativo nem garantia de publicação. A configuração foi registrada em collectionSchedule.ts e deve acompanhar alterações nos crons; não é uma consulta ao cron a cada renderização. Sem alteração no banco. 23 testes de planejamento, TypeScript e lint aprovados. Conferência local confirmou datas no painel e no status do Início.
