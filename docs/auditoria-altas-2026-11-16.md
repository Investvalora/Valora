# Verificação de todas as prioridades altas — 16/11, 15h37 Brasília

## Filas públicas: atraso atual eliminado

Três execuções limitadas autorizadas na main mesclada, todas aprovadas, sem reordenar tarefas ou alterar cotas:

- [43929919929](https://github.com/Investvalora/Valora/actions/runs/43929919929): dez lotes, zero falhas; primária 2 → 0, SEC 23 → 15.
- [43930347506](https://github.com/Investvalora/Valora/actions/runs/43930347506): SEC 15 → 7.
- [43930568448](https://github.com/Investvalora/Valora/actions/runs/43930568448): nove lotes, zero falhas; SEC 7 → 0.

Consulta final: zero tarefas vencidas na primária e SEC; zero leases ativas nos fornecedores. Isso comprova escoamento do atraso atual, não garante pontualidade futura do GitHub nem cobertura integral.

Hashes financeiros finais iguais aos da PR165: transações `2c719e7834e3874bd0a48b3b8b027276`; posições `8ab31fc81cd171db7f7cce6bf72c4058`; recebimentos `65c15fcfb4457c7eb242c40fe9fdf09c`. Não houve correção financeira ou gravação de recebimento.

## ITA: bases históricas diferentes, com diferença adicional de precisão

[Produto oficial iShares](https://www.ishares.com/us/products/239502/ishares-us-aerospace-defense-etf) mostra distribuições ajustadas ao split em 05/11/2026. Para setembro/junho/março, 0,083507 / 0,054527 / 0,050442. Alpha observou 0,25052 / 0,16358 / 0,151325, compatíveis com arredondamento após divisão por três; Yahoo guarda 0,083667 / 0,054667 / 0,050333, que não coincidem com os valores oficiais ajustados.

Confirmado: não é seguro simplesmente aceitar Yahoo nem multiplicar os valores oficiais arredondados por três para reconstruir o bruto original. Próxima correção deve explicitar a base e data de ajuste, obter bruto exato e conferir a quantidade histórica antes de conciliar. Nenhum valor, quantidade ou recebimento alterado.

## SAP: taxa final do depositário difere da observação inicial

Foi localizada e consultada a [API pública do próprio Deutsche Bank](https://adr.db.com/drwebrebrand/api/druniverse/dividend-history/1109), referenciada pelo JavaScript público da [página SAP](https://adr.db.com/drwebrebrand/dr-universe/dr_details.html?identifier=1109). Registro SAP SE / CUSIP 803054204, `Final`, record 05/05/2026 e pagamento 15/05/2026: grossRate 2,940725; taxRate 0,775616; feeRate 0,03; netRate 2,135109. A aritmética gross menos imposto e tarifa coincide com net. O objeto do histórico não traz campo de moeda nem ex; manter a identidade do programa e a evidência independente de ex na futura conciliação.

Alpha 2,929075, Yahoo 2,929 e Marketstack 2,93 não correspondem à taxa final consultada. Isso exige revisão primária de valor, não apenas tolerância de arredondamento. Não transportar a retenção/tarifa geral para recebimentos pessoais. O endpoint público de busca de eventos por POST retornou 403; não houve tentativa de contornar esse bloqueio. O histórico GET funcionou sem autenticação.

## MRX: declaração continua sem prova conclusiva

[Release arquivado na SEC](https://www.sec.gov/Archives/edgar/data/1997464/000199746426000075/q32026earningsrelease.htm) publicado em 05/11 confirma 0,16 USD, record 16/11 e pagamento 02/12. Não menciona deliberação em 03/11. O [calendário RI](https://www.marex.com/investors/dividends) acessível está desatualizado e só mostra até maio/2026. Assim, 05/11 é anúncio comprovado; não prova que a deliberação em 03/11 informada pela Alpha esteja errada. Preservar ambas; próxima implementação deve separar data do anúncio da deliberação ou registrar a divergência de metadados sem inventar uma decisão.

## PR: duas questões separadas

- Alpha: `provider_invalid_amount`, última consulta 16/11 às 02:31 UTC. Orçamento diário configurado atingido: 20 chamadas, zero restante. As três execuções não consultaram Alpha; não são reteste PR. Próxima elegibilidade atual da tarefa: 19/11 às 02:31 UTC. Não foi alterada nem houve bypass da cota.
- Marketstack: há snapshot ex/record 30/06, pagamento 10/07, 0,03 USD, declaração 21/04, enquanto o [filing do próprio emissor](https://s3.amazonaws.com/sec.irpass.cc/2754/0001658566-26-000069.pdf) anuncia dividendo base de 0,16 em maio. A linha precisa de verificação de identidade/classificação e do calendário exato; não atribuir automaticamente os 0,03 a uma parcela do evento base.

Continua necessário inspecionar uma nova resposta Alpha com diagnóstico sanitizado, dentro da cota, e consultar o comunicado completo de PR para conciliar o evento. Não há resposta bruta antiga armazenada no diagnóstico atual.

## Conclusão

Todos os itens altos foram verificados até o limite das evidências disponíveis. Atraso atual das filas encerrado; cadência futura permanece em acompanhamento. ITA/SAP têm divergências materiais identificadas, MRX exige distinção de datas, PR exige nova evidência e orçamento. Nenhum desses quatro foi marcado como corrigido nesta auditoria; não houve nova implementação ou migration.
