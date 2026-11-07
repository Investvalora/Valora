# Homologação integrada das fontes oficiais — 07/11/2026

Ambiente isolado em execução: PostgreSQL17.11 portátil e PostgREST12.2.12 em loopback. Handlers reais do repositório chamados via HTTP por um gateway local; fontes públicas reais. Catálogo de teste com mais de500 ativos para exercitar paginação. Registros pessoais apenas fictícios. Nenhuma migration nova aplicada definitivamente em produção.

O Docker não disponibilizou daemon; os binários portáteis foram obtidos de distribuições públicas e armazenados em output, fora das dependências do aplicativo. A integridade SHA512 do pacote PostgreSQL foi conferida. O stub de cron registra os agendamentos, mas não executa pg_cron/pg_net: a entrega ainda exige teste do scheduler hospedado depois do deploy. O teste não simula login/OAuth do GoTrue nem o runtime hospedado das Edge Functions; executa os handlers TypeScript com Node e PostgREST real. Deno check é verificado separadamente.

## Defeitos encontrados nesta homologação

1. B3: arquivo mensal de novembro retornou404, enquanto o diário de06/11 estava disponível. Implementado fallback limitado ao arquivo diário recente, somente no mês corrente, com aviso explícito de que não representa backfill mensal completo. Falhas diferentes de404 continuam falhas; não mascarar indisponibilidade.
2. CVM: arquivo real de2025 contém duplicatas idênticas e valores conflitantes para a mesma chave CNPJ/competência/versão. O UPSERT em lote falhava. Parser agora deduplica idênticos e exclui chaves conflitantes, informando o número excluído. Não escolhe VPA arbitrário. Carga repetida persistiu19269 informes, com9 chaves conflitantes excluídas e0 novos enriquecimentos na segunda execução.
3. Preparação do harness: Postgres puro não reproduzia os grants de service_role da plataforma; corrigido apenas no ambiente descartável. Conversão DATE do driver de teste também foi normalizada como string ISO, sem alterar datas do aplicativo.

## Evidências até o momento

- Quatro endpoints novos/alterados recusaram token autenticado sem privilégio de servidor com401.
- Catálogo com mais de500 ativos percorrido; cinco identificadores oficiais B3 gravados para os ativos reais do fixture.
- CVM:19269 informes persistidos; dois FIIs com dados ausentes enriquecidos; VPA confirmado de terceiro fundo preservado. Reexecução sem duplicação.
- B3 anúncios:20 anúncios, duas classes de ação por ISIN, sem criação de recebimentos pessoais.
- iShares:521 tickers descobertos, dois ETFs do catálogo isolado associados e20 distribuições gravadas. Evento TFLO enriquecido de Yahoo para fonte oficial com USD0,171627 e pagamento05/11.
- Inicialização sem PU do Tesouro: macro gravou CDI/Selic/IPCA, recalculou dois lotes e informou falha parcial do terceiro, sem fabricar preço. A ordem correta é ingerir PU antes de exigir recálculo integral.

Logs e resultados de cada chamada ficam em output/qa-fontes-oficiais/integration-results.json. Esse arquivo pode conter rodadas incompletas e não deve ser interpretado como aprovação enquanto assertions.json não confirmar a rodada final.

## Pendências de fechamento

- [x] Rodada integrada concluída: Tesouro649 preços, referência06/11/2026, recálculo3/3 sem erro depois da carga; CoinGecko3/3 pares; falha simulada CVM503 com informes preservados; fotografia de posições/lançamentos/eventos e soma do principal inalterada. `assertions.json` confirma aprovação.
- [x] Conferência visual local concluída após reconexão do navegador integrado: componente real `FundamentalsPanel` alimentado pelo banco isolado, em desktop e390×844. P/VP, DY e nota de competência CVM legíveis; métricas incompatíveis exibem "Não se aplica". Distribuições TFLO conferidas na prévia técnica, com data ex, pagamento, moeda e fonte separados. Evidências em output/qa-fontes-oficiais/visual-mobile.png, visual-distribuicoes-mobile.png e visual-desktop.png. A prévia é um harness de componentes, não o fluxo autenticado completo do aplicativo nem teste de aparelho físico.
- Publicação e homologação de cron/Edge Functions hospedados permanecem posteriores ao merge/deploy.

Testes direcionados após correções:14/14 aprovados; Deno check aprovado para B3 e CVM. Suíte completa1050 e build haviam passado antes dessas correções; não confundir com nova execução completa. Homologação técnica integrada e visual dos componentes aprovadas dentro dos limites descritos. Permanece a homologação dos agendamentos, runtime hospedado e fluxo autenticado após publicação coordenada. Nenhuma carteira real foi alterada.

## Ampliação da homologação autenticada e regressão

- Fluxo real local autenticado consultado com a carteira Investidor10: início, posições, detalhe CPTS11 (visão geral, proventos e score), importação CSV sem upload/salvamento e rentabilidade. Nenhuma movimentação real foi alterada.
- Rentabilidade terminou de carregar: período07/11/2024–31/10/2026, total24,09%; novembro ainda sem fechamento. Comparação IPCA terminou em setembro/2026, último mês publicado disponível. Sem aviso de histórico incompleto nesta consulta da carteira. Isso não comprova cobertura de todas as contas.
- Histórico público CPTS11 ainda vazio no banco compartilhado: novas fontes não foram publicadas. Recebimentos pessoais importados continuam visíveis. Não confundir ausência de histórico público com perda de recebimentos.
- Compatibilidade de rollout: consulta de fundamentos repete sem `cvm_reference_date` somente se essa coluna estiver ausente (42703/PGRST204 com nome correspondente). Erros de autorização não são contornados. Dois testes aprovados.
- Build TypeScript/Vite/PWA aprovado; Deno check dos nove endpoints alterados aprovado. Regressão ampla:1050/1051 testes passaram; um teste de CarteiraPage expirou aguardando PETR4 durante execução concorrente com build. Reteste completo dos três arquivos envolvidos:31/31 aprovados. Não registrar a primeira rodada como integralmente verde.
- Nove verificações de permissões/preservação aprovadas no PostgreSQL descartável. Dois workers simultâneos reservaram3+3 tarefas distintas, sem sobreposição; transações revertidas e seis fixtures removidos. Evidências: `permissions-final.json` e `concurrency-final.json`.
- Varredura de676 arquivos de texto rastreados sem credenciais detectadas; arquivos novos não rastreados não estão abrangidos por essa contagem.
- Preparação da PR: arquivos novos incluídos no índice e scanner repetido, **712 arquivos de texto, zero achados**. Lint de todos os arquivos JS/TS preparados (fora do runtime Deno) aprovado.

Ainda depende de publicação: migration e Edge Functions novas, configuração CoinGecko no runtime hospedado e execução real dos crons. Homologação local não substitui essas verificações após deploy. Comparação de saldos registrada em `docs/comparacao-investidor10-2026-11-07.md`; diferença residual43,20 no patrimônio das telas consultadas.
