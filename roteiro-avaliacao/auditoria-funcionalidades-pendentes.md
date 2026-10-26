# Auditoria de funcionalidades pendentes — Valora

## Retorno do usuário e ajuste do topo móvel — 26/10/2026

- Usuário confirmou o funcionamento da troca efetiva de senha após o merge da PR #74. Validação de senha concluída.
- Seletor de carteira do topo ocultado nas telas móveis/PWA, pois a troca por gesto já está disponível. Mantidos o período global no topo e o seletor de carteira no desktop.
- Ajuste móvel aguarda publicação e conferência do usuário.

## Prioridades médias implementadas — 26/10/2026

- Branch `codex/prioridades-medias`; aguardam revisão, merge pelo usuário e homologação em produção.
- Período global: barra superior disponível em telas estreitas, com quebra de linha e intervalo personalizado adaptável. Continua sendo o mesmo estado usado pela evolução do patrimônio, sem outro seletor sobre o gráfico. Não declarar homologação em aparelho real.
- Conta: formulário de nova senha e confirmação, política compartilhada, mensagens de erro/sucesso, cancelamento e suporte ao nonce de reautenticação exigido pelo Supabase. Formulário conferido no navegador local; credenciais da conta real não foram alteradas. Envio e reautenticação cobertos por testes com dublês; troca real fica para o usuário.
- Composição: usuário definiu metas por classe. Editor por carteira, soma de 100%, valores entre 0 e 100 e diferença em reais sobre o patrimônio completo, incluindo renda fixa. Os filtros visuais de Ativos não mudam a base das metas. Diferença representa realocação no patrimônio atual, não valor de aporte para atingir a meta sem vendas. Não executa ordens. Metas de teste não foram salvas na carteira real.
- Migração `20261026031629_wallet_allocation_targets.sql` aplicada ao Supabase: coluna JSON em wallets, validação no banco e permissão de atualização restrita à coluna, mantendo RLS de proprietário. Teste SQL 041 passou para persistência, limites, soma e isolamento entre usuários; fixture revertida integralmente.
- Ativos: seletor reaproveita regras e preferência de score existentes, calcula com os fundamentos disponíveis e permite a coluna Meu score no editor. Score também aparece nos cards de celular. Conferido no navegador local com preferência existente; valores ausentes aparecem como —.
- Proventos: Pagos considera apenas datas de pagamento informadas até hoje, inclusive na consulta compartilhada usada pelos resumos. Anunciados / a receber separa pagamentos futuros datados de registros sem data. Estes últimos podem já ter sido pagos e não comprovam valores a receber. Horizonte, busca, moeda nativa e estimativa de quantidade são explícitos; compra na data ex não cria direito. Consulta paginada e cache por carteira/situação. Não cria novos anúncios nem adiciona provedor de dados; análise ainda se restringe aos ativos atuais da carteira, sem conciliação de crédito na corretora.
- Validação automatizada: 64 testes principais em 9 arquivos, 2 do editor de metas e 103 de regressão em 10 arquivos (há sobreposição de 19 testes entre os conjuntos). Lint dos arquivos alterados e build TypeScript/Vite/PWA passaram.
- Advisors não apontaram a nova função/tabela como problema. Permanecem avisos anteriores: [search_path de funções antigas](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [extensões em public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [execução da função antiga handle_new_user](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) e [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Nenhuma dessas configurações foi alterada neste escopo.

Este estado substitui os apontamentos históricos de controles médios sem implementação. Entrega técnica implementada; validações reais indicadas acima continuam pendentes.

## PR #73 homologada em produção — 26/10/2026

- Merge realizado pelo usuário, commit a081e473da6c25a72d2dcae8a9d471b5baef957e; deploy Vercel success confirmado.
- Aba recarregada para receber a versão nova. Valor atual conferido na rentabilidade para ativo BRL e ativo USD; ambos coincidem com o saldo das mesmas posições na tabela de Ativos.
- **Concluída: coluna Valor atual usando custo e sem conversão USD.** A rentabilidade agora apresenta valor de mercado em BRL nessa coluna. Nenhum movimento financeiro ou cadastro alterado na conferência.

Este estado substitui a pendência de publicação da correção abaixo.

## Correção da coluna Valor atual — 26/10/2026

- Implementada na branch codex/valor-atual-rentabilidade: coluna usa derivePositionRows com a última cotação e o câmbio compartilhado, em vez de quantidade × preço médio.
- Ativos USD convertidos para BRL; dados ausentes, carregamento e falha não substituem valor de mercado por custo ou câmbio local inventado. Ausência de câmbio afeta somente as linhas USD.
- 38 testes direcionados passaram; lint passou. A confirmação em produção depende de revisão e merge pelo usuário.

Este estado substitui a pendência da coluna registrada abaixo; alteração ainda não publicada em produção.

## PR #72 homologada em produção — 26/10/2026

- Merge feito pelo usuário, commit db3b5c886b88e8a4bfc502214337686b14fe40eb; deploy de produção Vercel success confirmado.
- Alternância Todos/FII/Cripto atualiza resumo, linhas por ativo e tabela mensal; mudança do traçado da curva confirmada no SVG renderizado. FII restringe a tabela aos seis ativos dessa classe; retornar a Todos restaura 27 ativos.
- Período 1 mês produz resultado diferente de Desde o início. Dataset desta carteira não demonstrou visualmente um intervalo de preços superior a um ano; cobertura desse caso foi validada com aquisição de 2020 nos testes automatizados, sem declarar homologação histórica por extrato.
- Controles restaurados para Desde o início/Todos os tipos. Nenhum dado de carteira alterado.

Concluídos os controles de tipo e período da PR #72. Mantidas as limitações de metodologia registradas abaixo.

Nova pendência confirmada na revisão: a coluna Valor atual da tabela de rentabilidade exibe quantity × average_price, formatado em BRL até para ativos USD. Corrigir para valor de mercado com conversão, ou alinhar o rótulo e a moeda ao custo exibido, sem confundir com o filtro já homologado. Evidência: DesempenhoRentabilidade.tsx, cálculo de qty/avgPrice e célula Valor atual.

## Rentabilidade: filtros e período completo — 25/10/2026

- Implementado na branch codex/filtros-rentabilidade: classe selecionada aplicada às posições que geram série, resumo, tabela mensal, tabela por ativo e consulta de proventos. Dropdown usa as classes da carteira selecionada, sem perder as demais opções ao filtrar.
- Desde o início usa a aquisição mais antiga das posições analisadas, sem teto de 365 dias. Histórico de preços já paginado; benchmarks passam a paginar e a rentabilidade solicita proventos completos. Falha numa página não entrega resultado truncado como completo.
- Chave de cache dos proventos inclui carteira, início efetivo e classe. Carteira ainda carregando não consulta todas as carteiras por engano. CSV corrige a unidade de vs CDI para pontos percentuais.
- Validação: 80 testes passaram em 8 arquivos; build TypeScript/Vite/PWA e lint dos arquivos alterados passaram. Aguarda revisão e publicação; merge exclusivo do usuário.
- Preservada a metodologia existente de rentabilidade baseada nas posições atuais e preços: não é uma nova reconstrução de TWR por todos os aportes/resgates, nem passa a incluir posições já encerradas. O ganho por ativo continua comparando cotação atual com preço médio, com proventos do período selecionado.
- Prioridades altas encerradas como validação técnica, conforme alinhamento com o usuário. Conciliação externa fica como validação futura, sem equivaler os testes isolados a movimentação financeira real.

Este estado substitui os apontamentos históricos abaixo sobre filtros ainda desconectados e teto de um ano.

## Extrato externo recebido — 25/10/2026

- Usuário forneceu extrato consolidado de outubro dos dois títulos do Tesouro, com investido, saldo bruto, líquido e quantidade. O documento apresenta uma posição consolidada, sem histórico de compras, cupons ou resgates.
- Usuário esclareceu depois que o extrato é de outra conta. A comparação não comprova divergência cadastral nem erro de cálculo no Valora; hipótese anterior de cadastro incorreto descartada. Nenhum cadastro/saldo alterado.
- Saldo bruto do extrato também difere da estimativa contratual do aplicativo. O extrato do Tesouro reflete preço de mercado; o aplicativo informa estimativa bruta sem marcação a mercado. Não tratar a diferença inteira como erro aritmético nem criar cupom/resgate para ajustar saldo.
- Usuário esclareceu que o lançamento BTC era teste. Está identificado como exceção de teste, ainda persistido; nenhuma exclusão ou reconstrução de posição foi executada.
- Arquivo privado e valores detalhados não foram adicionados ao repositório. A comparação detalhada foi apresentada no chat a partir do documento original.

O extrato de outra conta não é base para ajustar a carteira de teste. Lançamento de teste identificado e preservado. Testes técnicos isolados aprovados; conciliação com extrato correspondente fica para validação futura.

## Conciliação interna ampliada — 25/10/2026

- 20 testes direcionados passaram em 6 arquivos: histórico mensal, câmbio, renda fixa histórica, painel de recebimentos, serviço e função de recálculo.
- Teste SQL 040 repetido no Supabase: PASS para cupom, resgate parcial/total, limites, cronologia, idempotência e RLS entre usuários. Transação encerrada com rollback de todos os fixtures; nenhum movimento persistido na carteira.
- Conferência somente de leitura da carteira autorizada: as 27 posições atuais conferem com as compras em quantidade e preço médio, dentro das precisões armazenadas. Essa carteira não possui vendas registradas no conjunto conferido.
- Fechamento de setembro reconstruído independentemente por SQL a partir das movimentações e últimos preços até 30/09. Conversão pela PTAX oficial BCB de venda de 30/09/2026: 5,1809. A soma com a estimativa de renda fixa coincide, ao centavo, com o gráfico; custo convertido também coincide. Isso valida a consistência interna, não a correção das cotações de origem ou de um extrato externo.
- **Exceção pendente de decisão do usuário:** há uma compra BTC sem posição atual ou venda correspondente. Perguntado se o lançamento é válido ou teste. Nenhuma exclusão, recálculo de posição ou alteração de dados realizada.
- Perguntado sobre disponibilidade de extratos externos. Até recebê-los, não marcar conciliação por corretora/Tesouro como concluída. A homologação técnica de cupons/resgates passou; o teste com recebimento real continua dependente de dados/documento do usuário.

Prioridades altas restantes: resolver a exceção BTC conforme a intenção do usuário e conciliar com extratos. A evidência de testes isolados não deve ser apresentada como homologação de movimentação financeira real.

## Homologação da PR #71 em produção — 25/10/2026

- Merge realizado pelo usuário, commit 3ac716ca19c27ce31e5bbd7f7daad8cd7ad2f866; deploy Vercel success confirmado.
- Após recarregar a produção, Posições, Composição e Lançamentos apresentam os mesmos patrimônio, investido e ganho do Início para a carteira mista. Contagem inclui os dois títulos; tabela própria e classe Renda Fixa presentes.
- Filtro Renda Fixa conferido em produção: isola os dois títulos, saldo, principal e ganho correspondentes. Filtros limpos ao final; visão completa restaurada.
- **Concluído: divergência dos totais causada pela exclusão de renda fixa em Ativos.** Permanecem pendentes conciliação histórica com extratos e homologação real de cupons/resgates; não houve alteração de posições ou movimentos nesta verificação.

Este estado substitui a pendência de publicação da correção abaixo.

## Homologação após PR #70 — 25/10/2026

- PR #70 integrada pelo usuário; deploy do commit de merge ce05935520afd7ad5b8d632df79fceaa79e21987 com status Vercel success.
- Usuário confirmou cadastro com uma nova conta Google externa e login funcionando em produção. OAuth externo homologado por relato do usuário.
- Conferência em produção com carteira contendo renda variável e dois títulos de renda fixa: Início inclui ambas; Ativos → Posições e Lançamentos omitem renda fixa nos KPIs. A diferença de patrimônio corresponde à soma dos current_value dos dois títulos; a diferença no investido corresponde à soma dos principais. Causa confirmada no código: essas telas derivam os KPIs somente de usePositions/derivePositionRows, enquanto Início usa useWalletTotals incluindo fixed_income_positions.
- **Alta pendente: incluir renda fixa nos totais e na apresentação de Ativos**, alinhando Posições, Composição e Lançamentos ao mesmo escopo de carteira/filtros, sem apresentar totais parciais como patrimônio total. Rever também carregamento/ausência de câmbio, pois as telas de Ativos ainda têm fallback local de 5.
- O último ponto do histórico mensal coincide com o patrimônio do Início. Filtro Renda Fixa apresenta principal e ganho compatíveis com os títulos cadastrados; filtro 1M reduz o gráfico ao mês atual. Controles restaurados a 1A/Todos os tipos após o teste.
- Não existem recebimentos de renda fixa registrados nessa carteira. Cupons/resgates permanecem cobertos pelos testes automatizados, mas sem homologação por extrato real nesta etapa. Nenhum movimento foi criado, excluído ou recalculado durante a conferência.
- A conferência confirma consistência interna nos pontos acima; não substitui conciliação dos fechamentos históricos e estimativas com extratos externos. O seletor atual de carteira não exibe valor monetário, portanto não houve comparação visual de total nele.

Este registro substitui os estados anteriores quando houver divergência. A falha foi corrigida localmente na branch codex/ativos-totais-renda-fixa: cálculo compartilhado entre as três abas, renda fixa na composição por classe/ativo, tabela própria com principal restante/saldo/ganho/peso e contagem combinada. Filtros de classe/nome se aplicam também aos títulos. Ausência de câmbio, carregamento ou falha não produzem patrimônio parcial apresentado como total. O CSV existente continua exportando renda variável, com escopo explícito no tooltip. Aguarda revisão e publicação; nenhum merge automático.

Validação da correção: 14 testes de Ativos e 6 de consistência do total da carteira passaram, além do build TypeScript/Vite/PWA e lint dos arquivos alterados. O teste de histórico do total da carteira teve seus mocks atualizados para as consultas históricas introduzidas na PR #70, sem chamadas remotas durante o teste. A conferência final em produção depende do merge/publicação pelo usuário.

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
