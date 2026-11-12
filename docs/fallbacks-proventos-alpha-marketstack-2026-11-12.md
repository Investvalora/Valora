# Alpha Vantage e Marketstack — 12/11/2026

## Homologação em produção concluída — PR143

Merge `ce8b81c71f49d4ed12758198de8c75f3830008d7`, CI da main [43246535177](https://github.com/Investvalora/Valora/actions/runs/43246535177) aprovado. Estado abaixo substitui as pendências históricas de publicação descritas nas seções seguintes.

- Migrations aplicadas pelo plugin Supabase: `mastercard_syndicated_announcements` versão remota `20261112152038`, `dividend_provider_fallbacks` `20261112152044`, `marketstack_key_rotation` `20261112152051`. Os identificadores remotos gerados diferem dos nomes locais; comparar também pelo nome da migration.
- `sync-international-announcements` v8 ACTIVE, configuração OIDC preservada; POST sem autenticação respondeu 401. RPCs de chave e reserva negadas a `authenticated`.
- Execução autenticada [43246851128](https://github.com/Investvalora/Valora/actions/runs/43246851128), 12h21 Brasília: Alpha COST cinco eventos, Marketstack AAPL quatro, ambos sem erros. Uma reserva em cada fornecedor e uma chamada Marketstack registrada por chave. Nenhum recebimento criado pelo coletor.
- COST ordinário USD1,47 ex30/10/pagamento13/11 e especial USD30 ex24/11/pagamento04/12 conciliados com Alpha. Zero linhas do especial na tabela recorrente `dividends`.
- Navegador integrado de produção: filtro COST mostrou exatamente um ordinário e um especial, aviso de exclusão do DY/Bazin, quantidade futura estimada0,03405616 e previsão brutaUSD1,0217 do especial. Painel de ex pendente sem duplicação do especial confirmado. Interface móvel legível e sem erros de carregamento observados.
- Dois comunicados públicos MA conciliados contra o banco em transação com rollback: zero alterações e zero conflitos; preservada fonte anterior `mastercard_ri`.
- Cinco chaves distintas lidas pelo backend. Reservas passaram por todas as cinco no banco publicado em transação revertida; não foi provocada exaustão real no fornecedor nem mantidos consumos fictícios. Cada chave adicional já havia passado em consulta real mínima antes da publicação.
- Antes/depois: 258 transações, hash `9f8b4b5c9054abba35c53717c12d94ab`; 208 recebimentos, hash `be7d8c15d31326a5ce429486e075884e`. Nenhum lançamento ou crédito pessoal alterado nesta homologação.
- Advisors de segurança: tabelas operacionais com RLS e sem políticas públicas produzem avisos informativos esperados, por serem exclusivas do backend. Avisos existentes de [pg_net no schema public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) e [proteção de senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) permanecem fora desta entrega.

Limites: o teste comprova a execução manual publicada e as reservas no banco, não cadência contínua de 15 minutos, exaustão real das cinco contas ou cobertura imediata de todo o catálogo. Selic sem identificação/extrato e observação do cron Tesouro continuam pendentes separadas.

Implementação local dos dois conectores de calendário de dividendos. Não altera compras, vendas, posições ou créditos pessoais. Complementa Nasdaq/RI/SEC para ações americanas ativas em USD; não fica restrita aos ativos de uma carteira.

## Cobertura realmente verificada

| Fonte | Consulta real | Resultado |
|---|---|---|
| Alpha Vantage `DIVIDENDS` | MA | USD 0,87, ex/registro 09/10, pagamento 09/11 |
| Alpha Vantage `DIVIDENDS` | COST | Especial USD 30, declaração 10/11, ex/registro 24/11, pagamento 04/12; cinco eventos recentes normalizados |
| Marketstack v2 `dividends` | MA | Quatro eventos recentes; último USD 0,87 com calendário igual à Alpha |
| Marketstack v2 `dividends` | COST | Ordinário USD 1,47 com pagamento 13/11; o especial ainda não estava na resposta |

A primeira leitura da chave Marketstack falhou; a chave corrigida pelo titular funcionou. Nenhuma credencial integra esta documentação ou arquivos versionados. Ambas foram guardadas no `.env.local` ignorado e no Vault compartilhado, como `alpha_vantage_key` e `marketstack_key`. A CLI não estava autenticada; a configuração no Vault foi concluída pelo plugin Supabase. A função aceita variáveis de ambiente primeiro, depois consulta somente essas duas entradas por RPC exclusiva do backend.

## Consumo e conciliação

- Alpha: limite interno de 20 chamadas/dia, abaixo das 25 gratuitas. Cache/agendamento por ticker de 24 horas, inclusive após falha.
- Marketstack: até oito chaves de contas diferentes, sem repetir chaves da mesma conta. Limite interno de duas chamadas/dia e 80/mês por chave, abaixo de 100/mês; até 16 reservas de tarefas/dia no total. Cache por ticker de sete dias, inclusive após falha; falta de orçamento permite nova tentativa no dia seguinte.
- Reserva transacional com trava global por fornecedor, antes da chamada HTTP. Reservas contam mesmo quando o fornecedor falha. Orçamento é compartilhado por todas as contas e instâncias; não considera consumo externo feito fora do Valora.
- A execução agendada pede no máximo um ticker por fornecedor. Prioriza declarações SEC futuras ainda sem data ex confirmada; os demais ativos entram por antiguidade da fila. A cobertura é gradual, não simultânea para todos os ativos.
- Calendários incompletos, paginação truncada, símbolos diferentes, datas inválidas e distribuições ambíguas são recusados. Sem dedução da data ex a partir do registro. Falhas não incluem corpo do fornecedor nem URL autenticada nos logs.
- Observações dos dois fornecedores ficam isoladas. Conflitos não sobrescrevem o evento anterior ou a fonte oficial. Dividendos Yahoo existentes só recebem datas ausentes quando ticker, valor e data ex coincidem e não há divergência de calendário.
- Declaração SEC com mesmo ticker, valor, declaração, registro e pagamento recebe uma data ex independentemente confirmada. O valor e a classificação especial/ordinária continuam vindo da SEC.
- O especial confirmado é lido na página de proventos como fluxo de caixa extraordinário, com quantidade histórica/estimada pelo fluxo existente. Não é inserido na tabela usada por DY/Bazin recorrentes. Não cria crédito líquido ou retenção presumida; recebimento real continua dependente do extrato.

## Publicação

As chaves já estão no Vault. A migration `20261112143833_dividend_provider_fallbacks.sql` e a anterior de MA foram aplicadas somente no Docker local. Para ativar depois da revisão/merge:

1. Aplicar as migrations pendentes na ordem do repositório.
2. Publicar `sync-international-announcements`, incluindo `providers.ts`, com a configuração de autenticação já existente; preservar autorização OIDC do coletor.
3. Publicar o frontend e o workflow atualizado. O runner chama o modo `providers`, sem receber as chaves.
4. Conferir a primeira execução e os campos `last_success_at`, `last_error`, reservas de consumo e a conciliação de COST. Confirmar o especial uma única vez na previsão e ausência na tabela recorrente. Não declarar encerrada a homologação em produção antes dessa execução.

### Rodízio Marketstack

A migration `20261112145525_marketstack_key_rotation.sql` acrescenta contadores por identificador SHA-256 da chave (sem guardar o valor da chave nessas tabelas) e bloqueios persistentes. O coletor mantém a primeira chave disponível até atingir seu orçamento ou receber uma recusa explícita, depois tenta a próxima. Cota esgotada bloqueia a chave até o primeiro dia do mês seguinte, em UTC; chave inválida por 24 horas e limite de frequência por 15 minutos. Falhas de rede ou calendário incompatível não gastam as cotas de outras contas. Não há criação automática de contas nem garantia de que o fornecedor permita agregar cotas gratuitas; a configuração deve respeitar o uso autorizado de cada conta.

Configuração pelo backend:

- Manter a chave atual em `MARKETSTACK_API_KEY` ou Vault `marketstack_key`.
- Acrescentar as próximas como `MARKETSTACK_API_KEY_2` até `_8`, ou Vault `marketstack_key_2` até `_8`.
- Alternativamente, `MARKETSTACK_API_KEYS` ou Vault `marketstack_keys`, com valores separados por vírgula. Valores repetidos são removidos; máximo de oito.
- Cada chave deve representar uma conta com cota própria. Reiniciar o servidor não limpa contadores. Trocar o valor de uma chave muda seu identificador; não usar essa troca para reiniciar artificialmente o orçamento da mesma conta.
- Há cinco chaves Marketstack configuradas: a original e quatro adicionais fornecidas pelo titular, guardadas no Vault (`marketstack_key_2` até `_5`) e no `.env.local` ignorado. As quatro adicionais retornaram HTTP 200 e um evento de MA em uma consulta mínima por chave. Nenhum valor de credencial foi incluído nos arquivos versionados. A troca após esgotamento foi testada com respostas simuladas; não foi provocada exaustão real das contas. Publicação da migration/função continua pendente.

## Validação

- Conectores consultados com as duas chaves reais; resultado acima.
- Integração inicial: 178 testes de proventos/interface, TypeScript, Deno e build aprovados. Build inspecionado sem as duas credenciais; `.env.local` confirmado como ignorado pelo Git. Rodízio: testes adicionais de troca após cota esgotada, deduplicação, bloqueio de consumo sem orçamento e preservação das outras cotas em falha de rede; TypeScript e Deno aprovados.
- Fixture SQL local com rollback: data ex do especial, preservação do DY, calendário Yahoo, conflito entre fornecedores, replay de lease, cotas e acesso restrito.
- Nenhuma migration/função nova desta integração publicada em produção nesta etapa. Somente armazenamento das duas chaves no Vault.

Referências oficiais: [Alpha Vantage — dividendos](https://www.alphavantage.co/documentation/#dividends), [limite gratuito Alpha](https://www.alphavantage.co/support/), [Marketstack v2 — calendário](https://blog.apilayer.com/introducing-marketstack-v2-api/), [planos Marketstack](https://marketstack.com/pricing/). Os limites técnicos não substituem as condições de licença/reutilização dos fornecedores.
