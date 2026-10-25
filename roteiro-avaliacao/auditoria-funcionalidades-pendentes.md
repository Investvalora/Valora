# Auditoria de funcionalidades pendentes — Valora

## Complemento mais recente — páginas públicas e alternativas sem domínio

- /sobre, /privacidade e /termos publicados em produção pela PR #69 (merge 28a0ef5), acessíveis sem login e ligados às telas de acesso. Por orientação do usuário, usam somente Valora e o email do projeto, sem nomes pessoais. Textos revisados e aprovados pelo usuário em 25/10. Links salvos no branding do Google. Após autorização explícita do usuário, publicação OAuth confirmada: painel Audience exibe In production e External. Não foi realizado novo login com uma segunda conta externa nesta etapa. Assuntos do SendGrid adiados pelo usuário, sem mudança de configuração.
- Não é obrigatório comprar domínio para testar SMTP: Gmail é alternativa gratuita com cotas e conta elegível, sem garantia de entrega fora do spam. Considerando a preocupação do usuário com volume, o SendGrid existente foi preservado.
- Limite real conferido no painel do projeto: 30 emails/h no Supabase, intervalo mínimo por destinatário de 30s. O limite por hora é configurável com SMTP próprio; nenhuma configuração foi alterada.
- Plano/cota SendGrid conferidos em 25/10: Free Trial de 100 emails/dia, com término em 18/11/2026. Remetente individual verificado, sem domínio autenticado; rastreamento de cliques e aberturas ativo. Após revisão, usuário decidiu manter tudo como está por enquanto. Nenhuma configuração alterada. Detalhes em verificacao-sendgrid-20261025.md.
- Detalhes, fontes e URLs para revisão: publicacao-google-email.md. Oito testes, build e lint passaram.

## Estado mais recente — 25/10/2026, recebimentos da renda fixa

- Implementados cupons, resgates parciais e totais em Ativos → Lançamentos. O usuário informa principal resgatado, valor bruto recebido e saldo posterior do extrato. O histórico mantém títulos encerrados e usa cada saldo posterior como nova base de capitalização.
- Migrações `20261025143849_fixed_income_events.sql` e `20261025145230_fixed_income_event_idempotency.sql` aplicadas via MCP. RLS de leitura/inclusão por proprietário, histórico sem alteração/exclusão direta, trava por título e validação de principal/saldo/datas. Repetir o mesmo UUID/conteúdo não duplica nem reaplica um resgate, inclusive após encerramento. Teste SQL transacional passou e reverteu todos os fixtures.
- `calc-fixed-income` versão 4 publicada com JWT obrigatório; considera o saldo posterior ao último movimento, vencimento e proteção contra sobrescrever um recebimento concorrente. Recálculo autenticado real conferido pela interface local: Saldos atualizados.
- Frontend permanece local, sem novo commit/publicação. Testes direcionados: 41 passaram em 12 arquivos; build e lint passaram. Sem movimentos financeiros fictícios persistidos.
- Google: status Testing confirmado, apenas uma conta autorizada. Homepage pública salva no branding; Publish app continua desabilitado. Faltam páginas públicas de privacidade e termos; não foram inventados links nem publicadas políticas em nome do projeto. A ausência de domínio próprio, por si só, não comprova impedimento do OAuth básico; o bloqueio observado é a configuração de branding incompleta.
- Email: SMTP personalizado ativo no SendGrid. Usuário confirmou que o Valora não possui domínio próprio/DNS. Sem domínio controlado, não é possível configurar SPF/DKIM/DMARC próprios. Entrega fora do spam permanece pendente; não se atribui a causa do spam somente a isso sem análise dos cabeçalhos/reputação. Nenhuma configuração de SMTP, segredo ou DNS alterada.
- Próximos passos externos: preparar/aprovar/publicar páginas de privacidade e termos para concluir branding; definir domínio remetente e autenticação no SendGrid e repetir teste de entrega.

