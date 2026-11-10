# Revisão do projeto e oportunidades — 06/11/2026

Revisão local de código, rotas, cálculos auxiliares, importação/exportação, PWA, build e TODO, solicitada pelo responsável. Não é nova auditoria de produção nem conciliação das contas reais. Não foram alteradas funcionalidades, movimentações, regras ou configurações externas nesta revisão.

Base: branch `codex/fundamentos-score-alertas`, incluindo melhorias ainda locais. Evidências de build/testes são as execuções já registradas em `melhorias-gerais-2026-11-06.md`; a revisão não executou outra regressão completa.

## Prioridades concretas

### RP-01 — Alta: revisar a fórmula do payout

Evidência: `enrichPositionRows.ts` calcula `(proventos recebidos pelo investidor / quantidade atual) / LPA × 100`. `AtivosPosicoes.tsx` usa esse enriquecimento na tabela atual, que apresenta Payout por padrão.

Payout da empresa deve comparar distribuição e lucro compatíveis por período/unidade; não depende de quanto o usuário recebeu pessoalmente. Compra recente, venda parcial e retenção de imposto podem alterar o resultado atual sem alterar a distribuição da empresa.

Exemplo ilustrativo, sem usar dados de conta: empresa distribui 1 por ação e tem LPA 2 no mesmo período → 50%. Se alguém com 10 ações atuais recebeu apenas 6 devido ao histórico de compras, a expressão atual retorna 30%. O teste demonstra a diferença de bases conceitualmente; não é medição de um ativo real.

Proposta: separar payout fundamentalista de rendimento recebido na carteira; usar distribuições públicas por ação e lucro compatíveis ou indicador confiável da fonte. Tratar lucro não positivo, BDRs e moedas/unidades; manter ausente quando a base não puder ser verificada. Corrigir antes de promover payout a critério de score.

### RP-02 — Alta: padronizar moeda nos totais de proventos e no YOC

Evidências:

- `useDividends.ts` produz estimativas com `total_value` na moeda do ativo.
- `incomeHistoryService.ts` preserva recebimentos importados líquidos em BRL.
- `useDividendTotals.ts` soma `total_value` por ticker sem conversão ou separação por moeda.
- `AtivosPosicoes.tsx` soma esses totais no campo `proventos12mBRL`.
- `enrichPositionRows.ts` usa o total recebido no YOC, com denominador `preço médio × quantidade` na moeda da cotação.

Essa cadeia permite misturar BRL e USD e comparar numerador/denominador em moedas distintas. Achado confirmado na expressão e nos contratos dos dados; não foi quantificado impacto em conta real nesta revisão.

Proposta: tipos explícitos de moeda e base; manter recebimentos originais, total em BRL com câmbio histórico/data de pagamento e cálculo por ativo com numerador/denominador compatíveis. Ausência de câmbio deve gerar indisponibilidade, não soma direta. Testar importado BRL + evento USD, compra/venda parcial e retenção. Não aplicar câmbio atual indiscriminadamente ao histórico.

### RP-03 — Alta: transformar o diagnóstico de histórico incompleto em ações

`ReturnHistoryNotice.tsx` já mostra motivos. O próximo passo é detalhar título/ativo, datas faltantes, tipo de lacuna e uma ação possível: atualizar fonte, completar cadastro ou conferir movimentação. O aviso genérico de renda fixa foi observado no ensaio local anterior desta sessão; sua causa específica não foi reinvestigada aqui.

Não registrar como novo defeito universal ou esconder a mensagem. Concluir o diagnóstico por lote e verificar cobertura do período solicitado, mantendo a regra de meses fechados e interrupções reais.

### RP-04 — Média: contrato único de indicadores e unidades

Score, estratégias e alertas têm conjuntos de métricas/validações distintos. `customStrategy.ts` não oferece todos os campos do score. Yahoo armazena dívida/PL como percentual; as ajudas agora explicam isso, mas limites antigos continuam preservados.

Proposta: catálogo compartilhado de indicador, unidade, classes compatíveis, fonte, referência e operadores. Não converter regras antigas sem confirmar a intenção. Evitar definir uma métrica como proxy de outra. A inclusão de novos indicadores deve aproveitar esse contrato.

### RP-05 — Média: importação acessível, protegida e rastreável

