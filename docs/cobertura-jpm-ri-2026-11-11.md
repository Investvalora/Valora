# JPM — descoberta automática no RI

## Problema e solução

JPM é listado na NYSE e não atende à identidade exigida pelo adaptador Nasdaq. A proteção permanece. O índice público usado pelo próprio [RI JPMorganChase](https://www.jpmorganchase.com/ir/news) respondeu sem credenciais e permite descobrir links de declarações de dividendos das ações ordinárias. Não foi necessário criar conta ou contratar API.

Novo adaptador no coletor Node já existente: consulta o índice JSON oficial (até quatro páginas e 2 MB por resposta), seleciona os dois comunicados recentes elegíveis e valida emissor, classe ordinária, declaração efetiva, valor, corte e pagamento. Links vêm do índice; não são montados por suposição trimestral. Não usa comunicados de intenção de aumento nem dividendos preferenciais.

O parser não produz `ex_date`. A função do banco concilia cada declaração com exatamente um evento já cadastrado, de mesmo valor e ex entre corte menos sete dias e corte. Preserva essa ex e completa apenas Yahoo sem pagamento confirmado. Datas já confirmadas e fontes primárias são preservadas; divergência ou ausência da ex vira `jpm_ex_date_or_event_conflict`, com nova tentativa em duas horas e sem falso sucesso. Não insere um evento JPM sem ex independente, não presume imposto e não cria recebimento pessoal.

## Validação local

Consulta real em 11/11/2026 descobriu:

- [Declaração de 15/09/2026](https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-increased-common-stock-dividend-9-15): USD 1,65; corte 06/10; pagamento 31/10.
- [Declaração de 18/05/2026](https://www.jpmorganchase.com/ir/news/2026/jpmc-declares-common-stock-dividend-5-18): USD 1,50; corte 06/07; pagamento 31/07.

Regressão de parser/coletor/endpoint aprovada; SQL local com ROLLBACK aprovou enriquecimento, idempotência, preservação de ex e pagamento, bloqueio de fonte externa, ausência/ambiguidade de ex e privilégios privados. Regressões Nasdaq/lease continuam passando. TypeScript e lint dos scripts/testes aprovados.

O probe JPM somente leitura passou também no GitHub hospedado: [execução43122494929](https://github.com/Investvalora/Valora/actions/runs/43122494929), com dois eventos oficiais descobertos. Não usou OIDC, fila ou gravação. AAPL/COST também passaram no mesmo workflow. O rollout e a gravação JPM em produção ainda não foram homologados nesta etapa.

## Publicação e limites

Após revisão e merge: aplicar `20261111233958_jpmorgan_official_announcements.sql`, publicar a função internacional atualizada e executar um lote da main com JPM priorizado apenas na fila técnica. A mesma identidade OIDC e os mesmos leases continuam protegendo a gravação. Nenhuma alteração financeira em produção foi executada durante a implementação.

Não encerra a cobertura de MA (RI ainda responde 403) nem a cobertura antecipada de um anúncio JPM quando nenhuma fonte forneceu sua ex independente. O adaptador sinaliza essas limitações em vez de criar datas. Valores líquidos pessoais continuam dependendo do extrato da corretora.

## Homologação de produção — PR137

Merge `ead3ba6e425ec84329c1edf6d7d90f0696c6a1da` confirmado. Migration aplicada como `20261111235634_jpmorgan_official_announcements`; função internacional v6 ACTIVE.

- [Probe na main43123622697](https://github.com/Investvalora/Valora/actions/runs/43123622697) aprovado.
- [Lote autenticado43123726072](https://github.com/Investvalora/Valora/actions/runs/43123726072): JPM2 eventos/1 gravação/0 conflitos; AAPL5 eventos/0 gravações/0 conflitos. Priorização somente na fila técnica de JPM/AAPL, sem mudança de posições ou lançamentos.
- JPM ex06/07/2026 preservada, USD1,50, corte06/07 e pagamento31/07 completados pelo comunicado de maio; evento de outubro USD1,65/pagamento31/10 e sua URL primária anterior ficaram intactos.
- Repetição das duas declarações em transação com ROLLBACK retornou saved0/conflicts0; finalização sem lease válido foi recusada.
- Os207 recebimentos pessoais mantiveram exatamente o mesmo hash antes/depois. Nenhum recebimento criado.
- Chamada sem identidade retornou401; anon/authenticated sem EXECUTE no gravador; advisor health sem lints. CI da main aprovada. Workflow ativo; recorrência agendada ainda precisa observação, separada dos despachos manuais aprovados.

Homologação técnica da PR aprovada. Achado separado: quatro dividendos JPM com source=seed ainda existem em produção, compatíveis com os quatro trimestres sintéticos gerados em supabase/seed.sql. A consulta de proventos não filtra essa origem. Registrado como prioridade alta para investigar impacto e isolar dados simulados; nenhum desses registros foi alterado nesta homologação.