As seções posteriores preservam etapas anteriores e são supersedidas por este estado quando houver divergência.

## Atualização local — 25/10/2026

### Homologação e histórico — atualização posterior de 25/10

- Google homologado em produção com a conta Valora: login retornou a https://investvalora.vercel.app/inicio. Isso comprova o fluxo dessa conta autorizada; não comprova liberação do aplicativo Google para qualquer conta externa.
- Confirmação de email homologada em produção com alias autorizado: usuário recebeu o email, confirmou o link e foi à página inicial. A sessão Valora Homologação em /inicio foi conferida no navegador. Não houve retorno a localhost.
- Nova pendência de entregabilidade: o email de confirmação chegou ao spam; revisar remetente/SMTP e autenticação do domínio antes de considerar a entrega à caixa principal homologada.
- Câmbio mensal integrado à PTAX pública, paginada, usando somente publicação até cada corte; sem fallback do câmbio atual para meses sem histórico. Consulta real validada no BCB e evolução local conferida.
- Renda fixa histórica calculada como estimativa bruta dos títulos ativos cadastrados: prefixado/Selic pela taxa anual registrada; CDI pela série diária disponível; IPCA por meses completos e spread. Corta no vencimento e omite pontos sem cobertura necessária.
- O histórico continua sendo uma reconstrução, não um extrato de custódia: não inclui títulos de renda fixa já desativados sem histórico de resgate, cupons, impostos ou marcação a mercado. Selic preserva a semântica atual do cadastro (taxa anual total), sem interpretar o campo como spread. Essas extensões exigem um modelo de movimentações de renda fixa e revisão de requisito.
- Validação atual: 54 testes direcionados, TypeScript/build/PWA e lint passaram. Código financeiro novo permanece local e sem publicação.

- Concluídos: os dois botões Filtrar em Ativos, com busca por nome/ticker e tipos compartilhada entre as três abas.
- Concluído: Exportar CSV em Ativos usa as posições filtradas e as colunas padrão do exportador existente, independentemente das colunas visíveis. Desabilitado durante carregamento ou sem resultados.
- Concluídos: atalhos Lançamento do ativo e Criar alerta no detalhe abrem os fluxos existentes com o ticker preenchido. Lançamentos usam a carteira selecionada, como o fluxo já existente.
- Histórico patrimonial parcialmente corrigido: compras e vendas reconstruídas em ordem de data/seq, custo médio por carteira/ticker, posições encerradas incluídas nos meses anteriores, corte final respeitado no dia exato. Dividendos e bonificações não alteram quantidade, seguindo a regra atual do banco. Posições sem movimentações mantêm o cadastro como saldo inicial.
- Ainda em aberto na prioridade alta: câmbio histórico e rendimentos históricos da renda fixa. O histórico usa câmbio atual e principal da renda fixa nos meses passados. Sem metadados ou cotação necessários, o ponto incompleto não é apresentado como patrimônio completo.
- As tabelas abaixo preservam o levantamento original de 24/10; os quatro primeiros controles foram atendidos conforme esta atualização. Permanecem posição ideal, alteração de senha e os recursos parciais listados adiante.

Esta atualização está local, sem novo commit ou publicação.

Revisão de código em 24/10/2026, na branch fix/levantamento-valora. Nenhuma funcionalidade foi alterada nesta auditoria. Evidências se referem ao código local; não foi feita homologação completa de todas as telas nem nova verificação da configuração remota.

## Controles expostos sem implementação completa

