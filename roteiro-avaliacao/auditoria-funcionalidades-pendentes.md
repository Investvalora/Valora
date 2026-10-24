# Auditoria de funcionalidades pendentes — Valora

Revisão de código em 24/10/2026, na branch fix/levantamento-valora. Nenhuma funcionalidade foi alterada nesta auditoria. Evidências se referem ao código local; não foi feita homologação completa de todas as telas nem nova verificação da configuração remota.

## Controles expostos sem implementação completa

| Prioridade | Tela / função | Situação confirmada | O que implementar | Evidência |
| --- | --- | --- | --- | --- |
| Alta | Ativos: Filtrar no cabeçalho e na tabela | Ambos os botões não possuem onClick. | Painel real de busca/tipo e aplicação dos critérios aos dados; evitar dois controles sem função. | src/modules/ativos/components/AtivosPage.tsx:24; src/modules/ativos/components/AtivosPosicoes.tsx:202 |
| Alta | Ativos: Exportar CSV | Botão sem onClick; já há exportador de posições em outro módulo. | Reutilizar exportação, definir se segue as colunas visíveis e os filtros, tratar formato e download. | src/modules/ativos/components/AtivosPosicoes.tsx:214; src/modules/portfolio/export/positionsCsv.ts |
| Alta | Detalhe do ativo: Lançamento do ativo | Botão sem onClick. Cadastro de lançamentos já existe no projeto. | Abrir formulário com o ticker e carteira preenchidos e atualizar consultas ao concluir. | src/modules/assets/components/AtivoDetailPage.tsx:204 |
| Alta | Detalhe do ativo: Criar alerta | Botão sem onClick. Criação de alertas já existe em outras telas. | Conectar o botão ao fluxo existente com o ticker preenchido. | src/modules/assets/components/AtivoDetailPage.tsx:210; src/modules/analise/components/AnaliseAlertas.tsx:135 |
| Média | Composição: Exibir posição ideal | Estado showIdeal só altera aria-checked e estilo do interruptor. Não participa dos dados do gráfico ou da lista. | Metas por classe/ativo, validação dos pesos e comparação entre participação atual e ideal. | src/modules/ativos/components/AtivosComposicao.tsx:305 |
| Média | Conta: Alterar senha | Botão desabilitado e texto “em breve”. Recuperação/redefinição de senha já existe em fluxo separado. | Fluxo autenticado de alteração, política de senha, reautenticação quando exigida e estados de erro/sucesso. | src/modules/preferences/components/AccountPage.tsx:87 |

São sete controles visuais: dois Filtrar, Exportar CSV, dois atalhos do detalhe, Exibir posição ideal e Alterar senha. São seis grupos de implementação, pois os dois filtros pertencem ao mesmo fluxo.

## Recursos parciais e diferenças dos requisitos

