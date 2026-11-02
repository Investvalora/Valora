# Correções da segunda bateria — 30/10/2026

Estado: **migration e frontend publicados; reteste de produção registrado abaixo**. PR #95 integrada pelo responsável em 30/10/2026 às 15:01 de Brasília, commit `163ec2f`. O lote cobre SB-01 a SB-08. As melhorias de escopo REQ/UX, investigações restantes, pendências anteriores de alertas e QA-01 continuam separadas. Nenhum lançamento existente foi alterado ou excluído.

| Item | Mudança |
| --- | --- |
| SB-01 | Validação compartilhada de data civil nos formulários manual/rápido e serviços de escrita/importação. Compras, vendas e aplicações futuras são rejeitadas; vencimentos futuros permanecem válidos. Valores iniciais dos formulários usam hoje no fuso local. Migration adiciona proteção de escrita para transações, posições e aplicações, sem reescrever registros anteriores. |
| SB-02 | Card e tabela do detalhe passam a usar o histórico elegível de recebimentos da carteira, com quantidade histórica, moeda e total líquido importado. Histórico público foi preservado em visualização própria, sem ser apresentado como recebido pelo investidor. Falha na consulta não aparece como ausência de recebimentos. |
| SB-03 | Cadastro com sessão imediata segue para `/inicio`. |
| SB-04 | `/carteira` mantém acesso protegido e redireciona para posições. Endereços inexistentes exibem página com retorno ao início. |
| SB-05 | Datas civis no detalhe deixam de passar por meia-noite UTC; timestamps continuam tratados como timestamps. |
| SB-06 | Migration separa unicidade de alertas automáticos e manuais. Condições/preços diferentes podem coexistir; configurações idênticas ativas permanecem bloqueadas. Formulário explica duplicidade e ticker inexistente sem expor mensagem bruta do banco. Verificador existente percorre e atualiza cada alerta por ID. |
| SB-07 | Percentuais visíveis em Visão geral e tabela mensal usam vírgula e duas casas, preservando valores e exportações. |
| SB-08 | Telas legadas de rentabilidade/proventos apresentam orientação compreensível e mantêm o botão de tentar novamente, sem expor a mensagem técnica do provedor. |

## Validação

- 28 testes direcionados aprovados: detalhe, formulários manual/rápido, serviço de transações e schema de data. Incluem rejeição de datas futuras nas três categorias, ausência de escrita, quantidade histórica, líquido importado e preservação do histórico público.
- 18 verificações SQL aprovadas no PostgreSQL em memória (PGlite), executando a migration sobre tabelas mínimas isoladas: inserção/alteração futura rejeitada, hoje permitido, vencimento futuro permitido, registro histórico não reescrito, alertas distintos aceitos, duplicidade exata rejeitada e deduplicação automática preservada entre usuários. Não equivale a homologação das policies/RLS em produção.
- Regressão completa: 805 aprovados e 11 falhas em 106 arquivos. São os mesmos quatro arquivos já identificados em QA-01: StrategyManager (5), InicioPage (2), AssetFiltersPanel (1), MobileCarteiraHome (3). Essa execução antecedeu o acréscimo dos três testes de data no lançamento rápido e o ajuste final da tabela de recebimentos; os arquivos alterados depois foram retestados separadamente no conjunto de 28 testes.
- Build final de produção/PWA e lint dos arquivos alterados: consultar os logs locais em `output/auditoria-segunda-bateria/`. O diretório contém evidências, não faz parte das dependências do app.
- `package.json`, lockfile e configuração de workspace do Valora não foram alterados. A dependência do verificador SQL está somente na pasta local de evidências.

## Integração e publicação pendentes

- [x] PR #95 integrada pelo responsável; não houve merge automático pelo agente.
- [x] Aplicada e conferida em produção a migration `20261030175828_validate_movement_dates_and_distinct_price_alerts.sql`, em 30/10 às 14:58 de Brasília. Triggers, índices, permissões e RLS conferidos. Não modifica a migration 018 excluída do escopo.
- [x] Frontend publicado e retestado no recorte disponível: interface autenticada e teste transacional de alertas/datas no banco. Limites de SB-03/SB-08 e PWA físico descritos abaixo.