| Prioridade | Tela / função | Situação confirmada | O que implementar | Evidência |
| --- | --- | --- | --- | --- |
| Alta | Ativos: Filtrar no cabeçalho e na tabela | Ambos os botões não possuem onClick. | Painel real de busca/tipo e aplicação dos critérios aos dados; evitar dois controles sem função. | src/modules/ativos/components/AtivosPage.tsx:24; src/modules/ativos/components/AtivosPosicoes.tsx:202 |
| Alta | Ativos: Exportar CSV | Botão sem onClick; já há exportador de posições em outro módulo. | Reutilizar exportação, definir se segue as colunas visíveis e os filtros, tratar formato e download. | src/modules/ativos/components/AtivosPosicoes.tsx:214; src/modules/portfolio/export/positionsCsv.ts |
| Alta | Detalhe do ativo: Lançamento do ativo | Botão sem onClick. Cadastro de lançamentos já existe no projeto. | Abrir formulário com o ticker e carteira preenchidos e atualizar consultas ao concluir. | src/modules/assets/components/AtivoDetailPage.tsx:204 |
| Alta | Detalhe do ativo: Criar alerta | Botão sem onClick. Criação de alertas já existe em outras telas. | Conectar o botão ao fluxo existente com o ticker preenchido. | src/modules/assets/components/AtivoDetailPage.tsx:210; src/modules/analise/components/AnaliseAlertas.tsx:135 |
| Média | Composição: Exibir posição ideal | Estado showIdeal só altera aria-checked e estilo do interruptor. Não participa dos dados do gráfico ou da lista. | Metas por classe/ativo, validação dos pesos e comparação entre participação atual e ideal. | src/modules/ativos/components/AtivosComposicao.tsx:305 |
| Média | Conta: Alterar senha | Botão desabilitado e texto “em breve”. Recuperação/redefinição de senha já existe em fluxo separado. | Fluxo autenticado de alteração, política de senha, reautenticação quando exigida e estados de erro/sucesso. | src/modules/preferences/components/AccountPage.tsx:87 |

São sete controles visuais: dois Filtrar, Exportar CSV, dois atalhos do detalhe, Exibir posição ideal e Alterar senha. São seis grupos de implementação, pois os dois filtros pertencem ao mesmo fluxo.

## Recursos parciais e diferenças dos requisitos

| Prioridade | Recurso | Limite atual | Trabalho necessário |
| --- | --- | --- | --- |
| Alta | Histórico patrimonial completo | O gráfico mensal usa posições atuais e suas datas de aquisição, câmbio disponível hoje e principal histórico da renda fixa. Não reconstrói posições já vendidas nem rendimentos passados da renda fixa. | Reconstruir saldos e custo a partir das movimentações, usar câmbio histórico e snapshots de renda fixa. O gráfico existente é uma visão histórica das posições cadastradas, não um extrato histórico integral. Evidência: src/modules/dashboard/monthlyWealth.ts. |
| Média | Rentabilidade: filtro de tipo | Filtra a tabela por ativo e sua exportação. A chamada usePerformance recebe somente período e carteira; gráfico e resumo permanecem agregados. | Definir o alcance visual do filtro e, se for global ao bloco, recalcular série e resumo com a mesma seleção. Evidência: src/modules/desempenho/components/DesempenhoRentabilidade.tsx:82–114. |
| Média | Rentabilidade: Desde o início | Em usePerformance, Tudo continua mapeado para 365 dias. A evolução da página inicial já ganhou consulta ampliada, mas isso não foi generalizado. | Buscar desde a primeira movimentação/preço disponível e alinhar carteira, proventos e benchmarks no mesmo intervalo. Evidência: src/modules/performance/hooks/usePerformance.ts:35. |
| Média | Período do topo | Atualmente consumido pelo gráfico de evolução da página inicial. Outras telas mantêm seus próprios períodos. O TopBar fica oculto no celular, e o gráfico inicial não tem mais um seletor local de período. | Definir se o período é global ou exclusivo da evolução; oferecer o mesmo acesso ao período no topo mobile. Evidência: src/shared/components/TopBar.tsx:17; src/modules/inicio/components/WealthEvolution.tsx:13; buscas por useChartPeriod. |
| Média | Proventos previstos — RF11 | O serviço usado nas telas consulta apenas pagamentos até hoje. | Separar pagos de anunciados/a receber, buscar pagamentos futuros e calcular elegibilidade pela posição na data-com. Evidência: contexto.md RF11; src/modules/dividends/services/dividendService.ts:26. |
| Média | Benchmark IPCA — RF13 | O requisito cita CDI, IBOV e IPCA. A configuração de desempenho usa CDI, IBOV e IFIX. IPCA em renda fixa não equivale a benchmark IPCA. | Decidir se a especificação deve incluir IFIX ou se IPCA deve ser integrado como série comparativa. Evidência: contexto.md RF13; src/modules/performance/hooks/usePerformance.ts:44. |
| Média | Score na nova tabela de Ativos — RF06 | O motor de score e telas de Análise existem. A nova tabela de Ativos não recebe a avaliação ativa nem disponibiliza a coluna. | Reutilizar a seleção de score e o cálculo existente, definindo a apresentação em Ativos. Não confundir score próprio com avaliações públicas do concorrente. Evidência: contexto.md RF06; src/modules/ativos/components/AtivosPosicoes.tsx; src/modules/portfolio/components/CarteiraPage.tsx:236. |

