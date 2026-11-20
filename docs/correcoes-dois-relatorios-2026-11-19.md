# Correções dos dois relatórios da quinta semana

Fontes: relatório de 19/11/2026 (23 cenários) e quinta bateria dos avaliadores. Conteúdo de documentos foi tratado como evidência, não como autorização para acessar contas. Credenciais presentes no relatório não foram utilizadas nem copiadas.

| Achado | Ajuste local |
| --- | --- |
| V5-D01 / V4-D01: Top pagadores repete ticker | Soma por ticker antes de ordenar e limitar; inclui tipos tributáveis na mesma base BRL já apresentada pela lista. Caso BBSE3: 22,95 + 17,85 + 0,40 = 41,20. |
| V5-D02 / V4-D02: legenda mostra Outros | Recharts já fornece o nome formatado da série à legenda; preservar esse nome em vez de tratá-lo novamente como chave de classe. |
| V5-D03: ajuda sai do card estreito | Cabeçalho permite quebra e reserva largura legível para o título; botão permanece dentro do card. |
| Bateria, defeito 01: faltam pausa/exclusão de alertas de preço | Controles compartilhados no detalhe do ativo, análise e tela de alertas. Pausa separada de Ignorar; exclusão exige confirmação e filtra conta, ID e tipo. Monitor SQL e Edge excluem pausados, inclusive na atualização concorrente. |
| Bateria, defeito 02: e-mail não chega | Fora do escopo por orientação explícita do responsável, incluindo a investigação do serviço de envio. |

## Validação e publicação

126 testes direcionados aprovados. Banco QA: pausa não dispara nem inicia retenção, retomada volta a disparar e outra conta não pode retomar/excluir; exclusão pelo dono aprovada. Dados de teste revertidos. Build aprovado. Componentes reais de KPI e gráfico conferidos em página QA com largura de 319 px; botão contido e nomes de classes distintos.

Aplicar a migration de lifecycle e publicar a Edge `check-price-targets` antes do frontend que seleciona `paused`. Não aplicada em produção. Não foram criados, pausados ou excluídos alertas de usuários reais.