O servidor aplica as novas restrições e o frontend novo foi observado após recarregar a sessão publicada. A migration foi autorizada separadamente após os testes locais. O reteste posterior usou perfis sintéticos somente dentro de transação revertida, sem criar sessão ou enviar email.

Procedimento e consultas de pré/pós-aplicação preparados em [aplicacao-migration-segunda-bateria.md](aplicacao-migration-segunda-bateria.md).

## Reteste local com sessão autenticada — 30/10

Servidor iniciado em `http://127.0.0.1:5174/`; o responsável efetuou o login na aba local. O frontend local consulta o Supabase configurado, portanto não foram gravadas operações válidas, novos alertas ou alterações financeiras para testar.

| Verificação na interface | Resultado |
| --- | --- |
| URL inexistente | Mostrou “Página não encontrada”; retorno ao início sem sessão levou ao login. |
| URL legada `/carteira` autenticada | Redirecionou para `/ativos/posicoes`, sem tela vazia. |
| Lançamento rápido: renda variável, renda fixa e Tesouro | Data de 31/10/2026, futura no dia do ensaio, rejeitada com “Informe uma data válida, até hoje.”; formulário permaneceu aberto. |
| Lançamento pelo detalhe de MXRF11 | Mesma rejeição de data futura; nenhuma operação foi gravada pelo teste. |
| Card e tabela de recebimentos de MXRF11 | Quantidade atual 187; recebimento de 15/10 apresentado com 173 cotas históricas e R$ 17,30 líquidos importados. Setembro mostrou 156 e R$ 15,60. |
| Histórico público | Permanece acessível em “Histórico do ativo”, com data ex e valor por cota, sem rotular multiplicação pela posição atual como recebido. |
| Datas e percentuais | Datas civis preservadas no detalhe; Visão geral e tabela mensal apresentaram vírgula decimal, como +11,45% e +2,02%. |

A inspeção visual identificou que faltava destacar a origem selecionada dos proventos; foi acrescentado destaque à aba ativa, sem mudar os dados ou remover a consulta pública. Lint e três testes do detalhe passaram depois desse ajuste.

Regressão final local: **808 aprovados e 11 falhas conhecidas em 106 arquivos**, sem novas falhas em relação à base. Log `output/auditoria-segunda-bateria/reteste-local-regressao.log`. As 18 verificações SQL isoladas também foram repetidas com sucesso.

Limites do ensaio: não foi desativada a confirmação de email para produzir sessão imediata no cadastro; não foi provocado erro real de provedor nem testada a nova unicidade de alertas contra produção. Esses pontos dependem dos testes automatizados/isolados e da homologação após a migration. Não é teste de PWA instalado em aparelho físico.

## Homologação em produção após merge — 30/10/2026

Sessão existente em `https://investvalora.vercel.app`, recarregada antes do teste. A presença da nova separação de recebimentos/histórico e da validação de data confirmou o frontend atualizado no domínio público. Não se usou a URL de preview para estes testes.

| Caso | Resultado observado |
| --- | --- |
| SB-01 / interface | Operação de 31/10 rejeitada em renda variável, renda fixa, Tesouro e no formulário pelo ativo. Modais cancelados sem gravação. |
| SB-01 / servidor | INSERT com amanhã rejeitado pela mensagem específica da função de validação, em transação revertida. |
| SB-02 e SB-05 | Card e tabela exibiram recebimentos importados com quantidades históricas e datas civis; histórico público permaneceu separado. |
| SB-04 | `/pagina-inexistente` exibiu página de recuperação; `/carteira` autenticada redirecionou para `/ativos/posicoes`. |
| SB-06 / servidor | Duas condições distintas coexistiram para o mesmo usuário/ticker; configuração idêntica e alerta automático duplicado foram bloqueados; outro usuário pôde ter a mesma configuração. |
| SB-07 | Visão geral e tabela mensal exibiram percentuais com vírgula decimal. |

