# Conciliação CR e diagnóstico GOOGL — 13/11/2026

## Escopo local

Crane (CR): o RI direto retorna 403. O coletor lê os releases da companhia distribuídos pela Business Wire e publicados na Nasdaq, com identidade da emissora, URL permitida, declaração e origem verificadas. A consulta pública identificou cinco anúncios: quatro de USD 0,255 e um de USD 0,23. No evento com registro em 31/08/2026 e pagamento em 09/09/2026, confirma USD 0,255; o snapshot Alpha de USD 0,435 diverge.

A data ex não é deduzida da data de registro. Exige uma única âncora independente compatível; sem ela, mantém a lacuna. O anúncio de dezembro pode usar observação privada de fornecedor com valor e todas as datas compatíveis. Não extrapola calendário futuro.

Fontes: [release do segundo trimestre na Nasdaq](https://www.nasdaq.com/press-release/crane-company-reports-second-quarter-2026-results-and-raises-full-year-adjusted-eps), [origem Business Wire](https://www.businesswire.com/news/home/20260728065272/en/).

## Preservação e diagnóstico

- Snapshots brutos dos fornecedores permanecem imutáveis. Uma tabela privada registra confirmação ou rejeição com prova primária e datas idênticas.
- Uma resposta corrigida pode ser confirmada sem apagar o snapshot anterior. Divergência comprovada recebe `provider_primary_disagreement`: cobertura parcial explícita, sem marcar sucesso integral.
- Divergências sem prova ou entre datas continuam sendo `provider_event_conflict`. O diagnóstico privado guarda apenas valores/datas e até cinco referências, sem resposta bruta, credenciais ou URL recebida.
- GOOGL recebe uma solicitação de diagnóstico para uma tentativa, sujeita às cotas e leases existentes. Os registros aceitos não permitem concluir qual linha rejeitada causou o conflito anterior.
- Sem alteração de posições, lançamentos ou recebimentos pessoais. Não houve aplicação desta migration em produção.

## Validações

- TypeScript aprovado; 37 testes direcionados em três arquivos aprovados.
- Consulta HTTP pública real da Crane aprovada: cinco anúncios, valores e datas preservados.
- Sete baterias SQL aprovadas no banco isolado, com rollback: conciliação primária, BlackRock, orçamento, fallback, rotação, saúde das filas e nova adjudicação. Testes cobrem rejeição auditada, resposta corrigida, divergência de datas, sigilo, lacuna ex, tentativa única, lease e cota.
- Replay integral em banco novo aprovado, seguido das 16 baterias SQL do workflow. A porta local foi alterada para 55432 porque o Windows reservou a faixa que inclui 54332.
- Lint dos testes alterados e `git diff --check` aprovados. Advisor local sem erros; permanece o aviso preexistente `extension_in_public` de `pg_net`.
- A regressão geral apresentou timeout no teste de consulta de cotações da Carteira e foi interrompida; o arquivo passou isoladamente (27 testes). Não registrar a suíte completa como aprovada. A regressão integral do módulo de proventos passou: 209 testes em 24 arquivos.

## Pendências operacionais

Publicar migration, Edge e workflow após revisão/merge; executar o coletor primário CR e o reteste dos fornecedores. GOOGL exige resposta real posterior para concluir o diagnóstico. Na auditoria de 13/11, as cotas diárias já estavam esgotadas: nenhuma consulta paga ou desvio de limite foi usado.

O agendamento GitHub executou em 00h11, 06h55 e 15h17 UTC de 13/11; os intervalos continuam superiores à cadência pretendida. Primeira passagem internacional, cobertura de calendários, atualização de worker antigo e comparação física antes/depois permanecem abertas. O diagnóstico Tesouro observado nesta rodada não apresentou erro.
