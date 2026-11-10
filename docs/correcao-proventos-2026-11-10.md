# Proventos — 10/11/2026

## Causa e reparo aplicado

GARE11, VGHF11 e MA tinham eventos Yahoo com valor e data ex, mas sem pagamento. O filtro de pagos os excluía corretamente. Não se deve substituir pagamento por data ex.

Calendário público corrigido no Supabase, somente em registros Yahoo ainda sem pagamento e com ticker, data ex, tipo e valor exatos:

| Ativo | Data COM | Pagamento | Valor por unidade | Fonte |
|---|---|---|---|---|
| GARE11 | 30/10/2026 | 09/11/2026 | R$ 0,083 | [Fundos.NET](https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1365436) |
| VGHF11 | 30/10/2026 | 09/11/2026 | R$ 0,05 | [Fundos.NET](https://fnet.bmfbovespa.com.br/fnet/publico/exibirDocumento?cvm=true&id=1365431) |
| MA | 09/10/2026 | 09/11/2026 | US$ 0,87 | [RI Mastercard](https://investor.mastercard.com/stock-information/dividend-history/default.aspx) |

Datas ex preservadas. Nenhuma compra, venda, posição ou receita pessoal foi alterada. JPM e TFLO mantêm os líquidos comprovados da Nomad (US$ 0,09 e US$ 0,41 nos créditos de novembro).

## Homologação local

Na carteira Investidor10, período Tudo: total passou de R$ 776,35 para R$ 804,55. São R$ 776,35 líquidos importados e R$ 28,20 estimados brutos. GARE11 aparece com 183 cotas/R$ 15,19; VGHF11, 254/R$ 12,70; MA, 0,06394/cerca de R$ 0,31 bruto convertido. Não foi inventada retenção da Mastercard. A diferença residual de aproximadamente R$ 0,41 para a captura do Investidor10 envolve bases distintas (líquido da corretora, estimativa bruta e câmbio); não se deve igualar totais artificialmente.

28 testes passaram (leitura das fontes, histórico importado, elegibilidade e moedas). Migration e teste SQL executados em transação revertida: acesso restrito, enriquecimento, idempotência, preservação de pagamento conflitante e rejeição de correspondência ambígua. Essa validação não publicou a migration nem o cron.

## Prevenção preparada, ainda não publicada

Nova função `sync-dividend-payments`: descobre FIIs ativos pelo ISIN/CNPJ do cadastro B3/CVM, consulta avisos estruturados ativos do Fundos.NET, valida identidade e enriquece apenas um evento compatível existente. Não se limita à carteira de teste. Limita páginas/documentos/tamanho/tempo; registra falhas e repete a consulta, sem gravar receitas pessoais ou datas presumidas. Fontes sem identidade, documentos incompatíveis e pagamentos ambíguos ficam pendentes.

A consulta HTTP automática do RI Mastercard retornou 403; o calendário atual foi confirmado pela página oficial acessível na pesquisa. O adaptador mantém falha explícita e nova tentativa, sem contornar bloqueios. Isso ainda exige acompanhamento e não representa cobertura automática validada para todas as ações americanas.

Ordem de publicação: publicar `sync-dividend-payments` com os arquivos compartilhados importados; aplicar `20261110211841_confirmed_dividend_payment_sources.sql`; verificar execução do cron e tarefas com erro; conferir novamente os pagamentos. A configuração desativa a checagem JWT do gateway, mas a função exige autorização interna de serviço. Não disponibilizar essa operação ao cliente autenticado comum.
