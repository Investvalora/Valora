# Homologação de produção — PR156

Merge `6c944ad856e43fdf5be65202cc3df9508372f7e5`, 13/11/2026 às 20h03 UTC. Checks da PR aprovados, incluindo probe das fontes, app, isolamento, replay e identidade do coletor. CI/main `43497994942` aprovado.

## Execução real do novo runner

Uma única execução manual de homologação, [43498783915](https://github.com/Investvalora/Valora/actions/runs/43498783915), no commit do merge. Job `collect` aprovado em 41 segundos. Não havia execução automática do novo runner antes do teste.

Seis lotes alternados, três por fila, `failed=0`, `deadline_reached=false`:

- Primária: SA, RA, TIC, SAP e TS retornaram `nasdaq_identity_unsupported`; TSLA retornou `nasdaq_unavailable`. Zero eventos e zero gravações financeiras. O runner respeitou o limite de seis ativos; esses resultados são lacunas de cobertura, não confirmação de calendário completo.
- SEC: GO, GOOG e GOOGL concluídos sem erro, respectivamente zero, dois e dois documentos inspecionados. Nenhum anúncio criado.
- Tarefas vencidas primárias: 27 → 21; SEC: 36 → 33. O número de tarefas com erro primário passou de 27 a 33 porque os seis ativos consultados registraram limitações de cobertura. Não houve classificação falsa de sucesso de calendário.
- Uma única chamada ao modo providers. Alpha pulado por cota; Marketstack pulado por orçamento de chave. Consumo diário preservado: Alpha 20, Marketstack 14. Auditoria parcial explícita.

## Preservação e saúde

Antes/depois, usando `md5(string_agg(to_jsonb(t)::text,'' order by id))`:

| Dados | Quantidade | Hash preservado |
| --- | ---: | --- |
| transactions | 272 | f88fa98884ab110a7b5586e5a34acf7b |
| positions | 124 | 99ec048cc73ed73f84c1f3b08b999ec1 |
| wallet_income | 208 | 14453d1c05f93ee28296f0cea79b5f17 |

Health advisor sem achados. Tesouro/macro executou automaticamente em 13/11 às 20h00 UTC (17h Brasília): sucesso, 13 posições atualizadas, zero erros e sem diagnóstico incompleto.

## Aceite e limites

Homologação funcional do runner publicada e aprovada. Sem migrations ou deploy adicional. Não houve alteração visual nesta entrega.

Ainda acompanhar a frequência automática do GitHub e primeira passagem completa. A rodada manual comprova processamento e redução das tarefas vencidas, não garante entrega do cron. Cobertura das fontes, reteste HTTP Alpha/CR após renovação de cota e eventuais divergências continuam abertos.
