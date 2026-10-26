# Correções de prioridade alta — semanas 1 e 2

Branch: `codex/correcoes-altas-semanas-1-2`. A migration 018 e o esquema do banco ficam fora desta alteração por solicitação do usuário.

## Alterações

- Score: limita o resultado final a 0–100. As regras e penalidades continuam sendo somadas antes de aplicar o limite; não altera pesos nem pontuações cadastradas.
- Participação no detalhe do ativo: usa a avaliação da carteira selecionada, ignorando filtros de pesquisa da lista. O denominador inclui outros ativos, conversão USD/BRL e renda fixa. Sem cotação/câmbio completo, não informa um peso parcial como se fosse completo.
- Variação do ativo: compara o preço mais recente com o último fechamento de data anterior, inclusive após fins de semana e feriados. Não utiliza custo de compra como variação diária. Sem base válida, omite a variação. O rótulo indica “no último fechamento” para não atribuir a hoje uma cotação antiga.
- Rentabilidade: Início e Desempenho compartilham o mesmo cálculo sobre a mesma série histórica e o mesmo período. Total usa “Tudo”; 12M usa “1A”; filtro visual do gráfico patrimonial não altera essas métricas. Patrimônio, custo e ganho em reais continuam separados. Preserva a metodologia existente de Desempenho: composição de meses fechados e fallback diário quando não há mês fechado. Não constitui nova metodologia TWR/IRR, nem conciliação de dados de mercado com extrato de corretora.
- Alertas: verificação autenticada ao abrir o app, recuperar foco e a cada minuto com a aba visível. Invalida lista e contador quando há disparo. Não há monitoramento com o app fechado, pois não foi criado cron/migration. A Edge Function aceita NUMERIC textual, informa falhas de leitura/gravação e usa atualização condicional para não duplicar disparos concorrentes. Marcar como lido não dispara novamente para o mesmo dia de cotação; um novo fechamento elegível pode gerar nova notificação.

## Evidências e validação

Os testes cobrem limites/penalidades do score, peso multimoeda com renda fixa, separação entre custo e variação diária, fechamento anterior ausente, retorno total versus 12M, sessão ausente, polling, condição inclusiva de alerta, repetição, falha de gravação e isolamento pelo usuário autenticado.

Validação local final antes da PR: regressão completa com 683 testes aprovados em 79 arquivos. Build web/PWA e ESLint aprovados. Logs completos em `.tmp/testes-pr-altas.txt` e `.tmp/build-pr-altas.txt`.

Consulta somente leitura ao Supabase confirmou ausência de cron para `check-price-targets` e retornou fechamentos de PETR4 em 23 e 26/10. O retorno SQL usa NUMERIC textual, contemplado nos testes. Nenhum dado de conta foi alterado.

A publicação da Edge Function alterada e o reteste autenticado do fluxo completo em produção permanecem necessários. Os testes do handler usam HTTP simulado e não devem ser descritos como disparo real em produção. Não houve deploy nem merge nesta alteração.

## Conferência final antes da PR

Executado `pnpm dev` e conferida a interface local no Brave com sessão existente. A participação de um ativo foi comparada entre lista e detalhe e coincidiu; a variação de PETR4 foi comparada aos fechamentos anterior e atual, separada do custo; o retorno de 12M coincidiu entre Início e Desempenho. Nenhuma posição ou regra da conta foi alterada manualmente.

A conferência identificou saltos mensais atípicos na série de rentabilidade da carteira usada. A causa ainda precisa de investigação com histórico completo, cotações e movimentos. A uniformização entre telas não encerra a precisão financeira dessa série: manter a anomalia aberta em acompanhamento separado. A opção 5A, datas civis e formatação decimal continuam no TODO das demais prioridades.
