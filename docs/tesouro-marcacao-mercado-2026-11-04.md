# Tesouro com preços oficiais — 04/11/2026

## Método

Fonte: Tesouro Transparente, conjunto Taxas dos Títulos Ofertados pelo Tesouro Direto.
CSV: https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv
Dicionário: https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/1a8eb2e3-4902-4a38-a1eb-6410f23d90de/download/Taxa.pdf

Usamos PU Base Manhã, definido pela fonte como preço com liquidação D0 para marcar a mercado os títulos existentes. Saldo bruto = quantidade real do título × PU Base. Não é PU Compra nem promessa de preço de execução/resgate. Não desconta impostos e taxas.

Tipo e vencimento são identificadores obrigatórios; quantidade não é inferida pelo aporte. Suporte inicial a IPCA+, Prefixado e Selic sem cupons. Títulos com cupons, Renda+ e Educa+ ficam fora desse caminho. Eventos de resgate parcial/cupons exigem quantidade por evento e não são convertidos por proporção do principal.

Sem quantidade/vencimento continua a estimativa contratual existente. Com marcação configurada, preço ausente não vira saldo igual ao custo nem vira uma estimativa contratual silenciosa. Não usa preços futuros; carrega último preço disponível por até dez dias, exibindo a data. Vencimento e eventos sem quantidade não são inventados.

## Banco e servidor

Migration 20261104223542_treasury_market_prices.sql aplicada: tabela treasury_prices com leitura autenticada/RLS, escrita apenas pelo servidor; campos de quantidade, método e referência de preço nas posições existentes. Importação fixa da fonte oficial, seleção dos vencimentos cadastrados e gravação em lotes. Cron 11h30 e 22h30 UTC em dias úteis (08h30 e 19h30 de Brasília). Recálculo depois da importação bem-sucedida.

sync-treasury-prices v2 publicada. calc-fixed-income v12 publicada. Importação 520: HTTP 200, 850 preços, fonte até 30/10/2026, 365 pontos para IPCA+ 2029 e 485 para Prefixado 2031. Maior intervalo entre preços: cinco dias. Execução 521: 13 posições recalculadas, sem erros.

As quantidades dos três lotes da carteira Investidor10 foram confirmadas pelo usuário e pelos prints: 0,03 em 20/05/2025, custo 102,0009; 0,01 em 23/09/2025, custo 34,7147; 0,14 em 19/11/2024, custo 65,7412. Foram gravadas somente nessas três aplicações, com guardas de carteira, data, principal, vencimento e ausência de eventos. Custos originais preservados.

Saldos oficiais de 30/10: IPCA+ a 3.941,01 por título, lotes 118,2303 e 39,4101; Prefixado a 552,67 por título, saldo 77,3738. Total 235,0142. Não copiar os valores do Investidor10 para forçar igualdade: sua base/horário pode diferir do PU D0 oficial.

## Interface e histórico

Novo lançamento simples preserva quantidade quando informado o vencimento. Cadastro manual permite quantidade opcional. Ativos > Renda fixa > Opções > Ver aplicações permite informar os dados do extrato nos lotes existentes. Tabela identifica mercado versus estimativa e a data de referência.

Gráfico patrimonial e rentabilidade consultam treasury_prices para lotes configurados. Isso remove a dependência de IPCA mensal ainda não publicado para esses títulos. Outros motivos de histórico incompleto continuam sendo mostrados; não foi removido o alerta global.

## Validação e publicação

Testes de parser oficial, preços por quantidade, data/vencimento corretos, recusa de valores futuros/antigos, importação e recálculo, principal preservado e outubro completo sem IPCA. 59 testes aprovados na regressão de renda fixa, lançamentos, agrupamento, totais e rentabilidade. TypeScript, lint dos arquivos alterados e build/PWA aprovados na implementação. Migration testada com rollback, checagem de permissões e ausência de aviso de segurança para a tabela nova.

Servidor e quantidades já aplicados. As mudanças de interface e de cálculo histórico no navegador precisam do merge/deploy do frontend. Não foi possível fazer a conferência visual nesta sessão porque a ferramenta do navegador falhou ao inicializar; não afirmar que o aviso sumiu na interface publicada antes dessa etapa.

## Verificação após merge e deploy

PR 105 confirmada como MERGED em 04/11/2026 às 23h03 UTC (20h03 BRT). Conferência HTTP do site publicado: entry index-B9LiscsW.js contém consulta treasury_prices; chunk AtivosPosicoes-CC5cDoEo.js contém configuração de marcação e referência do preço oficial.

Banco de produção: os três lotes permanecem com valuation_method market, valuation_price_date 30/10/2026 e saldo igual a quantidade × PU Base, a quatro casas decimais: 77,3738; 118,2303; 39,4101. Custos preservados.

Executado o mesmo cálculo histórico do código da PR usando posições, eventos, taxas e 850 preços oficiais lidos de produção. Verificadas 712 datas do Prefixado e 530/404 datas dos lotes IPCA+ (1.646 datas, desde as aplicações até 31/10): zero valores ausentes. Isolando toda a renda fixa da carteira, outubro apresentou incomplete=false e nenhuma issue. Isso valida especificamente a causa de renda fixa/IPCA; não afirma ausência de outras lacunas nos ativos de renda variável ou câmbio.

A ferramenta de navegador falhou novamente ao iniciar, inclusive após reset. Portanto a validação técnica dos dados, cálculo e arquivos publicados está concluída; o desaparecimento visual do aviso na sessão autenticada ainda não foi observado diretamente. Fixtures de produção ficaram somente em output, fora do Git.
