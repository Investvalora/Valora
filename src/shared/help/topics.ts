type Explanation = { title: string; meaning: string; rules: string[]; example: string }
export const HELP_TOPICS = {
  balance: {
    title: 'Patrimônio e valor investido',
    meaning: 'O patrimônio representa a avaliação dos ativos. O valor investido representa o custo da posição: não deve acompanhar a oscilação diária das cotações.',
    rules: ['Confira a carteira selecionada e os filtros antes de comparar telas.', 'Cotações e câmbio podem mudar o patrimônio. Compras, vendas e custos registrados alteram o custo da posição.', 'Valores em dólar precisam ser convertidos para comparar totais em reais. Confira a data e a fonte do câmbio; dado indisponível não equivale a zero.'],
    example: 'Uma compra de 10 unidades a R$ 20, com R$ 2 de custos, custa R$ 202. Se a cotação subir para R$ 23, a posição vale R$ 230; a alta não transforma seu custo em R$ 230.',
  },
  returns: {
    title: 'Rentabilidade e histórico',
    meaning: 'Rentabilidade mede o desempenho considerando a metodologia do histórico. Não é a mesma coisa que dividir a variação do patrimônio pelo saldo anterior quando houve movimentações.',
    rules: ['Selecione o período e confira a cobertura histórica e os avisos da tela.', 'Compras e vendas mudam o patrimônio sem representar, por si só, lucro ou prejuízo.', 'Uma lacuna de cotação ou câmbio pode impedir o cálculo completo. Compare períodos e bases iguais.'],
    example: 'O patrimônio passa de R$ 1.000 para R$ 1.100 após uma compra de R$ 100, sem mudança de preços. O aumento de R$ 100 não significa rentabilidade de 10%.',
  },
  income: {
    title: 'Proventos recebidos e a receber',
    meaning: 'O calendário reúne eventos e estimativas disponíveis. Um anúncio de pagamento não comprova o valor líquido creditado na sua corretora.',
    rules: ['Confira ativo, data ex, pagamento, fonte e situação do evento. A quantidade elegível depende das datas e do histórico da posição.', 'Use a legenda do gráfico para distinguir recebido e a receber; passe o mouse ou toque nas barras para consultar os meses.', 'O extrato ou lançamento confirma o recebimento pessoal. Imposto, tarifas e câmbio podem explicar diferenças; cobertura incompleta não significa ausência de dividendos.'],
    example: 'Um extrato em USD mostra dividendo bruto de US$ 0,06 e imposto de US$ 0,02: o líquido é US$ 0,04. O valor em reais ainda depende do câmbio utilizado.',
  },
  transactions: {
    title: 'Lançamentos, quantidades e moeda',
    meaning: 'Registre a movimentação com a moeda do ativo, sua data, quantidade, preço e custos. O lançamento descreve uma operação; não envia ordens à corretora.',
    rules: ['Compras e vendas de ações brasileiras, FIIs, BDRs e ETFs brasileiros exigem quantidades inteiras. O mercado fracionário brasileiro permite negociar menos de um lote, mas não frações de uma unidade.', 'Ativos americanos, cripto e Tesouro podem aceitar frações conforme o tipo cadastrado. Outros eventos, como bonificações, têm regras próprias.', 'Preço e custos podem ter centavos. Confira a moeda antes de salvar e não converta manualmente um preço em USD para BRL em um campo do ativo em USD.'],
    example: 'Para uma ação brasileira, 3 unidades a R$ 12,50 são válidas; 3,5 unidades em uma compra não são. Para um ativo americano compatível, 0,25 unidade a US$ 100 pode ser válida.',
  },
  csv: {
    title: 'Importação de CSV',
    meaning: 'O importador transforma as linhas do arquivo em movimentações. A prévia serve para conferir os dados antes de gravar.',
    rules: ['Use o modelo da tela e confira o mapeamento, as datas, a moeda e os separadores numéricos na prévia.', 'As compras e vendas brasileiras mantêm a regra de unidades inteiras: a importação não deve arredondar uma fração para fazê-la passar.', 'Revise erros e avisos de duplicidade. Duas operações realmente iguais podem existir; não altere valores apenas para contornar a proteção contra repetição de lote.'],
    example: 'Se a prévia interpretar uma compra brasileira como 1,5 unidade, corrija o arquivo conforme o comprovante ou o mapeamento. Não troque por 2 sem confirmar a operação real.',
  },
  score: {
    title: 'Score e indicadores',
    meaning: 'O score soma as contribuições das regras configuradas. Ele organiza sua análise e não é uma recomendação de investimento.',
    rules: ['Escolha o grupo de regras e confira métrica, unidade, operador, limite e pontos. Use a explicação do indicador para consultar a fórmula.', 'Condição atendida soma ou desconta os pontos configurados; sem dado não se deve interpretar o indicador como zero.', 'A escala não é normalizada automaticamente: regras que somam 6 pontos positivos resultam em até 6 pontos. Dívida/PL de 1,5 vez corresponde a 150%.'],
    example: 'Uma regra ROE > 10% com +2 pontos soma 2 se o ROE for 12%. Se o ROE for 10%, o operador > não inclui o limite e a contribuição é zero.',
  },
  analysis: {
    title: 'Análises, estratégias e alertas',
    meaning: 'Compare indicadores na mesma unidade e data de referência. Estratégias e limites dependem das hipóteses escolhidas.',
    rules: ['Confira fontes e datas dos fundamentos; cotação recente não significa balanço recente.', 'Preço de referência e simulações não garantem retorno. Um dado ausente deve permanecer identificado como indisponível.', 'Alertas dependem das consultas e permissões disponíveis; não representam monitoramento garantido em tempo real.'],
    example: 'Ao comparar Dívida/PL, 150% e 1,5 vez representam a mesma proporção. Comparar 150 com 1,5 sem conferir a unidade produz uma conclusão incorreta.',
  },
  allocation: {
    title: 'Carteiras e composição',
    meaning: 'A carteira agrupa suas posições e movimentações. A composição mostra a participação das classes ou ativos na avaliação apresentada.',
    rules: ['Confira a carteira ativa antes de lançar, importar ou consultar.', 'Metas percentuais orientam o planejamento e devem totalizar 100%. Não executam compras nem vendas.', 'Uma classe acima da meta pode diminuir de peso quando você aporta nas demais, mesmo sem vender ativos.'],
    example: 'Em R$ 1.000 de patrimônio, uma classe com R$ 300 representa 30%. Uma meta de 40% indica uma diferença de alocação, não uma ordem automática de compra.',
  },
  planner: {
    title: 'Planejar aporte',
    meaning: 'Distribui um orçamento em reais entre classes com diferença positiva para suas metas, considerando a carteira e o aporte simulado.',
    rules: ['Configure metas que somem 100% e informe o orçamento e o mínimo por classe.', 'A sugestão é por classe, não uma lista de ordens por ativo. Não calcula a quantidade executável de cada papel nem inclui todas as taxas.', 'Pode haver sobra de caixa. A simulação não registra lançamentos nem vende posições.'],
    example: 'Com R$ 500 de orçamento, o plano pode sugerir R$ 300 em uma classe e R$ 200 em outra. Você ainda precisa escolher ativos, conferir preços e registrar as operações realizadas.',
  },
  wealth: {
    title: 'Variação do patrimônio',
    meaning: 'Explica a mudança entre saldos históricos, separando movimentações, mercado e câmbio conforme os dados disponíveis.',
    rules: ['Compras/aplicações e vendas/resgates são fluxos de ativos, não necessariamente depósitos ou retiradas bancárias.', 'Proventos e cupons são apresentados fora do saldo dos ativos; não há reinvestimento automático presumido.', 'Lacunas históricas impedem uma conciliação completa. Compare as datas do histórico com a avaliação atual antes de confrontar valores.'],
    example: 'Saldo inicial de R$ 1.000 + compra de R$ 200 + valorização de R$ 30 = saldo final de R$ 1.230, sem outras movimentações ou efeitos.',
  },
  export: {
    title: 'Exportar e conferir backup',
    meaning: 'O JSON versionado preserva os registros da carteira e seus vínculos para conferência e portabilidade.',
    rules: ['Guarde o arquivo em local privado: ele contém dados financeiros.', 'Valores decimais podem aparecer como texto para preservar precisão. Identificadores ligam operações e posições.', 'A conferência de arquivo valida e compara o conteúdo; não restaura, mescla nem importa automaticamente os registros.'],
    example: 'Ao abrir um backup para conferência, o sistema pode identificar um lançamento cujo ID já existe. Essa consulta não cria uma segunda operação.',
  },
  goal: {
    title: 'Meta de renda passiva',
    meaning: 'Compara sua meta mensal em reais com a média dos últimos 12 meses de recebimentos confirmados registrados.',
    rules: ['Estimativas públicas não entram como recebimento pessoal confirmado. Meses sem registro contam como zero; confira se o extrato está completo.', 'A projeção de capital usa o rendimento anual hipotético convertido em taxa mensal equivalente.', 'A projeção considera inflação zero e não inclui impostos ou tarifas. Não garante pagamentos mensais.'],
    example: 'R$ 1.200 confirmados em 12 meses representam média de R$ 100 por mês, mesmo que os pagamentos tenham se concentrado em poucos meses.',
  },
  health: {
    title: 'Saúde e atualização dos dados',
    meaning: 'Mostra fontes, datas e lacunas de cotações, câmbio, fundamentos e avaliações disponíveis.',
    rules: ['O painel confere os dados salvos a cada cinco minutos enquanto está visível e conectado. Essa previsão é da consulta nesta tela, não do próximo processamento do fornecedor.', 'Última gravação e data de referência são diferentes; datas de pagamento ou data ex não indicam quando o calendário foi atualizado. Horários são apresentados em Brasília e intervalos preservam diferenças entre ativos.', 'Conferir novamente consulta os dados salvos; não obriga o fornecedor a publicar uma atualização.', 'Último fechamento em fim de semana não é automaticamente falha. Calendários de mercados e classes podem ser diferentes.', 'Cobertura incompleta é diferente de valor zero ou de uma empresa não pagar dividendos. Confira os avisos antes de concluir.'],
    example: 'Uma cotação de sexta-feira consultada no domingo pode ser o último fechamento disponível. Um fundamento com data antiga deve ser avaliado pela sua própria referência.',
  },
} satisfies Record<string, Explanation>
export type HelpTopic = keyof typeof HELP_TOPICS
