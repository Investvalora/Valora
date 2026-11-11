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
