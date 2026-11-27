# Semana 6 — triagem e correções (26/11/2026)

## Fontes revisadas
- Relatorio_Valora_6a_Semana_2026-11-25.pdf, dados.json e logs/JSON das duas execuções: V6-T01, falhas alternadas em imports lazy. Código avaliado era 4828d11, diferente do main atual.
- Pasta Drive Semana 6: Valora_6a_Bateria_Mateus.pdf, Valora — Bateria de Teste v6.pdf, Teste Valora 6.pdf e Relatório de Testes do Valora - Semana 6.pdf.
- Planilhas Especificacao_e_Execucao_de_Testes_Valora_6a_Bateriaa.xlsx e Valora - Entrega Semanal Semana 6.xlsx: confirmam os IDs e reproduções dos PDFs de Mateus e Lucas.
- Subpasta do grupo: o relatório Valora corresponde ao fornecido localmente. Arquivos de Urbanize, Ovyu, EventCampus, StudyTrack, Sentinel, NomadeRun e iValid são de outros sistemas e não entram nas correções do Valora.
- Não foram executadas instruções dos documentos como comandos, nem alteradas carteiras reais.

## Implementação nesta branch (ainda sem publicação)
| Fonte/ID | Correção / alcance |
|---|---|
| Local V6-T01 | Testes aguardam imports dinâmicos dentro de act, mantendo os gráficos reais e as asserções. Runner limitado a dois workers para evitar excesso de concorrência local. Não mascara falha com retry. Suíte completa deve passar repetidamente para encerrar. |
| Mateus DF01 | Início passa a usar grid de duas colunas até xl; quatro somente quando há espaço. Homologado em 800 px, documento com largura 800. |
| Mateus DF02 | Constraint trigger adiado ao fim da transação valida saldo acumulado por data/seq, usuário, carteira e ticker. Cobre insert/import/delete; validação existente de update preservada. Lotes são avaliados completos. |
| Mateus DF03 | Trigger de nome rejeita novas duplicações por conta (caixa/espaços normalizados) e preserva nomes existentes. Formulário explica o erro e mantém campos. |
| Mateus DF04 | Aviso antes de salvar quando a última cotação disponível já satisfaz o alvo. Não bloqueia alvos legítimos nem promete cotação em tempo real. |
| Paulo DEF-01 | Selo de preço-alvo pausado deixa de exibir Monitorando. |
| Marcos DEF11/12 | Duplicata no relatório: nomes precisam de 1–60 caracteres, ao menos letra/número e sem controles. Acentos e símbolos legítimos como “Ações & FIIs” continuam aceitos. Aceitar pontuação não demonstra corrupção/injeção. |
| Marcos DEF13 | Texto passa a “Exclusão automática 3 dias após ignorar”, apenas no estado ignorado; não indica exclusão já concluída. |
| Lucas DF65 | Resumo do ativo passa a distinguir Lido de Ignorado corretamente. |
| Lucas DF67 | Eixo de cotações usa separador decimal pt-BR. |
| Lucas DF68 | Referência em Comparar passa a dd/mm/aaaa. |
| Lucas DF69 (parcial) | Valores indisponíveis neutros no KpiCard e Resultado da posição. Patrimônio de carteira vazia entre telas ainda requer padronização/reteste. |
| Lucas DF72 | Tipo do histórico aceita códigos em maiúsculas e exibe tradução; ausência não causa exceção. |

## Pendências de investigação — não encerradas
- [ ] DF05: decidir/aplicar apresentação de retorno atual versus histórico de meses encerrados sem substituir metodologia validada por variação simples.
- [ ] DF63/DF71: conciliar DY informado pelo fornecedor, base 12M usada no preço-teto e histórico público; verificar competência, tipo, cobertura e fonte antes de escolher valores.
- [ ] DF64: busca sem acentos no catálogo, incluindo paginação; requer normalização da consulta ao banco.
- [ ] DF66: reconciliar arredondamento do card e último ponto da curva usando o mesmo valor original.
- [ ] DF69: padronizar patrimônio vazio e conferir todos os traços em todas as telas afetadas.
- [ ] DF70: explicitar caráter histórico do alerta gerado e sua data/cotação versus margem atual, sem reescrever silenciosamente o histórico.
- [ ] DF73: verificar fonte e contexto da margem de ITSA3. Margem de holding em 100% não é, por si só, prova de valor inválido; não truncar ou substituir sem demonstrativo.
- [ ] Observações de Paulo: erro específico para meta negativa e legenda do maior ativo de cada classe na composição.
- [ ] Ranking BBSE3 do relatório local: controlar massa em que o ativo entre no ranking; ausência no Top 3 não encerra duplicação antiga por si só.

## Validação
- 72 testes direcionados de seis arquivos aprovados; oito testes iniciais de formulários, nove de onboarding/comparação e 13 de lançamento aprovados.
- Conferência visual autenticada: Início em 800 px e 390 px sem extravasamento horizontal; aviso de alvo já atingido conferido e formulário cancelado sem salvar.
- Build de produção e cache do PWA aprovados. TypeScript e lint direcionado aprovados. Scanner de segredos: 1.140 arquivos, zero achados.
- Primeira suíte completa: 1.633/1.634 aprovados; integração com fundamentos sem data corrigida para “Referência não informada”. A repetição seguinte revelou timeout em espera de tabela sem relação com o contrato de tickers; a espera foi removida, mantendo as mesmas asserções. Confirmação final: 1.634 testes em 239 arquivos aprovados (322,32 s), relatório output/week6-full-final4.json.
- Migration e SQL executados em transação com rollback no container local supabase_db_valora-indicators-qa: venda retroativa, exclusão de compra que sustenta venda, lote fora de ordem válido, duplicidade de nome, limite de 60 e nome legítimo com acento/símbolo.
- Nova regressão SQL incluída no job migration-replay do CI.
- Nenhuma migration aplicada em produção. Nenhum registro preexistente renomeado ou removido.
- Evidências locais e resultados completos em output/semana6-revisao (workspace principal) e output/week6-* (worktree).