| Prioridade | Recurso | Limite atual | Trabalho necessário |
| --- | --- | --- | --- |
| Alta | Histórico patrimonial completo | O gráfico mensal usa posições atuais e suas datas de aquisição, câmbio disponível hoje e principal histórico da renda fixa. Não reconstrói posições já vendidas nem rendimentos passados da renda fixa. | Reconstruir saldos e custo a partir das movimentações, usar câmbio histórico e snapshots de renda fixa. O gráfico existente é uma visão histórica das posições cadastradas, não um extrato histórico integral. Evidência: src/modules/dashboard/monthlyWealth.ts. |
| Média | Rentabilidade: filtro de tipo | Filtra a tabela por ativo e sua exportação. A chamada usePerformance recebe somente período e carteira; gráfico e resumo permanecem agregados. | Definir o alcance visual do filtro e, se for global ao bloco, recalcular série e resumo com a mesma seleção. Evidência: src/modules/desempenho/components/DesempenhoRentabilidade.tsx:82–114. |
| Média | Rentabilidade: Desde o início | Em usePerformance, Tudo continua mapeado para 365 dias. A evolução da página inicial já ganhou consulta ampliada, mas isso não foi generalizado. | Buscar desde a primeira movimentação/preço disponível e alinhar carteira, proventos e benchmarks no mesmo intervalo. Evidência: src/modules/performance/hooks/usePerformance.ts:35. |
| Média | Período do topo | Atualmente consumido pelo gráfico de evolução da página inicial. Outras telas mantêm seus próprios períodos. O TopBar fica oculto no celular, e o gráfico inicial não tem mais um seletor local de período. | Definir se o período é global ou exclusivo da evolução; oferecer o mesmo acesso ao período no topo mobile. Evidência: src/shared/components/TopBar.tsx:17; src/modules/inicio/components/WealthEvolution.tsx:13; buscas por useChartPeriod. |
| Média | Proventos previstos — RF11 | O serviço usado nas telas consulta apenas pagamentos até hoje. | Separar pagos de anunciados/a receber, buscar pagamentos futuros e calcular elegibilidade pela posição na data-com. Evidência: contexto.md RF11; src/modules/dividends/services/dividendService.ts:26. |
| Média | Benchmark IPCA — RF13 | O requisito cita CDI, IBOV e IPCA. A configuração de desempenho usa CDI, IBOV e IFIX. IPCA em renda fixa não equivale a benchmark IPCA. | Decidir se a especificação deve incluir IFIX ou se IPCA deve ser integrado como série comparativa. Evidência: contexto.md RF13; src/modules/performance/hooks/usePerformance.ts:44. |
| Média | Score na nova tabela de Ativos — RF06 | O motor de score e telas de Análise existem. A nova tabela de Ativos não recebe a avaliação ativa nem disponibiliza a coluna. | Reutilizar a seleção de score e o cálculo existente, definindo a apresentação em Ativos. Não confundir score próprio com avaliações públicas do concorrente. Evidência: contexto.md RF06; src/modules/ativos/components/AtivosPosicoes.tsx; src/modules/portfolio/components/CarteiraPage.tsx:236. |

## Expansões da referência do Investidor10

Estes itens não devem ser tratados automaticamente como defeitos ou como requisitos já aprovados do Valora:

- Margem bruta, CAGR de receitas/lucros em cinco anos e DY médio de cinco anos: faltam campos/fontes e histórico necessário no fluxo de fundamentals atual. O serviço seleciona P/L, P/VP, ROE, DY, dívida/patrimônio, margem líquida, LPA e VPA.
- Média pública de avaliações: falta o produto de avaliações, sua persistência e agregação.
- Minha nota e preço-alvo pessoal na tabela: falta um modelo de preferência por usuário/carteira/ativo e sua edição. Alertas de preço-alvo já existem, mas não constituem automaticamente uma avaliação pessoal na tabela.
- % ideal e Comprar para rebalancear: dependem de metas, orçamento e cálculo de distribuição; estão ligados ao interruptor de posição ideal.
- Ordenação pelas colunas da nova tabela: o AtivosTable atual não oferece interação de ordenação no cabeçalho. Existem utilitários/tabelas com ordenação em outros módulos; é uma expansão reaproveitável.
- Sincronização de preferências entre dispositivos: o editor de colunas recém-adicionado guarda escolhas por usuário somente no navegador. A versão de celular mantém os cartões próprios e ainda não usa o editor de colunas desktop.

## Não confundir com ausência geral de funcionalidade

- Login Google, cadastro, confirmação de senha, recuperação de acesso, carteira, lançamentos, alertas, score, Graham, Bazin e edição de colunas têm implementações. Isso não substitui homologação de cada cenário e configuração de produção.
- Há serviços/funções de sincronização de cotações, dividendos e fundamentos; falta de botão ligado não significa ausência do processamento no backend.
- CarteiraPage.tsx contém ações “Sincronizar dados” e “Gerar insights” que apenas avisam “Em breve”. Esse componente não está ligado às rotas atuais em src/routes.tsx. Registrar como legado a revisar, sem confundir com o fluxo de alertas/insights que já existe em outras telas.
- O estado remoto de deploy, publicação pública do OAuth e teste de confirmação de email não foi revalidado nesta auditoria. Consultar o histórico em correcoes-levantamento.md e homologar separadamente.

## Ordem sugerida

1. Conectar Filtrar e Exportar CSV em Ativos.
2. Conectar os dois atalhos do detalhe do ativo.
3. Corrigir o alcance dos filtros de rentabilidade e Tudo.
4. Completar histórico por movimentações e proventos previstos.
5. Implementar metas de posição ideal e rebalanceamento.
6. Concluir alteração de senha e acesso ao período no celular.
7. Decidir os indicadores e recursos adicionais da referência antes de criar dados ou integrações.
