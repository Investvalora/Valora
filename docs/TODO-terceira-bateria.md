# Terceira semana — triagem e TODO

Revisão inicial em 04/11/2026. Leitura do relatório e da planilha, com confronto estático do código local após a PR #105. Não equivale a reprodução visual em produção; nenhum dado financeiro ou código de produto foi alterado.

## Fontes

- [Relatório de Testes do Valora — Semana 3](https://docs.google.com/document/d/13jNXbQFW5DtPenlLb5oWool1BlhxW1xoPO4HK1QGeGs/edit).
- [Entrega Semanal Semana 3](https://docs.google.com/spreadsheets/d/1jXcruzLGBY3w-fb7h7jwbTbawjOm6VibzX14Z8pZJNg/edit).

São os mesmos 20 casos e 12 apontamentos em dois formatos, sem duplicar contagens. A fonte informa 8 aprovados e 12 reprovados, sem defeitos de severidade alta. A classificação abaixo distingue falha de comportamento, melhoria e investigação.

## Investigações prioritárias

- [ ] **S3-01 / DF05 — Conciliar rentabilidade entre detalhe, desempenho e Início.** Fonte: ITUB4, 10 unidades, PM R$ 40; detalhe -2,27%, tabela +4,25%, carteira -3,28%. A R$ 39,09, o ganho sobre custo é de fato -2,275%. Porém retorno histórico com meses fechados, retorno da posição e retorno com proventos não são necessariamente iguais. Conferir `usePerformance`, `performanceCalculations`, datas das cotações usadas na tabela, datas das compras, proventos elegíveis e filtros antes de alterar fórmula. Aceite: mesma base produz mesmo resultado; bases diferentes ficam explicitadas. Não forçar o histórico a igualar a cotação atual.
- [x] **S3-02 / DF48 — Conciliar a rota legada `/patrimonio`.** A rota continua ativa em `src/routes.tsx`; `PatrimonioPage` utiliza histórico e composição a partir dos últimos preços do histórico. A fonte compara R$ 417,00 nessa rota com R$ 390,90 nas telas atuais. Conferir data e universo da composição; alinhar o valor atual ou redirecionar a rota preservando a função útil. Atribuição à mesma causa de outros defeitos é hipótese da fonte, ainda não comprovada.

## Defeitos confirmados por revisão estática

- [x] **S3-03 / DF07 — Percentuais visíveis de Rentabilidade em pt-BR.** `DesempenhoRentabilidade.fmtPct` usa `toFixed`; comparações em pontos percentuais também. Padronizar textos de tela, preservando o formato técnico do CSV.
- [x] **S3-04 / DF58 — Alocação no cabeçalho dos grupos.** `AssetGroupCard` usa `portfolioPct.toFixed(1)`. Usar vírgula decimal; escolher precisão consistente sem alterar o percentual calculado.
- [x] **S3-05 / DF44 — Limite de nome no cadastro.** `signupSchema` só aplica mínimo de três caracteres; `profileSchema` já limita a 120. Alinhar desktop e móvel com perfil e testar limites, sem concluir cadastros reais.
- [x] **S3-06 / DF24 — Erro amigável na redefinição de senha.** `ResetPasswordForm` exibe `error.message` diretamente. Tratar sessão ausente/link inválido com orientação em português e manter solicitação de novo link.
- [x] **S3-07 / DF46 — Erro amigável de conexão na recuperação.** Desktop e móvel permitem mensagem técnica bruta. Tratar falha de rede sem expor detalhes técnicos e permitir nova tentativa.

## Melhorias e funcionalidades pendentes

- [ ] **S3-08 / DF56 — Nome deve conter uma letra.** Já consta como UX-02 da segunda bateria; não duplicar implementação. Melhoria de qualidade cadastral, sem evidência de quebra da autenticação. Aceitar letras Unicode e nomes diversos.
- [ ] **S3-09 / DF49 — Título da aba por página.** Melhoria de navegação/acessibilidade; título genérico não comprova falha financeira ou vulnerabilidade. Confirmar o mecanismo global antes de implementar.
- [ ] **S3-10 / DF12 — Composição por setor.** Já consta como REQ-09 da segunda bateria. Funcionalidade ausente, depende de classificação confiável e setor desconhecido explícito; não é novo erro no cálculo por classe.
- [ ] **S3-11 / DF34 — Adicionar IPCA aos benchmarks.** Lacuna em relação ao requisito citado pelo avaliador. A ausência não comprova erro do CDI/IBOV/IFIX. Adicionar IPCA com periodicidade mensal e somente dados publicados; preservar IFIX. Não interpolar inflação diária como se fosse observada.
- [x] **S3-12 / DF59 — Texto do botão de novo lançamento.** Fonte relata “Salvar alteração” ao criar. Esse texto existe nas três variantes de `AddTransactionModal`; `QuickTransactionModal` já usa “Salvar”. Ajustar o modal de inclusão correspondente, mantendo edição distinta de inclusão. É inconsistência de texto, sem evidência de gravação incorreta.

## Correções anteriores confirmadas pelo avaliador

- [x] Telefone inválido rejeitado (CT125 / DF22).
- [x] Senha só com espaços rejeitada (CT126 / DF45).
- [x] Mostrar/ocultar senha e confirmação (CT127 / DF57).
- [x] Página inexistente e redirecionamento de `/carteira` (CT130 / DF43).
- [x] Patrimônio igual nas quatro telas do menu (CT135 / DF02).
- [x] Campos aceitam decimais e frações (CT138 / DF01): inspeção de campos, não teste de persistência.
- [x] Filtro de posições (CT139 / DF10): exportação CSV não testada.
- [x] Período 5A do ativo (CT140 / DF11).

O relatório também reconhece CDI e IBOV preenchidos (DF55). Não reabrir itens aprovados sem nova reprodução. A lista anterior continua válida para requisitos não cobertos por esta entrega. As descrições abaixo registram a triagem inicial; o estado da implementação está no final deste documento.

## Confronto com as correções de hoje

As fontes foram modificadas no Drive por volta de 13h50 BRT de 04/11. A publicação da PR #105 foi confirmada às 20h03 BRT. Portanto o relatório não comprova o comportamento posterior à última publicação; também não se presume que os apontamentos desapareceram.

| Correção de 04/11 | Relação com a terceira semana | Conclusão |
| --- | --- | --- |
| PR #103: Yahoo prioritário para cotações BR, fallback/rodízio Brapi e preservação do horário real | Pode reduzir preços antigos em DF05/DF48 | Atualização de dados não unifica consultas ou métodos de retorno; manter investigação. |
| PR #104: horários internacionais/cripto e timestamps, macro antes do recálculo da renda fixa | Corrige causas de desatualização e valor de renda fixa | A massa relatada tem somente ITUB4; essas correções de cripto, câmbio e renda fixa não explicam diretamente os três retornos desse ensaio. |
| PR #104: desativação condicionada do catálogo TOT sem uso | Não equivale à posição TOTS3 | Não relacionar ao ITUB4 nem reabrir o incidente apenas por este relatório. |
| PR #105: Tesouro por quantidade real × PU oficial e histórico de preços | Resolve a causa de renda fixa/IPCA para os três lotes configurados da Investidor10 | Outubro da renda fixa verificado sem lacunas com dados de produção; não é correção geral de DF05 nem prova de histórico completo de toda conta. |
| Conciliação do RDB | Principal difere R$ 30 entre plataformas | Usuário confirmou a aplicação de 30/10 como válida no Valora; manter. Não registrar como defeito de cálculo. |

### Rentabilidade: o que a comparação de código mostra

1. Início usa `useDashboard` → `useHistoricalReturns`; o resumo de Desempenho também usa esse cálculo histórico. O gráfico prefere meses fechados quando há pontos anteriores ao mês atual. Retorno histórico não deve ser igualado ao ganho sobre PM só porque existe um único ativo.
2. A tabela por ativo segue outro caminho: `usePerformance` → `useWealthHistory.lastPricesMap` → `computeAssetRows`. Usa último preço de uma consulta própria e soma proventos sobre o custo da posição atual. Não utiliza diretamente a série histórica de retorno do resumo. Assim, a diferença pode envolver método, cobertura de preços ou dividendos, além da atualização do provedor.
3. Há um risco concreto ainda aberto nessa tabela: `dividendRows` multiplica pagamentos públicos pela quantidade atual. Isso não verifica a quantidade na data do evento nem restringe automaticamente aos recebimentos efetivos da carteira. Conferir elegibilidade e importações líquidas, reutilizando o tratamento correto já existente no detalhe; não aplicar proventos anteriores à compra. É uma lacuna do caminho de Desempenho, não motivo para desfazer a correção anterior do detalhe.
4. `/patrimonio` continua montando composição a partir de snapshots de renda variável e de sua própria consulta de preços; não passou a usar o total completo compartilhado com as telas atuais. Além da diferença de cotação relatada, essa composição não inclui a renda fixa do total atual. A PR #105 não migrou essa rota legada.

Prioridade: reproduzir S3-01 com mesma carteira, datas e pagamentos; depois alinhar S3-02. Para os demais dez apontamentos, as correções de mercado/Tesouro de hoje não alteraram os componentes envolvidos: permanecem na triagem acima. Sem nova validação visual de produção e sem alterações de produto nesta comparação.

## Investigação executada — 04/11, após correções de mercado/Tesouro

### Causa reproduzida de DF05 e DF48

`wealthService.listLatestPrices` ordena por ticker e por data **decrescente**. `buildLastPricesMap`, em `wealthCalculations.ts`, pressupõe ordem crescente e percorre a lista do fim para o início. Isso seleciona o preço mais antigo disponível de cada ticker nessa janela de dez dias. `useWealthHistory` entrega esse mapa à tabela por ativo de Desempenho e à composição da rota `/patrimonio`.

Reprodução local executando as funções reais, sem alterar produto ou banco: duas cotações em ordem idêntica à consulta, ITUB4 a R$ 39,09 em 04/11 e R$ 41,70 em 26/10; posição de dez ações a PM R$ 40, sem proventos. O mapa escolheu **41,70**, a composição resultou em **R$ 417,00** e `computeAssetRows` retornou **+4,25%**. Fornecendo o preço mais recente à mesma função, retornou **-2,275%**. Reproduz exatamente os números de DF05/DF48 com massa sintética construída a partir dos valores relatados; não afirma que 26/10 foi a data real do preço original da conta do avaliador.

- [ ] Corrigir seleção de preço para comparar datas explicitamente, independente da ordem de entrada; cobrir consulta em ordem decrescente e múltiplos tickers. Preservar preços válidos e tratamento de ausência.
- [ ] Corrigir proventos da tabela de Desempenho: o código ainda usa quantidade atual para todos os pagamentos públicos. Usar elegibilidade histórica e recebimentos/importações por carteira. Não imputar esse segundo problema ao ensaio ITUB4 sem conhecer seus pagamentos reais.
- [ ] Alinhar a composição de `/patrimonio` ao valuation atual completo (inclusive renda fixa), ou redirecionar preservando funções úteis. Corrigir só a ordenação resolve o exemplo de preço, mas não integra renda fixa a essa rota.
- [ ] Explicar o retorno histórico de **-3,28%** do Início: ainda depende de datas de compra, preços e proventos da massa original. Início utiliza `useHistoricalReturns`; não confundir esse valor com o ganho atual sobre PM. Nenhuma prova de erro desse retorno específico nesta execução.

### Demais defeitos

Confirmados no código: `fmtPct` e p.p. de Desempenho usam ponto; `AssetGroupCard` usa `toFixed(1)`; cadastro não tem limite máximo (execução real de `signupSchema.safeParse` aceitou nome de 300 letras); recuperação desktop/móvel e redefinição permitem `error.message` bruto; `AddTransactionModal` de inclusão usa “Salvar alteração”. Os ajustes são localizados nos componentes/schemas correspondentes, sem alterar fórmulas financeiras, crons ou as correções de hoje. Devem preservar tratamento específico de limites e links inválidos e evitar mensagens técnicas brutas também nos fallbacks.

### Validação e alcance

Suíte direcionada: **63 testes aprovados em quatro arquivos** (`performanceCalculations`, `usePerformance`, `wealthCalculations`, `SignupForm`). O caminho inicialmente informado para teste de `useDividends` não corresponde a arquivo existente e não entrou na contagem. A suíte existente aprovada não detectava o desacordo de ordenação; a reprodução isolada acima demonstra o defeito apesar desses testes verdes. A primeira execução foi impedida pelo sandbox na inicialização do Vite; repetida com acesso autorizado, passou. Não houve novo teste visual em produção nem alteração de posições, lançamentos, cotações ou configurações nesta investigação.

Complemento: executados os caminhos corretos de `useDividends.test.ts` e `incomeHistoryService.test.ts`, **20 testes aprovados**. Total da investigação: **83 testes aprovados em seis arquivos**. Há tratamento histórico e de importações já testado para reutilizar; não é necessário substituir esses cálculos por nova estimativa.

Estado após investigação: S3-01 e S3-02 têm causa de seleção de preço confirmada em reprodução local; o componente histórico -3,28% continua sem causa atribuída. S3-03 a S3-07 e o rótulo S3-12 estão confirmados no código. Implementação das correções ainda pendente.


## Correções implementadas nesta branch

- S3-01: seleção da cotação mais recente por data, independente da ordem retornada. Desempenho agora usa os recebimentos elegíveis/importações da carteira em vez de multiplicar todos os pagamentos públicos pela quantidade atual. Texto explica a diferença entre resultado da posição e retorno histórico. A investigação do -3,28% da massa original continua aberta; não foi alterado o método histórico ou o recorte de meses fechados.
- S3-02: a rota e o gráfico foram preservados; os cards de composição reutilizam o valuation completo de Ativos, sem seus filtros de tela, incluindo renda fixa e disponibilidade de câmbio/cotações. Falhas não exibem um total parcial como completo.
- S3-03/S3-04: percentuais e pontos percentuais visíveis em pt-BR; formato técnico do CSV preservado.
- S3-05: cadastro desktop/móvel reutiliza o limite de 120 caracteres do schema de perfil.
- S3-06/S3-07: mensagens em português para rede, limite de tentativas, sessão/link inválido e senha repetida; fallback público sem mensagem técnica bruta.
- S3-12: as variantes do modal de inclusão exibem “Adicionar lançamento”. Edição de transações não foi alterada.

S3-08 a S3-11 continuam pendentes como melhorias/funcionalidades. Não foram removidos IFIX, rotas, gráficos, campos ou opções para satisfazer os testes. Nenhuma migration, escrita financeira ou alteração nos agendamentos/provedores de hoje é necessária.

Regressão de implementação: 232 testes aprovados em 30 arquivos dos módulos afetados, incluindo seleção de cotação fora de ordem, proventos líquidos, elegibilidade, histórico e composição com renda fixa. TypeScript, lint dos arquivos alterados e build de produção/PWA aprovados. Validação visual autenticada de produção depende de publicação posterior pelo responsável; não foi simulada como concluída.
