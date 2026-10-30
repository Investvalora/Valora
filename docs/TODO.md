# TODO do Valora

## Segunda bateria — revisão de 30/10/2026

Triagem completa, fontes e critérios de aceite em [TODO-segunda-bateria.md](TODO-segunda-bateria.md). Duplicatas foram consolidadas; correções já integradas não foram reabertas como trabalho novo.

### Defeitos confirmados

SB-01 a SB-08 implementados e testados localmente em 30/10; migration aplicada e PR #95 integrada pelo responsável. Frontend publicado e retestado no recorte documentado, com cenários não forçados explicitados. [Registro e validação](correcoes-segunda-bateria-2026-10-30.md).

- [x] **Publicar o frontend e retestar o recorte disponível:** versão publicada conferida na sessão autenticada; validação de datas/alertas no servidor testada com rollback. Cenários não forçados e PWA físico registrados no relatório. A migration 018 permanece intocada.

- [x] **Alta — SB-01:** impedir que compras com data futura alterem a carteira atual nos fluxos de lançamento manual/rápido.
- [x] **Alta — SB-02:** corrigir o card de proventos do detalhe, que multiplica histórico público pela quantidade atual e pode incluir eventos anteriores à compra.
- [x] **Média — SB-03:** corrigir o redirecionamento para `/carteira` após cadastro com sessão imediata.
- [x] **Média — SB-04:** tratar rotas inexistentes e o endereço legado `/carteira` sem tela vazia.
- [x] **Média — SB-05:** corrigir datas exibidas um dia antes no detalhe do ativo.
- [x] **Média — SB-06:** permitir alertas de preço distintos para o mesmo ativo, preservando a deduplicação dos automáticos.
- [x] **Baixa — SB-07:** padronizar vírgula decimal nos percentuais visíveis.
- [x] **Baixa — SB-08:** substituir mensagens técnicas de falha do provedor por orientação compreensível.

### Investigações e qualidade

- [x] **INV-01 — Encerrado na versão atual:** Início e Ativos concordaram no reteste em produção de Minha Carteira e Investidor10; 14 testes locais passaram. Retirado das pendências ativas após alinhamento com o responsável em 30/10. A causa exata da captura antiga não foi determinada. [Investigação](investigacao-patrimonio-segunda-bateria.md).
- [ ] **Média — INV-02/03:** identificar a causa do erro de criação de alerta sem massa completa e conferir o relato de gráfico vazio sob a regra de meses fechados.
- [x] **QA-01a:** suíte recuperada: 820/820 testes aprovados em 106 arquivos, mais três novos testes de alerta aprovados separadamente. Build/PWA e lint aprovados. Restaurado aviso de falha na exibição de estratégias.
- [ ] **Média — QA-01b:** homologar gesto no PWA instalado em aparelho físico; casos automatizados de abertura/arrasto e gestos negativos passaram.

### Funcionalidades e melhorias para validar escopo

- [ ] Busca global de ativos para consulta; favoritos; período 5A no detalhe; painel de fundamentos.
- [ ] Detalhamento do score por critério e score médio ponderado da carteira.
- [ ] Alertas configuráveis de indicador/evento; edição de lançamentos; composição por setor; exclusão de carteira.
- [ ] Mostrar/ocultar senha no cadastro e definir a regra para nomes exclusivamente numéricos.

Migration 018 e crítica a preço-alvo “irrealista” continuam excluídas conforme decisão do responsável. Não alterar o método de rentabilidade acordado para atender comparações entre medidas diferentes.

## Rentabilidade e histórico

- [x] **Investigar e resolver o histórico incompleto da rentabilidade comparada.** Corrigidas as causas identificadas e retestadas localmente as carteiras “Investidor10” e “Minha Carteira”, sem aviso de histórico incompleto no período desde o início. Correções integradas na PR #88; a antiga pendência de integração do frontend não se aplica à main revisada em 30/10.
  - Mensagem observada: “Histórico incompleto: faltam preços, câmbio ou movimentações suficientes. O gráfico mostra os trechos disponíveis, com interrupções nas lacunas. Cada trecho da carteira reinicia em 0%; não representa o acumulado do período inteiro nem permite comparação direta com os índices ao longo dessas lacunas.”
  - Validar a continuidade e o cálculo da rentabilidade acumulada com movimentações e câmbio, além do alinhamento das datas e bases de comparação com os índices.
  - Critério de conclusão: histórico suficiente apresenta o acumulado correto e comparável no período; lacunas reais continuam identificadas, sem inventar dados, ligar trechos indevidamente ou apenas ocultar o aviso.

### Correção e reteste — 28/10/2026

