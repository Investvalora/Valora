# Revisão das cinco pendências — 17/11/2026

## PR: diagnóstico esclarecido; US$ 0,03 não confirmado

A consulta real da Alpha retornou zero na linha com declaração 21/04, ex/record 30/06 e pagamento 10/07. Não é falha de conversão monetária do Valora. Quatro linhas válidas continuam aproveitadas; a inválida é descartada sem substituir seu valor. O diagnóstico local agora distingue `zero` de `range`, inclusive na auditoria privada, sem registrar valor bruto nem credenciais.

A Marketstack apresenta US$ 0,03 para essas datas. O [10-Q oficial da Permian](https://www.sec.gov/Archives/edgar/data/1658566/000165856626000124/pr-20260930.htm), nota 9, informa US$ 0,16 no trimestre e US$ 0,48 nos nove meses. Não foi localizada evidência oficial que confirme o pagamento adicional de US$ 0,03. A observação continua privada e em retenção; os eventos oficiais de US$ 0,16 permanecem intactos. Não declarar a origem do erro do fornecedor como comprovada.

## SAP: valor final oficial reconferido

Nova consulta ao [histórico do depositário Deutsche Bank](https://adr.db.com/drwebrebrand/api/druniverse/dividend-history/1109) retornou SAP SE, CUSIP 803054204, status Final e bruto US$ 2,940725, pagamento ADR 15/05/2026. Alpha 2,929075 e Marketstack 2,93 continuam evidências divergentes, sem sobrescrever o valor oficial. O líquido do depositário não comprova o recebimento pessoal e não foi importado.

## TIC e cobertura

O [10-K oficial de TIC](https://www.sec.gov/Archives/edgar/data/2032966/000162828026017015/tic-20251231.htm) informa que a companhia não paga nem antecipa dividendos em dinheiro às ações ordinárias. O [10-Q seguinte](https://www.sec.gov/Archives/edgar/data/2032966/000162828026070554/tic-20260930.htm) descreve dividendos das preferenciais pagos em ações ordinárias; isso não é dividendo em dinheiro recebido pelos titulares das ordinárias.

Preparada migration que usa o mecanismo existente de política revisada, com fonte oficial e validade fixa de 17/11 a 17/12. Replay não renova a análise. Nova evidência de dividendo em dinheiro invalida a classificação. Não desativa o ativo nem suas posições. Ainda não aplicada em produção.

Respostas vazias simultâneas de Alpha/Marketstack incluem AMZN, AS, BA, BB, BNC, BRK.B, GO, IT, KN, MX, NU, PERT, SA, TIC e TSLA; Marketstack também ITA e RA. Ausência de calendário sozinha não confirma ausência de dividendos. AMZN já possui política revisada; TIC tem correção preparada. Os demais continuam sujeitos a revisão por emissor e identidade, sem criar calendários fictícios. Divergências e precisão limitada permanecem visíveis como cobertura parcial.

## Filas e cadência

- Runs manuais [44195888178](https://github.com/Investvalora/Valora/actions/runs/44195888178) e [44196608385](https://github.com/Investvalora/Valora/actions/runs/44196608385) aprovadas: respectivamente nove e seis lotes, nenhuma falha ou interrupção por prazo.
- SEC passou de 10 para 2 e depois zero tarefas vencidas; primária também zero no fechamento às 23:09 UTC. Marketstack zero.
- Alpha informa uma tarefa vencida: AMZN, excluída da coleta pela política oficial vigente. Não é bloqueio do rodízio. O contador de health ainda conta essa tarefa, apesar da inelegibilidade; essa limitação fica explícita.
- GitHub tem cron de 15 minutos, porém os runs agendados observados ocorreram às 02:26, 11:03 e 19:45 UTC. Não garantir cadência de 15 minutos. O fallback Supabase está configurado a cada 20 minutos e possui registros de execução.
- O escoamento pontual foi confirmado; estabilidade futura do agendamento e erros de cobertura dos emissores continuam em acompanhamento. Tarefa concluída não significa calendário completo.

## Tesouro: próxima execução automática validada

Cron de 17/11 às 22:30 UTC executou. A resposta real HTTP 200 (requisição 11991) informa 1.130 preços salvos, última referência 16/11, recálculo concluído em 22:30:08, 13 posições atualizadas e lista de erros vazia. A confirmação usa a resposta da função, não apenas o sucesso do agendador. Nenhum recálculo manual adicional foi necessário.

## Validação e preservação

- 42 testes de conectores/auditoria aprovados.
- Migration executada no QA isolado; teste SQL de validade, expiração e invalidação por novo dividendo aprovado com rollback das fixtures. CI inclui a nova bateria.
- Hashes financeiros antes/depois das consultas e runs: transactions `2c719e7834e3874bd0a48b3b8b027276`; positions `8ab31fc81cd171db7f7cce6bf72c4058`; wallet_income `65c15fcfb4457c7eb242c40fe9fdf09c`. Sem alteração nesses registros.
- Branch `codex/close-provider-investigations`. Diagnóstico `zero` e política TIC preparados localmente; publicação/homologação dessas mudanças após PR e merge.
