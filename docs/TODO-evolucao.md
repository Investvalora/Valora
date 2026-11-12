# TODO ativa de evolução do Valora

**RP09 — defeito reproduzido em teste real:** responsável confirmou revogação e redirecionamento ao login sem explicação. Correção local mantém motivo em memória e mostra aviso no login móvel/desktop, distinguindo logout voluntário. [Registro](aviso-login-sessao-encerrada-2026-11-12.md). Publicação e reteste pendentes.

**Correção local após teste físico:** lançamento rápido com rascunho de oito horas no dispositivo, restauração explícita e limpeza ao cancelar/logout; barra inferior não confunde janela menor sem edição com teclado. [Escopo e limites](correcao-rascunho-dispositivo-2026-11-12.md). Publicação/reteste pendentes; revogação da conta de teste ainda não executada.

**Android físico12/11 — parcial:** Galaxy A31/PWA instalado: início, score, lançamento sem salvar, teclado e retorno pelos recentes passaram. Reabertura via launcher recriou a tela sem rascunho; investigar separadamente. Tempos de Activity não são benchmark web. Worker antigo e revogação da conta de teste ainda não validados. [Registro](homologacao-android-fisico-2026-11-12.md).

Reteste físico complementar: quantidade3 preservada no retorno normal pelos recentes e cancelada sem salvar. Três aberturas detectaram valores do início em até6,51/4,83/5,05s, incluindo observação ADB; sem métricas web ou comparação antes/depois. Fallback internacional observado às13h11/14h11 com sucesso. Não encerra atualização de worker antigo, recriação da sessão de aba, fila integral ou revogação entre dispositivos.

**PR146 publicada e homologada na web em12/11:** merge `bcb245a`, CI/main e Vercel aprovados. Prévia do score, pontos negativos, cancelamento, lançamento sob demanda e recuperação de senha conferidos sem gravações. [Evidências](homologacao-producao-pr146.md). Substitui os estados de publicação pendente desta rodada; critérios físicos e limites legados continuam abertos.

**Homologação local conjunta 12/11:** correções RP-04/06/07/09 aprovadas em 1.334 testes, build/PWA e conferência autenticada sem gravações. [Evidências e limites](homologacao-tecnicas-2026-11-12.md). Publicação e critérios físicos continuam pendentes.

Consolidada em 06/11/2026 a pedido do responsável. Esta é a lista de acompanhamento das melhorias discutidas nesta rodada; os relatórios anteriores preservam evidências e histórico. Checkbox marcado significa critério concluído e documentado, não apenas código iniciado.

Priorizar fontes gratuitas. Disponibilidade de dados será validada antes de prometer cobertura. Cada entrega deve preservar funcionalidades existentes, receber testes apropriados e seguir por PR; merge pelo responsável.

## Estado atual — após homologação PR143, 12/11/2026

- Concluídos em produção: total investido histórico (PR128), importação CSV e precisão/persistência (PR132/141), fontes alternativas MA/Alpha/Marketstack, líquido informado de MA e especial COST com ex confirmada (PR143).
- PR144 publicada; execução forçada autorizada encerrou a homologação funcional: macro v14 recalculou13 posições e registrou a pendência esperada do Selic. Corrigido 401 do caminho cron por validação segura da credencial legada; internacional v10 retornou200/auditoria salva em repetição real. Cron ativo; cadência contínua fica em acompanhamento, sem bloquear o aceite funcional. Entradas financeiras preservadas.
- Validação operacional: confirmar execução automática do novo fallback e o próximo macro/Tesouro (17h Brasília; repetição20h). Execução manual aprovada não substitui essas evidências.
- Selic desconhecido encerrado operacionalmente: após autorização expressa do responsável, somente o cadastro de principalR$1.010/quantidade100/vencimento10/10/2027 foi desativado. Registro preservado, sem correção por suposição ou exclusão; demais posições e Investidor10 intactas. Não participa mais do recálculo de ativos.
- Cobertura não é universal: ausência de calendário permanece explícita; acompanhar ativos não suportados/conflitos, sem presumir pagamentos, impostos ou quantidades.
- Técnicas gerais continuam separadas: RP04, RP06, RP07 e RP09. Segurança SEG07 depende de plano pago.

[Implementação da próxima etapa](observabilidade-filas-e-jobs-2026-11-12.md). Os registros abaixo preservam a cronologia; textos antigos de publicação pendente não reabrem entregas já homologadas.

## Histórico consolidado — entregas anteriores

**MA — alternativa gratuita local e líquido conciliado:** [descoberta e limites](cobertura-ma-comunicados-2026-11-12.md). Feed público de comunicados Nasdaq por ticker confirmou dois releases oficiais Business Wire, com parser estrito e ex independente obrigatória no banco; implementação aguarda replay/probe hospedado e publicação. Titular confirmou09/11: bruto USD0,06/imposto0,02/líquido0,04; recebimento pessoal parcial registrado sem alterar os anteriores. COST ainda sem ex primária confirmada; cadastro Selic de outra conta depende de extrato. Novo diagnóstico Tesouro só poderá ser observado após próximo cron às17h Brasília. Finnhub dividendos exige Premium; não resolve essas pendências gratuitamente.

