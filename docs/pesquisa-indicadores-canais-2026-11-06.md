# Indicadores e referências de canais — 06/11/2026

Registro solicitado pelo responsável. Backlog de pesquisa e evolução; não significa indicadores implementados, cobertura gratuita garantida ou autorização para contratar serviços.

## Candidatos para ações

| Ordem sugerida | Indicador | Valor para o produto | Dependência |
| --- | --- | --- | --- |
| 1 | Payout | Relacionar distribuições ao lucro e contextualizar DY; disponibilizar no score e nas estratégias. | Já há cálculo na tabela (`enrichPositionRows.ts`); conferir alinhamento de período, moeda/unidade por ação e lucro positivo antes de reutilizar. |
| 2 | Dívida líquida/EBITDA | Complementar dívida/patrimônio na avaliação de endividamento. | Obter dívida, caixa e EBITDA comparáveis. Não substituir silenciosamente dívida/PL por esse indicador. Não aplicar automaticamente a bancos/seguradoras. |
| 3 | ROIC | Complementar ROE com retorno sobre capital investido na operação. | Definir NOPAT, capital investido e período; validar fonte e compatibilidade setorial. |
| 4 | CAGR de receitas e lucros — 5 anos | Acrescentar evolução histórica. | Série financeira consistente; ausências e lucro inicial não positivo não viram crescimento fictício. |
| 5 | Margem operacional/EBIT | Separar desempenho operacional dos efeitos financeiros/tributários. | Receita e EBIT do mesmo período. |
| 6 | Fluxo de caixa livre | Complementar lucro contábil com geração de caixa após investimentos. | Definir convenção de CAPEX e fluxo operacional; não confundir fluxo para acionista com fluxo da firma. |

## Candidatos para FIIs

- [ ] Vacância física e financeira, inicialmente para fundos de imóveis.
- [ ] Concentração por imóvel e locatário; tratar fundos de papel e fundos de fundos conforme sua estrutura.
- [ ] WAULT/prazo dos contratos, identificando a ponderação utilizada.

Essas métricas podem depender de informes CVM/FNET e relatórios gerenciais; disponibilidade pública não garante extração automática ou API gratuita. Mostrar referência, fonte e indisponibilidade; não inferir números de documentos sem validação.

## Referências consultadas

- **Suno / Tiago Reis:** rentabilidade, margens, endividamento, crescimento e distribuição. [Aula de indicadores](https://lp.suno.com.br/minicurso-contabilidade/aula-5/), [guia de análise de ações](https://lp.suno.com.br/wp-content/uploads/2024/05/Suno_Research_Ebook_Como_analisar_uma_acao_2024.pdf), [endividamento](https://www.suno.com.br/artigos/2-importantes-fatores-para-se-analisar-em-relacao-a-divida-de-uma-companhia/).
- **Fundamentei:** histórico financeiro, caixa, CAPEX e payout. [Exemplo de painel público](https://fundamentei.com/us/sci). Não presume acesso à tabela premium nem à API.
- **Clube FII:** contexto de imóveis, vacância, contratos e concentração além de DY/P/VP. [Material da equipe](https://clubefiinews.com.br/mercado-imobiliario/seguranca-em-fiis-como-analisar-alem-dos-numeros).
- **A Cara da Riqueza — Diego Bechara:** incluído expressamente a pedido do responsável. [Canal](https://www.youtube.com/@acaradariquezaoficial). Já aparece como referência em `InvestmentCalculators.tsx`; evitar duplicar as calculadoras existentes.

## A Cara da Riqueza — análise inicial e próximos passos

O projeto já tem simulação de FIIs/reinvestimento, juros compostos, meta de renda e preço-teto de FIIs com referência ao canal. A existência dessas funções foi conferida no código, não deduzida dos resultados da pesquisa.

Sugestões de produto para avaliação, sem atribuir autoria exclusiva ao canal:

- [ ] Comparar cenários com e sem reinvestimento usando as funções já existentes.
- [ ] Mostrar evolução da renda mensal e distância da meta de renda passiva, distinguindo realizado de projeção.
- [ ] Comparar a referência de preço-teto de FIIs com renda fixa, mostrando premissas, impostos simplificados e prêmio de risco, sem apresentar preço garantido.
- [ ] Expor cenários de aporte, inflação e rendimento para mostrar sensibilidade, sem duplicar as calculadoras atuais.
- [ ] Rever os vídeos e a planilha anteriormente enviados pelo responsável para separar método já implementado de melhorias novas, com fórmulas e unidades verificadas.

Vídeos anteriormente enviados: [vídeo 1](https://www.youtube.com/watch?v=kz1dsRClNXg), [vídeo 2](https://www.youtube.com/watch?v=fDR0RW_8NpE). Nesta consulta o YouTube não retornou conteúdo/transcrições verificáveis: não foi feita nova revisão integral dos vídeos nem identificado um indicador exclusivo do canal. Não usar agregadores ou comentários de terceiros para atribuir fórmulas ao autor. O registro é uma avaliação inicial do encaixe no produto; a revisão específica permanece aberta.

## Critérios antes da implementação

- Confirmar fórmula, unidade, período, classes compatíveis e fonte gratuita utilizável.
- Distinguir o que já existe na tabela do que falta nos construtores de score/estratégia/alertas.
- Preservar fórmulas e limites cadastrados; novas métricas exigem explicação e tratamento de ausência.
- Citar criador/canal apenas quando houver método ou material efetivamente utilizado, conforme preferência do responsável. Indicadores financeiros tradicionais não passam a ser de autoria de um canal por serem explicados nele.
