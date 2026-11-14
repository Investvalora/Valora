# Massive e Alpaca — fontes complementares de proventos

## Escopo

Adapters backend integrados à execução autenticada `providers` existente. Cobrem ativos USD mantidos em posições de qualquer conta, nas classes ações americanas, ETFs e REITs; não há lista fixa de tickers da carteira Investidor10. Novos ativos entram na fila na próxima execução.

As fontes são **evidências estruturadas privadas**, não comprovantes de recebimento e não substitutos dos comunicados oficiais. Não escrevem em `transactions`, `positions`, `wallet_income` ou `dividends`. O calendário público continua dependendo da confirmação oficial; simplesmente adicionar uma chave não promove todos os registros do fornecedor a anúncios oficiais.

## Endpoints e credenciais

- Massive: GET `https://api.massive.com/stocks/v1/dividends`, autenticação Bearer; `MASSIVE_API_KEY` salva nos secrets do Supabase.
- Alpaca: GET `https://data.alpaca.markets/v1/corporate-actions`, apenas tipo `cash_dividend`; `ALPACA_API_KEY` e `ALPACA_API_SECRET` salvas no Supabase, obtidas da conta **Paper**. Não usa endpoints de conta, negociação ou ordens. IP allowlist e conta Live não foram alterados.
- Nenhuma chave foi adicionada ao repositório ou ao frontend. O usuário gerou o par Alpaca; não foi regenerado pelo agente.

Fontes: [Massive](https://massive.com/docs/rest/stocks/corporate-actions/dividends), [Alpaca](https://docs.alpaca.markets/us/reference/corporateactions-1), [modelo oficial Alpaca](https://github.com/alpacahq/alpaca-py/blob/master/alpaca/data/models/corporate_actions.py).

## Consulta real com as contas gratuitas

Dois testes GET dos adapters para JNJ retornaram cinco eventos por fonte, sem paginação. Ambos incluíram USD/ação 1,34, ex/registro 24/11/2026 e pagamento 08/12/2026. Massive retornou moeda USD e declaração 13/10/2026. Alpaca não retornou moeda nem declaração: ambos permanecem nulos. `foreign=false` não é usado para inventar moeda e `process_date` não vira declaração. Teste adicional no playground Massive confirmou HTTP 200 para esse evento futuro.

Essa consulta comprova acesso a JNJ com as credenciais atuais, não cobertura universal ou direito de redistribuição. Antes de expor os dados desses planos individuais aos usuários, confirmar condições de uso com os provedores. A implementação mantém as evidências privadas, sem ampliar exposição pública.

## Integridade e limitações

- Uma tarefa por provedor por execução. Reserva atômica e lease de dez minutos; limite conservador de uma consulta/minuto e 40/dia UTC. Respostas 429, 401 e 403 bloqueiam o provedor por 24 horas, inclusive atravessando meia-noite. Sem rodízio de contas.
- Cada observação mantém provedor, ticker, ID, datas, moeda, valor original e classificação. Revisões do mesmo ID são novas versões imutáveis, ficam `revision_review` e não são somadas. IDs distintos e fornecedores distintos permanecem separados.
- Classificação dinâmica: `reported_unconfirmed`, `incomplete`, `distribution_review`, `official_confirmed`, `official_conflict` ou `revision_review`. A confirmação oficial exige igualdade exata dos campos na reconciliação primária. Nenhuma projeção por frequência entra como anúncio.
- Eventos especiais mantêm suas datas, incluindo eventual data ex posterior ao pagamento, para revisão. Não são convertidos em dividendos recorrentes nem têm ex inferida pelo registro.
- Máximo 100 registros/1 MiB/15 segundos; redirecionamento proibido. Paginação indica cobertura parcial; o adapter não segue `next_url` arbitrária nem afirma histórico completo. Janela limitada a um ano antes/depois; na Alpaca os filtros de período usam `process_date`, conforme a API.
- RLS, ausência de políticas cliente e funções security invoker; acesso restrito a service_role. Health e auditoria mostram filas, cotas, motivos e contagens sem chaves ou payload bruto.

## Validação

- Regressão final de proventos e auditoria: 265 testes em 29 arquivos aprovados, incluindo due-bill, autenticação e sanitização dos registros operacionais.
- Treze testes Deno de autenticação aprovados; TypeScript e `deno check` do worker aprovados.
- Dezenove baterias SQL aprovadas no banco isolado `valora-provider-qa` após replay: reserva, cap/minuto, 40/dia, lease incorreta, revisão, classificação oficial, fontes separadas, campos ausentes, bloqueio atravessando UTC, privilégios e preservação financeira, além das regressões dos demais emissores.
- Replay SQL completo das 83 migrations aprovado no projeto descartável. O comando CLI expirou durante a inicialização lenta do Docker; após recuperação e verificação de banco vazio, o replay foi concluído pelo socket interno usando psql e ON_ERROR_STOP. Banco principal e produção não foram resetados.

## Publicação

1. Migration `20261114002002_supplemental_dividend_sources.sql` antes da função.
2. Publicar `sync-international-announcements` com o módulo `supplemental.ts` e `_shared/jobRuns.ts` atualizado; preservar autenticação própria.
3. O modo `providers` e agendamento existentes passam a coletar uma tarefa por fonte quando os secrets existirem. Consultar `health.supplemental` e auditoria privada.

Secrets já configurados; migration/função desta branch **ainda não publicadas**. Falta homologar o pipeline após publicação. Os testes HTTP não gravaram proventos pessoais.
