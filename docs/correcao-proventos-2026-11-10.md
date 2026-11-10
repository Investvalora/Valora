# Proventos — 10/11/2026

## Atualização após o merge da PR128

A publicação pendente descrita abaixo foi concluída em produção em 10/11: função `sync-dividend-payments` (versão 2), migration `confirmed_dividend_payment_sources` e cron `3-59/5 * * * *` ativos. A fila descobre todos os FIIs com identidade B3/CVM disponível. Não grava receitas pessoais. RLS habilitado e leitura/escrita de usuários comuns negadas, verificadas após aplicação. O advisor informa ausência de políticas nessa tabela restrita ao serviço, por desenho.

A execução real encontrou avisos HGLG11 com blocos de cotas e recibos de subscrição. A leitura agora se restringe ao bloco de ticker+ISIN exatos; continua rejeitando identidades duplicadas e amortizações não suportadas. Fixture oficial multiclasses e cinco testes do parser passaram. HGLG11, MXRF11 e XPSF11 tiveram seus pagamentos de 16/11 preenchidos automaticamente. CXSE3 teve o calendário de 17/11 confirmado pontualmente pelo histórico oficial de RI, sem alterar valor por ação nem criar crédito pessoal; esse reparo pontual não representa um novo adaptador automático de RI para todas as ações.

Homologação na página publicada: novembro mostrou R$ 34,89 a receber + R$ 30,92 recebidos = R$ 65,81. Somente anúncios com data confirmada entram na previsão; ausência de outros anúncios ainda pode deixar a cobertura incompleta. Limitação da Mastercard e conflitos de outros fundos continuam registrados na fila, sem datas presumidas. A execução de HGLG11 retornou HTTP 200, três eventos enriquecidos e zero conflitos. Recebimentos da Nomad e lançamentos da carteira preservados.

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

### Gráfico mensal de recebidos e a receber

Desempenho › Proventos passa a mostrar uma barra empilhada por mês: recebido em azul forte e pagamentos anunciados restantes do mês atual em azul claro. Mouse, foco ou toque abrem o detalhamento das parcelas e do total. A tabela e os indicadores de recebidos não incluem a previsão. Filtros por ticker/tipo afetam as duas parcelas do gráfico.

Somente anúncios com pagamento futuro conhecido entram na previsão; sem data permanecem na aba de anúncios, com aviso de cobertura incompleta no gráfico. USD futuro usa a PTAX disponível hoje (até dez dias anteriores), explicitamente estimada; se faltar câmbio, a previsão inteira fica indisponível, mantendo os recebidos visíveis. Não repete automaticamente o último dividendo nem presume retenção. A visualização depende do calendário: na homologação atual, a base ainda não tinha pagamentos futuros datados para novembro na carteira; o gráfico informa essa limitação. Não interpretar zero como garantia de ausência de créditos.

20 testes específicos passaram, incluindo separação das parcelas, toque/teclado, exclusão de datas desconhecidas e câmbio estimado. Build e lint dos arquivos alterados passaram. Validação responsiva em 390 px sem transbordamento horizontal da página; a rolagem fica dentro do gráfico.

Homologação adicional: seis cenários nos testes do hook/gráfico/tela passaram, cobrindo filtros combinados por ticker e tipo, isolamento dos KPIs de recebidos e falha de previsão sem ocultar recebidos. Na tela real, filtrar GARE11 produziu R$ 15,19 em novembro e o filtro foi restaurado. Em página local isolada com dados fictícios (sem gravação), R$ 30,11 recebidos + R$ 40,41 a receber resultaram em R$ 70,52; simulando o pagamento, a parcela a receber zerou e recebidos passaram a R$ 70,52, mantendo o total. Tooltip por toque e fechamento por Escape conferidos no navegador; em 390 px, página com scrollWidth 390 e tooltip entre x=49 e x=279. Não substitui teste em aparelho físico nem valida a publicação da ingestão: anúncios reais sem data continuam excluídos e sinalizados.

Nova função `sync-dividend-payments`: descobre FIIs ativos pelo ISIN/CNPJ do cadastro B3/CVM, consulta avisos estruturados ativos do Fundos.NET, valida identidade e enriquece apenas um evento compatível existente. Não se limita à carteira de teste. Limita páginas/documentos/tamanho/tempo; registra falhas e repete a consulta, sem gravar receitas pessoais ou datas presumidas. Fontes sem identidade, documentos incompatíveis e pagamentos ambíguos ficam pendentes.

A consulta HTTP automática do RI Mastercard retornou 403; o calendário atual foi confirmado pela página oficial acessível na pesquisa. O adaptador mantém falha explícita e nova tentativa, sem contornar bloqueios. Isso ainda exige acompanhamento e não representa cobertura automática validada para todas as ações americanas.

Ordem de publicação: publicar `sync-dividend-payments` com os arquivos compartilhados importados; aplicar `20261110211841_confirmed_dividend_payment_sources.sql`; verificar execução do cron e tarefas com erro; conferir novamente os pagamentos. A configuração desativa a checagem JWT do gateway, mas a função exige autorização interna de serviço. Não disponibilizar essa operação ao cliente autenticado comum.
