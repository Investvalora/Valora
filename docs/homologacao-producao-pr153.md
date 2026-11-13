# Homologação de produção PR153 — 13/11/2026

Merge `df52569f76b27f965d901a4e4e92d4c765b5f197`. CI/main `43478351429` aprovado. Na conferência, a migration e a função ainda não estavam publicadas: migration `primary_provider_adjudication` aplicada via MCP; função internacional v15 ACTIVE publicada com os arquivos versionados e autenticação própria/OIDC preservada. POST sem autenticação retornou 401. Tabelas e helpers privados negam acesso aos clientes; health advisor sem achados.

## CR aprovado

Consulta real ao coletor Nasdaq/Business Wire identificou cinco anúncios. Homologação direcionada adquiriu lease somente da tarefa CR vencida, sem reordenar as demais tarefas, e chamou `finish_primary_dividends`: cinco salvos, zero conflitos, zero lacunas e zero recebimentos pessoais criados. Lease liberada e sucesso registrado às 18h32 UTC.

Calendário público conciliado: USD 0,23 (ex 28/11/2025; pagamento 10/12/2025) e USD 0,255 em 27/02, 29/05, 31/08 e 30/11/2026, com pagamentos em 11/03, 10/06, 09/09 e 09/12. A data ex foi ancorada em dados independentes existentes, sem inferência a partir do registro.

Replay dos snapshots reais Alpha/CR em transação com rollback retornou `provider_primary_disagreement`, `primary_rejected=1`, zero conflitos não explicados. O snapshot USD 0,435 não foi apagado nem marcado como nova consulta HTTP bem-sucedida. Reteste HTTP Alpha permanece sujeito à cota diária já esgotada.

## Rodízio e GOOGL: diagnóstico aprovado, divergência aberta

- Workflow real [43483316791](https://github.com/Investvalora/Valora/actions/runs/43483316791) aprovado; preflight respeitou o orçamento esgotado das cinco chaves e Alpha, sem HTTP pago.
- Nova chave fornecida pelo usuário não tinha uso anterior. Salva no secret backend `MARKETSTACK_API_KEY_2`, sem arquivo de chave no repositório. Rodízio passou a reconhecer seis chaves.
- Workflow [43484120673](https://github.com/Investvalora/Valora/actions/runs/43484120673) consultou GOOGL com a nova chave (uma requisição). Recebeu cinco eventos e identificou conflito de declaração no evento ex 09/03/2026: Marketstack **04/02/2026**, Alpha **27/01/2026**. Valor USD 0,21, registro 09/03 e pagamento 16/03 coincidem. Diagnóstico privado gravou os campos exatos; lease liberada e solicitação de tentativa única consumida, sem loop.
- A execução ficou **failed**, corretamente, por `provider_event_conflict`; não registrar cobertura GOOGL como resolvida nem pipeline integralmente verde.
- O [release oficial de resultados da Alphabet](https://s206.q4cdn.com/479360582/files/doc_news/2026/Feb/04/attachments/2025q4-alphabet-earnings-release.pdf), publicado em 04/02, confirma valor, registro e pagamento (página 2). Não estabelece por si só a data exata da deliberação; data de publicação não foi usada para sobrescrever a data declarada por outro fornecedor. Próxima investigação: distinguir declaração e publicação e conciliar metadados com fonte primária, preservando evidências.

Uma segunda execução ampla do workflow foi bloqueada pela revisão automática: consumiria cota e atualizaria outras tarefas sem necessidade para conferir o comunicado. Não foi contornada nem repetida. A investigação seguiu somente com leitura da fonte e do diagnóstico já produzido.

## Preservação e limites

Antes/depois: 272 lançamentos, checksum `f88fa98884ab110a7b5586e5a34acf7b`; posições `99ec048cc73ed73f84c1f3b08b999ec1`; 208 recebimentos pessoais, checksum `14453d1c05f93ee28296f0cea79b5f17`. Todos preservados.

Migration, publicação, fonte CR, proteção de acesso, cotas/rodízio e diagnóstico GOOGL validados. GOOGL continua com divergência aberta; Alpha/CR ainda requer consulta HTTP posterior. Cadência, primeira passagem e demais calendários continuam na TODO. Nenhuma chave ou digest foi incluído neste documento.
