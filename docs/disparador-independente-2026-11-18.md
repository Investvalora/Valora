# Disparador independente — 18/11/2026

O Supabase passa a oferecer um relógio independente para solicitar o workflow
`international-announcements.yml` na `main`, com `probe_only=false`.
O executor continua no GitHub: aceitar um dispatch não comprova conclusão da coleta.

## Validação

- Migration aprovada no banco QA isolado `supabase_db_valora-provider-qa`:
  reserva única por intervalo de 15 minutos, resultado imutável após finalização,
  tabela e funções sem acesso de anon/authenticated. Cron do QA desativado.
- 24 testes em três arquivos aprovados (disparador, enriquecimento de posições e catálogo).
- Migration aplicada em produção e Edge Function `dispatch-international-collector`
  publicada na versão 1. Autorização interna conferida pela própria função.
- Chamada controlada `net` 13050, em 18/11 às 16:35 de Brasília:
  função respondeu 503 e registrou `rejected`, HTTP 403 do GitHub.
  Isso comprova que o secret foi encontrado, mas não que tenha permissões suficientes.
  Nenhuma execução nova foi criada por essa chamada.
- Agendamento `international-independent-dispatch` pausado após a recusa.
  Os agendamentos e o fallback anteriores foram preservados.

## Pendência para ativação

Conferir o token fine-grained: proprietário dos recursos Investvalora,
repositório Valora, permissão Actions Read and write e aprovação da organização
quando exigida. HTTP 403 isolado não distingue permissão insuficiente, política
da organização e outras restrições do GitHub.

Após ajuste, repetir uma chamada em novo intervalo, comprovar HTTP 204 e a
execução correspondente no GitHub. Só então reativar o cron
`4,19,34,49 * * * *` e acompanhar execução automática e conclusão do coletor.
Não registrar valores de tokens em arquivos, logs ou mensagens.

Esta homologação não encerra os testes físicos de worker antigo e desempenho,
nem as pendências de cobertura e conciliação de recebimentos.

## Reteste após correção da permissão — 16h45 de Brasília

- Responsável corrigiu a permissão de Administration para Actions Read and write.
- Chamada 13060 aceita: HTTP 204 do GitHub e auditoria `accepted` no intervalo
  19:45 UTC, preservando a recusa anterior.
- Workflow [44383559144](https://github.com/Investvalora/Valora/actions/runs/44383559144)
  concluído com sucesso às 16h45:47 de Brasília; duas verificações de lotes
  públicos, nenhuma falha fatal e nenhuma pendência vencida nas filas públicas.
- O diagnóstico dos fornecedores permanece parcial, com lacunas de cobertura;
  sucesso do workflow não significa cobertura completa de proventos.
- Cron reativado após sucesso, nos minutos 4, 19, 34 e 49 de cada hora.
  O relógio é independente do cron do GitHub, mas a execução ainda depende dos
  runners e da disponibilidade do GitHub.
- Nova chamada 13061 no mesmo intervalo usada para retestar a deduplicação.
  Acompanhamento da primeira execução automática permanece separado do disparo manual.