O teste de banco está em [second_battery_transactional_retest.sql](../supabase/tests/second_battery_transactional_retest.sql). Cria fixtures sintéticas, verifica constraints reais e executa rollback. A consulta posterior confirmou **zero perfis e zero alertas de teste restantes**. Alertas foram inseridos como monitorando (`lido`), sem invocar o verificador ou disparar notificações.

Não foram forçados em produção o cadastro que devolve sessão imediata (SB-03), a indisponibilidade de provedor (SB-08), o disparo de notificações nem o ciclo de criar/editar alertas pela interface. Não foi alterada a política de email ou provocada indisponibilidade para concluir esses cenários. O PWA instalado em aparelho físico também não foi homologado neste ensaio. As 11 falhas anteriores da suíte permanecem em QA-01.

Observação de apresentação restante: o comparativo “vs CDI” no detalhe ainda usa ponto decimal em pontos percentuais; a correção SB-07 entregue cobriu Visão geral e tabela mensal. Registrado como UX-03, sem alterar fórmulas durante a homologação.


## Continuação local: qualidade e investigações — 30/10/2026

- Recuperados os quatro arquivos de teste: contexto de Router e formulário real no fluxo de estratégias; cor da carteira e tipo do título nas fixtures; geometria explícita da zona de início do gesto no ambiente jsdom. As asserções de criação, percentuais, classes, exclusão, KPIs e navegação foram preservadas.
- Corrigido defeito real: a falha ao alterar a exibição de uma estratégia era silenciosa. Agora apresenta aviso local e permite nova tentativa, também coberta por teste. A opção legada `initialDraft`, ignorada pelo gerenciador, foi retirada da assinatura; o formulário continua aceitando e testando o preenchimento inicial.
- Acrescentados casos negativos de gesto fora da região lateral e de rolagem vertical. A lógica de gesto do produto permaneceu igual; foi acrescentado somente identificador da região para o teste.
- INV-02: três novos testes confirmam mensagens para duplicidade, ativo fora do catálogo e falha inesperada, sem expor mensagem interna nem perder campos ao tentar novamente. Não provam a causa do relato original sem ticker/massa.
- INV-03: regra de meses encerrados e parcial inicial confirmada no código; cobertura existente de primeiro mês, âncora e lacunas preservada. A massa original continua necessária para concluir a investigação.

Validação: regressão completa com **820 testes aprovados em 106 arquivos**, sem falhas (`output/auditoria-segunda-bateria/reteste-qualidade-completo.log`). Os três testes novos de `PriceAlertForm` passaram em execução separada (`reteste-formulario-alerta.log`); o teste de recuperação da estratégia foi repetido após a última asserção (`reteste-estrategia-final.log`, cinco aprovados). Build TypeScript/Vite/PWA e lint de todos os arquivos de código alterados aprovados. Não houve nova migration, publicação ou merge nesta continuação. Homologação de gesto em PWA físico permanece pendente.

## Testes complementares e interface responsiva — 30/10/2026

Navegador Brave na origem local `http://127.0.0.1:5174`, com sessão já existente. A largura foi temporariamente ajustada para 390 × 844 e depois restaurada. Isso é ensaio responsivo, não execução de PWA instalado nem gesto de toque em aparelho físico.

| Caso | Resultado |
| --- | --- |
| Início móvel | Sino de alertas visível, com contador; cards e identificação da carteira apresentados. |
| Seleção de carteira pelo botão lateral | Lista abriu e a seleção de Minha Carteira atualizou Ativos para essa carteira. Investidor10 foi restaurada ao final. |
| Abrir ativo no celular | Link de MXRF11 abriu o resumo com quantidade, preço médio, saldo, cotação e abas. |
| Criar alerta pelo ativo | Ticker MXRF11 pré-preenchido. Envio sem preço mostrou “Informe um preço-alvo válido.”; formulário cancelado sem criar alerta. |
| Rentabilidade de Minha Carteira | Gráfico e tabela preenchidos. Período disponível terminou em 30/09/2026; outubro ainda aberto ficou sem percentual mensal. Não reproduzido gráfico vazio nessa carteira. |

Cobertura nova, executada separadamente da regressão completa anterior:

