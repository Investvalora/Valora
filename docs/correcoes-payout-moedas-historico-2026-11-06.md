# Payout, moedas e diagnóstico de histórico

Implementação na branch `codex/payout-moedas-homologacao`, a partir da main com a PR #108. Datas de execução de 06/11 BRT avançam para 07/11 em UTC. A interface desta entrega ainda depende do merge/deploy pelo responsável.

## Payout

O cálculo anterior dividia os recebimentos pessoais pela quantidade atual e pelo LPA. Isso fazia compras, vendas, retenções e importações alterarem um indicador da empresa. Agora a coluna usa exclusivamente o payout informado pelo Yahoo (`summaryDetail.payoutRatio × 100`), com LPA trailing positivo e finito no mesmo payload. Não calcula por DY × P/L nem mistura períodos por inferência. Só exibe para ações/BDRs, com fonte Yahoo; ausência, fundos, fonte diferente e lucro não positivo ficam indisponíveis. Payout acima de 100% é permitido. A regra de score ainda não recebeu payout.

- Migration aditiva `20261107013406_fundamental_payout_ratio.sql` aplicada no Supabase. Coluna nullable, restrição contra valores negativos/não finitos; RLS e grants preservados.
- `sync-yahoo-fundamentals` v13 publicada, com autenticação de serviço preservada. Teste pontual de ingestão PETR4/AAPL gravou respectivamente 28,5% e 11,8%, fonte Yahoo, referência UTC 07/11. Não são valores fixos de teste nem promessa de cobertura de todos os ativos. Outros registros são preenchidos pelo sync habitual; não há preenchimento inventado.
- A seleção da coluna no frontend exige a migration antes do deploy; esse pré-requisito já foi atendido neste projeto.

## Moedas de proventos e YOC

Totais e gráficos em BRL convertem USD pela PTAX venda da data do pagamento, usando a última publicação anterior de até dez dias. Não usam a cotação atual ou futura para recebimentos históricos. Anúncios futuros continuam na moeda original, separados dos recebimentos pagos. Imports legados identificados como recebimentos importados sem moeda permanecem em BRL, conforme o contrato de importação existente; moeda desconhecida nos demais registros é indisponível.

O valor original continua intacto no banco. O adaptador de exibição mantém moeda, total, bruto e valor por cota originais; converte cada base independentemente, sem reconstruir bruto a partir do líquido. O líquido importado permanece autoritativo. Se faltar um câmbio necessário, o total não é mostrado como uma soma parcial ou zero.

YOC mantém a convenção do app: recebimentos dos últimos 12 meses / custo da posição atual, na moeda do custo. Compras/vendas podem mudar esse denominador; não é uma projeção do dividendo anual da empresa. A tabela de rentabilidade por ativo também mantém recebimentos em BRL para exibição, mas converte para a moeda do custo ao calcular o percentual. Detalhe do ativo mostra recebimentos na moeda indicada por sua tela. Rendimento histórico diário continua consumindo os recebimentos originais, evitando dupla conversão.

Cobertura: dashboard, análise/proventos, telas pagas de proventos, posições/composição/lançamentos, carteira, detalhe e tabela de rentabilidade por ativo. Testes cobrem BRL/USD mistos, importação líquida, quantidades diferentes, ausência de FX, data futura, cotação vencida e nenhuma chamada de câmbio quando tudo está em BRL.

## Histórico incompleto

O diagnóstico identifica título, aplicação, ID do lote, causa e intervalos de datas realmente afetadas. Distingue cadastro sem taxa/indexador, inativo sem resgate, série CDI/IPCA insuficiente, preço oficial de Tesouro ausente/vencido e eventos de Tesouro cuja quantidade ainda não é suportada. O aviso oferece acesso aos lançamentos/eventos, recarregamento e orientação de conferência com extrato. Recarregar não promete obter dados ausentes no provedor.

Meses encerrados, lacunas, invalidação do acumulado e reinício dos trechos foram preservados. Não foram criados movimentos, taxas ou preços para ocultar o aviso. A leitura dos lotes da conta de homologação encontrou taxas cadastradas e resgate do CDB com evento; a visualização observada do período da Investidor10 não apresentava o aviso genérico. Isso não comprova cobertura de todas as datas e carteiras.

## Validação e limites

Build de produção/PWA e TypeScript passaram; lint das áreas alteradas sem erros; scanner sem achados em arquivos rastreados. Regressão completa: **1.019 testes, 148 arquivos**, todos aprovados. O teste direcionado de recarregamento também garante que não há chamada de câmbio com datas vazias quando só existem valores em BRL. A mensagem de import dinâmico no teste `CompositionCard` é provocada intencionalmente pelo cenário de recuperação, não um erro confirmado do app publicado.

Homologação da entrega anterior está em [validação da PR #108](validacao-producao-pr108.md). Esta nova interface precisa de reteste após seu próprio deploy. A carteira Investidor10 não recebeu alterações de posições, lançamentos, renda fixa ou recebimentos. O único dado de conta criado para o ensaio foi a regra/aviso temporários autorizados; fontes públicas de fundamentos foram atualizadas pontualmente.
