# Acompanhamento — 18/11/2026

## Runs automáticos

Três execuções agendadas aprovadas hoje, em UTC:

| Run | Criação | Intervalo desde o anterior |
|---|---|---|
| [44219164942](https://github.com/Investvalora/Valora/actions/runs/44219164942) | 01:53:06 | — |
| [44281354787](https://github.com/Investvalora/Valora/actions/runs/44281354787) | 10:01:14 | 8h08min08s |
| [44373550795](https://github.com/Investvalora/Valora/actions/runs/44373550795) | 18:47:42 | 8h46min28s |

O último run executou 14 lotes, sem falhas nem interrupção por prazo. Na consulta de 18:55 UTC (15h55 Brasília), filas primária, SEC e fornecedores estavam sem tarefas elegíveis vencidas. AMZN continua somente no contador bruto. Não foi necessário disparo manual adicional.

## Correção local do diagnóstico

O campo `schedule_delayed` usava somente a idade do último run. Assim, um run que acabava de iniciar após oito horas sem criação produzia `false`. O máximo histórico aparecia corretamente, mas o indicador resumia mal a situação.

Acrescentado `last_creation_gap_seconds`; o indicador considera tanto a idade atual quanto o intervalo mais recente entre criações. Um run recente não apaga o atraso anterior. Quando o próximo intervalo normaliza, o indicador pode voltar a `false`, preservando o máximo histórico. Não prova que um run foi descartado nem altera o cron, cotas ou dados financeiros.

Regressões cobrem o caso real de 18/11 e a recuperação posterior. Correção ainda local, na branch `codex/cadence-gap-diagnostics`; não publicada.

Validação concluída: seis testes, lint, TypeScript e verificação de sintaxe aprovados. Consulta real pelo analisador local retornou último intervalo 31.588 segundos (8h46min28s), espera por runner zero e `schedule_delayed=true`, mesmo com o último run recente. Nenhuma mutation no banco de produção foi executada nesta rodada.

## BlackBerry

A [FAQ atual de RI](https://investors.blackberry.com/faq) identifica o ticker e contém uma seção de dividendos, mas o conteúdo retornado dessa seção é apenas um traço. Isso não confirma uma política futura. O [10-Q de agosto/2026](https://www.sec.gov/Archives/edgar/data/1070235/000107023526000115/bbry-20260831.htm) e o relatório anual já consultado confirmam ausência de pagamentos nos três exercícios anteriores. Mantida a distinção: histórico sem caixa confirmado, calendário/política futura não confirmados. Nenhuma política de não pagamento foi inserida por inferência.

## PERT

Encontradas referências históricas que ajudam a ligar a identidade:

- [Form D de 2011 da SEC](https://www.sec.gov/Archives/edgar/data/1420667/000142066711000003/primary_doc.xml): Permanent Technologies Inc., CIK 1420667 e nome anterior Triden Telecom.
- Índice de aviso DTCC de 10/12/2007: reorganização Triden → Permanent Technologies, ticker PERT e CUSIP 714205101. O PDF direto retornou 404 nesta rodada; não tratado como documento novamente validado.
- [Página de PERT na OTC Markets](https://www.otcmarkets.com/stock/pert/overview): identidade comercial e enquadramento OTC. O [relatório de emissor indexado](https://www.otcmarkets.com/file/company/financial-report/171914/content) não pôde ser aberto nesta rodada; a data exibida pelo buscador não comprova a data do documento.

O coletor SEC atual aceita identidades do registro NYSE/Nasdaq e depois exige confirmação de ticker no submissions. Encontrar um CIK antigo não autoriza contornar esses controles nem comprova existência de calendário de dividendos atual. Nenhum alias foi adicionado e nenhum dado pessoal foi alterado. A pendência fica delimitada a fonte atual e identidade operacional para OTC; não significa que a companhia não paga dividendos.

## Limites

A cadência continua irregular apesar de runs bem-sucedidos. Para execução previsível, permanece necessária a definição de um disparador/executor independente. O ajuste desta rodada torna o diagnóstico coerente; não resolve o agendador interno do GitHub.
