# Correções da segunda bateria — 30/10/2026

Estado: **migration aplicada em produção; frontend ainda aguarda merge/publicação**. O lote cobre SB-01 a SB-08. As melhorias de escopo REQ/UX, investigações restantes, pendências anteriores de alertas e QA-01 continuam separadas. Nenhum lançamento existente foi alterado ou excluído.

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

- [ ] Revisar e integrar a PR pelo responsável; não há merge automático.
- [x] Aplicada e conferida em produção a migration `20261030175828_validate_movement_dates_and_distinct_price_alerts.sql`, em 30/10 às 14:58 de Brasília. Triggers, índices, permissões e RLS conferidos. Não modifica a migration 018 excluída do escopo.
- [ ] Publicar frontend/PWA e retestar os oito casos no ambiente publicado, incluindo uma operação futura recusada e dois alertas distintos do mesmo ativo em conta de teste.

O servidor agora aplica as novas restrições de datas e unicidade. O frontend publicado ainda depende do merge/publicação da PR #95. A aplicação foi autorizada separadamente após os testes locais; nenhuma conta/sessão de teste foi criada por esta etapa.

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
