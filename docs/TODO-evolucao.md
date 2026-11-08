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

PR112 também separa visualmente líquidos importados e estimativas brutas em Desempenho › Proventos. Fechamento técnico da rodada não significa reconciliação de líquido sem extrato ou igualdade artificial dos centavos com I10. [Estado detalhado](pendencias-prioritarias-2026-11-07.md).

## 3. Média — consistência técnica e operação

**Atualização PR114:** [implementação técnica](pendencias-tecnicas-integridade-2026-11-07.md) e [homologação em produção](homologacao-producao-pr114.md). Contrato frontend/monitor alinhado; importação atômica com recibo e idempotência por conteúdo publicada e retestada com carteira temporária autorizada: duas linhas preservadas, repetição sem duplicar, limpeza integral e Investidor10 preservada. As duas migrations estão aplicadas. Rascunhos da prévia CSV e do lançamento rápido sobreviveram à recarga em produção, sem envio automático. Recuperação de sessão conferida em harness visual isolado; medição inicial do build com rede simulada concluída. Permanecem rascunhos dos outros formulários e teste Android físico, que o titular fará após publicação; não marcar RP-06/RP-07 inteiramente encerrados.

Rodada técnica local iniciada em 07/11/2026: catálogo compartilhado inicial, recuperação de sessão/tela, bloqueio da corrida de importação e divisão de páginas. Os itens abaixo permanecem abertos até atenderem seus critérios completos e homologação. [Implementação, medições e limites](correcoes-tecnicas-2026-11-07.md).

Atualização07/11: implementação inicial publicada pela PR110; início, importação, detalhe e rentabilidade conferidos em produção. RP04–07 continuam abertos pelos critérios restantes abaixo; RP09 precisa do reteste específico de sessão revogada, sem revogar sessões reais inadvertidamente.

- [ ] **RP-04 — Catálogo compartilhado de indicadores.** Centralizar fórmula/convenção, unidade, fonte, referência, classes e operadores para tabela, score, estratégias e alertas. Conferir Dívida/PL; confirmar intenção antes de converter limites antigos.
  - PR120: aviso explícito da interpretação percentual de Dívida/PL nas regras de score e alertas, inclusive nos formulários. Um limite 1,5 continua sendo 1,5%; 1,5 vez equivale a 150%. Nenhum limite personalizado foi convertido. A confirmação da intenção dos limites antigos permanece pendente.
- [x] **RP-05 — Integrar a importação ao fluxo atual.** Entregue na PR114: parser/preview, destino, recibo do lote, duplicação por conteúdo, atomicidade e corrida entre confirmações testados. Homologação com carteira temporária autorizada e limpeza concluída, conforme [registro](homologacao-producao-pr114.md).
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

**Continuação RP-09 local:** integração de novo login da mesma conta, isolamento na troca de identidade e resposta tardia verificados com AuthProvider/SessionRecovery reais e respostas simuladas. Corrigida espera indefinida de getUser com limite de 15 segundos e nova tentativa, sem logout. 9 testes aprovados; nenhuma sessão real revogada. [Evidências e limite do teste entre abas](recuperacao-sessao-2026-11-08.md). Ainda não publicado.
