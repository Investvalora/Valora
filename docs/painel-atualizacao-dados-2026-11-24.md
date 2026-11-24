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