**Primeira execução automática internacional confirmada em12/11 às08h29 Brasília:** [run43209530449](https://github.com/Investvalora/Valora/actions/runs/43209530449), evento schedule, merge9226169, sucesso. SEC AAPL inspecionou1 documento/zero anúncios; last_success_at confirmado no banco. Nasdaq BRK.B/CR diagnosticadas como identidade não suportada, sem gravações.207 recebimentos e hash `b3ba248bfc7107f7a33bee59e66624af` preservados. Encerra a dúvida sobre disparo automático, mas não comprova cadência15min: API retorna somente1 execução schedule, com41 tarefas primárias/45 SEC vencidas. Manter acompanhamento da frequência e escoamento das filas; não declarar cobertura contínua completa.

**PR142 publicada e verificada tecnicamente:** merge9226169, calc-fixed-income v16 ACTIVE, autenticação401 sem token e código remoto com diagnóstico específico confirmados.15 posições com hash integral preservado antes/depois; nenhum recálculo manual.44 testes locais cobrem ausência/preço antigo/resposta inválida e marcação válida. Cadastro Selic sem referência segue aguardando extrato; observar próxima execução e cron internacional permanece pendente. Ver diagnostico-tesouro-sem-preco-2026-11-12.md.

**Exceção Tesouro investigada em12/11:** [diagnóstico](diagnostico-tesouro-sem-preco-2026-11-12.md). Cadastro Selic2027-10-10/quantidade100 sem preço correspondente; três lotes confirmados da Investidor10 atualizados normalmente. Não corrigir título/quantidade por suposição. Diagnóstico mais específico implementado localmente,12 testes aprovados; publicação pendente. Cadastro segue dependente de extrato do titular; nenhum saldo ou lançamento alterado. Cron internacional ainda sem evento schedule observado.

**PR141 publicada e homologada na interface de produção:** merge37d99cd, CI da main43146101618 e deploy aprovados. Bundle de importação corrigido confirmado; prévia/edição preservam decimais e rejeitam nove casas. Nenhuma confirmação de importação real; rascunho sintético removido. Persistência exata e fronteiras1000/1001 comprovadas no SQL local com rollback. Cron atualizado na main, mas ainda sem execução schedule registrada: recorrência internacional continua aberta. Evidências em prioridades-alt03-recorrencia-2026-11-11.md.

**Homologação local CSV complementar aprovada:** teste integrado arquivo→prévia editada→mutation/serviço→RPC simulada preserva todos os dígitos;30 cenários nesta rodada. Navegador autenticado confirmou prévia/edição exatas e rejeição de nove casas. Sem confirmar importação real; rascunho sintético descartado. TypeScript/lint aprovados. Correção pronta para PR; recorrência cron aguarda publicação/observação, conforme prioridades-alt03-recorrencia-2026-11-11.md.

**Prioridades altas — auditoria e correção local:** [precisão CSV e recorrência](prioridades-alt03-recorrencia-2026-11-11.md). Encontrada perda potencial de dígitos no envio CSV por Number; transporte passa a texto decimal exato, compatível com a RPC publicada.29 testes e fixture SQL com persistência/fronteiras1000/1001/idempotência aprovados, sem escrita em produção. ALT03 aguarda publicação desta correção. Recálculo automático observado às20h Brasília:13 atualizações e uma falha explícita de preço Tesouro; recorrência comprovada, sucesso integral não. Internacional continua sem evento schedule observado; alteração local do cron tenta reativá-lo mantendo15min, com validação pós-merge pendente.

**PR140 homologada em produção:** merge `756fb63d3a1214eb3ecdfcd2609306bc96fc95ba`, CI da main [43142821954](https://github.com/Investvalora/Valora/actions/runs/43142821954) aprovada. Conferência autenticada no navegador integrado: COST regular USD1,47 uma única vez na lista conciliada; especial USD30 separado com data ex pendente, corte24/11/pagamento04/12 e link SEC. Busca COST/cost e MA sem resultado, período6M e layouts estreito/desktop1365px conferidos, sem overflow horizontal. Retorno a Pagos preservou total R$632,01,151 registros e novembro R$30,92 recebidos/R$40,55 previstos. Nenhum lançamento, recebimento ou carteira alterado. A apresentação pendente descrita abaixo está publicada; ampliar cobertura e observar recorrência automática continuam abertos.

**Atualização PR139:** descoberta SEC publicada e homologada em produção: migration aplicada, função v7 e lote OIDC com dois anúncios COST, zero conflitos e recebimentos preservados. Ver evidências em descoberta-sec-dividendos-2026-11-11.md. Essa atualização substitui a publicação pendente nos registros anteriores. Recorrência automática ainda precisa observação.

**Próxima etapa em implementação:** apresentação de declarações SEC com ex a confirmar na aba Anunciados / a receber. Filtragem pela carteira/período/busca, classificação ordinário/especial e documento oficial; sem quantidade elegível, total pessoal, conversão ou participação em gráfico/DY/Bazin. Oculta apenas eventos com calendário/valor já conciliados na base de dividendos. Sem nova migration ou alteração de recebimentos. Homologação visual e publicação permanecem pendentes.

Validação local desta etapa:13 testes aprovados (serviço, troca de conta/carteira, componente e regressão de proventos mensais), TypeScript, ESLint e build/PWA104 arquivos aprovados. Branch `codex/anuncios-sec-pendentes`. Sem sessão local aberta no navegador para conferência visual nesta rodada; não declarar homologação visual ou produção da nova seção concluída.

Homologação visual local concluída após login do responsável: aba Anunciados, busca COST/cost e MA sem correspondência, período6M e layouts estreito/desktop1365px conferidos. COST regular USD1,47 aparece uma única vez na lista conciliada; especial USD30 aparece separado com corte24/11/pagamento04/12, sem quantidade ou total pessoal. Base pública confirma essa separação. Retorno a Pagos preservou R$632,01/151 registros e novembro R$30,92 recebidos + R$40,55 previstos. Sem rolagem horizontal no desktop (scrollWidth=innerWidth=1365). Carteira apenas consultada; nenhum lançamento criado ou alterado. Esta atualização encerra a pendência visual local acima, mas não a publicação da interface.

**Descoberta SEC genérica implementada localmente:** [escopo, testes e limites](descoberta-sec-dividendos-2026-11-11.md). Catálogo ticker/CIK,8-K e fila por ativo USD compatível; dois anúncios COST localizados sem lista fixa de carteira. Ledger separado distingue ordinário/especial e mantém ex não confirmada fora dos cálculos.70 testes e SQL local aprovados. Probe hospedado SEC aprovado na PR139; revisão/publicação e futura apresentação/conciliação dos pendentes ainda necessários; não equivale a cobertura integral dos ativos americanos.

**Revisão MA/COST concluída:** [evidências e limites](revisao-cobertura-ma-cost-2026-11-11.md). MA segue bloqueada403, inclusive Node; índice SEC acessível não fornece os comunicados trimestrais esperados. Divergência COST de outubro encerrada: Nasdaq confirma ex/corte30/10 e SEC confirma corte30/10/pagamento13/11/USD1,47, exatamente como no Valora. Nenhuma data alterada.

**Alta — anúncio especial COST fora da Nasdaq:** SEC8-K de10/11 anuncia USD30, corte24/11 e pagamento04/12; ex independente ainda não confirmada e nenhum evento inserido. Implementar descoberta SEC e anúncio pendente sem inventar ex, mantendo especial separado do recorrente em DY/Bazin. Coletor ainda sem execução schedule observada na API GitHub; workflow/Actions ativos não encerram essa validação.

**PR138 publicada e homologada tecnicamente:** [evidências do isolamento](isolamento-proventos-simulados-2026-11-11.md#homologação-técnica-em-produção--pr138). Migration aplicada, sync-asset-data v7 ativa. Papel authenticated vê1428 eventos reais e zero simulados;178 seed preservados para auditoria. Hash dos207 recebimentos pessoais e dos eventos públicos preservado. Substituição via RPC validada com ROLLBACK; CI/main e deploy aprovados. Sem reteste visual autenticado nesta rodada. Esta atualização substitui a publicação pendente abaixo.

**Isolamento de proventos simulados em andamento:** [inventário e critérios restantes](isolamento-proventos-simulados-2026-11-11.md). Confirmados178 eventos seed/45 ativos. Leituras locais de pagos/anúncios/âncoras B3 excluem seed/synthetic antes da paginação. Proteção RLS, conciliadores e substituição por fonte real preparados na migration local;14 testes e TypeScript aprovados. Cinco regressões SQL locais aprovadas após recuperar Docker; suíte completa1250/1250 e build/PWA aprovados após estabilizar o teste USD. Validação local concluída; publicação pendente. Nenhuma remoção ou alteração em produção.

**PR137 homologada em produção:** [evidências JPM](cobertura-jpm-ri-2026-11-11.md#homologação-de-produção--pr137). Migration aplicada, função v6 ativa, lote OIDC aprovado: dois comunicados JPM/uma atualização de calendário, zero conflitos. Julho completado; outubro preservado; repetição sem nova gravação e207 recebimentos pessoais intactos. Permanecem MA/403, ex independente ausente e observação da recorrência agendada.

**Alta — isolar proventos simulados:** encontrados quatro eventos JPM com `source=seed` em produção, correspondentes à geração trimestral sintética de `supabase/seed.sql`. A consulta de proventos não exclui essa origem. Inventariar os demais ativos, medir impacto em estimativas/cálculos, impedir o consumo como dado real e definir saneamento sem apagar recebimentos pessoais. Nenhum seed removido nesta homologação.

**Próxima cobertura — JPM implementada localmente:** [descoberta no RI e conciliação segura](cobertura-jpm-ri-2026-11-11.md). Comunicados descobertos pelo índice oficial, sem URLs trimestrais fixas. Completa calendário apenas com ex independente já cadastrada e correspondência única; não presume imposto nem altera recebimentos. Testes locais e probe hospedado do RI aprovados na PR137; revisão e publicação pendentes. MA continua separado por bloqueio403.

**PR136 homologada em produção:** [evidências do coletor](coletor-node-internacional-2026-11-11.md#homologação-em-produção--pr136-mergeada). Migration aplicada, função v5 ativa e OIDC real aprovado. AAPL/COST: sete gravações, zero conflitos, nenhum recebimento pessoal criado. Cron antigo inativo; novo workflow configurado a cada15min. Resta observar execução agendada e ampliar cobertura fora da Nasdaq (MA/JPM/RI). Esta atualização substitui o bloqueio operacional descrito abaixo.

**Correção em andamento do bloqueio Nasdaq:** [coletor Node com identidade temporária](coletor-node-internacional-2026-11-11.md). Coleta preparada para runner GitHub e gravação protegida por OIDC da main/lease de uso único; sem exportar service_role. Testes locais aprovados. Validar primeiro o probe hospedado, sem credencial ou gravação, antes de ativar. Cron antigo continua desligado.

**Homologação PR135 encontrou bloqueio:** [resultado de produção](homologacao-producao-pr135.md). Função/migration publicadas e checks aprovados, mas Nasdaq falhou no runtime hospedado (cancelamento/HTTP2/timeout). Zero anúncios gravados. Apenas o novo cron ficou inativo até corrigir e validar acesso hospedado; fontes anteriores e correção MA preservadas. A automação internacional continua em prioridade alta, sem aprovação operacional.

**Correção MA aplicada:** [resultado e testes](investigacao-cobertura-ma-2026-11-11.md#correção-aplicada-após-autorização). Exceção oficial de janeiro/2025 suportada no RPC de produção; anúncio público completado com pagamento07/02/2025, sem mudar ex10/01 nem USD0,76. Recebimentos pessoais preservados. Permanece o HTTP403 e a automação de descoberta de novos comunicados.

**Cobertura MA — causa identificada:** [investigação e solução proposta](investigacao-cobertura-ma-2026-11-11.md). RI retorna403 e o conciliador recusa uma exceção legítima de calendário (record09/01/2025, ex10/01/2025). Preservar a data existente; acrescentar exceção comprovada e alternativa oficial de documentos. CDN/SEC acessíveis, mas descoberta de próximos anúncios ainda precisa implementação/validação. Nenhum dado alterado.

**Próxima prioridade implementada localmente:** [anúncios internacionais automáticos](anuncios-internacionais-2026-11-11.md), via catálogo e fonte pública Nasdaq para ações ordinárias compatíveis. Testes locais de parser/segurança e SQL aprovados; AAPL/COST consultados no Deno, MA explicitamente fora da cobertura. Ainda exige revisão, publicação e observação dos jobs; não encerra toda a cobertura internacional.

**Atualização PR134:** correção CDI chegou à main e `calc-fixed-income` v15 foi publicada. [Homologação técnica em produção](homologacao-producao-pr134.md): autenticação e os seis intervalos reais validados em leitura com a série de 540 referências. Nenhum saldo recalculado manualmente. Resta observar o próximo recálculo automático e a CI do merge; não há mais pendência de publicar a função CDI.

**Homologação atual:** [PR132 em produção e encaminhamento CDI](homologacao-producao-pr132-133.md). CSV publicado e validado, migration aplicada e sincronização de pagamentos v3 ativa. PR133 foi mergeada em outra branch; CDI ainda fora da main. PR134 aberta para corrigir esse encaminhamento. Essa atualização prevalece sobre menções anteriores a publicação pendente do CSV.

Rodada prioritária em andamento: [correções locais, testes e limites](prioridades-dados-csv-2026-11-11.md). CSV ganhou bloqueio de perda de precisão no parser e migration equivalente; 25 testes aprovados. Replay SQL isolado e publicação pendentes. Diagnóstico dos erros de pagamentos detalhado; automação internacional e calendário CDI ainda abertos.

Atualização após PR132: prévia CSV homologada localmente e replay SQL aprovado na CI; publicação continua pendente. Próxima correção local: [cobertura CDI por dias bancários](cobertura-cdi-dias-uteis-2026-11-11.md), com calendário ANBIMA e detecção de um único dia útil ausente. Quatorze testes aprovados; sem recálculo em produção. Critério CDI permanece aberto até publicação e conferência dos lotes.

Homologação local CDI concluída no Deno: função verificada, 719 taxas públicas de 2024–2026 aceitas e três remoções controladas em memória detectadas com a data exata. Nenhum saldo real recalculado.

Esta atualização prevalece sobre menções históricas a “local”, “falta publicar” e checkboxes ainda amplos nas seções seguintes.

- Concluídos e homologados no navegador de produção: custo histórico do total investido (PR128), quatro ajustes da semana 4 (PR130), tooltip de proventos e parcelas B3 (PR131). Calendário dos eventos identificados de novembro recuperado; recebimentos Nomad preservados.
- CSV: formato decimal explícito publicado e arquivo real de 27 linhas validado sem importação; faltam fechar todos os critérios de ALT-03, incluindo persistência/limites na versão atual em ambiente de teste.
- PWA: correção de cache contaminado publicada na PR128; falta comprovar recuperação de instalação antiga e concluir validação física. Não permanece como código aguardando publicação.
- Prioridades de dados ainda abertas: automatizar anúncios internacionais futuros e ampliar cobertura de calendários; confirmar líquido pessoal de MA quando houver extrato; conciliar divergência de data ex COST; completar diagnóstico/cobertura CDI e acompanhamento das filas/orçamento dos jobs.
- Técnicas ainda abertas: critérios restantes do catálogo compartilhado e intenção dos limites antigos de Dívida/PL (RP-04); recuperação/rascunhos e atualização de PWA antigo (RP-06); medição em aparelho/rede reais (RP-07); sessão revogada entre dispositivos reais (RP-09). Testes controlados e entregas parciais já publicados permanecem válidos.
- Retestes físicos dos gráficos/tooltips das PR130/131 pendentes. Não repetir como pendência geral os fluxos físicos já confirmados pelo responsável em versões anteriores.
- Backlog de produto, indicadores, referências e simulações preservado nas seções 4–6. Proteção nativa contra senhas vazadas segue adiada por depender do plano pago, conforme TODO de segurança.

Evidências atuais: [PR128](homologacao-producao-pr128.md), [PR130](homologacao-producao-pr130.md), [PR131](homologacao-producao-pr131.md) e [conciliação dos proventos](correcao-tooltip-calendario-proventos-2026-11-11.md).

Segurança foi priorizada em seguida: [estado das correções e pendências](TODO-seguranca.md), incluindo proteção de login, dependências e isolamento entre contas.

## 1. Concluir a entrega já implementada

- [x] **ENT-01 — Revisar o diff e abrir PR das melhorias locais.** Entrega na branch `codex/fundamentos-score-alertas`, incluindo fundamentos, score explicado/ponderado, regras de alertas e correções de segurança. Commits separados por melhorias e segurança; arquivos pessoais/gerados excluídos. Backend aplicado; publicação e homologação permanecem em ENT-02/03. Merge pelo responsável.
- [x] **ENT-02 — Retestar a interface em produção após merge/deploy.** Conferir fundamentos por classe, mesma pontuação do ativo, cobertura da média, criação/edição/pausa de regras e preservação dos alertas de preço.
- [x] **ENT-03 — Homologar esta versão no PWA instalado.** Leitura das ajudas, formulários, navegação e um teste autorizado de novo tipo de push. As homologações anteriores de Android/iOS permanecem válidas para suas versões; não equivalem ao reteste desta entrega.

Homologação da PR #108 concluída: CRUD temporário em produção, OAuth/ajudas/score confirmados pelo responsável e push com abertura de Alertas no PWA. Regra removida e aviso encerrado. [Evidências e limites](validacao-producao-pr108.md).

- [x] **ENT-04 — Publicar e retestar payout, moedas e diagnóstico.** PR #109 mergeada, deploy e CI da main aprovados. Payout, YOC/BRL/USD, recebimentos, meses fechados e diagnóstico por lote conferidos no navegador integrado, em desktop e layout móvel. [Evidências e limites](validacao-producao-pr109.md). Na Minha Carteira, a lacuna de IPCA em 31/10 persiste porque a fonte consultada ainda termina em setembro; o aviso correto foi preservado. Seleção Investidor10 e colunas restauradas, sem alterações financeiras.

Detalhes e testes já executados: [melhorias gerais](melhorias-gerais-2026-11-06.md).

## 2. Alta — confiabilidade dos cálculos e dados

### Quarta bateria — triagem em 11/11/2026

[Lista e critérios de aceite da semana 4](TODO-quarta-bateria.md): tooltip da rentabilidade (S4-01), referência do retorno de meses fechados versus lucro atual (S4-02), título de Explorar (S4-03) e avatar por ticker em Lançamentos (S4-04). Implementados, publicados na PR130 e [homologados em produção](homologacao-producao-pr130.md) em 11/11, em desktop e layout de 390 px. Validação local: 113 testes, build e lint aprovados; meses fechados preservados. Permanece o toque no PWA físico. Relatório confirma sete correções anteriores.

### Relatos prioritários — 10/11/2026

**Atualização de 11/11 — proventos mensais:** [tooltip e conciliação de novembro](correcao-tooltip-calendario-proventos-2026-11-11.md). Tooltip e consumo genérico das parcelas oficiais B3, incluindo KLBN4, publicados na PR131 e [homologados em produção](homologacao-producao-pr131.md), em desktop e layout de 390 px. Novembro: R$40,55 a receber + R$30,92 recebidos = R$71,47. Calendário público de COST/AAPL reparado pontualmente; recebimentos Nomad preservados. Pendente toque físico. Prioridade alta: automatizar descoberta de anúncios futuros internacionais com fonte primária e conciliar cobertura/datas ex, sem extrapolar pagamentos nem aplicar imposto presumido como líquido recebido.

Os três pontos abaixo foram relatados pelo responsável e precisam de reprodução e diagnóstico; ainda não representam causas confirmadas ou correções concluídas. Preservar os lançamentos da carteira Investidor10 durante a investigação.

- [x] **ALT-01 — Total investido variando sem lançamento.** Reproduzir a alteração mantendo os mesmos lançamentos e variando cotações/câmbio. Separar custo de aquisição de patrimônio a mercado: o investido deve refletir o custo histórico, incluindo despesas de compra já adotadas, e mudar somente por movimentações pertinentes ou suas edições/exclusões; não por valorização ou câmbio atual. Conferir renda fixa (principal versus rendimento), ativos BRL/USD, compras, vendas e custos nas telas que apresentam o total. Aceite: atualizar cotações sem alterar o investido; reconciliar mudanças por lançamento e comparar com o Investidor10 na mesma base/data, sem forçar igualdade.
  - Causa confirmada no código em 10/11: resumo e Ativos convertiam custo USD pelo câmbio atual; o gráfico também limitava o aplicado ao patrimônio em situações de prejuízo. Correção local usa custo remanescente das compras com despesas, PTAX histórica por aquisição e baixa proporcional nas vendas, isolado por carteira. Saldo inicial sem movimentos usa a referência da data de aquisição; histórico incompatível ou câmbio ausente fica indisponível, sem fallback para dólar atual. Renda fixa mantém principal restante separado do rendimento. PTAX é referência, não comprovação do câmbio efetivo da remessa. Publicação, homologação visual e comparação na mesma base com I10 permanecem pendentes. [Fórmula, testes e limites](correcao-total-investido-2026-11-10.md).
  - Homologação visual local concluída em 10/11: Início/Posições/Composição/Lançamentos concordam em investido 18.483,17; gráfico mantém esse aplicado em outubro e novembro apesar de patrimônios diferentes. Recarga e layout móvel conferidos. Corrigido também o centavo causado pelo preço médio arredondado, usando o custo dos movimentos BRL quando disponível. Regressão final: 51 testes. Permanecem publicação, reteste de produção e comparação com I10 na mesma base.
  - Comparação pública em 10/11: 30 posições de renda variável coincidem em quantidade/preço médio visível; investido I10 18.677,67 versus local 18.483,17, diferença 194,50. A conversão implícita dos custos USD e a variação do aplicado entre outubro/novembro no I10 são compatíveis com convenção cambial variável, mas a fórmula interna não foi comprovada. Não forçar igualdade mudando dados. [Conferência e limites](comparacao-investidor10-2026-11-10.md).
- [x] **ALT-02 — Proventos recebidos no mês não aparecem atualizados.** Calendário público de GARE11, VGHF11 e MA corrigido e conferido localmente: total Tudo R$ 804,55 (R$ 776,35 líquidos importados + R$ 28,20 estimados brutos). JPM/TFLO da Nomad preservados. Rotina Fundos.NET preparada e testada; falta publicar função/migration/cron e acompanhar bloqueio HTTP 403 do RI Mastercard. Não presumir líquido pessoal nem igualar o total ao Investidor10. [Diagnóstico e publicação](correcao-proventos-2026-11-10.md).
  - Comparação em 10/11 confirmou diferença de 27,79 tanto no total recebido (Valora776,35 / I10 804,14) quanto em12M (603,81 /631,60). Identificar eventos e critério bruto/líquido antes de corrigir; não preencher pela diferença sem evidência.
- [x] **ALT-03 — Revisar regras de quantidade na importação CSV.** Conferir quantidade por lançamento e limite de linhas por arquivo. Validar separadores decimais, campos entre aspas, frações e precisão por classe (inclusive cripto); rejeitar quantidades zero, negativas, não finitas ou ambíguas com indicação da linha, sem multiplicação/arredondamento silencioso. Conferir limites de linhas e mensagens nos casos de fronteira. Aceite: prévia e gravação aplicam as mesmas regras; testar frações, formatos aceitos/rejeitados, duas linhas legitimamente iguais e repetição do lote, preservando atomicidade e proteção contra duplicação.
  - Confirmado em 10/11 com CSV fornecido pelo responsável: 27 compras, 13 quantidades fracionadas, nenhuma linha exatamente duplicada. O parser rejeita todas com 54 erros (27 de quantidade e 27 de preço), pois reutiliza a regra de digitação pt-BR e recusa ponto decimal, inclusive em `46.00000000`. Conversão somente em memória para vírgula produziu 27 linhas sem erros. Corrigir a compatibilidade de formato do CSV com convenção explícita/sem adivinhar valores ambíguos e mensagens que expliquem o separador; conferir também prévia, edição, deduplicação e envio. Arquivo original preservado; nenhuma importação executada. Validação sintática não comprova correspondência com os ativos cadastrados nem ausência de duplicação na carteira.
  - Correção local: seletor explícito de vírgula/ponto decimal, com exemplos e normalização para o formato interno pt-BR, preservando as casas do arquivo. Mudar a escolha relê o arquivo; prévia editável e rascunho usam vírgula. Formato com ponto não aceita agrupamento de milhares nem convenções misturadas; não há detecção por suposição. Mensagens orientam conferir a convenção. Regressão de parser, duplicatas e interface: 22 testes aprovados, incluindo edição/restauração após normalização. O CSV real passou com 27 linhas, zero erros e valores numéricos preservados; não foi importado. Publicação/homologação e os demais critérios de ALT-03 continuam pendentes.

- [x] **RP-01 — Corrigir a base do payout.** Usar distribuição e lucro da empresa compatíveis por período, moeda e unidade. O resultado não deve depender de compras, vendas ou proventos recebidos pessoalmente. Tratar lucro não positivo e dados ausentes. Validar antes de disponibilizar payout no score.
- [x] **RP-02 — Padronizar moedas nos proventos e YOC.** Impedir soma direta de BRL/USD; preservar valores originais e definir conversão histórica quando necessária. Testar recebimentos importados em BRL, eventos em USD, retenção e mudanças de quantidade. Câmbio ausente deve gerar indisponibilidade.
- [x] **RP-03 — Diagnóstico acionável do histórico incompleto.** Identificar ativo/título/lote, datas e informação faltante; oferecer atualização ou orientação de cadastro. Validar a causa de renda fixa por lote. Preservar meses fechados e lacunas reais, sem apenas ocultar o aviso.

RP-01/02/03 implementados e testados na branch `codex/payout-moedas-homologacao`; publicação acompanhada em ENT-04. [Implementação, fórmulas e limites](correcoes-payout-moedas-historico-2026-11-06.md).

Evidências e distinção entre achado de código e impacto ainda não medido: [revisão do projeto](revisao-projeto-oportunidades-2026-11-06.md).

### Reconciliação com Investidor10 — 07/11/2026

[Soluções verificadas, fontes e limites](solucao-reconciliacao-pendencias-2026-11-07.md). Integração local B3/CVM/iShares e reforços de BCB/Tesouro/CoinGecko: [implementação e publicação](fontes-oficiais-2026-11-07.md). JPM permanece sem adaptador homologado; iShares tem descoberta pelo catálogo, sem lista fixa de tickers.

- [x] Publicar correção de proventos totais/lucro: PR110 mergeada e produção conferida, total773,60 e12M603,54. [Evidências](homologacao-producao-pr110.md).
- [x] Adicionar sincronização BR após fechamento e ampliar janela EUA até22h UTC. Migrations aplicadas; atualização BR pontual40/40 sem falhas. Não alterar cotações americanas que concordam entre fontes só para igualar ao I10.
- [x] Publicar remoção do CDI fixo10,5%: função publicada e recálculo autorizado executado. Saldo preservado quando faltam dados; nenhuma taxa arbitrária introduzida.
- [ ] Completar diagnóstico de referência/cobertura CDI: diferenciar data de execução da referência econômica e identificar lacunas internas da série. Publicação do fallback removido não encerra esse critério.
- [ ] Integrar fonte gratuita confiável de datas reais de pagamento/valores líquidos para completar proventos após importação (JPM/TFLO). Yahoo ex_date não comprova pagamento; não copiar arredondamentos nem inventar retenção/câmbio.
- [x] Publicar e homologar a carga inicial das fontes oficiais: migration e10 funções publicadas;4 crons ativos. CVM19301 informes/9 FIIs, B3 diário40 ativos/primeiro lote13 anúncios, iShares20 eventos, cripto12/12. [Evidências e limites](homologacao-producao-pr110.md). Não significa cobertura completa de todos os calendários ou recebimentos líquidos.
- [ ] Ampliar cobertura de calendário de FIIs brasileiros e outros gestores/JPM; rotação/orçamento global dos jobs de cotação em escala. Confirmar processamento das filas automáticas além do primeiro lote antes de declarar cobertura integral.
- [x] Publicar falha parcial observável na ingestão B3 e corrigir ZIP com data descriptor no Edge. Carga HTTP200 validada após correção; mensal indisponível continua explicitamente como cobertura diária. PR111 mergeada com checks aprovados.
- [x] Conferir cadastro Tesouro Selic vencimento10/10/2027, quantidade100, sem PU oficial compatível. Fora da carteira Investidor10. Desativação única autorizada em12/11, sem apagar ou alterar principal, quantidade e vencimento; demais posições preservadas. Cadastro pode ser reativado após esclarecimento, mas já não bloqueia o recálculo dos ativos.
- [x] Retestar em produção a consolidação dos lotes do mesmo Tesouro após merge da PR111: IPCA2029 uma linha/2 aplicações, saldo158,34; compras e datas preservadas.

Atualização das prioridades: custo de aquisição com corretagem/taxas de compra corrigido no banco, com recálculo autorizado; diferença explicada de7,92659 na Investidor10, restando cerca de0,05 para reconciliar. CDI agora grava referência econômica05/11 separada da execução e rejeita lacunas acima de10 dias; critério é conservador e não substitui calendário bancário completo. B3 concluiu22/22 tarefas sem erros,134 anúncios. JPM pagamento31/10 confirmado no RI e complementado como evento público; líquido pessoal não inferido. Tesouro desconhecido pertence a outra conta, não ao titular da Investidor10; preservado e não tratado como cadastro do usuário.

PR112 também separa visualmente líquidos importados e estimativas brutas em Desempenho › Proventos. Fechamento técnico da rodada não significa reconciliação de líquido sem extrato ou igualdade artificial dos centavos com I10. [Estado detalhado](pendencias-prioritarias-2026-11-07.md).

## 3. Média — consistência técnica e operação

**Atualização PR114:** [implementação técnica](pendencias-tecnicas-integridade-2026-11-07.md) e [homologação em produção](homologacao-producao-pr114.md). Contrato frontend/monitor alinhado; importação atômica com recibo e idempotência por conteúdo publicada e retestada com carteira temporária autorizada: duas linhas preservadas, repetição sem duplicar, limpeza integral e Investidor10 preservada. As duas migrations estão aplicadas. Rascunhos da prévia CSV e do lançamento rápido sobreviveram à recarga em produção, sem envio automático. Recuperação de sessão conferida em harness visual isolado; medição inicial do build com rede simulada concluída. Permanecem rascunhos dos outros formulários e teste Android físico, que o titular fará após publicação; não marcar RP-06/RP-07 inteiramente encerrados.

Rodada técnica local iniciada em 07/11/2026: catálogo compartilhado inicial, recuperação de sessão/tela, bloqueio da corrida de importação e divisão de páginas. Os itens abaixo permanecem abertos até atenderem seus critérios completos e homologação. [Implementação, medições e limites](correcoes-tecnicas-2026-11-07.md).

Atualização07/11: implementação inicial publicada pela PR110; início, importação, detalhe e rentabilidade conferidos em produção. RP04–07 continuam abertos pelos critérios restantes abaixo; RP09 precisa do reteste específico de sessão revogada, sem revogar sessões reais inadvertidamente.

- [ ] **RP-04 — Catálogo compartilhado de indicadores.** Centralizar fórmula/convenção, unidade, fonte, referência, classes e operadores para tabela, score, estratégias e alertas. Conferir Dívida/PL; confirmar intenção antes de converter limites antigos.
  - 12/11: intenção da regra original Valor & Qualidade confirmada pelo responsável: 1,5 vez o patrimônio. Correção única autorizada e salva em produção para <150%, mantendo+2, conferida no banco. Pendência de intenção dessa regra encerrada; não implica conversão de regras de outras contas. [Registro](validacao-pendencias-fisicas-operacionais-2026-11-12.md).
  - Continuação local12/11: corrigida leitura direta na prévia para usar catálogo/fonte/classe; unidades compartilhadas com fundamentos, ausência distinguida de reprovação e sinal negativo correto.87 testes aprovados e conferência visual local concluída, com edição cancelada e regra original preservada. [Escopo](consistencia-previa-score-2026-11-12.md). Sem converter limites; publicação pendente.
  - PR120: aviso explícito da interpretação percentual de Dívida/PL nas regras de score e alertas, inclusive nos formulários. Um limite 1,5 continua sendo 1,5%; 1,5 vez equivale a 150%. Nenhum limite personalizado foi convertido. A confirmação da intenção dos limites antigos permanece pendente.
- [x] **RP-05 — Integrar a importação ao fluxo atual.** Entregue na PR114: parser/preview, destino, recibo do lote, duplicação por conteúdo, atomicidade e corrida entre confirmações testados. Homologação com carteira temporária autorizada e limpeza concluída, conforme [registro](homologacao-producao-pr114.md).
- [ ] **RP-06 — Recuperação de erros e de carregamento do PWA.** Adicionar fallback global e nova tentativa; distinguir offline e falha de versão/chunk, preservando dados de formulário. Não prometer gravação offline sem implementação própria.
  - Reteste responsivo12/11: formulário/rascunho/cancelamento passaram em390px e ações cabem em320px. Encontrada barra inferior oculta após redução de altura da janela, recuperada com recarga; revisar detecção de teclado em MobileNav. [Evidência e limites](validacao-pendencias-fisicas-operacionais-2026-11-12.md).
  - Continuação local12/11: ícones também validam MIME e usam somente cache da versão atual; falha de quota ao guardar chunks/ícones não bloqueia resposta válida da rede.16 testes do worker aprovados. [Escopo e limites](recuperacao-cache-icones-2026-11-12.md). Publicação e atualização real de PWA antigo ainda pendentes.
  - Prioridade: corrigir cache de assets com resposta HTML. Homologação PR124 encontrou NovaEstrategiaPage-8fZHJVrF.js com HTTP200, MIME text/html e fromServiceWorker=true; rede direta responde JavaScript. A recarga normal repete a falha. Não concluir homologação integral enquanto persistir. Detalhes em homologacao-producao-pr124.md.
  - Correção local em 10/11: validação de MIME na leitura/gravação de assets e no pré-cache, remoção de entrada inválida, recuperação pela rede sem reutilizar cache HTTP e consulta restrita ao cache da versão atual. A versão do cache também considera o código do worker. Regressão: 12 testes aprovados, incluindo cache contaminado, offline, ativação e clique de notificações. Ainda depende de publicação e reteste do caso real em produção; nenhuma sessão ou carteira foi apagada.
- [ ] **RP-07 — Melhorar carregamento inicial.** Medir em aparelho/rede limitados, dividir rotas e carregar recursos pesados sob demanda. Comparar com o bundle inicial observado de aproximadamente 1,4 MB sem compressão; manter fluxos existentes.
  - Continuação local12/11: formulários públicos e shell autenticado carregados por rota, com proteção e fallback existentes. Entrada gzip -14,3%, início -7,4%, login -4,5%; total JS gzip +1,8%.45 testes aprovados. [Medição e limites](carregamento-rotas-publicas-2026-11-12.md). Publicação e medição física pendentes.
- [x] **RP-08 — CI por PR.** Versionar execução de TypeScript, lint, testes e build/PWA com runtime e lockfile definidos. Testes SQL com fixtures/rollback e tratamento seguro de credenciais. Entregue na PR #108; CI da main e PR aprovadas, com Node 24 nas Actions.

- [ ] **RP-09 — Explicar sessão revogada.** Diferenciar `session_not_found` de indisponibilidade do provedor e orientar novo login. Não aceitar token revogado para silenciar o erro nem alterar o escopo de logout sem decisão explícita.
  - Continuação local12/11: diálogo de revogação confirmada permanece durante retry e indisponibilidade; libera somente após confirmar usuário da sessão atual.10 testes de recuperação aprovados, preservando formulário e isolamento entre contas. [Escopo](recuperacao-revogacao-confirmada-2026-11-12.md). Homologação conjunta e reteste real entre dispositivos pendentes.

## 4. Novas funcionalidades de produto

- [ ] **FUN-01 — Planejador do próximo aporte.** Informar o valor disponível e simular distribuição por classe usando as metas já existentes, com mínimos e sobra de caixa explícitos. Resultado é planejamento, sem execução de ordens.
- [ ] **FUN-02 — Explicar a variação do patrimônio.** Separar aportes/retiradas, valorização, câmbio e proventos; explicitar convenção e evitar dupla contagem. Permitir reconciliar o total com a mesma data/base.
- [ ] **FUN-03 — Exportação completa por carteira.** Incluir lançamentos, renda fixa/eventos, recebimentos e metadados de moeda/fonte, além das posições. Definir formato portável e prévia/validação para eventual restauração, com conferência de duplicatas. CSV atual de posições não é backup completo.
- [ ] **FUN-04 — Meta de renda passiva integrada.** Salvar meta e acompanhar renda efetivamente recebida e distância da meta. Reutilizar calculadoras para projeções, separadas dos resultados realizados e com premissas visíveis.
- [ ] **FUN-05 — Painel de saúde dos dados.** Reunir fonte/data de cotação, câmbio, fundamentos e cobertura histórica. Diferenciar mercado fechado, dado antigo e atualização parcial, aproveitando os avisos e a atualização pontual existentes.

## 5. Novos indicadores — validar fontes antes de incluir

Cada indicador deve ter explicação, unidade, período, fonte, compatibilidade por classe e tratamento de ausência. Investigar integração em tabela, score, estratégias e alertas conforme aplicável, sem substituições silenciosas.

- [ ] **IND-01 — Payout nas regras e estratégias.** Reutilizar somente após concluir RP-01/RP-02 e validar a base fundamentalista.
- [ ] **IND-02 — Dívida líquida/EBITDA.** Obter dívida, caixa e EBITDA comparáveis; separar de Dívida/PL e tratar setores incompatíveis.
- [ ] **IND-03 — ROIC.** Definir NOPAT, capital investido e período; conferir convenção da fonte.
- [ ] **IND-04 — CAGR de receitas — 5 anos.** Validar histórico suficiente e intervalos corretos.
- [ ] **IND-05 — CAGR de lucros — 5 anos.** Definir indisponibilidade para bases não positivas ou série insuficiente.
- [ ] **IND-06 — Margem operacional/EBIT.** Receita e resultado operacional do mesmo período.
- [ ] **IND-07 — Fluxo de caixa livre.** Padronizar fluxo operacional, CAPEX e sinais; identificar a convenção adotada.
- [ ] **IND-08 — Vacância física de FIIs.** Priorizar fundos de imóveis, com período e base de área explícitos.
- [ ] **IND-09 — Vacância financeira de FIIs.** Distinguir vacância, carências e descontos conforme relatório/fonte.
- [ ] **IND-10 — Concentração de FIIs.** Por imóvel/locatário; definir medidas próprias para fundos de papel e fundos de fundos.
- [ ] **IND-11 — WAULT/prazo dos contratos.** Informar prazo e critério de ponderação, com classes compatíveis.

## 6. Referências e evolução das simulações

- [ ] **REF-01 — Concluir a revisão de canais e materiais.** Suno/Tiago Reis, Fundamentei, Clube FII e **A Cara da Riqueza — Diego Bechara**. Rever os vídeos/planilha enviados, registrar o que já existe e validar novas fórmulas antes de atribuir autoria. Transcrições do A Cara da Riqueza não ficaram acessíveis na consulta inicial.
- [ ] **SIM-01 — Comparação com/sem reinvestimento.** Usar o mesmo cenário e as funções existentes, mostrando renda, patrimônio, aportes e caixa lado a lado.
- [ ] **SIM-02 — Sensibilidade das projeções.** Comparar cenários de aporte, inflação e rendimento, distinguindo premissa de dado observado. Reutilizar os simuladores atuais.
- [ ] **SIM-03 — Evoluir a comparação de preço-teto de FIIs com renda fixa.** Conferir o método já implementado e tornar visíveis premissas, impostos simplificados e prêmio de risco. Não apresentar resultado como preço ou rendimento garantido.

Fontes, prioridades de pesquisa e limites de atribuição: [pesquisa de indicadores e canais](pesquisa-indicadores-canais-2026-11-06.md). A evolução da renda mensal e da meta mencionada nessa pesquisa está consolidada em FUN-04.

## Sequência sugerida

Entrega local → payout/moedas → diagnóstico e contrato dos indicadores → robustez/importação/CI → planejador de aporte e explicação das variações → indicadores e simulações conforme fontes validadas. A ordem dentro das etapas pode ser ajustada pelo responsável.

## Decisões preservadas

- A antiga exclusão da migration 018 foi superada pela correção de instalação autorizada na PR113: replay das 61 migrations aprovado localmente e no CI. Não reaplicar o histórico inteiro em produção.
- SendGrid/spam continua adiado enquanto não houver domínio próprio.
- Tokens do Kauê permanecem autorizados conforme decisão registrada na TODO de segurança.
- Recursos já entregues não são reabertos como ausentes: favoritos, edição de lançamentos, exclusão de carteira, metas por classe, busca, push básico, composição por setor e comparação IPCA. Esta lista contém suas evoluções quando explicitadas.

**Complemento PWA — 08/11/2026:** responsável confirmou funcionamento após verificar o ajuste responsivo da barra Renda variável em Ativos › Lançamentos. Correção restrita à busca e aos botões Importar CSV/Lançamento, sem mudança de logo ou formulário. Homologação detalhada em [PR114](homologacao-producao-pr114.md). Medição física de desempenho e rascunhos dos demais formulários continuam separados.

**Reteste publicado PR115 — 08/11/2026:** deploy do merge `ecd7ea9` aprovado na Vercel; barra Renda variável conferida no navegador integrado em 320 e 390 px. Busca e ambos os botões cabem no cartão. Consulta sem alteração de lançamentos. Próxima extensão local de RP-06: rascunho da edição de lançamentos, isolado por conta/carteira/lançamento e snapshot original, restauração explícita e limpeza ao cancelar/salvar. Testes de recuperação e de snapshot alterado incluídos; não considerar os demais formulários concluídos.

Homologação da edição: PR116 mergeada e publicada (`4b6d55a`), checks e deploy aprovados. Em produção, edição reaberta após recarga mostrou quantidade original 20 e opção Restaurar rascunho; restauração trouxe 21; Cancelar removeu o rascunho e nova abertura voltou a 20. Nenhum envio de edição ao banco. Evidências locais em `output/homologacao-pr116/`.

**PR117 publicada e homologada — 08/11/2026:** rascunhos dos dois formulários de criação de alerta de preço e da criação/edição de regras entregues no merge `04d954c`. Checks e deploy aprovados. Produção: preço-alvo 42,5 e referência de regra 8,5 recuperados após recarga; cancelamento limpou os rascunhos, inclusive na folha em 390 px. Nenhum alerta/regra foi salvo. [Escopo e limites](rascunhos-alertas-2026-11-08.md). Evidências locais em `output/homologacao-pr117/`.

**Continuação local — detalhe e edição de alertas:** rascunho no lançamento de renda variável pelo detalhe, separado por conta/carteira/ticker, e na edição de alertas, separado pelo snapshot original. Restauração explícita, preço manual protegido da cotação automática e limpeza no cancelamento/sucesso. 105 testes de regressão aprovados; conferência autenticada local de recarga/restauração/cancelamento sem escrita no banco. [Detalhes e pendências](rascunhos-detalhe-2026-11-08.md). Ainda não publicado.

**Atualização PR118:** merge `0910990`, checks/deploy aprovados e homologação em produção concluída: lançamento do detalhe e edição de alerta restaurados após recarga e limpos ao cancelar, em 390 px. Nenhum envio ao banco. Evidências locais em `output/homologacao-pr118/`.

**PR119 publicada — renda fixa/Tesouro:** merge `fc474d4`, checks/deploy aprovados. Rascunhos dos formulários antigos implementados e testados por conta/carteira/categoria. Conferência visual local isolada concluída; os componentes legados não têm entrada na navegação publicada. Fluxos atuais conferidos em produção sem gravar aplicações. [Escopo e limites](rascunhos-renda-fixa-2026-11-08.md). Evidências locais em `output/qa-legacy/` e `output/homologacao-pr119/`; RP-06 permanece parcial.

**PR120 publicada — RP-09/RP-04:** integração de novo login da mesma conta, isolamento na troca de identidade e resposta tardia verificados com AuthProvider/SessionRecovery reais e respostas simuladas. Corrigida espera indefinida de getUser com limite de 15 segundos e nova tentativa, sem logout. 9 testes de sessão aprovados; nenhuma sessão real revogada. Merge `be6e45e`, CI da main e Vercel aprovados. Avisos de Dívida/PL e atualização ao digitar 1,5/150 conferidos em produção no score e alertas, cancelando sem salvar. [Evidências e limite do teste entre abas](recuperacao-sessao-2026-11-08.md). Reteste real entre dispositivos permanece pendente; não foi provocado timeout Auth em produção.

**Continuação local RP-06 — regras de score:** criação e edição agora preservam rascunho incompleto por conta e snapshot da regra original, com restauração explícita e limpeza ao cancelar/salvar. Alteração da identidade ou do snapshot remonta o formulário sem misturar campos. Sem conversão de limites ou mudança no cálculo. [Escopo e validação](rascunhos-score-2026-11-08.md). Ainda não publicado; RP-06 não está integralmente encerrado.

**PR121 publicada e homologada:** merge `f4eef70`, CI da main e Vercel aprovados. Criação e edição de score restauradas em produção após recarga, cancelamento limpou rascunhos e preservou Dívida/PL original 1,5. Botões de criação acima da navegação e ações de edição visíveis em 390 px. Nenhuma regra salva; evidências locais em output/homologacao-pr121. Substitui o estado local acima; não equivale a aparelho físico.

**Continuação RP-07 local:** formulário rápido carregado somente no primeiro uso, nos atalhos globais e do início; ciclo original de fechar/reabrir preservado. Entrada JS de 737,69 para 705,52 kB; dependências estáticas do início gzip de 247,10 para 243,33 kB. Posições e pré-cache aumentaram ligeiramente, detalhados na [medição](carregamento-inicial-2026-11-08.md). Sem afirmação de ganho de tempo a partir da amostra instável de rede. Ainda não publicado; medição Android físico continua pendente.

**PR122 publicada e homologada:** merge `3e9256b`, deploy e CI da main aprovados. Em produção, formulário solicitado no primeiro clique; rascunho quantidade 2/preço 10 restaurado após recarga em 390 px e limpo ao cancelar. Nenhum lançamento salvo. Evidências locais em output/homologacao-pr122. Substitui estado local acima; validação física de desempenho permanece aberta.

**Continuação RP-06 local — reconexão:** aviso global de erro agora acompanha eventos online/offline do navegador, sem reapresentar conteúdo ou recarregar automaticamente. Após falha de recurso/chunk, botão de recarga aguarda conexão; quando ela volta, disponibiliza a ação explícita. [Implementação e homologação isolada](recuperacao-conexao-2026-11-08.md). Ainda não publicado; não encerra RP-06 inteiro.

**PR123 publicada e homologada — 09/11:** merge `0bb7792`, deploy e CI da main aprovados. Falha controlada de asset na aba de produção mostrou o aviso real; offline bloqueou recarga, online habilitou e clique recuperou a tela. Bloqueios/rede/cache/viewport restaurados; nenhuma regra salva ou sessão revogada. Evidências locais em output/homologacao-pr123. Substitui o estado local acima.

**Continuação RP-06 local — estratégias:** criação/edição com rascunhos por conta e versão original, parâmetros vindos das calculadoras separados, restauração explícita e limpeza ao cancelar/fechar/salvar. Campos incompletos continuam sujeitos às validações de envio. Corrigidas ações da edição ocultas no mobile. [Escopo, testes e homologação local](rascunhos-estrategias-2026-11-09.md). Ainda não publicado; não encerra a recuperação de todos os formulários.

**PR124 publicada — homologação parcial:** merge `19327c8`, CI da main e Vercel aprovados. Criação/restauração passou com bypass temporário do cache; edição/restauração/limpeza passou com cache normal, preservando inflação original5%. Nova estratégia falha com cache normal por HTML servido como asset JS pelo service worker. Bypass foi removido e nenhum dado foi salvo. [Evidências e pendência prioritária](homologacao-producao-pr124.md). Substitui estado local acima; não declarar tudo aprovado.
# Complemento de cobertura — Alpha Vantage e Marketstack (12/11/2026)

- [x] Implementar conectores backend com verificação real de MA/COST, chaves fora do Git, cotas globais e cache por ticker.
- [x] Preparar rodízio Marketstack com até oito contas, contadores persistentes por chave, bloqueio após cota esgotada e renovação mensal. Cinco chaves configuradas no Vault; as quatro adicionais passaram na consulta real mínima. Publicação ainda pendente.
- [x] Conciliar data ex com declaração SEC sem inferir corte; separar especial de COST do DY/Bazin recorrente.
- [x] PR143 mergeada (`ce8b81c`): três migrations aplicadas, função internacional v8 ativa e primeira execução publicada aprovada. COST especial confirmado uma vez na interface; cinco chaves disponíveis, rodízio de reservas verificado com rollback. Lançamentos e recebimentos pessoais preservados.

Detalhes: [implementação e limites](fallbacks-proventos-alpha-marketstack-2026-11-12.md).
