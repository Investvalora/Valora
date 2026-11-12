# Isolamento de proventos simulados

Inventário de produção somente leitura: 178 eventos `source=seed` em 45 ativos, incluindo quatro no JPM. A política SELECT de dividends permite todos os registros para authenticated. Não há FK apontando para dividends. Nenhum registro foi excluído ou alterado nesta investigação.

A consulta compartilhada de proventos alimenta pagos, anúncios e estimativas por quantidade histórica. Ela também consulta âncoras de ex-date para parcelas B3. As duas leituras locais agora excluem `seed` e `synthetic` antes da paginação. Recebimentos pessoais de wallet_income continuam no fluxo próprio e não são filtrados por essa mudança.

Testes foram ampliados para exigir o filtro em pagos, anúncios e âncoras B3. Execução ainda pendente de conclusão; não declarar homologado.

Pendências necessárias para fechar o item:

- Migration com política restritiva de SELECT para impedir leituras simuladas por versões antigas do frontend, preservando linhas para auditoria e ambientes locais.
- Excluir origens simuladas da seleção de candidatos nos conciliadores FNET/MA/JPM; a ex simulada não comprova uma data real.
- Permitir substituição de seed/synthetic por evento Yahoo real da mesma chave, limpando datas simuladas; preservar fontes primárias e datas reais confirmadas. Hoje store_yahoo_dividend_events atualiza somente source=yahoo.
- Revisar sync-asset-data, cujo conjunto de datas existentes inclui seed e impede atualização de uma chave sintética coincidente.
- Testes SQL isolados com rollback: leitura autenticada, serviço, conciliação, substituição e preservação dos recebimentos pessoais. Medir o impacto agregado sem confundir valor por ação com valor pessoal.

A criação da migration via CLI e os testes com permissões ampliadas foram impedidos por falha da revisão automática devido ao limite de uso. Nenhuma migration criada manualmente para contornar essa restrição. Implementação parcial local, sem publicação.


## Implementação local concluída

Migration `20261112001158_isolate_synthetic_dividends.sql` criada pela CLI após liberação da revisão automática. Política SELECT restritiva exclui seed/synthetic para authenticated; linhas continuam acessíveis ao serviço para auditoria. FNET/MA/JPM ignoram candidatos simulados. Anúncio Nasdaq com ex independente pode substituir a mesma chave simulada. Yahoo substitui seed/synthetic limpando record/payment/source_url simulados; eventos primários confirmados ficam preservados. sync-asset-data ignora chaves simuladas no conjunto de datas conhecidas e usa o RPC protegido em lotes de200.

14 testes de leitura/sincronização aprovados; TypeScript aprovado. Fixture SQL adicionada ao replay da CI. Docker local inicialmente desligado; após iniciar retornou erro500 de infraestrutura, portanto execução SQL local ainda não comprovada. Nenhuma alteração em produção. Publicação somente após migration/replay aprovados e revisão.


## Homologação local retomada

Postgres local disponível após a inicialização. Migration executada no Docker; os cinco arquivos SQL synthetic_dividends, international_announcements, jpmorgan_announcements, mastercard_ex_exception e international_collector_leases passaram, com fixtures revertidas. Política restritiva oculta simulados para authenticated, mantém auditoria para service_role e permite substituição real com limpeza de metadados fictícios.

Os14 testes diretamente relacionados e TypeScript passaram. A suíte completa foi iniciada; um teste USD de CarteiraPage falhou na execução concorrente e passou na repetição isolada sem alteração de código. Resultado final da suíte/build ainda em acompanhamento. Sem publicação nesta etapa.


Build de produção/PWA aprovado (103 arquivos de pré-cache), ESLint dos arquivos alterados aprovado e scan843 arquivos sem segredos. Deno check da função aprovado. Diff revisado sem alterações de layout ou formulários. Validação funcional da correção aprovada em testes locais; execução integral da suíte ainda em acompanhamento devido à falha intermitente USD já repetida isoladamente com sucesso.


## Correção da instabilidade do teste USD

A execução integral anterior terminou com1249 testes aprovados e um timeout de5000ms em CarteiraPage/conversão USD; não houve asserção de valor incorreto. O caso isolado passou sem mudança de produto. O harness agora desmonta a tela e limpa todos os QueryClients após cada cenário; o cenário USD aguarda conjuntamente linha convertida, taxa PTAX e ausência do badge. Timeout de15s restrito a esse teste de integração; timeout global e fórmula de câmbio preservados.

45 testes de CarteiraPage/usdRateService/dividendService passaram; TypeScript e ESLint aprovados. Repetição integral com maxWorkers=2 iniciada para conferir a estabilização no contexto da suíte.


Resultado final após o ajuste:189 arquivos e1250 testes aprovados na execução integral com maxWorkers=2 (279,84s). Falha USD não se repetiu. Validação local concluída: regressão completa, cinco suites SQL com rollback, build/PWA, TypeScript, lint e Deno check aprovados. Nenhuma alteração em produção.
