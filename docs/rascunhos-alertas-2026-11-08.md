# Continuação das pendências técnicas — 08/11/2026

## Implementação local

- Rascunho em sessão nos dois formulários de alerta de preço (detalhe/análise e folha de alertas).
- Rascunho na criação e edição de regras de indicadores/proventos.
- Compartilhamento da persistência e do aviso, sem alterar a estrutura visual dos formulários existentes.
- Escopo por conta/contexto; edição de regra também separada pelo snapshot original. Contextos de criação de preço por ativo permanecem separados.
- Restauração explícita. Não cria alertas, não ativa regras e não busca cotação automaticamente ao restaurar. Nas regras, é necessário selecionar o ativo novamente para validar a classe.
- Cancelamento, fechamento explícito, descarte e sucesso limpam o rascunho. Recarregar/desmontar preserva o preenchimento por até oito horas na sessão da aba. Voltar aos valores originais remove o rascunho alterado.
- Falha no armazenamento mostra orientação; não bloqueia preenchimento/envio normal. Não é backup nem gravação offline.

## Validação

Regressão de alertas/armazenamento: 88 testes em 18 arquivos aprovados. Regressão de sessão e catálogo de indicadores também aprovada. Build/PWA aprovado. Testes incluem restauração sem envio, ausência de consulta inicial ao restaurar preço, cancelamento, indisponibilidade do armazenamento e isolamento de contexto. Conferência autenticada local em Análise > Alertas: preço-alvo 42,5 e regra PETR4 com referência 8,5 recuperados após recarregar; cancelados sem salvar. Regra também conferida em 390 px. Evidências locais não versionadas: `output/qa-rascunhos-alertas/`.

Não houve criação/edição de alertas, regras ou lançamentos no banco. Não houve recálculo ou modificação da carteira Investidor10.

Conferência final da folha `/alertas` em 390 px: preencher PETR4/preço-alvo 42,5, recarregar e reabrir ofereceu restauração; o valor voltou corretamente. Cancelar removeu o rascunho, confirmado em nova abertura. Evidência: `folha-mobile-restaurada.png`. A rodada conclui a homologação local do escopo desta entrega; não substitui o reteste em produção ou em aparelho físico.

## Estado das demais técnicas

- RP-05 fechado: importação entregue e homologada na PR114; checkbox atualizado para refletir as evidências existentes.
- PR116: edição de lançamentos publicada e homologada; texto antigo de entrega local corrigido.
- RP-06 continua parcial: outros formulários, como lançamento pelo detalhe e edição do conteúdo de alertas, ainda precisam de análise própria. Esta rodada não altera autenticação, logos, cálculos ou limites de indicadores.
- RP-04: contrato compartilhado já entregue. Limites personalizados antigos, sobretudo Dívida/PL, dependem da intenção do titular; não converter automaticamente 1,5 em 150.
- RP-07: build de referência continua em aproximadamente 737 kB de entrada sem compressão, 219 kB gzip. A medição real de CPU/rede e instalação em aparelho físico permanece pendente; teste funcional móvel não é medição de desempenho.
- RP-09: testes simulados de revogação/rede/identidade aprovados, sem revogar sessões reais. Reteste completo entre abas/dispositivos permanece separado.
- CDI/calendários/fontes de proventos: não foram modificados nesta rodada; exigem investigação própria e fontes verificadas. Não marcar como encerrados.

Publicação e homologação em produção desta continuação ainda pendentes.
