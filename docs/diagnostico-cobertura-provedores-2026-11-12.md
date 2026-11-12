# Diagnóstico de cobertura — 12/11/2026

## Correção local preparada

Branch codex/precisao-cobertura-proventos. Parser aceita até oito casas, verifica se a conversão para Number preserva o decimal informado e rejeita zero com provider_invalid_amount (não erro de calendário). Migration 20261112200950_dividend_provider_precision amplia somente as observações privadas para numeric(20,8) e ajusta a validação da RPC. Não reescreve proventos públicos ou recebimentos pessoais.

Calendário ausente continua em last_error da tarefa e não atualiza last_success_at. Workflow deixa de tratá-lo como falha técnica; auditoria registra status partial e coverage_gaps com fornecedor/ticker. Valores inválidos, identidade incompatível, conflitos, transporte e rejeições permanecem falhas. O resultado de conflito da RPC agora também é propagado ao coletor e à auditoria; antes era ignorado.

Validação local: 32 testes direcionados aprovados, TypeScript aprovado, lint dos arquivos abrangidos sem erros (Edge excluído pelo lint do projeto). Scanner:893 arquivos versionados, zero achados. Banco Supabase novo e isolado valora-provider-qa aplicou a cadeia completa até20261112200950; passaram 040_migration_replay_test.sql, dividend_provider_fallbacks.sql (incluindo precisão/rejeição de arredondamento), marketstack_key_rotation.sql e queue_health_and_jobs.sql. O banco local anterior tem objetos sem histórico correspondente, portanto não foi resetado para testar.

Migration e Edge não publicados. Aplicar migration antes de publicar parser/Edge. Cobertura universal e precisão dos dados arredondados da Marketstack não são prometidas. Zero continua rejeitado; conflitos continuam fatais, sem importar valores para fazer o workflow ficar verde.

Auditoria de produção e consultas de leitura aos fornecedores; nenhuma alteração de eventos, recebimentos ou posições.

## Causas confirmadas

- Alpha Vantage/PRT: resposta real DIVIDENDS contém 0.0196242 para ex 30/09/2026, com declaração 18/09 e pagamento 15/10. O parser aceita no máximo seis casas e rejeita o lote inteiro com provider_invalid_amount. Outros onze eventos do intervalo têm até seis casas. A tabela dividend_provider_events também usa numeric(18,6): ampliar somente o regex causaria arredondamento na persistência. Correção deve abranger contratos, armazenamento e testes de precisão antes de importar.
- Marketstack/PRT: fonte arredonda valores para centavos, inclusive 0 nas distribuições de abril/maio. Em outubro retorna 0,02 onde Alpha informa 0,016204. O parser rejeita zero e o lote com provider_invalid_calendar; não é evidência de data incorreta. Não aceitar zero nem usar o arredondado para substituir o valor preciso. Melhorar diagnóstico e tratar validade por evento com cobertura parcial explícita é trabalho restante.
- META: fontes alternativas retornam 0,53 versus 0,525 na base e no RI oficial. A proteção contra conflito está correta; não relaxar tolerância para eliminar o alerta.
- Marketstack/AMZN: último processamento reportou provider_calendar_unavailable. Ausência de calendário completo na fonte não comprova defeito de cálculo ou pagamento devido. Manter indisponibilidade explícita.

## Operação às 16h50 Brasília

47 tarefas por fila. Vencidas: principal 35, SEC 42, Marketstack 39, Alpha 39. Erros: 14/0/3/2 respectivamente. Última execução independente de fornecedores às 16h11, concluída com sucesso. Houve avanço desde os 43 pendentes dos fornecedores, mas as filas não estão escoadas.

GitHub schedule às 16h05 executou; falhou por erros dos fornecedores, com auditoria persistida. Isso prova disparo automático, não cadência sustentada de quinze minutos. Não usar execuções manuais como substituto dessa evidência.

Log confirmado: execução 43286571542, International announcements #20. Checkout/setup passaram; collect terminou com exit code1 porque scripts/collect-international-announcements.mjs trata tanto provider_invalid_amount (Alpha/PRT) quanto provider_calendar_unavailable (Marketstack/AMZN) como falha fatal do job. Nasdaq/GGG e GO foram classificados como unsupported, failed0; SEC/BA terminou failed0. Portanto a falha não foi instalação, autenticação GitHub ou regressão de build. A auditoria foi salva (audit_saved:true). Separar indisponibilidade esperada de cobertura e dado inválido deve preservar diagnóstico/alertas, sem tornar o job verde escondendo perdas.

Reconsulta: 39 tarefas nunca tentadas em cada fornecedor; nunca tiveram sucesso 42 na Marketstack e 41 na Alpha. Ainda é a primeira passagem. A função publicada permite Alpha 20 consultas/dia para 47 ativos e reagenda após 24h; portanto fila de vencidos zerada diariamente não é critério alcançável nessa configuração. Marketstack permite 16/dia e intervalo de sete dias. A ordenação prioriza posições antes da idade: avaliar proteção contra inanição dos demais ativos. Acompanhar idade máxima e primeira passagem, não somente contagem de vencidos. Ajuste de frequência/intervalo deve respeitar orçamento, sem aumentar chamadas indiscriminadamente.

Macro anterior às 12h59: 13 atualizações, uma falha do cadastro Selic depois desativado.

**Execução automática conferida às 17h00:** registro sync-macro-rates iniciado 20:00:01 UTC, terminado 20:00:04 UTC, status success, updated 13, errors e calculation_errors vazios. Séries gravadas: CDI 500, Selic 500, IPCA 24. Nenhum disparo manual nesta rodada. Confirma o caminho agendado e a ausência da falha do cadastro desativado; não afirma que todos os dias futuros ou todas as lacunas históricas estão resolvidos.

## Próxima correção proposta

1. Preservar pelo menos a precisão observada de PRT em toda a cadeia, sem arredondamento implícito no banco.
2. Separar rejeição de valor, calendário ausente e conflito; permitir aproveitamento de eventos válidos apenas com diagnóstico durável dos rejeitados e sem declarar cobertura completa.
3. Impedir que dados arredondados de fonte secundária sobrescrevam valores mais precisos; confirmar referência primária quando houver divergência.
4. Medir drenagem por execuções automáticas e orçamento real antes de ampliar lotes ou frequência.