Já existem parser, preview editável e serviço de importação. Entretanto, `TransactionImportPage` não aparece nas rotas atuais e não foi encontrada integração desse preview nas telas atuais de lançamentos. Os trechos revisados do serviço fazem INSERT de lote sem identificador de importação/deduplicação por arquivo.

Oportunidade: ligar o fluxo ao menu atual, mostrar carteira de destino antes de confirmar, identificar lote/arquivo, conferir possíveis duplicatas e fornecer resultado por lote. Não bloquear compras legítimas apenas por terem os mesmos valores. Investigar ainda a concorrência entre validação assíncrona do preview e confirmação: hoje o botão não depende explicitamente de uma validação em andamento. Essa corrida é hipótese de teste, não reprodução concluída.

### RP-06 — Média: recuperação de erro de tela e de atualização do PWA

`App.tsx` monta as rotas sem Error Boundary global. Há boundaries locais em componentes, mas isso não cobre a aplicação inteira. `routes.tsx` usa Suspense para carregamento de rotas; Suspense não substitui recuperação de exceções.

Proposta: fallback com nova tentativa e orientação segura; tratar falha ao baixar um chunk após publicação, preservar formulários em andamento e distinguir offline de erro. Não prometer operação financeira offline: o service worker atual mantém arquivos estáticos, não sincroniza lançamentos offline.

### RP-07 — Média: reduzir carregamento inicial

Build local final anterior: `index-C9bNNfjb.js` com 1.408,08 kB (391,29 kB gzip). `routes.tsx` ainda importa várias páginas diretamente, embora já use lazy em sub-rotas.

Oportunidade: dividir rotas adicionais, carregar gráficos/calculadoras sob demanda e medir tempo de abertura em aparelho/rede limitados. O tamanho é evidência de oportunidade, não prova de lentidão fora de um requisito. Preservar rotas e comportamento existentes.

### RP-08 — Média: verificação automática por PR

Não há `.github/workflows` neste checkout. Há scripts de testes, lint, build/PWA e testes SQL, mas execução local não garante que toda PR passe por eles.

Proposta: CI com versão de runtime fixada, instalação pelo lockfile, TypeScript, lint, testes e build. Banco com fixtures e rollback, sem credenciais privilegiadas no frontend ou nos logs. A revisão não verificou configurações externas ou pipelines que estejam fora do repositório.

## Funcionalidades adicionais com encaixe no produto

1. **Planejador de próximo aporte:** já temos metas por classe e diferença sobre patrimônio atual. Acrescentar o valor do próximo aporte e simular sua distribuição para reduzir os desvios, respeitando caixa e valores mínimos. Não executa compra.
2. **Explicação da variação do patrimônio:** separar aportes/retiradas, valorização na moeda original, efeito do câmbio e proventos. Complementa os gráficos e facilita conciliação com outros sistemas.
3. **Exportação completa e portável por carteira:** já existe CSV de posições de renda variável filtradas. Acrescentar lançamentos, renda fixa/eventos, recebimentos e metadados de moeda/fonte; prévia e validação para eventual restauração. Não chamar o CSV atual de backup completo.
4. **Metas de renda integradas à carteira:** aproveitar as calculadoras existentes, salvar a meta e comparar renda recebida com projeção em cenários explícitos. Evitar duplicar simuladores já entregues.
5. **Painel de saúde dos dados:** reunir data/fonte de cotações, câmbio, fundamentos e cobertura do histórico; distinguir cotação antiga, sincronização parcial e mercado fechado. Já existem avisos e atualização pontual, que devem ser reutilizados.

## Sequência sugerida

1. Publicar e retestar as melhorias locais já concluídas em PR própria.
2. RP-01 e RP-02, com casos de moeda e compras/vendas históricas.
3. RP-03 e RP-04, para que novos números tenham rastreabilidade e interpretação consistente.
4. RP-06/07/08 e integração cuidadosa da importação RP-05.
5. Planejador de aporte e explicação das variações; depois indicadores adicionais já registrados na pesquisa de canais.

Não incluir novamente como pendência: favoritos, edição de lançamentos, exclusão de carteira, busca do catálogo, metas por classe, calendário de proventos, push básico, comparação IPCA, composição por setor ou os quatro recursos implementados nesta branch. Podem receber evolução, mas já existem.

Migration 018 e entrega de email/SendGrid mantêm as decisões anteriores do responsável. Código legado com mensagens “Em breve” não foi tratado como defeito de tela atual sem confirmar sua acessibilidade; não foi removido.
