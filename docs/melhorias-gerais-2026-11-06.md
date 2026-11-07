# Melhorias gerais — 06/11/2026

Branch: `codex/fundamentos-score-alertas`. Quatro itens da TODO anterior à terceira bateria. Frontend implementado e conferido localmente; ainda não publicado nem mergeado. As três migrations abaixo já foram aplicadas no Supabase compartilhado.

## Caminhos e comportamento

- **Resumo do ativo → Visão geral:** painel de P/L, P/VP, ROE, DY, Dívida/PL e margem líquida, com referência e fonte. Ações/BDRs recebem indicadores de empresas; FIIs/REITs recebem P/VP e DY. Outras classes mostram incompatibilidade. Dados demonstrativos, ausentes ou não finitos não viram zero. Dívida/PL do Yahoo é exibida em percentual; não se presume unidade de outro provedor.
- **Resumo do ativo → Score:** cada regra mostra indicador, condição, valor observado, pontos configurados e contribuição. Ausência é diferente de condição não atendida. A soma e o limite de 0–100 são os mesmos do cálculo existente; não há normalização nova nem alteração dos limites cadastrados.
- **Análise → Score:** média dos scores de ações e BDRs com todos os critérios presentes, ponderada pelo valor de mercado em BRL. Fundos, ETFs, cripto, renda fixa e empresas sem todos os dados ficam fora da média, mas continuam no denominador da cobertura do patrimônio. Dados demonstrativos são excluídos. Cotação/câmbio ausente impede publicar uma média parcial. Filtros da tabela de Ativos não limitam o universo; a carteira selecionada é respeitada.
- **Alertas e Análise → Alertas → Nova regra de alerta:** criar, editar, pausar, ativar e excluir condições por indicador (`≥`/`≤`) ou eventos de proventos. Autocomplete identifica o ativo sem consultar cotação. Alertas de preço existentes continuam disponíveis.

## Monitoramento

- Cron `monitor-configured-alerts`, a cada cinco minutos, usando dados já sincronizados. Nenhuma API paga, chave adicional ou Edge Function nova.
- Indicadores: ações/BDRs e DY/P/VP para FIIs/REITs. Primeiro atendimento dispara; manter a condição atendida não repete. Uma observação posterior que deixe de atender rearma. Alterar ticker/indicador/operador/limite redefine a condição avaliada. Pausar não apaga avisos.
- Fundamentos futuros, demonstrativos ou com referência há mais de 400 dias não disparam. Métrica ausente não rearma artificialmente. Dívida/PL só é avaliada quando a fonte é Yahoo, cuja unidade percentual está explícita no editor.
- **Provento anunciado:** evento novo na base, inserido a partir da criação da regra, com pagamento/data ex ainda não passada. Não presume cobertura em tempo real de anúncios das companhias.
- **Pagamento:** data publicada entre a criação da regra e hoje; recuperação de até sete dias se o monitor atrasar. É aviso de evento público, não confirmação de direito ou valor recebido pela carteira.
- Cada evento gera no máximo um aviso por regra. Ler/ignorar/remover a notificação não recria o mesmo evento. Editar/remover uma regra não apaga avisos recebidos. Excluir e recriar uma regra cria uma identidade de monitoramento nova.
- Inserts em `alerts` aproveitam o trigger de push existente. A entrega física de um novo tipo de aviso não foi repetida; testes de banco não substituem esse ensaio.

## Banco e isolamento

Aplicadas, em ordem:

1. `20261106225649_configured_alert_types`: acrescenta `indicator` e `event` ao enum, em migration separada.
2. `20261106232307_configured_alert_rules`: regras por conta, validação de classe/condição, estado interno, deduplicação e agendamento. Preserva a unicidade dos alertas antigos e dos preços-alvo.
3. `20261106233419_configured_alert_metric_units`: monitor valida a unidade de dívida por fonte e usa texto legível nas notificações.

Arquivos inicialmente gerados pelo CLI e alinhados aos identificadores efetivamente registrados pelo MCP no histórico remoto, para não reaplicar as mesmas migrations.

RLS e grants restringem leitura/escrita das regras ao proprietário. Estado e entregas não têm acesso de navegador; monitor com SECURITY INVOKER, sem execução para anon/authenticated, `search_path=''`. O auditor apresenta INFO de RLS sem policy nas duas tabelas internas: bloqueio intencional, com grants apenas ao serviço. Avisos preexistentes de extensões e proteção de senha não foram alterados neste escopo.

## Validação

- TypeScript aprovado após integração.
- Regressão completa: **976 testes aprovados, 141 arquivos**, sem falhas, 271,46 s. Log local `output/melhorias-gerais-regressao.log`.
- Após refinamentos de compatibilidade/unidade, **9 testes direcionados aprovados**, incluindo três novos da média ponderada; parte sobrepõe a regressão. Não somar as contagens como casos distintos. Log `output/melhorias-gerais-complementar.log`.
- SQL `supabase/tests/configured_alert_rules.sql`: contas/ativo sintéticos com rollback, cobrindo RLS, tentativa de proprietário falso, bloqueio de execução no cliente, classe/threshold inválidos, cruzamento/rearme, edição, pausa, ausência, seed, referência futura/antiga e deduplicação de proventos. Aprovado novamente após a última migration.
- Pós-teste: **zero contas sintéticas, zero ativos sintéticos e zero regras persistidas**. Nenhuma posição, lançamento ou preferência real foi modificada. Job registrado em `*/5 * * * *`, execução real com status `succeeded`.
- Navegador integrado autenticado: PETR4 com indicadores e referência 06/11; composição do score somou 4, igual ao total existente. “Minha Carteira” apresentou score 1,05 e cobertura 46,47% na leitura observada. Valores são uma captura, não expectativa fixa de mercado.
- Formulário de regra conferido em viewport móvel e desktop, incluindo autocomplete PETR4, entrada de limite e alternância para evento. Cancelado sem salvar na conta. Modo móvel registrado em `output/melhorias-gerais-alerta-mobile.png`.
- PWA instalado e interface de produção ainda exigem reteste após publicação. O aviso de histórico incompleto visto na carteira durante o ensaio não pertence às quatro melhorias e não foi ocultado ou alterado.

Build/PWA final aprovado. Lint sem erros; dois avisos preexistentes de Fast Refresh em `.tmp/mobile-kpi-review/main.tsx` e `StrategyForm.tsx`, fora do escopo. Logs: `output/melhorias-gerais-build-final.log` e `output/melhorias-gerais-lint.log`.

## Complemento — explicações dos campos do score

A pedido do responsável, acrescentadas ajudas expansíveis por toque/teclado em cada indicador dos cards de score: conceito, fórmula, unidade, limitações e contribuição específica da regra. Seção geral explica nome/grupo, operador, limites inclusivos/exclusivos, pontos positivos/negativos, dados ausentes, limite de 0–100 e média ponderada. Criação e edição atuais também apresentam orientação junto aos campos, incluindo o indicador selecionado. Nenhuma regra, ponto ou fórmula foi alterado.

Conceitos conferidos com o material educativo da [B3](https://borainvestir.b3.com.br/tipos-de-investimentos/renda-variavel/acoes/6-indicadores-para-comparar-acoes-de-empresas-do-mesmo-setor/); a unidade de Dívida/PL segue a implementação Yahoo existente, sem confundir dívida total com dívida líquida ou converter os limites do usuário. Testes direcionados iniciais: 35 aprovados. Logs deste complemento em `output/score-explicacoes-*`.