- Banco: adicionados 11.982 fechamentos públicos Yahoo ausentes, de 25/10/2024 em diante, sem sobrescrever preços existentes. Limite de carga: 27/10/2026. Pares cripto BRL sem histórico direto usam cotação USD e câmbio histórico; não são convertidos pelo câmbio atual.
- Comparadores: carregados CDI real do BCB/SGS 12 (501 pontos), IBOV do Yahoo (498) e IFIX oficial B3 (498). Seeds remanescentes, inclusive registros fictícios em feriados, permanecem armazenados mas não entram na comparação. Conferido zero ponto real de índice posterior a 28/10/2026.
- Movimentações: excluída somente a compra de teste de 0,00061788 BTC em 10/03/2026 da “Minha Carteira”, após confirmação específica do usuário. Consulta posterior confirmou zero divergências entre quantidades das movimentações e posições. Nenhum outro lançamento foi alterado.
- Cálculo: gráfico diário inclui o retorno do primeiro dia e a base no fechamento anterior; índices usam o mesmo calendário e início/fim da carteira. Resumo, gráfico e tabela respeitam os meses encerrados; carteira iniciada no mês atual mantém resultado parcial. Lacunas continuam interrompendo séries e invalidando o acumulado, com motivos exibidos por ativo quando disponíveis.
- Verificação local: 102 testes passaram; build de produção/PWA passou. Conferidas troca de carteira e filtros. Na janela desde o início até setembro/2026: Investidor10 +27,92% e Minha Carteira -1,12%, usando as movimentações cadastradas e a convenção diária informada no app. Não é conciliação com extrato de corretora.
- Reprodução da carga: `scripts/prepare-return-history.mjs` consulta fontes públicas e gera SQL para revisão, sem credenciais nem escrita automática no banco. Novas importações anteriores à cobertura disponível podem exigir nova carga; o aviso permanece para esses casos. Não foi criado agendamento de backfill.
- Evidências locais: `output/return-history/` (fora do commit).

## Adiado por decisão do responsável

- Entrega dos emails/SendGrid e redução de spam: manter a configuração atual enquanto não houver domínio próprio, conforme combinado.

## Alertas — diagnóstico de 28/10/2026

- [x] **Concluir o teste de entrega push no dispositivo.** Infraestrutura aplicada em 28/10/2026, função `send-alert-push` v3 e variável `VITE_VAPID_PUBLIC_KEY` configuradas em produção. Após habilitar o serviço de mensagens push do Google no Brave, a inscrição foi salva e o teste retornou HTTP 200 (`sent:1,failed:0`). O responsável confirmou a exibição de “Novo alerta no Valora” no computador. Alerta temporário removido; inscrição preservada. Monitoramento automático de preços com app fechado continua no item separado abaixo. Detalhes em [push-notifications.md](push-notifications.md).
- [ ] **Atualizar lista e sino quando o servidor mudar alertas.** As consultas não têm polling nem assinatura Realtime. O monitor invalida o cache quando sua própria verificação dispara alertas; alterações externas podem permanecer fora da tela. Implementar atualização e validar dois clientes autenticados da mesma conta.
- [ ] **Corrigir o retorno ao app e apresentar falhas do monitor.** `usePriceTargetMonitor` não sobrescreve `refetchOnWindowFocus: false` do QueryClient, apesar do comentário prometer verificação ao recuperar foco. Seu erro também não é apresentado no AppShell. Testar foco, indisponibilidade e recuperação.
- [ ] **Revisar elegibilidade, moeda e validade dos alertas Bazin.** A tela ainda mostra alerta Bazin para ETH e o gerador não filtra a classe de ativo; textos usam `R$` fixo, inclusive para ativos USD. Alertas existentes podem persistir quando deixam de ser candidatos. Corrigir sem apagar ou substituir edições e decisões do usuário indiscriminadamente.
- [ ] **Definir e implementar monitoramento com app fechado.** O banco não possui agendamento de geração/verificação de preços-alvo; o único job de alertas encontrado é a limpeza dos ignorados. Push por si só não executa a avaliação de preços. Validar geração e entrega com a aba fechada e isolamento entre contas.

Escopo do diagnóstico inicial: código, consulta do banco e leitura da tela publicada, sem alterações. A lista e o sino carregaram na sessão conferida (um alerta novo); não foi reproduzida uma divergência de contador nessa sessão. Na etapa posterior, autorizada pelo responsável, a infraestrutura push foi aplicada e testada conforme o item acima; somente um alerta temporário de teste foi criado e removido. Os demais itens de alertas continuam abertos.

## Segurança

Registro específico em [TODO-seguranca.md](TODO-seguranca.md).
