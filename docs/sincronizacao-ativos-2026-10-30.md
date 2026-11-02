# Busca e sincronização ao adicionar ativos — 30/10/2026

## Diagnóstico

RADL3 existia no catálogo e tinha 63 preços (agosto a outubro), mas nenhum registro de fundamentos ou distribuição. Salvar uma compra invalidava posições/transações; não solicitava a carga de dados de mercado. O formulário antigo iniciava a busca externa e exigia novo envio para salvar. No lançamento rápido, a classe inicial FIIs escondia RADL3, que pertence a Ações BR. Consultar preço a cada prefixo também podia disparar buscas externas antes de existir um ticker completo.

## Alterações

- Após compras e cadastro direto de posições, solicita sincronização em segundo plano; importação faz o mesmo, sequencialmente, para tickers únicos de compras. A falha da fonte não desfaz nem marca como fracassado um lançamento salvo.
- Serviço `sync-asset-data`: valida sessão e pertencimento à conta, busca até cinco anos de preços e eventos públicos Yahoo, preserva preços/eventos existentes e solicita fundamentos somente do ticker. Não inventa datas de pagamento nem transforma distribuições antigas em proventos recebidos.
- Resultado recente completo é reaproveitado no cliente por quinze minutos; chamadas simultâneas do mesmo ticker são agrupadas. Resposta parcial não fica presa nesse cache. Ativos mostra andamento, indisponibilidade parcial e nova tentativa.
- Menu de cada ativo ganhou “Atualizar dados de mercado”, também no celular.
- Busca externa ganhou fallback gratuito Yahoo e exige sessão verificada. ETFs identificados pelo provedor não são classificados como FIIs pelo sufixo 11. As credenciais continuam no servidor.
- Cadastro antigo aguarda a resolução externa no primeiro envio; respostas antigas são ignoradas quando o ticker muda. Lançamento rápido oferece selecionar o ativo na classe correta sem redigitar; se o catálogo não conhece o ticker, permite busca externa. Prefixos sem ativo exato não consultam preço externo automaticamente.

## Reparo e cobertura

RADL3 foi completada em produção usando dados públicos Yahoo obtidos sem chave paga. Inserts com conflito ignorado: **1.248 preços**, **25 eventos de distribuição** e **um registro de fundamentos** ao final. Nenhuma compra, venda, quantidade, preço médio ou distribuição recebida importada foi alterada. A tabela local autenticada confirmou DY, P/L e P/VP de RADL3.

| Ativo/grupo | Resultado da revisão |
| --- | --- |
| RADL3 | Histórico e fundamentos disponíveis e carregados. Eventos públicos não equivalem a recebimentos anteriores à aquisição. |
| CPTS11, GARE11, VGHF11, XPSF11 | Preços e distribuições existentes; consulta gratuita não retornou `bookValue`/`priceToBook`. Nenhuma métrica preenchida com zero para disfarçar ausência. |
| MCD | Preços e distribuições existentes; Yahoo retornou VPA negativo e P/VP ausente. O modelo atual exige VPA/P/VP positivos; a linha de fundamentos não é gravada. Graham não deve calcular referência nesse caso. Suportar os outros indicadores individualmente exige revisar esse modelo. |
| IVV, TFLO | Preços e distribuições existentes. Indicadores de empresa não são exigidos de ETFs. |
| BTC-BRL, ETH-BRL | Cotação BRL recente existente; fonte Yahoo rejeitou a série direta BRL consultada. O cálculo histórico já dispõe do caminho USD + câmbio histórico; não foi criada série BRL pelo câmbio atual. Fundamentos de empresa e dividendos não se aplicam. |
| Demais posições consultadas | Histórico de preços e fundamentos existentes, quando aplicáveis; ausência de distribuições em NU não foi tratada como falha de carga. |

## Publicação e validação

Backend publicado: `lookup-asset` v8; `sync-yahoo-fundamentals` v7; `sync-asset-data` v1. Não houve migration nem merge. O frontend desta branch ainda depende de PR/merge/publicação para disponibilizar a automação e o novo menu em produção.

A chamada interna experimental pelo `pg_net` usando a credencial já existente no Vault retornou 401 (request 204). Não houve exposição, troca ou revogação de credenciais. O reparo usou dados públicos conferidos, e a execução posterior pelo usuário autenticado na interface local funcionou: andamento exibido, concluído sem aviso de erro. O caminho de agendamento interno permanece uma investigação separada.

Testes: regressão completa **836/836 em 110 arquivos** no recorte anterior ao último ajuste do menu/classe; depois, testes específicos do menu, busca gratuita e restrição de fundamentos repetidos. Foram exercitados autenticação inválida, ativo de outra conta, limite 429 do provedor, preservação de preços/JCP, cache, resposta parcial, primeira tentativa externa e classe inicial incorreta. Lint e build/PWA são conferidos novamente ao fechar a alteração. Evidências locais em `output/`, fora do commit.

Ensaio de interface local: sessão existente, carteira Investidor10; atualização de RADL3 pelo novo menu, tabela com indicadores e seleção de RADL3 em Ações BR sem redigitar. Formulário cancelado sem salvar compra de teste. Não é teste de PWA instalado em aparelho físico. Nenhum plano pago foi contratado; fontes gratuitas continuam sujeitas a limites e disponibilidade.

Fechamento: o teste específico da primeira digitação passou junto com os outros seis casos do lançamento rápido; 15 testes de menu/filtros e 13 de busca/escopo do backend passaram após os ajustes correspondentes. Build TypeScript/Vite/PWA e lint final dos arquivos alterados aprovados. A execução autenticada real de `sync-asset-data` concluiu sem mensagem de erro; o banco continuou com 1.248 preços, 25 distribuições e um fundamento de RADL3, sem duplicação. Os demais itens da TODO de alertas não foram implementados por esta correção de dados e cadastro.

## Complemento: autocomplete e confirmação de preço

Reproduzido o relato de “GOOGLE”: preço anterior podia continuar preenchido enquanto o texto já não representava o ativo escolhido, e a classe selecionada escondia sugestões de outra classe. Agora a cotação só é consultada/preenchida após seleção explícita; editar a busca limpa a seleção e o preço. As sugestões mostram ticker, nome, classe e moeda, incluindo correspondências de outras classes; selecionar ajusta a classe. “Google” também pesquisa o nome cadastrado Alphabet. O nome do ativo selecionado permanece visível, e preço digitado manualmente não é sobrescrito pela atualização da cotação. Preço vazio não é interpretado como zero.

Na interface local, “GOOGLE” apresentou GOGL34, GOOG e GOOGL com nomes e moedas, sem preço antes da seleção. Escolher GOOGL mudou para Stocks US/USD e preencheu a cotação; mudar o texto para FAST limpou o preço anterior. FAST não existia no catálogo antes do ensaio. A busca externa explícita encontrou Fastenal Company, criou somente o cadastro público do ativo e apresentou nome/classe/USD. Consulta posterior confirmou zero posições e zero transações FAST. Nenhuma compra foi salva.

Validação complementar: **32 testes aprovados** entre formulário e serviço de busca; lint e build/PWA aprovados. Aba local deixada aberta com a busca GOOGLE para revisão do responsável. Essas mudanças de frontend ainda não estão em produção.
