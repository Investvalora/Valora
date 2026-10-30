# Segunda bateria de testes — triagem e TODO

Revisão em 30/10/2026, contra `origin/main` em `481ddb6` (PR #94 integrada). Esta revisão cruza os relatórios com o código atual e o histórico de correções. Não equivale a um novo teste manual completo em produção. Nenhuma funcionalidade ou dado de usuário foi alterado nesta auditoria.

## Fontes e alcance

[Pasta recebida](https://drive.google.com/drive/u/4/folders/1pTOBZCtRDKCLMq_VsabMtciDK7FA4wo2). Foram lidos os seis PDFs externos sobre Valora, o relatório nativo com sua planilha de defeitos e nosso relatório anterior de correções. Documento e planilha do mesmo grupo não contam como achados diferentes. O subdiretório de testes aplicados pelo grupo Valora contém avaliações de outros projetos e uma cópia do nosso relatório; esses projetos não entram nesta lista.

| Ref. | Arquivo | Observação |
| --- | --- | --- |
| A | [Valora — 2ª Bateria de Testes (Reteste) e Defeitos Detectados](https://drive.google.com/file/d/1W-4VYCuxzMKeTcNvBZQd0J1qL8X5U_FL/view) | 27 registros DEF; código testado `863cfbe`, anterior à PR #94. Massa sintética e serviços simulados. |
| B | [Valora - 2º Bateria de testes](https://drive.google.com/file/d/1QCq3vNDFLw2FQkbvjo-R-1qSc4NRwhUi/view) | Favoritos, fundamentos, score e períodos do detalhe. |
| C | [Defeitos Detectados - Valora](https://drive.google.com/file/d/1HnkJ2X9mCmieISsAQgmvCGJQHc5MlZ6m/view) | Avaliação pública sem autenticação; rotas desconhecidas. |
| D | [Valora — Bateria de Teste v2](https://drive.google.com/file/d/1-Bt9wbgPgfgB8Pxq5CwlxKSHCbv3Vfu-/view) | Exclusão de carteira, divergência de patrimônio e base do gráfico. |
| E | [Bateria_Teste_Valora V2](https://drive.google.com/file/d/1nISgtYrhJnLi70RuEQxVb68A1mmvamlW/view) | Erro ao criar alerta; não informa ticker e estado anterior suficientes para reproduzir. |
| F | [Teste do VALORA](https://drive.google.com/file/d/19eniSwfjqxuILNqhR3jEyjghCYsATzth/view) | Já analisado na PR #94; mantidas as decisões do responsável. |
| G | [Relatório de Testes Valora - Semana 2](https://docs.google.com/document/d/1NoVDdQ_KF1g3r5P1smaXBHsTVe-KU6ygxSNK0dPO6VE/edit) e [Defeitos Valora - Semana 2](https://docs.google.com/spreadsheets/d/1R32NUar7XxiIhWDVCIOAjdYZMw0guT-Zw8Iqnock8qk/edit) | Mesmos três achados: percentuais, nome numérico e visibilidade da senha. |
| H | [Nosso relatório de correções e retestes de 26/10](https://drive.google.com/file/d/1sP3r1ezF_RNJdtIInJZwZAHtbAO5MXo0/view) | Referência histórica; suas pendências não são automaticamente atuais. |

As referências à ERS nos relatórios não tornam toda ausência um erro de funcionamento. Há fontes que a descrevem como minuta e outras como requisito aprovado. Recursos ausentes ficam separados para decisão de escopo; defeitos de comportamento observáveis não dependem dessa decisão.

## Defeitos confirmados no código — corrigir

**Atualização de 30/10:** SB-01 a SB-08 implementados e testados localmente. Os comportamentos abaixo descrevem a origem dos defeitos; as soluções e verificações estão no [registro de correções](correcoes-segunda-bateria-2026-10-30.md). As marcações concluídas referem-se à implementação local, sem declarar alteração em produção.

Reteste posterior no navegador local autenticado confirmou rejeição de datas futuras, recebimentos com quantidades históricas, histórico público separado, rotas e percentuais. Regressão final: 808 aprovados e as 11 falhas anteriores. Limites e casos que aguardam publicação estão no mesmo registro.

- [ ] **Integrar, aplicar a nova migration e publicar o lote**, seguido de reteste em produção. A migration 018 não foi alterada.

### Prioridade alta

- [x] **SB-01 — Impedir compras futuras de alterarem a carteira atual.** A/DEF-19. `QuickTransactionModal.tsx` valida presença da data, mas não seu limite; `transactionsService.addManualTransaction` também não o faz. Os schemas de `AddTransactionModal.tsx` exigem apenas texto não vazio. A proteção de `positionSchema.ts` e do CSV não cobre todos esses caminhos. Validar uma regra compartilhada e proteger a escrita no servidor. Aceite: amanhã é rejeitado sem mudar posição, patrimônio ou aportes; hoje e datas históricas válidas continuam aceitas. Não confundir data de aplicação com vencimento futuro legítimo.
- [x] **SB-02 — Corrigir a estimativa de proventos no resumo do ativo.** A/DEF-26, parte restante. `AssetDividendPreview`, em `AtivoDetailPage.tsx`, lista o histórico público e multiplica cada pagamento pela quantidade atual. Isso inclui eventos anteriores à compra e ignora quantidades históricas. O hook dos totais já usa os recebimentos da carteira; o card não. Aceite: mostrar recebimentos elegíveis pelas posições nas datas corretas, preservar importações líquidas e distinguir histórico público de valores do investidor. Conferir também a lista de proventos do detalhe, sem ocultar o histórico público útil.

### Prioridade média

- [x] **SB-03 — Corrigir o destino após cadastro com sessão imediata.** A/DEF-01. `SignupForm.tsx` ainda navega para `/carteira`, rota inexistente. O caso depende de cadastro que devolva sessão; com confirmação obrigatória o caminho pode não ser acionado. Aceite: ir para uma rota válida do app tanto com sessão imediata quanto depois da confirmação, sem mudar a política de email para reproduzir.
- [x] **SB-04 — Tratar URLs inexistentes.** C/DF01 e efeito de A/DEF-01. `src/routes.tsx` não possui rota curinga nem redirecionamento para o antigo `/carteira`. Aceite: URL desconhecida apresenta saída utilizável; link legado leva a destino válido; rotas privadas continuam protegidas. É falha de navegação, não evidência de acesso indevido.
- [x] **SB-05 — Preservar datas civis no detalhe do ativo.** A/DEF-07. `fmtDate` usa `new Date('AAAA-MM-DD')` com formatação no fuso local. Reprodução independente: `2026-01-05` aparece como `04/01/2026` em America/Sao_Paulo. Usar o tratamento compartilhado de data civil, sem deslocar timestamps reais. Aceite: compra e data-com mantêm o dia original nas abas, cards e demais telas.
- [x] **SB-06 — Permitir alertas de preço distintos para o mesmo ativo.** A/DEF-12; possível relação com E/DEF01. O índice `alerts_active_user_type_ticker_idx`, em `008_create_alerts.sql`, torna único usuário/tipo/ticker para alertas não ignorados; não distingue condição nem preço. O formulário permite tentar e devolve erro genérico. Definir unicidade das configurações, preservando a deduplicação dos alertas automáticos. Aceite: PETR4 acima de 24 e abaixo de 20 coexistem, editam e disparam independentemente, com isolamento por usuário. Isto não reabre a correção da migration 018 retirada da lista.

### Prioridade baixa

- [x] **SB-07 — Padronizar percentuais em português.** G/DF07. `DesempenhoVisaoGeral.tsx` e `TabelaMensal.tsx` ainda formatam percentuais com `toFixed(2)`, produzindo ponto decimal; outras telas usam `Intl.NumberFormat('pt-BR')`. Aceite: vírgula decimal consistente nos valores visíveis, sem alterar números ou formato de exportação por engano.
- [x] **SB-08 — Traduzir erros técnicos para mensagens úteis.** A/CT-66. Há exibição direta de `error.message` nas rotas legadas `RentabilidadePage.tsx` e `ProventosPage.tsx`. O relatório capturou “Edge Function returned a non-2xx status code”. Aceite: erro de provedor tem texto compreensível e opção de tentar novamente, com detalhes técnicos reservados ao diagnóstico. A captura não comprova vazamento de credenciais.

## Investigações — ainda não chamar de defeito confirmado

- [x] **INV-01 — Diferença entre Início e Ativos: encerrada na versão atual.** D/DEF02: captura antiga de R$ 523,60 contra R$ 2.230,86. Reteste em produção em 30/10 confirmou valores coincidentes nas duas telas para Minha Carteira e Investidor10. Composição persistida do relatório conferida separadamente; dois hooks concordaram. Testados localmente compra, resgate parcial, filtros e atualização de cotação; 14 testes passaram. Após alinhamento com o responsável, o item sai das pendências ativas. A causa histórica exata e a correção específica responsável não foram determinadas; reabrir somente com nova reprodução. [Evidências](investigacao-patrimonio-segunda-bateria.md).
- [ ] **INV-02 — Identificar a causa exata do erro de alerta do relatório E.** Solicitar/reproduzir ticker válido e configuração, verificar primeiro alerta versus segundo, resposta e restrição envolvida. Se for a unicidade de SB-06, encerrar como duplicata; caso contrário, manter achado separado. Não atribuir a falha automaticamente ao preço baixo.
- [ ] **INV-03 — Conferir a alegação de gráfico sem dados no relatório F/DEF03.** A regra acordada usa meses encerrados; carteira iniciada no mês atual pode mostrar parcial. Verificar lançamentos e cobertura de preços/câmbio na massa original antes de concluir erro. Não inventar histórico nem remover avisos legítimos.
- [x] **INV-04 — Executar e classificar inicialmente a suíte atual.** A relata 11 falhas em 788 testes numa versão anterior. Nesta revisão: **798 passaram e 11 falharam, em 105 arquivos**. Detalhes abaixo; recuperação da cobertura permanece em QA-01. Não são 11 defeitos do produto comprovados.

### Qualidade e cobertura — prioridade média

- [ ] **QA-01 — Recuperar os quatro arquivos de teste que falham e retestar gesto em aparelho.** `StrategyManager.test.tsx`: cinco falhas por ausência de Router; os testes também esperam modal onde o fluxo atual navega para página. `InicioPage.test.tsx`: duas falhas porque a carteira simulada não informa `color`, usado pela paleta. `AssetFiltersPanel.test.tsx`: uma falha porque o lote simulado não informa `type`, usado por `FixedIncomeActions`. `MobileCarteiraHome.test.tsx`: três falhas de gesto/transformação; o componente passou a restringir a zona de início do gesto, mas a massa não prepara sua geometria. Atualizar fixtures/contextos preservando as asserções de comportamento e conferir o gesto real no PWA antes de decidir entre regressão e expectativa desatualizada. Não simplesmente remover testes ou funcionalidades para deixá-los verdes.

## Funcionalidades ausentes / melhorias — validar escopo

Ausência confirmada no fluxo não significa cálculo errado. Os identificadores RF/RN abaixo são os citados pelos autores; validar a versão aceita da ERS antes de tratá-los como descumprimento contratual.

- [ ] **REQ-01 — Busca de ativos fora da carteira para consulta.** A/DEF-04, RF-006. Existe busca ao lançar, mas não uma consulta global de catálogo destinada a abrir o resumo sem cadastrar posição.
- [ ] **REQ-02 — Favoritos.** A/DEF-06 e B/defeito 1, RF-008. Não há fluxo de adicionar/remover nem lista persistente. Uma implementação atende os dois relatórios.
- [ ] **REQ-03 — Período 5A no gráfico de cotação do ativo.** A/DEF-05, RF-007. Os botões atuais são 1M, 3M, 6M, 1A e Tudo; “Tudo” não substitui janela móvel de cinco anos. O truncamento antigo de Tudo já foi corrigido.
- [ ] **REQ-04 — Expor indicadores fundamentalistas no detalhe do ativo.** B/defeito 2, RF-009. O detalhe consulta fundamentos e mostra DY, mas não apresenta o conjunto P/L, P/VP, ROE etc. solicitado. Indicadores em colunas da tabela não atendem integralmente a consulta no detalhe. Exibir indisponibilidade sem inventar métricas para classes incompatíveis.
- [ ] **REQ-05 — Explicar a composição do score por ativo.** A/DEF-09 e parte de B/defeito 3, RF-013. O total e a aba Score existem. Faltam critério, valor observado, condição, pontos e contribuição ao resultado; é lacuna de explicação, não ausência total do Score.
- [ ] **REQ-06 — Score médio ponderado da carteira.** A/DEF-10, RN-006. Definir pesos, tratamento de dados ausentes e universo de ativos antes de implementar; hoje há score por ativo.
- [ ] **REQ-07 — Alertas configuráveis por indicador/evento.** A/DEF-13, RF-017/RN-008. O editor manual oferece preço; alertas automáticos existentes não equivalem a um construtor de condições. Depende de fontes e regras acordadas.
- [ ] **REQ-08 — Editar lançamentos de renda variável.** A/DEF-18, RF-020. O serviço oferece inserção e exclusão, sem atualização. Definir edição com recálculo histórico de preço médio/quantidade e validação da cronologia, inclusive vendas posteriores; não apenas editar o saldo final.
- [ ] **REQ-09 — Composição por setor econômico.** A/DEF-23, RF-022. As visões atuais são por classe, ativo e exposição internacional. Exige classificação confiável e tratamento de setor desconhecido; o termo técnico `sectorPath` no donut desenha uma fatia e não é cadastro de setor econômico.
- [ ] **REQ-10 — Excluir carteira pela interface.** D/DEF01. `WalletsPage.tsx` oferece criar, selecionar e editar. Incluir como funcionalidade solicitada, com regra para carteira principal e dados vinculados antes de implementar exclusão.
- [ ] **UX-01 — Mostrar/ocultar senha no cadastro e confirmação.** G/DF57. O login já tem o controle. É melhoria de usabilidade; não vulnerabilidade por si só.
- [ ] **UX-02 — Definir validação de nome com ao menos uma letra.** G/DF56. `profileSchema` limita tamanho, mas aceita `123456`. É qualidade cadastral, sem comprovação de impacto em autenticação. Se adotado, respeitar letras Unicode, nomes diversos e manter a regra alinhada ao perfil e cadastro; não aplicar uma lista restritiva de nomes.

## Já corrigidos — não duplicar na TODO de implementação

“Corrigido” abaixo significa confirmado no código e/ou reteste documentado; não se declara aqui nova homologação manual integral da versão publicada.

| Origem | Apontamento | Situação atual / evidência |
| --- | --- | --- |
| A/DEF-02 | Login Google | Fluxo implementado; login real de conta nova e existente já confirmado pelo responsável. Bloqueio por credenciais no ambiente do avaliador não reabre o defeito. |
| A/DEF-03; F/DEF05 | Editar nome/telefone | PR #94: `EditProfileForm`, serviço e sincronização do perfil. Não confundir alteração pendente de email com email já confirmado. |
| F/DEF01 | Telefone inválido | PR #94: schema compartilhado, validação e normalização. C também aprovou a validação. |
| F/DEF02 | Reenviar confirmação | Melhoria entregue na PR #94, com cooldown e feedback. |
| F/DEF07 | Sobreposição em cards móveis | PR #94: quebra de texto e largura mínima; evidências locais em 320/360/390 px. Reteste em aparelho instalado continua útil. |
| A/DEF-05, parte | Tudo truncado | O próprio reteste A confirma o histórico completo da massa longa; falta apenas a opção 5A, REQ-03. |
| A/DEF-08 | Score acima de 100 | Limite aplicado; A confirmou. Normalização versus teto é decisão de método, não novo bug demonstrado. |
| A/DEF-11 | Estratégias inacessíveis pelo menu | Aba em Análise; A confirmou. |
| A/DEF-14 | Editar alerta | Serviço e interface existentes; A confirmou condição/preço atualizados. |
| A/DEF-15 | Disparo de preço com app aberto | A confirmou condição atendida e não atendida. Monitoramento com app fechado permanece em item próprio da TODO geral. |
| A/DEF-16 | Percentual do alerta | Fórmula corrigida sobre o preço-teto; A confirmou exemplo de 50%. |
| A/DEF-17 | Lançamento sem centavos | Campo aceita frações; A confirmou gravação. |
| A/DEF-20 | Patrimônio usando cotação antiga | Reteste A confirmou cotação mais recente e R$ 1.450 nas telas da massa. O relato distinto D/DEF02 também foi encerrado após o reteste atual de INV-01, sem atribuir ambos à mesma causa. |
| A/DEF-21, parte | Valor atual usando custo | Reteste A confirma coluna corrigida; fórmula de rentabilidade é discussão separada abaixo. |
| A/DEF-22 | Composição por ativo agrupava classe | A confirmou distribuição individual e percentuais. |
| A/DEF-24 | Peso do ativo sempre 100% | Detalhe usa valuation da carteira; A confirmou 17,24% da massa. |
| A/DEF-25 | “Hoje” era ganho sobre preço médio | Cabeçalho usa variação entre fechamentos e rótulo explícito; A confirmou. |
| A/DEF-26, parte | Totais somavam proventos anteriores à compra | Totais usam histórico de recebimentos; A confirmou R$ 130 na massa. Card do detalhe ainda pendente em SB-02. |

## Não aceitar como defeito sem evidência / decisão

| Origem | Alegação | Classificação |
| --- | --- | --- |
| A/DEF-21 | Rentabilidade tem de ser somente `(cotação / PM - 1)` | Divergência de requisito/método. Ganho sobre PM, retorno com proventos e retorno histórico são medidas distintas. A própria fonte reconhece a explicação do método. Não trocar a fórmula acordada só para igualar números diferentes. |
| D/DEF03 | Primeiro ponto positivo prova erro | Não basta. O código inclui retorno do primeiro dia e acrescenta base 100 no fechamento anterior (`returnChartSeries.ts`); o eixo em percentual representa base como 0%. Conferir se a base está visível e se a origem de todas as curvas coincide. Não descartar o rendimento do primeiro dia para forçar zero. |
| B/defeito 3 | Não existe Score no detalhe | Contradito pelo código atual e pelo relatório A: aba e total existem. A falta de detalhamento é REQ-05. |
| B/defeito 4 | Faltam 1M/3M/6M; só há 1A/2A/5A | Não corresponde ao componente atual, que contém 1M/3M/6M/1A/Tudo. Não reproduzido nesta revisão. Ausência de 5A está em REQ-03. |
| F/DEF06 | HTML contém itens sem uso, logo há falha de segurança | Sem vetor de exploração, dado exposto ou comportamento demonstrado, não comprova vulnerabilidade. Remoção de código pode ser manutenção, se identificada concretamente. |
| F/DEF07, parte | Valores monetários com quatro casas | Não demonstrado no trecho verificado; formatadores de moeda usam duas casas. Quantidade fracionária não é valor monetário. |
| A/observações | Mais requisições provam lentidão fora do requisito | A mediu 1,42–2,41 s, abaixo do seu limite de 3 s. Otimização pode ser melhoria; não há falha de limite demonstrada nessa massa. |
| A/testes bloqueados | Falta de URL/credenciais no ambiente local | Limitação do ensaio; existe implantação pública e OAuth já homologado. Não registrar indisponibilidade ou falta de HTTPS com base apenas nesse bloqueio. |

## Exclusões e pendências históricas

- A/DEF-27, migration 018: **fora da TODO por decisão explícita do responsável**, sem declarar corrigida e sem alterar o arquivo. Não confundir com o ajuste pontual de unicidade necessário a SB-06.
- F/DEF04, preço-alvo “irrealista”: **desconsiderado por decisão explícita do responsável**. Não é motivo para remover os outros achados independentes de alertas.
- H/P-01: emails no spam/SendGrid continuam adiados conforme decisão do responsável; não reabrir neste ciclo.
- H/P-03: os três lotes de Tesouro foram tratados posteriormente com taxas históricas aproximadas autorizadas; a pendência de 26/10 não pode ser copiada como atual.
- H/P-02: CDB com datas inconsistentes na origem exige conciliação do registro específico; este conjunto de testes não comprova que o dado foi corrigido nem autoriza inventar datas.
- H/P-04: conferir em aparelho físico gesto de carteira, rolagem, toque, tooltip e legibilidade. Validação local responsiva não substitui esse teste.
- H/P-05: conciliação externa exige extrato da mesma conta, data e base; diferença com outro sistema, isoladamente, não prova erro de atualização ou fórmula.
- Pendências anteriores de atualização de lista/sino, retorno ao foco, elegibilidade/moeda de Bazin e monitoramento com app fechado continuam em [TODO.md](TODO.md). Push entregue não encerra automaticamente esses quatro fluxos.

## Validação desta auditoria

- Base conferida com `git fetch origin`: `481ddb6`, incluindo PR #94 e alterações integradas de interface.
- Reprodução isolada do deslocamento de data em America/Sao_Paulo: `2026-01-05` formatado como `04/01/2026`.
- Revisão estática dos fluxos de cadastro, rotas, lançamento, alertas, proventos, score, composição, patrimônio e formatação.
- Suíte atual: `pnpm test:run --maxWorkers=2 --minWorkers=1`, **798 aprovados, 11 falhas, 105 arquivos (101 aprovados e 4 com falhas)**, duração 164,58 s. Log em `output/auditoria-segunda-bateria/test-run-limited.log` (evidência local, fora do commit). A primeira tentativa foi bloqueada pelo sandbox; a execução sem limite de workers foi interrompida e substituída por dois workers. Não houve mudança de produto ou teste para obter esse resultado.
- Nenhuma escrita em banco, criação/exclusão de alerta, exclusão de carteira ou alteração de configuração de produção nesta revisão.