## Expansões da referência do Investidor10

Estes itens não devem ser tratados automaticamente como defeitos ou como requisitos já aprovados do Valora:

- Margem bruta, CAGR de receitas/lucros em cinco anos e DY médio de cinco anos: faltam campos/fontes e histórico necessário no fluxo de fundamentals atual. O serviço seleciona P/L, P/VP, ROE, DY, dívida/patrimônio, margem líquida, LPA e VPA.
- Média pública de avaliações: falta o produto de avaliações, sua persistência e agregação.
- Minha nota e preço-alvo pessoal na tabela: falta um modelo de preferência por usuário/carteira/ativo e sua edição. Alertas de preço-alvo já existem, mas não constituem automaticamente uma avaliação pessoal na tabela.
- % ideal e Comprar para rebalancear: dependem de metas, orçamento e cálculo de distribuição; estão ligados ao interruptor de posição ideal.
- Ordenação pelas colunas da nova tabela: o AtivosTable atual não oferece interação de ordenação no cabeçalho. Existem utilitários/tabelas com ordenação em outros módulos; é uma expansão reaproveitável.
- Sincronização de preferências entre dispositivos: o editor de colunas recém-adicionado guarda escolhas por usuário somente no navegador. A versão de celular mantém os cartões próprios e ainda não usa o editor de colunas desktop.

## Não confundir com ausência geral de funcionalidade

- Login Google, cadastro, confirmação de senha, recuperação de acesso, carteira, lançamentos, alertas, score, Graham, Bazin e edição de colunas têm implementações. Isso não substitui homologação de cada cenário e configuração de produção.
- Há serviços/funções de sincronização de cotações, dividendos e fundamentos; falta de botão ligado não significa ausência do processamento no backend.
- CarteiraPage.tsx contém ações “Sincronizar dados” e “Gerar insights” que apenas avisam “Em breve”. Esse componente não está ligado às rotas atuais em src/routes.tsx. Registrar como legado a revisar, sem confundir com o fluxo de alertas/insights que já existe em outras telas.
- O estado remoto de deploy, publicação pública do OAuth e teste de confirmação de email não foi revalidado nesta auditoria. Consultar o histórico em correcoes-levantamento.md e homologar separadamente.

## Ordem sugerida

1. Conectar Filtrar e Exportar CSV em Ativos.
2. Conectar os dois atalhos do detalhe do ativo.
3. Corrigir o alcance dos filtros de rentabilidade e Tudo.
4. Completar histórico por movimentações e proventos previstos.
5. Implementar metas de posição ideal e rebalanceamento.
6. Concluir alteração de senha e acesso ao período no celular.
7. Decidir os indicadores e recursos adicionais da referência antes de criar dados ou integrações.
