# Prioridades — investigação e correções de07/11

## Concluído

- Produção PR111: IPCA2029 consolidado,2 aplicações, principal136,72/saldo158,34/ganho21,63/retorno15,82%. Lotes mantidos.
- Fila automática B3:22/22 com last_success_at e nenhum last_error;134 anúncios. iShares2 fontes sem erro. Não equivale à cobertura integral de todos os emissores.
- Custo médio omitindo despesas confirmado no código e banco. Usuário confirmou custos extras nos lançamentos e autorizou sua inclusão. Migration local20261107221951 e remota via MCP `acquisition_costs_in_average_price` aplicadas; função privada preservada. Compras incluem corretagem+taxa; despesas de venda não alteram custo unitário remanescente. Rebuild restrito a posições existentes com compras contendo custos; transações intactas. Posições de abertura sem razão não são reconstruídas.
- Custo Investidor10 em BRL pela mesma PTAX5,5013:15485,3207927→15493,2473833, acréscimo7,9265906. Somando principal renda fixa3177,1268, investido derivado18670,3741833, arredondado18670,37; I10 anterior18670,43. Restam0,06 após arredondamento (aprox0,05 pela diferença original arredondada). Sem compensação artificial.
- Digests de transações e de id/quantidade/data de posições idênticos antes/depois. Exemplos novos PM:BBAS319,8879;WEGE338,9317;IVV696,8729.
- CDI: período exclusivo do corte, datas únicas/valores válidos, proteção de lacunas/antiguidade>10 dias. Última data econômica gravada em valuation_price_date para estimativa contratual; label de lote distingue índice de preço oficial. Função calc-fixed-income v14 publicada. Recálculo13 posições; seis RDBInvestidor10 referenciam05/11. Data de execução não representa CDI publicado nesse dia. O limiar10 dias não detecta toda ausência isolada; calendário bancário exato ainda pendente.
- Consulta de datas CDI vs Selic no intervalo comum não encontrou datas ausentes; isso não prova calendário integral. Último CDI05/11.
- JPM: fonte oficial confirma ex/record06/10,pagamento31/10,USD1,65. Evento existente Yahoo sem payment_date complementado, sourcejpmorgan_ri/source_url; não criado recebimento pessoal. [RI](https://jpmorganchaseco.gcs-web.com/ir/shareholder-information/dividend-history/). Atualização pontual, não adaptador automático de todos os emissores.

## Pendências delimitadas

- I10 agora exibe TFLO líquido2,20 e JPM0,51 (antes2,03/0,47); a mudança observada impede tratá-los como extrato imutável. Bruto elegível oficial e importação líquida são bases diferentes. Sem inferir retenção/câmbio ou fabricar wallet_income.
- Selic vencimento10/10/2027,quantidade100: sem preço compatível; usuário não reconhece. Consulta confirmou **outro titular**, não o dono da Investidor10. Cadastro preservado; falha global parcial não é falha da carteira do usuário. Sem divulgar identidade nem trocar vencimento.
- Referência CDI no texto dos lotes ainda depende de deploy frontend; backend e banco já publicados. UI de referência genérica da tabela permanece compatível.
- Centavos restantes no custo dependem de precisão dos preços médios e convenção cambial; sem ajuste em massa para igualar cabeçalhoI10.

## Testes

7 testes direcionados CDI/Edge, TypeScript e Deno check aprovados; lint dos arquivos frontend alterados aprovado. PostgreSQL descartável: compras10×10+3 e10×20+2 =>PM15,25; venda parcial com despesas mantémPM15,25; RPC continua sem EXECUTE autenticado. TesteSQL versionado em supabase/tests/acquisition_costs.sql, rollback. Nenhuma fixture persistida em produção.

## Fechamento da rodada na PR112

Tela Desempenho › Proventos passa a separar os totais filtrados de líquidos importados e estimativas brutas, com aviso de imposto/tarifa/câmbio e de que a soma combina bases diferentes. Não substitui o histórico nem aplica retenção presumida. Teste do componente confirma a separação sem alteração dos valores. Rodada direcionada8/8 aprovada.

Critérios não tecnicamente solucionáveis sem dados externos permanecem delimitados: líquido exato JPM/TFLO necessita extrato; centavos restantes necessitam base exata de conversão/precisão do I10. Cadastro de outro titular não será alterado por solicitação desta conta. Estes itens não impedem a entrega das correções e não justificam inventar recebimentos, taxa ou vencimento.

## Pesquisa pública dos créditos JPM e TFLO

Pesquisa solicitada pelo usuário em 07/11/2026. As quantidades da carteira permitem calcular o bruto elegível, mas não comprovam o crédito líquido da corretora:

| Ativo | Pagamento | Distribuição por unidade | Quantidade | Bruto calculado em USD |
| --- | --- | --- | --- | --- |
| JPM | 31/10/2026 | 1,65 | 0,08102 | 0,133683 |
| TFLO | 05/11/2026 | 0,171627 | 3,35616657 | 0,57600879990939 |

Fontes primárias: [declaração do JPMorgan](https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-increased-common-stock-dividend-9-15) e [distribuições do TFLO](https://www.ishares.com/us/products/260652/ishares-treasury-floating-rate-bond-etf). O JPM tem data de registro em 06/10; o TFLO em 02/11.

Uma retenção hipotética de 30%, sem outras despesas, resultaria em USD 0,0935781 para JPM e USD 0,403206159936573 para TFLO, antes do arredondamento da corretora. São cenários, não líquidos confirmados. A [IRS Publication 519](https://www.irs.gov/publications/p519) prevê tratamento específico para interest-related dividends de fundos que façam a designação correspondente. O [relatório QII da iShares de 2025](https://www.ishares.com/us/literature/tax-information/2025-ishares-qualified-interest-income-summary-stamped.pdf) documenta esse mecanismo e orienta conferir a retenção no informe da corretora; não comprova o percentual do pagamento do TFLO de novembro de 2026. A pesquisa não localizou uma designação desse pagamento que permita calcular seu líquido com segurança.

Não foi criado recebimento pessoal nem aplicada retenção presumida. Para encerrar a conciliação são necessários o lançamento da corretora (bruto, imposto, tarifa, moeda e eventual câmbio), inclusive possível ajuste posterior de retenção.

### Precisão residual do custo

Consulta somente de leitura comparou o custo das compras dos ativos ainda mantidos com quantidade vezes preço médio armazenado. Nesta carteira, sem vendas desses ativos, a diferença de arredondamento é BRL 0,0136 mais USD 0,000251144536; pela PTAX 5,5013 equivale a BRL 0,0149816214. Portanto explica cerca de 1,5 centavo, não os aproximadamente 5,6 centavos integrais. O custo calculado diretamente desses lançamentos mais renda fixa seria BRL 18.670,3891649 (18.670,39), ainda cerca de 4 centavos abaixo do cabeçalho observado no I10. Nenhuma compensação artificial foi aplicada.

## Comprovantes Nomad recebidos

Extrato fornecido pelo titular confirma USD como moeda original: TFLO em 06/10 bruto0,54/imposto0,16/líquido0,38; JPM crédito02/11 bruto0,13/imposto0,04/líquido0,09; TFLO05/11 bruto0,58/imposto0,17/líquido0,41. A dúvida sobre líquidos está resolvida; valores arredondados efetivamente creditados prevalecem sobre multiplicação teórica. Não presumir retenções futuras iguais.

Migration support_usd_recorded_income aplicada e TFLO06/10 existente substituído por USD0,38, sem duplicação. Novembro aguarda deploy do frontend desta PR: substituição por evento (ticker/tipo/data de registro ou pagamento) evita duplicar a estimativa JPM31/10 com crédito02/11. Importação parcial Nomad não suprime outros pagamentos no intervalo. Script privado idempotente preparado em output/nomad-income-after-deploy.sql; NÃO executar antes de confirmar o deploy. Não versionar prints nem identificadores pessoais desse script. Doze testes direcionados aprovados e TypeScript aprovado.

## Homologação visual local — 07/11

Servidor Vite reiniciado em 127.0.0.1:5176; sessão real autenticada reconhecida, carteira Investidor10 apenas consultada. Desempenho > Proventos carregou sem erros de console. Filtros TFLO/JPM funcionaram, assim como a separação dos totais importados e estimados. TFLO06/10 aparece uma única vez, R$1,89 na apresentação em BRL; o valor original persistido é USD0,38. JPM31/10 e TFLO05/11 ainda são explicitamente classificados no resumo como estimativas brutas, pois a carga dos líquidos de novembro foi deliberadamente reservada para depois do deploy. A apresentação desses dois créditos reais ainda deve ser conferida após a carga; a substituição de estimativa por evento com data de crédito diferente passou no teste automatizado. Evidência local: output/qa-fontes-oficiais/nomad-proventos-local.png (não versionada).
