# TODO ativa de evolução do Valora

Consolidada em 06/11/2026 a pedido do responsável. Esta é a lista de acompanhamento das melhorias discutidas nesta rodada; os relatórios anteriores preservam evidências e histórico. Checkbox marcado significa critério concluído e documentado, não apenas código iniciado.

Priorizar fontes gratuitas. Disponibilidade de dados será validada antes de prometer cobertura. Cada entrega deve preservar funcionalidades existentes, receber testes apropriados e seguir por PR; merge pelo responsável.

Segurança foi priorizada em seguida: [estado das correções e pendências](TODO-seguranca.md), incluindo proteção de login, dependências e isolamento entre contas.

## 1. Concluir a entrega já implementada

- [x] **ENT-01 — Revisar o diff e abrir PR das melhorias locais.** Entrega na branch `codex/fundamentos-score-alertas`, incluindo fundamentos, score explicado/ponderado, regras de alertas e correções de segurança. Commits separados por melhorias e segurança; arquivos pessoais/gerados excluídos. Backend aplicado; publicação e homologação permanecem em ENT-02/03. Merge pelo responsável.
- [ ] **ENT-02 — Retestar a interface em produção após merge/deploy.** Conferir fundamentos por classe, mesma pontuação do ativo, cobertura da média, criação/edição/pausa de regras e preservação dos alertas de preço.
- [ ] **ENT-03 — Homologar esta versão no PWA instalado.** Leitura das ajudas, formulários, navegação e um teste autorizado de novo tipo de push. As homologações anteriores de Android/iOS permanecem válidas para suas versões; não equivalem ao reteste desta entrega.

Detalhes e testes já executados: [melhorias gerais](melhorias-gerais-2026-11-06.md).

## 2. Alta — confiabilidade dos cálculos e dados

- [ ] **RP-01 — Corrigir a base do payout.** Usar distribuição e lucro da empresa compatíveis por período, moeda e unidade. O resultado não deve depender de compras, vendas ou proventos recebidos pessoalmente. Tratar lucro não positivo e dados ausentes. Validar antes de disponibilizar payout no score.
- [ ] **RP-02 — Padronizar moedas nos proventos e YOC.** Impedir soma direta de BRL/USD; preservar valores originais e definir conversão histórica quando necessária. Testar recebimentos importados em BRL, eventos em USD, retenção e mudanças de quantidade. Câmbio ausente deve gerar indisponibilidade.
- [ ] **RP-03 — Diagnóstico acionável do histórico incompleto.** Identificar ativo/título/lote, datas e informação faltante; oferecer atualização ou orientação de cadastro. Validar a causa de renda fixa por lote. Preservar meses fechados e lacunas reais, sem apenas ocultar o aviso.

Evidências e distinção entre achado de código e impacto ainda não medido: [revisão do projeto](revisao-projeto-oportunidades-2026-11-06.md).

## 3. Média — consistência técnica e operação

- [ ] **RP-04 — Catálogo compartilhado de indicadores.** Centralizar fórmula/convenção, unidade, fonte, referência, classes e operadores para tabela, score, estratégias e alertas. Conferir Dívida/PL; confirmar intenção antes de converter limites antigos.
- [ ] **RP-05 — Integrar a importação ao fluxo atual.** Reutilizar parser/preview existentes, mostrar carteira de destino e registrar lote/arquivo. Conferir possíveis duplicatas sem bloquear compras legítimas iguais. Reproduzir a hipótese de corrida entre validação assíncrona e confirmação; só então classificar/corrigir esse defeito.
- [ ] **RP-06 — Recuperação de erros e de carregamento do PWA.** Adicionar fallback global e nova tentativa; distinguir offline e falha de versão/chunk, preservando dados de formulário. Não prometer gravação offline sem implementação própria.
- [ ] **RP-07 — Melhorar carregamento inicial.** Medir em aparelho/rede limitados, dividir rotas e carregar recursos pesados sob demanda. Comparar com o bundle inicial observado de aproximadamente 1,4 MB sem compressão; manter fluxos existentes.
- [ ] **RP-08 — CI por PR.** Versionar execução de TypeScript, lint, testes e build/PWA com runtime e lockfile definidos. Testes SQL com fixtures/rollback e tratamento seguro de credenciais.

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
