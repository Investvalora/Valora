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
