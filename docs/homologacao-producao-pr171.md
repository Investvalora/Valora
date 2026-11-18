# Homologação PR171 — 18/11/2026, 16h08 Brasília

- Merge `6b3d402b33fafe4db300688d5cc96ee4eecb2d3b`, checks de app, replay, isolamento, identidade, probe e Vercel aprovados.
- [Run de homologação 44377152947](https://github.com/Investvalora/Valora/actions/runs/44377152947) executado na main publicada; coleta aprovada em 36 segundos, dois lotes públicos e zero falhas, sem deadline atingido.
- Diagnóstico real disponível: `last_creation_gap_seconds=31588` (8h46min28s), `last_schedule_age_seconds=1222`, `schedule_delayed=true`, `current_runner_wait_seconds=0`. O intervalo longo permanece sinalizado apesar de o último agendamento ser recente. `max_creation_gap_seconds=37091` preserva o histórico.
- Filas primária, SEC, Alpha e Marketstack sem tarefas elegíveis vencidas. AMZN permanece somente no total bruto da Alpha, conforme política vigente.
- Hashes financeiros iguais aos anteriores: transactions `2c719e7834e3874bd0a48b3b8b027276`; positions `8ab31fc81cd171db7f7cce6bf72c4058`; wallet_income `65c15fcfb4457c7eb242c40fe9fdf09c`.
- Nenhuma migration nem publicação de função necessária. Não foram antecipadas tarefas de fornecedor ou alterados limites/chaves.

Correção do diagnóstico homologada. A regularidade do cron GitHub não foi resolvida por este ajuste. BB/PERT continuam sem confirmação suficiente de calendário futuro; não foram classificados por inferência.
