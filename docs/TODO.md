# TODO do Valora

## Cadastro e sincronização de ativos — 30/10/2026

- [x] Investigar RADL3 e completar histórico, eventos públicos e fundamentos disponíveis sem alterar lançamentos.
- [x] Implementar sincronização após compras/importação, atualização pontual pelo menu e correção da primeira busca/classe incorreta; testes e backend publicados.
- [x] Integrar/publicar frontend: PR #97 mergeada; autocomplete, atualização manual, 5A e CDI conferidos em produção.
- [x] Conferir automação após compra: em 31/10, um lançamento fictício de 1 FAST na carteira temporária autorizada iniciou sincronização sem ação manual. Preços 0→1.255, fundamentos 0→1, eventos públicos 8→21. Carteira, transação e posição de teste removidas com autorização; Investidor10 restaurada.
- [x] Fundamentos parciais: migration aplicada e backend publicado. Fonte real gravou cinco registros (MCD e quatro FIIs), mantendo ausências como NULL e VPA negativo real; Graham continua incompatível com VPA não positivo.
- [x] HTTP 401 Vault/pg_net: validação do digest no banco publicada; chamada interna retornou HTTP 200 e gravou cinco registros, sem trocar/revogar credenciais.

Detalhes: [sincronizacao-ativos-2026-10-30.md](sincronizacao-ativos-2026-10-30.md).

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

- [ ] Busca global de ativos para consulta; favoritos; painel de fundamentos. Período 5A já publicado na PR #97.
- [ ] Detalhamento do score por critério e score médio ponderado da carteira.
- [ ] Alertas configuráveis de indicador/evento; edição de lançamentos; composição por setor; exclusão de carteira.
- [ ] Definir a regra para nomes exclusivamente numéricos. Mostrar/ocultar senha e confirmação conferidos em 31/10 no deployment publicado, sem criar conta nem encerrar sessão real.

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
- [x] **Atualizar lista e sino quando o servidor mudar alertas.** PR #98 integrada. Em 31/10, alteração externa do alerta temporário apareceu na conta real sem recarregar; sino mostrou 1 novo e voltou a zero após encerramento. Dois clientes cobertos por teste automatizado.
- [x] **Corrigir o retorno ao app e apresentar falhas do monitor.** PR #98: foco explícito, mensagem segura e nova tentativa. Foco e falha/recuperação cobertos por testes; retorno ao app real mostrou o alerta disparado. Não foi provocada indisponibilidade real do provedor.
- [x] **Revisar alertas Bazin legados.** Em 31/10, lote exato de 25 registros de 27/10 encerrado como Ignorado após confirmação específica do responsável. Textos preservados, sem novos pushes; retenção normal de três dias. A primeira tentativa, com contagem incorreta de 24, foi abortada antes de modificar dados. PR #98 mantém a proteção de edições e a elegibilidade/moeda dos novos alertas.
- [x] **Monitoramento de preços-alvo com app fechado.** Em 31/10, sem aba do Valora aberta no app, job disparou o alerta temporário às 12h49 (Brasília), com HTTP 200, quatro envios aceitos e zero falhas. Responsável confirmou a notificação. Isolamento/status/datas cobertos por SQL em tabelas temporárias. Alerta de teste encerrado como ignorado; limpeza normal após três dias. PWA em aparelho específico não foi testado separadamente.

Escopo do diagnóstico inicial: código, consulta do banco e leitura da tela publicada, sem alterações. A lista e o sino carregaram na sessão conferida (um alerta novo); não foi reproduzida uma divergência de contador nessa sessão. Na etapa posterior, autorizada pelo responsável, a infraestrutura push foi aplicada e testada conforme o item acima; somente um alerta temporário de teste foi criado e removido. Os demais itens de alertas continuam abertos.

## Segurança

Registro específico em [TODO-seguranca.md](TODO-seguranca.md).

## Achado complementar no reteste de 31/10

- [x] **Contas antigas sem perfil interno:** proteção aplicada em produção em 31/10 pela migration `20261031171016`. Perfil ausente recuperado a partir do Auth no login ou antes de criar carteira; perfis existentes preservados e RLS mantido. Testes com rollback cobriram recuperação, idempotência, carteira padrão, cliente já conectado, bloqueio entre contas e acesso anônimo. Zero perfis pendentes e zero fixtures após o teste. [Detalhes](recuperacao-perfil-carteiras.md).

- [ ] **Publicar e retestar — gráfico com poucos meses:** correção local concluída e conferida no Chrome do emulador: coluna 1M visível sem arrastar, inclusive ao filtrar Ações BR. Largura proporcional e reinício da rolagem ao trocar filtros/carteira; valores e cálculo preservados. [Investigação](reteste-pwa-emulador-2026-10-31.md).
- [ ] **Publicar e retestar — abertura pelo push:** foco/navegação com fallback implementados e testados. Aviso local autorizado abriu `/alertas` no emulador com o app em segundo plano, sem criar alerta no banco. Transporte FCM em produção já validado separadamente (cinco envios aceitos). Falta reteste da correção publicada no PWA instalado.
- [ ] **Publicar e retestar — gesto lento:** correção local passou com arrasto de 1.100 ms, retorno à carteira e rolagem vertical. Área lateral aceita toque e usa pan-y sem bloquear rolagem horizontal dos gráficos. Homologação física e gesto da borda nativa continuam separados.

- [x] Correção local da moeda na prévia e na aba de lançamentos do detalhe: moeda do ativo passada ao formatador, sem conversão ou mudança de valores. Seis testes aprovados, lint e build/PWA aprovados. Interface local conferida com AAPL em USD e BBAS3 em BRL; viewport 390 × 844 sem alargamento da página. Aguarda PR/publicação; não equivale a teste em PWA físico.

## Pendências técnicas — implementação local posterior à PR #97

Lista/sino: polling de 30 segundos enquanto o app está visível e atualização ao recuperar foco. Monitor: verifica ao recuperar foco, apresenta falha segura e permite tentar novamente. Bazin: exige classe/moeda compatíveis; novas mensagens USD usam US$; registros legados não são assumidos como automáticos, e edições/decisões do usuário são preservadas. Agendamento de preços-alvo: SQL preparado para verificar a cada minuto e aproveitar o trigger de push existente.

**Backend aplicado em produção após confirmação explícita do responsável.** Migration `20261030225247`, quatro funções publicadas, chamada interna bem-sucedida e três execuções do job conferidas. Frontend aguarda PR/merge; entrega push com app fechado ainda não homologada nesta etapa. A lógica SQL foi testada em tabelas temporárias, pois o ensaio com alertas fictícios em contas reais foi rejeitado pela aprovação automática e não executado. Evidências em [aplicacao-pendencias-tecnicas.md](aplicacao-pendencias-tecnicas.md). Os itens de alertas acima permanecem abertos até publicação e homologação.
# Complemento local — 30/10/2026

- [x] REQ-03: opção 5A no gráfico de cotação do detalhe, mantendo Tudo e os demais períodos. A consulta usa cinco anos de calendário e trata 29/02.
- [x] UX-01: mostrar/ocultar senha e confirmação no cadastro, com controles independentes.
- [x] UX-03: comparação vs CDI no detalhe com vírgula decimal e duas casas, preservando o cálculo.

Esses três itens foram implementados na branch `codex/sincronizacao-novos-ativos`; aguardam publicação. Validação local: sete testes aprovados entre cadastro, consulta histórica e detalhe do ativo; lint dos arquivos envolvidos e build de produção aprovados. Nenhuma migration ou escrita financeira foi realizada neste complemento.
