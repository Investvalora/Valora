# Anúncios internacionais automáticos — 11/11/2026

## Entrega local

Nova rotina `sync-international-announcements` descobre pelo catálogo ativo de ações USD, sem lista de tickers da carteira. Cada execução reivindica até dois ativos com lease de dez minutos; usa até quatro requisições de fonte. Sucesso volta após doze horas; identidade sem cobertura/dados ausentes após 24h; falha transitória após duas horas. Cron proposto a cada cinco minutos, deslocado dos outros jobs. O limite é local desta rotina, não uma quota global de todos os provedores.

Consulta pública Nasdaq em duas etapas: `quote/{ticker}/info` confirma símbolo exato, ação ordinária, classe STOCKS e listagem Nasdaq; só então lê as linhas de dividendos. O resumo do endpoint foi observado atrasado e não é usado. Aceita apenas cash em USD com declaração já realizada, datas coerentes e precisão compatível com o banco. Não importa história antiga sem ajuste de split; janela histórica de 366 dias, máximo futuro de 366 dias para data ex. Distribuições múltiplas na mesma data ex são recusadas como ambíguas, sem somá-las por suposição.

É uma fonte pública agregada, fornecida pela Nasdaq/Quotemedia, não um RI de emissor. A própria fonte informa cobertura limitada a símbolos listados Nasdaq e possíveis misturas de espécies de distribuição. A confirmação de identidade e a recusa de linhas ambíguas reduzem esse risco, sem prometer completude ou SLA. [Descrição da fonte](https://www.nasdaq.com/market-activity/stocks/aapl/dividend-history).

## Preservação e segurança

- Eventos novos entram como anúncios brutos com `source=nasdaq` e URL de origem. Não cria `wallet_income`, retenção, câmbio de corretora ou lançamentos pessoais.
- Evento Yahoo com mesma data ex e mesmo valor só é enriquecido se não tinha pagamento. Valores diferentes geram conflito.
- Evento já confirmado por RI/iShares/FNET é preservado. Mesma data de pagamento com data ex próxima divergente gera conflito, evitando duplicação. Assim, a divergência COST não é arbitrariamente resolvida por esta fonte.
- Fila privada com RLS; RPCs somente para `service_role`; função exige token interno validado antes de qualquer acesso. Host fixo, timeout de 12s por consulta, corpo até 2MB, redirecionamentos não seguidos, erros persistidos somente como códigos seguros.
- HTTPS compatível com Node (`node:https`) funcionou no Deno local. O fetch nativo falhou; não se desativou TLS, não se usou proxy nem se falsificou identidade do navegador.

## Validação

- 27 testes aprovados, incluindo parser, autorização, fluxo positivo de gravação, falhas seguras e regressão das fontes existentes.
- `deno check` aprovado. Adaptador real executado no Deno sem banco: AAPL cinco eventos recentes, incluindo ex 12/11/2026, pagamento 16/11, USD0,27; COST quatro, incluindo pagamento 13/11, USD1,47; MA recusada como fora de cobertura Nasdaq.
- Migration aplicada somente no Docker Supabase local. Teste `supabase/tests/international_announcements.sql` aprovado com ROLLBACK: idempotência, preservação de fonte primária, conflito de valor/ex, enriquecimento Yahoo compatível, precisão e permissões. Integrado ao replay da CI.
- ESLint dos testes, TypeScript e scan de segredos aprovados. Deno verificado novamente após o ajuste de transporte.

## Publicação e pendências

Não publicado em produção. Revisar PR, publicar a função com os módulos compartilhados e o adaptador antes de aplicar `20261111215720_international_dividend_announcements.sql`, que habilita fila/cron. Depois observar execuções reais e cobertura por ativo. O sucesso de consultas locais não comprova acesso à fonte a partir da infraestrutura hospedada.

Não substitui iShares para ETFs, RI Mastercard/JPM ou fontes BR. Ainda faltam fontes automáticas para ativos fora da cobertura e confirmação do líquido pessoal MA. Novos tickers compatíveis serão descobertos automaticamente; os demais terão indisponibilidade explícita, sem estimar datas.