- `ProviderFailure.test.tsx`: dois testes nas telas legadas de rentabilidade e proventos. Erro técnico simulado resulta em mensagem segura; “Tentar novamente” chama o refetch e o estado pode retornar ao carregamento. Nenhum provedor real foi derrubado.
- `usePerformance.test.tsx`: quatro testes aprovados, incluindo dois novos que executam a regra do hook para excluir o mês aberto quando há histórico anterior e mostrar parcial quando só existem pontos do mês atual.

São **quatro casos novos aprovados** nesta continuação, além dos três testes de alerta e da regressão de 820 casos já registrados. Não representam nova execução integral de 827 testes. INV-02/03 continuam dependentes da massa original para atribuir causa histórica. Não foram gravados lançamentos nem novos alertas neste ensaio de interface.

Execução final conjunta dos dois arquivos complementares: **seis testes aprovados**, incluindo os dois casos preexistentes do hook (`output/auditoria-segunda-bateria/reteste-complementar-performance.log`). Build TypeScript/Vite/PWA e lint dos dois arquivos aprovados após adaptar as asserções à versão JavaScript configurada no projeto (`build-testes-complementares.log`). Nenhum código funcional foi alterado nesta etapa de testes complementares.

## Conferência em produção após PR #96 — 30/10/2026

PR #96 integrada pelo responsável no commit `a1874f0`. Conferência no domínio `https://investvalora.vercel.app`, em sessão autenticada, com carteira Investidor10. A consulta de deployments do GitHub para esse SHA não retornou registro; os checks anteriores da Vercel eram bem-sucedidos, mas não comprovam isoladamente a promoção desse commit para produção. A verificação abaixo comprova os fluxos observados no domínio público, sem atribuir um SHA ao bundle.

- Estratégias carregaram; “Nova estratégia” abriu `/analise/estrategias/nova` com formulário do zero, seleção de classes e botão de criar desabilitado sem os dados necessários. Cancelado sem salvar.
- Rentabilidade comparada apresentou carteira e índices, com período até 30/09/2026. Outubro permaneceu sem resultado na tabela de meses encerrados.
- Em largura 390 × 844, MXRF11 abriu pelo link da lista de ativos e apresentou resumo, cotação, posição, recebimentos e abas.
- “Criar alerta” no ativo trouxe MXRF11 preenchido. Envio sem preço foi rejeitado com “Informe um preço-alvo válido.”; cancelado sem criar alerta.
- Início móvel apresentou sino; botão lateral abriu as cinco carteiras e “Voltar” retornou ao início. Carteira selecionada permaneceu Investidor10; tamanho original do navegador restaurado.

Não foram alterados lançamentos, alertas ou estratégias por este ensaio. O caminho de falha ao salvar a exibição de estratégia não foi provocado em produção; permanece coberto pelo teste local. Também não foram provocadas falhas reais de provedor ou testado gesto em PWA físico. INV-02/03 não são encerradas pela ausência de reprodução nesta massa.

## Reteste publicado da PR #97 ? 30/10/2026

- Sessao autenticada no dominio de producao, carteira Investidor10 preservada.
- Novo lancamento: GOOGLE retornou GOGL34, GOOG e GOOGL com nome, classe e moeda. Preco vazio antes da selecao; GOOGL selecionado mudou para Stocks US/USD e preencheu 277,47. Alterar o texto para RADL3 limpou o preco anterior. Formulario cancelado sem gravar.
- Menu de RADL3: Atualizar dados de mercado apresentou estado de sincronizacao e terminou sem aviso de falha ou indisponibilidade na lista. Os fundamentos de RADL3 estavam visiveis. Isto verifica a acao manual autenticada; nao comprova sozinho o gatilho depois de salvar compra.
- Detalhe RADL3 abriu normalmente; opcao 5A selecionada carregou grafico preenchido. vs CDI exibiu -13,16 p.p., com virgula decimal.
- Nenhum lancamento financeiro foi criado ou excluido neste reteste. O gatilho automatico apos compra continua coberto pelos testes locais, mas ainda sem nova compra de homologacao em producao. Controle de senha no cadastro nao foi retestado nesta sessao autenticada.
## Correção local do filtro de classe — 30/10/2026

