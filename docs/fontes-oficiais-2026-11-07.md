# Integração de fontes oficiais — 07/11/2026

Implementação local. Nenhuma publicação, aplicação definitiva de migration, criação de recebimento ou alteração de lançamentos nesta etapa.

Atualização: [homologação integrada local](homologacao-fontes-oficiais-2026-11-07.md) aprovada para banco/API/handlers/fontes reais e visual dos componentes em desktop/móvel no navegador integrado. A carga integrada encontrou e corrigiu fallback do arquivo mensal B3 ausente e duplicatas/conflitos reais nos informes CVM. Fluxo autenticado completo, scheduler e runtime hospedados continuam sujeitos à homologação após publicação.

## Fluxos

- CoinGecko: chave local encontrada como `COINGECKO_KEY`; código de busca e de atualização agora aceita esse nome e `COINGECKO_API_KEY`. Teste real autenticado retornou HTTP200 para BTC/ETH em BRL/USD. O valor não foi exibido nem incluído em arquivo novo. CLI sem autenticação de gestão: existência no ambiente remoto não foi confirmada; `.env` local não é automaticamente publicado nas Edge Functions.
- B3 COTAHIST: catálogo paginado em500, timeout e limite de download, validação do parâmetro de meses, extração do ISIN atual para correspondência exata. O histórico de meses antigos não troca a identidade atual. Preservada a coleta em arquivo compartilhado.
- B3 proventos: novo job `sync-b3-dividends`. Descobre tarefas de ações BR pelo catálogo e identificadores oficiais; reserva3 tarefas com lease, repete falhas após1 hora e sucessos após1 dia. Consulta pública `GetListedSupplementCompany` com `issuingCompany` e verifica ISIN exato. Guarda anúncio, aprovação, data-com, pagamento, tipo e valor bruto em `b3_cash_announcements`. Não inventa data ex. Só complementa evento legado quando valor/data ex têm correspondência não ambígua e pregões oficiais disponíveis. Parcelas múltiplas permanecem separadas no anúncio: o esquema legado não representa pagamentos separados para o mesmo ticker/ex/tipo.
- CVM: novo `sync-cvm-fii` baixa dois arquivos anuais em lote, incluindo ano anterior para entregas atrasadas. Parser de ZIP com diretório central, limites de tamanho e CSV com aspas. Join por CNPJ/competência/versão; ISIN associa ao ativo. Guarda informes de todos os fundos válidos do arquivo, sem lista de carteira. Complementa somente VPA ausente e P/VP ausente, copiando os outros campos da última fotografia para a fotografia atual, preservando os anteriores. Mostra competência do VPA no detalhe. Nunca usa informe ainda não entregue. Relatório mais velho que6 meses não é usado no fallback.
- BCB: integração existente mantida; rejeita payload/taxa/data inválida integralmente e não transforma `13.65%` ou linha parcial em taxa válida. IPCA negativo continua permitido. Validação completa de lacunas/calendário no cálculo continua pendente.
- Tesouro Transparente: além do histórico desde a aplicação dos lotes existentes, coleta os últimos30 dias de todos os títulos simples suportados (IPCA+, Prefixado e Selic). Não depende de existir posição para disponibilizar preços recentes. Cupons, Renda+ e Educa+ não ganharam suporte por aproximação.
- iShares: novo `sync-issuer-dividends`. Descobre páginas pelo diretório público de ETFs e ticker exato, sem cadastrar TFLO ou os40 ativos no motor. Ambiguidade exclui mapeamento. Descoberta diária, coleta por fila com3 reservas e lease. Valida domínio, caminho, ausência de redirecionamento, título/ticker, tabela, moeda, datas independentes e valor. Preserva recebimentos pessoais. Conflitos com fonte confirmada não são sobrescritos.
- Yahoo: gravação passa por RPC que preserva anúncios confirmados de outra fonte. Reexecutar a coleta não apaga datas confirmadas pelo gestor/B3.

## Cobertura e limites

