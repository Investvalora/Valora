# Recuperação limitada das filas internacionais — 13/11/2026

## Diagnóstico

Consulta ao GitHub em 13/11: últimos disparos `schedule` às 00h11, 06h55 e 15h17 UTC; a configuração continua em quatro disparos por hora. Execuções manuais e de PR não comprovam frequência automática. O GitHub documenta que disparos agendados podem atrasar ou ser descartados: https://docs.github.com/en/actions/how-tos/troubleshoot-workflows.

Snapshot de produção às 19h32 UTC: fila primária com 27 tarefas vencidas de 47; SEC com 36 de 47, sem erros. Alpha consumiu 20/20 consultas diárias; Marketstack 14/16 globais. O diagnóstico de chaves é uma fotografia anterior à reserva HTTP e não comprova sozinho saldo disponível posterior.

## Correção local

O runner alterna até três lotes da fila primária e três SEC. Cada lote conserva o claim e a lease existentes: até dois ativos primários e um SEC. Assim, uma execução pode consultar até seis ativos primários e três SEC, quando houver tarefas elegíveis e tempo disponível.

Fila vazia ou falha interrompe somente a fila correspondente. Não há repetição local de uma fonte que falhou. O limite de 120 segundos é verificado **entre lotes**; um lote em andamento termina normalmente e pode ultrapassar essa janela. O timeout de cinco minutos do workflow continua como teto externo. Lotes são registrados imediatamente para preservar o diagnóstico mesmo diante de interrupção posterior.

Alpha Vantage e Marketstack permanecem fora desse laço, com uma chamada ao modo `providers` por execução e todos os limites/bloqueios existentes no banco. Nada muda nos cálculos, lançamentos, posições ou recebimentos pessoais. Sem migration ou deploy de Edge Function.

## Validação

- 217 testes de proventos em 26 arquivos aprovados na homologação local.
- Integração com os coletores reais e transporte HTTP simulado: seis ativos primários e três SEC, nove leases distintas consumidas uma única vez, nenhuma lease pendente, tarefas excedentes preservadas e nenhuma chamada a fornecedores pagos.
- Novos cenários: limite por fila, alternância, fila vazia, falha de fonte, exceção sem vazamento de corpo remoto, deadline e resultado malformado.
- TypeScript e lint dos arquivos alterados aprovados.
- Build completo aprovado; PWA gerado com 131 arquivos em cache (`valora-static-9fdd1f631339`). Rollup removeu comentários de anotação da dependência Zod, sem impedir a compilação.
- Consulta de saúde em produção somente leitura; a nova rotina ainda não foi publicada ou executada contra produção.

## Pendências que não devem ser encerradas por esta mudança

- Comprovar escoamento real após merge, especialmente primeira passagem SEC. A correção não garante que o GitHub entregará todos os disparos.
- Nova resposta HTTP Alpha/CR após liberação de cota, prevista para 14/11 00h UTC (13/11 21h Brasília). Replay anterior não substitui essa consulta.
- Cobertura parcial/precisão de fornecedores continua explícita; não converter ausência de calendário em prova de ausência de dividendos nem arredondar valores primários para aceitar o fornecedor.
- Tesouro: último diagnóstico automático disponível é sucesso em 12/11 23h UTC, 13 posições atualizadas e zero erros. Próxima execução de 13/11 ainda não havia ocorrido nesta auditoria.