O autocomplete do lançamento priorizava a classe selecionada, mas incluía as demais. Agora lista apenas ativos do tipo escolhido, mantém a moeda da classe quando o ticker é incompatível e bloqueia o salvamento de ativo de outra classe. A busca externa permanece disponível; resultado incompatível orienta alterar o tipo, sem trocá-lo automaticamente. Trocar o tipo também cancela resultados externos pendentes.

Regressão cobre BTC em Ações BR e MXRF11 em ETFs BR, além de seleção válida, preço manual e criptomoedas em BRL. Publicada na PR #98 e conferida na conta real após o merge.
## Pendências técnicas preparadas — 30/10/2026

Implementações locais para atualização de lista/sino, retorno ao foco, falhas do monitor, elegibilidade/moeda Bazin, preservação de edições, fundamentos parciais e validação interna pelo Vault. Migration nova prepara monitoramento SQL por minuto e reutiliza os triggers de push existentes. Nenhuma alteração na migration 018.

Regressão completa: **855/855 testes em 116 arquivos**, lint e build TypeScript/Vite/PWA aprovados. Após confirmação explícita, migration `20261030225247` aplicada e quatro funções publicadas. Chamada interna retornou HTTP 200 com cinco fundamentos gravados; job por minuto conferido com três execuções bem-sucedidas. Condições do monitor testadas em tabelas temporárias sem push. O ensaio com alertas fictícios em contas reais foi rejeitado pela aprovação automática e não executado. Nenhuma compra fictícia foi criada; teste após compra e entrega push com app fechado permanecem pendentes. Frontend aguarda merge pelo responsável. Evidências em [aplicacao-pendencias-tecnicas.md](aplicacao-pendencias-tecnicas.md).

## Homologação após merge — 31/10/2026

PR #98 integrada e deploy do commit conferido. Após autorização para testar na conta do responsável, o alerta temporário disparou pelo cron às 12h49 de Brasília com a página fora do app. Push retornou quatro envios aceitos, zero falhas; exibição confirmada pelo responsável. Lista e sino mostraram o novo alerta; alteração externa posterior apareceu sem reload. Teste encerrado como Ignorado, com retenção normal de três dias. Investimentos e lançamentos preservados. O teste de compra e homologação física de PWA específico permanecem separados. Detalhes no roteiro de aplicação acima.

### Continuação de 31/10 — pendências técnicas

Teste de sincronização após compra concluído em carteira temporária, com criação e limpeza especificamente autorizadas: 1 FAST fictício, um salvamento, carga automática de 1.255 preços e um fundamento; eventos públicos passaram de oito a 21. Limpeza conferida com zero carteira/transação/posição temporária, sem alterar as carteiras existentes. Dados públicos mantidos e Investidor10 restaurada.

Cadastro publicado conferido em origem separada do mesmo deployment: senha e confirmação têm controles independentes; nenhum cadastro enviado. Lote legado de 25 alertas Bazin encerrado como Ignorado após confirmação específica, sem sobrescrever textos ou gerar pushes. A tentativa inicial com contagem incorreta de 24 foi abortada sem alterações.

Registrado novo ajuste de apresentação: moeda do valor de lançamentos USD no detalhe. Não alterado neste reteste; não é mudança no valor cadastrado. PWA físico continua dependente de aparelho. Resultados detalhados em `aplicacao-pendencias-tecnicas.md`.

### Reteste e ajuste local da moeda — 31/10

Corrigidas somente as chamadas de formatação de preço/total na prévia e aba de lançamentos do detalhe: recebem a moeda do ativo. Valores e fórmulas preservados, sem conversão cambial. Seis testes do detalhe passaram, incluindo BRL/USD; lint e build TypeScript/Vite/PWA aprovados.

No navegador local autenticado, em 390 × 844, AAPL mostrou preço $302.60 e total $20.00, com largura de página igual ao viewport. BBAS3 manteve R$ 16,27 e total R$ 244,05 para quantidade 15. Viewport original restaurado. Nenhum lançamento criado, alterado ou excluído neste ensaio. Correção local aguardando PR/publicação; gestos e notificações em PWA físico continuam fora desta validação responsiva.
