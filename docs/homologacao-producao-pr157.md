# Homologação PR157 — 13/11/2026

Merge `b2d841cef3631093fba502eb69678c3c0d4623c5`; checks da PR e CI/main `43504038332` aprovados. Migration `jnj_primary_calendar` aplicada; função internacional ACTIVE v19, com autenticação própria preservada. Health advisor sem achados e EXECUTE negado a anon/authenticated nas funções internas.

Nova consulta pública real descobriu três comunicados JNJ. Homologação restrita ao ticker: lease temporária somente JNJ, payload obtido da fonte enviado ao `finish_primary` da função publicada. Sem disparar workflow amplo ou consumir APIs pagas. Requisição interna 7237: HTTP 200, sem timeout, `saved=3`, `conflicts=0`, `coverage_gaps=0`, `received_income_created=0`.

Sucesso registrado às 20h57m53 UTC (17h57 Brasília); erro limpo, lease liberada e próxima consulta em 24 horas. Calendário futuro confirmado: USD 1,34 por ação, ex/registro 24/11/2026, pagamento 08/12/2026. Maio e agosto conciliados com fonte primária; fevereiro mantido. Não houve criação de recebimento pessoal.

Hashes antes/depois preservados: transactions `f88fa98884ab110a7b5586e5a34acf7b`; positions `99ec048cc73ed73f84c1f3b08b999ec1`; wallet_income `14453d1c05f93ee28296f0cea79b5f17`.

Homologação funcional backend concluída. A execução agendada futura usará o adapter publicado no repositório; esse teste direcionado não comprova frequência do GitHub. Demais lacunas e reteste Alpha/CR continuam separados.
