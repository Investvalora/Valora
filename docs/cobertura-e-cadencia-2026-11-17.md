# Cobertura, cadência e diagnóstico de filas — 17/11/2026

## Alterações locais

Branch `codex/eligible-queue-health`. Duas migrations preparadas, ainda não aplicadas em produção:

1. `eligible_provider_queue_health`: `due` e `oldest_due` consideram somente ativos ativos, ordinárias USD suportadas, sem política vigente de não pagamento e com lease elegível. Inclui rechecagens solicitadas pelo reconciliador. O contador bruto anterior fica em `scheduled_due`; orçamento permanece separado.
2. `reviewed_issuer_cash_policies`: onze fontes oficiais revisadas, com observação fixa em 18/11 01:25 UTC e validade até 18/12 01:25 UTC. Replay não renova a avaliação. Não exclui ativos, históricos, compras, vendas nem recebimentos. Novos dividendos confirmados invalidam a política pelo mecanismo existente.

O health também informa idade do item vencido mais antigo e `backlog_overdue` após 90 minutos. Assim, uma tentativa recente em outro ticker não esconde uma fila envelhecida. Esse sinal é separado de `stale` e do orçamento do fornecedor.

## Revisão por emissor

Consulta à produção encontrou quinze tickers com resposta vazia nos dois fornecedores, além de dois vazios somente na Marketstack. Isso não equivale a dezessete calendários ausentes no aplicativo.

