# TODO ativa de evolução do Valora

Consolidada em 06/11/2026 a pedido do responsável. Esta é a lista de acompanhamento das melhorias discutidas nesta rodada; os relatórios anteriores preservam evidências e histórico. Checkbox marcado significa critério concluído e documentado, não apenas código iniciado.

Priorizar fontes gratuitas. Disponibilidade de dados será validada antes de prometer cobertura. Cada entrega deve preservar funcionalidades existentes, receber testes apropriados e seguir por PR; merge pelo responsável.

Segurança foi priorizada em seguida: [estado das correções e pendências](TODO-seguranca.md), incluindo proteção de login, dependências e isolamento entre contas.

## 1. Concluir a entrega já implementada

- [x] **ENT-01 — Revisar o diff e abrir PR das melhorias locais.** Entrega na branch `codex/fundamentos-score-alertas`, incluindo fundamentos, score explicado/ponderado, regras de alertas e correções de segurança. Commits separados por melhorias e segurança; arquivos pessoais/gerados excluídos. Backend aplicado; publicação e homologação permanecem em ENT-02/03. Merge pelo responsável.
- [x] **ENT-02 — Retestar a interface em produção após merge/deploy.** Conferir fundamentos por classe, mesma pontuação do ativo, cobertura da média, criação/edição/pausa de regras e preservação dos alertas de preço.
- [x] **ENT-03 — Homologar esta versão no PWA instalado.** Leitura das ajudas, formulários, navegação e um teste autorizado de novo tipo de push. As homologações anteriores de Android/iOS permanecem válidas para suas versões; não equivalem ao reteste desta entrega.

Homologação da PR #108 concluída: CRUD temporário em produção, OAuth/ajudas/score confirmados pelo responsável e push com abertura de Alertas no PWA. Regra removida e aviso encerrado. [Evidências e limites](validacao-producao-pr108.md).

- [x] **ENT-04 — Publicar e retestar payout, moedas e diagnóstico.** PR #109 mergeada, deploy e CI da main aprovados. Payout, YOC/BRL/USD, recebimentos, meses fechados e diagnóstico por lote conferidos no navegador integrado, em desktop e layout móvel. [Evidências e limites](validacao-producao-pr109.md). Na Minha Carteira, a lacuna de IPCA em 31/10 persiste porque a fonte consultada ainda termina em setembro; o aviso correto foi preservado. Seleção Investidor10 e colunas restauradas, sem alterações financeiras.

Detalhes e testes já executados: [melhorias gerais](melhorias-gerais-2026-11-06.md).

## 2. Alta — confiabilidade dos cálculos e dados

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
- [ ] Conferir cadastro Tesouro Selic vencimento10/10/2027, quantidade100, sem PU oficial compatível. Fora da carteira Investidor10; saldo preservado, sem correção por suposição. Outros13 lotes recalculados.
- [x] Retestar em produção a consolidação dos lotes do mesmo Tesouro após merge da PR111: IPCA2029 uma linha/2 aplicações, saldo158,34; compras e datas preservadas.

Atualização das prioridades: custo de aquisição com corretagem/taxas de compra corrigido no banco, com recálculo autorizado; diferença explicada de7,92659 na Investidor10, restando cerca de0,05 para reconciliar. CDI agora grava referência econômica05/11 separada da execução e rejeita lacunas acima de10 dias; critério é conservador e não substitui calendário bancário completo. B3 concluiu22/22 tarefas sem erros,134 anúncios. JPM pagamento31/10 confirmado no RI e complementado como evento público; líquido pessoal não inferido. Tesouro desconhecido pertence a outra conta, não ao titular da Investidor10; preservado e não tratado como cadastro do usuário.

## 3. Média — consistência técnica e operação

Rodada técnica local iniciada em 07/11/2026: catálogo compartilhado inicial, recuperação de sessão/tela, bloqueio da corrida de importação e divisão de páginas. Os itens abaixo permanecem abertos até atenderem seus critérios completos e homologação. [Implementação, medições e limites](correcoes-tecnicas-2026-11-07.md).

Atualização07/11: implementação inicial publicada pela PR110; início, importação, detalhe e rentabilidade conferidos em produção. RP04–07 continuam abertos pelos critérios restantes abaixo; RP09 precisa do reteste específico de sessão revogada, sem revogar sessões reais inadvertidamente.

- [ ] **RP-04 — Catálogo compartilhado de indicadores.** Centralizar fórmula/convenção, unidade, fonte, referência, classes e operadores para tabela, score, estratégias e alertas. Conferir Dívida/PL; confirmar intenção antes de converter limites antigos.
- [ ] **RP-05 — Integrar a importação ao fluxo atual.** Reutilizar parser/preview existentes, mostrar carteira de destino e registrar lote/arquivo. Conferir possíveis duplicatas sem bloquear compras legítimas iguais. Reproduzir a hipótese de corrida entre validação assíncrona e confirmação; só então classificar/corrigir esse defeito.
- [ ] **RP-06 — Recuperação de erros e de carregamento do PWA.** Adicionar fallback global e nova tentativa; distinguir offline e falha de versão/chunk, preservando dados de formulário. Não prometer gravação offline sem implementação própria.
- [ ] **RP-07 — Melhorar carregamento inicial.** Medir em aparelho/rede limitados, dividir rotas e carregar recursos pesados sob demanda. Comparar com o bundle inicial observado de aproximadamente 1,4 MB sem compressão; manter fluxos existentes.
- [x] **RP-08 — CI por PR.** Versionar execução de TypeScript, lint, testes e build/PWA com runtime e lockfile definidos. Testes SQL com fixtures/rollback e tratamento seguro de credenciais. Entregue na PR #108; CI da main e PR aprovadas, com Node 24 nas Actions.

- [ ] **RP-09 — Explicar sessão revogada.** Diferenciar `session_not_found` de indisponibilidade do provedor e orientar novo login. Não aceitar token revogado para silenciar o erro nem alterar o escopo de logout sem decisão explícita.

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

- Migration 018 continua fora do escopo por decisão do responsável.
- SendGrid/spam continua adiado enquanto não houver domínio próprio.
- Tokens do Kauê permanecem autorizados conforme decisão registrada na TODO de segurança.
- Recursos já entregues não são reabertos como ausentes: favoritos, edição de lançamentos, exclusão de carteira, metas por classe, busca, push básico, composição por setor e comparação IPCA. Esta lista contém suas evoluções quando explicitadas.