Não é uma API universal de proventos. B3 estruturado novo cobre ações BR com ISIN e anúncio compatíveis; calendário de FIIs brasileiros, BDRs e outros emissores internacionais ainda exige adaptadores/fontes próprios. CVM mensal não fornece comprovante de crédito e não substitui calendário recém-anunciado. iShares cobre seus fundos do diretório público, não JPM nem todos os gestores. Não foi adicionado um parser genérico de comunicados JPM sem homologação.

Tabela iShares atual apresenta10 distribuições no HTML; a coleta automatiza eventos recentes, não garante recomposição integral de todo o histórico antigo. A descoberta diária contempla novos ETFs do catálogo em até a próxima execução; não depende do navegador aberto.

Recebimentos líquidos, imposto, tarifa e câmbio de corretora continuam separados de anúncios brutos. As novas tabelas não alteram `positions`, `transactions` nem o histórico importado. Preços de mercado naturalmente podem modificar avaliações futuras após publicação dos jobs existentes.

Filas de proventos retomam lotes em execuções posteriores. A paginação adicionada em cotações não elimina cotas gratuitas ou o limite de duração dos demais jobs; rotação persistente de todo o catálogo de cotações/fundamentos e orçamento global por provedor continuam evoluções necessárias para milhares de ativos. CoinGecko continua usando a infraestrutura existente e depende das cotas do plano.

## Validação

- Consulta real CoinGecko HTTP200; somente status/ativos/moedas impressos.
- ZIP oficial CVM2026 HTTP200,9185 informes válidos, última entrega30/10/2026.
- Diretório oficial iShares HTTP200,521 tickers; TFLO e IVV encontrados automaticamente.
- Parser de distribuições TFLO HTTP200,10 eventos, ex/record02/11/2026, pagamento05/11/2026 e USD0,171627 no mais recente.
- B3/PETR4 HTTP200,10 anúncios com ISIN correspondente e datas independentes.
- Migration e asserções SQL executadas em transação revertida: permissões, complementação CVM sem perder DY, idempotência, lease, proteção contra Yahoo, conflito de gestor e deduplicação B3. Confirmar inexistência das tabelas/jobs depois do rollback faz parte da homologação.
- Build frontend/PWA aprovado; suíte completa1050 testes aprovados. Testes direcionados posteriores também aprovados (incluindo parser B3,11/11 na última rodada). Testes SQL completos repetidos depois da inclusão de B3: aprovados; ausência das tabelas e dos4 jobs novos confirmada após rollback.

## Publicação coordenada

1. Revisar a migration `20261107183717_official_market_sources.sql` e os arquivos da entrega. Os agendamentos fazem parte da migration; publicar todas as funções na mesma janela, ou manter os novos cron jobs pausados até terminar.
2. Aplicar a migration, publicar `sync-cvm-fii`, `sync-issuer-dividends`, `sync-b3-dividends` e versões alteradas de B3, Yahoo, macro, Tesouro, global e lookup. A versão antiga de B3 não preenche ISIN; a nova precisa da tabela criada. O frontend tolera a ausência de `cvm_reference_date` durante o rollout; o enriquecimento e sua indicação dependem da migration.
3. Conferir `COINGECKO_KEY` ou `COINGECKO_API_KEY` nos secrets do servidor. Não colocar chave em `VITE_*`, migration, código ou PR.
4. Executar COTAHIST para preencher identificadores; executar CVM; executar descoberta iShares com `{ "discover": true }`; depois processar as filas. Repetir e conferir ausência de duplicatas/overwrites, últimas referências e respostas503.
5. Conferir recebimentos preservados e carteiras somente em leitura. Não marcar lacunas de calendário como resolvidas sem evidência.

Advisors do banco existente: proteção contra senhas vazadas e extensão pg_net no schema public continuam avisos preexistentes; nenhuma dessas configurações foi alterada. Tabelas internas com RLS sem policy permanecem inacessíveis aos clientes por intenção. Novas tabelas têm privilégios mínimos; apenas dados públicos de mercado têm leitura autenticada.