| Ticker | Conclusão / fonte primária revisada | Ação |
|---|---|---|
| AMZN | Política oficial vigente já publicada | Preservar; retirar do contador elegível |
| TIC | Política revisada publicada pela PR169 | Preservar |
| AS | [Amer Sports, relatório 2025](https://s21.q4cdn.com/769814866/files/doc_financials/2025/ar/Amer_Sports_Annual_Report_2025_Final.pdf), seção Dividends and Dividend Policy: retém resultados, sem previsão de pagamento | Política temporária preparada |
| BA | [FAQ Boeing](https://investors.boeing.com/investors/investor-resources/): dividendo ordinário suspenso; preferenciais são outra classe | Política temporária preparada |
| BNC | [Prospecto SEC de outubro/2026](https://www.sec.gov/Archives/edgar/data/1482541/000149315226049436/formposam.htm), Dividend Policy: sem pagamentos e sem intenção atual | Política temporária preparada |
| BRK.B | [10-K Berkshire 2025](https://www.sec.gov/Archives/edgar/data/1067983/000119312526083899/brka-20251231.htm): não declara caixa desde 1967 | Política temporária preparada, sem presumir permanência |
| GO | [10-K Grocery Outlet 2025](https://investors.groceryoutlet.com/static-files/b693047c-21cb-4c6e-a857-5fc050b6c744), Dividend Policy: não prevê dividendos | Política temporária preparada |
| IT | [10-K Gartner 2025](https://www.sec.gov/Archives/edgar/data/749251/000074925126000112/it-20251231_htm.xml): atualmente não paga caixa às ordinárias | Política temporária preparada |
| KN | [10-K Knowles 2025](https://www.sec.gov/Archives/edgar/data/1587523/000158752326000014/knowles2025annualreport.pdf): sem previsão imediata de caixa às ordinárias | Política temporária preparada |
| MX | [10-K Magnachip 2025](https://www.sec.gov/Archives/edgar/data/1325702/000119312526108435/mx-20251231.htm): sem histórico de caixa nem política implementada | Política temporária preparada |
| NU | [20-F Nu 2025](https://www.sec.gov/Archives/edgar/data/1691493/000129281426002166/nuform20f_2025.htm), Item 8: retém resultados, sem previsão de dividendos | Política temporária preparada |
| SA | [AIF Seabridge 2025](https://www.sec.gov/Archives/edgar/data/1231346/000121390026035021/ea028273101ex99-1.htm): não pretende pagar caixa; distribuições de ações são outro evento | Política temporária preparada |
| TSLA | [FAQ Tesla](https://ir.tesla.com/node/16): retém resultados para crescimento, sem previsão de caixa | Política temporária preparada |
| BB | [Relatório BlackBerry 2026](https://www.sec.gov/Archives/edgar/data/1070235/000107023526000039/bbry-20260228.htm): confirma três exercícios sem caixa, mas não comprova intenção futura atual | Histórico sem pagamento confirmado; manter lacuna de política/calendário futuro |
| PERT | Permanent Technologies, OTC; SEC retornou `sec_identity_unavailable` | Identidade/fonte oficial ainda não confirmada; não marcar como não pagadora |
| ITA | Marketstack vazia, mas sete eventos não sintéticos no Valora, última ex 15/09/2026 | Lacuna de fornecedor; não bloquear fontes oficiais nem classificar não pagadora |
| RA | Marketstack vazia, mas 25 eventos não sintéticos no Valora, última ex 12/11/2026 | Lacuna de fornecedor; preservar calendário existente |

Identidades consultadas no catálogo SEC: AS `0001988894`, IT `0000749251`, BNC `0001482541`, NU `0001691493`, BB `0001070235`, SA `0001231346`. Não renomeados os ativos com nome genérico nem alterados cadastros pessoais.

## Cadência: diagnóstico e limite comprovado

- Repositório ativo, branch padrão `main`, workflow `active`, cron `8,23,38,53 * * * *`.
- Últimos doze runs agendados analisados: maior intervalo entre criações **37.091 segundos (10h18min11s)**. Na amostra mais recente, espera entre criação e início foi zero; não há evidência de horas esperando um runner nesse run.
- Em 17/11 os runs foram criados às 02:26:13, 11:03:39 e 19:45:28 UTC. A consulta às 01:31 UTC de 18/11 mostrou mais de cinco horas sem novo run agendado.
- A [documentação GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) permite atrasos e descarte sob carga. Isso é compatível com os registros, mas não prova o motivo de cada ausência: o instante de criação do run não revela o instante em que o disparo foi enfileirado internamente.
- Aumentar frequência ou trocar minutos não garante execução. O cron já evita o minuto zero. Não alteradas cotas, paralelismo ou cadência dos fornecedores.
- Novo passo de diagnóstico no workflow consulta histórico com `actions: read`, separa intervalo de criação da espera por runner e publica números sanitizados no resumo. Falha nessa leitura aparece como indisponibilidade de diagnóstico e não impede a coleta financeira. Não imprime tokens nem payloads arbitrários.
- Para exigir periodicidade previsível será necessário um disparador externo independente ou outro executor. Não foi criada dependência de novas contas, tokens ou serviço pago nesta entrega; o diagnóstico não promete corrigir o agendador interno do GitHub.

## PR/Marketstack

Mantida a retenção privada do evento de US$ 0,03, sem nova promoção ao calendário, sem somá-lo ao evento oficial e sem alterar o recebido pessoal. A bateria SQL `high_priority_cash_reviews.sql` foi reexecutada: comprova retorno `provider_distribution_unverified`, ausência do evento público e ausência de sucesso falso da coleta. Não foi gasta quota de fornecedor para repetir uma observação já conhecida.

## Validação

- 27 baterias SQL do workflow aprovadas no banco isolado `supabase_db_valora-provider-qa`, incluindo a nova regressão de elegibilidade e a proteção de PR.
- Onze seeds exercitados com ativos-fixture e datas fixas, em transação com rollback. Migration de health aplicada apenas no QA.
- 53 testes em cinco arquivos aprovados: cadência, fallback, drenagem, integração da drenagem e auditoria.
- TypeScript e lint dos arquivos novos aprovados. Varredura de segredos dos arquivos rastreados: zero achados.
- Nenhum lançamento, posição ou recebimento foi escrito em produção nesta rodada. Próximo passo: PR, merge e publicação das migrations; o diagnóstico do workflow precisa do primeiro run após merge para homologação remota.
