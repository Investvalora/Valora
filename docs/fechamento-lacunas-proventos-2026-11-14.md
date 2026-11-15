# Fechamento das lacunas da primeira passagem — 13/11, horário de Brasília

Branch `codex/close-dividend-coverage-gaps`. Alterações locais; nenhuma migration, função ou correção de calendário desta branch foi publicada em produção nesta investigação. Carteiras e recebimentos de produção não foram modificados.

## Anúncios oficiais e conciliação

| Ativo | Valor bruto/ação USD | Declaração oficial | Ex independente | Pagamento | Evidência oficial |
| --- | ---: | --- | --- | --- | --- |
| GOOGL | 0,22 | 28/10/2026 | 07/12/2026 | 14/12/2026 | [Alphabet RI](https://abc.xyz/investor/faqs-and-general-information/) |
| KO | 0,53 | 15/10/2026 | 01/12/2026 | 15/12/2026 | [Comunicado Coca-Cola](https://www.coca-colacompany.com/media-center/coca-cola-declares-quarterly-dividend) |
| MCD | 1,93 | 17/09/2026 | 01/12/2026 | 15/12/2026 | [Comunicado McDonald's](https://mcdonalds.mediaroom.com/2026-09-17-McDONALDS-MARKS-50-CONSECUTIVE-YEARS-OF-DIVIDEND-INCREASES%2C-JOINING-THE-RANKS-OF-DIVIDEND-KINGS) |
| DIS | 0,75 | 13/11/2025 | 15/12/2025 | 15/01/2026 | [Resultados oficiais Disney](https://thewaltdisneycompany.com/press-releases/the-walt-disney-company-reports-fourth-quarter-and-full-year-earnings-for-fiscal-2025/) |
| GGG | 0,295 | 12/06/2026 | 20/07/2026 | 05/08/2026 | [Tabela oficial Graco](https://investors.graco.com/stock-information/dividend-history) |

Datas ex dos três futuros ancoradas nas observações já persistidas da Massive; DIS nas observações Alpha Vantage/Marketstack; Graco também explicita a ex na própria tabela. Nenhuma ex deduzida da data de registro. Valores ordinários comuns: o dividendo preferencial de Alphabet e a segunda parcela de Disney permanecem separados.

GOOGL: o fornecedor informa declaração em 27/10; o RI informa 28/10. A data oficial prevalece no registro aprovado, sem reescrever o snapshot do fornecedor. A view distingue `official_metadata_difference` de um conflito econômico.

DIS: o registro Yahoo informa pagamento em 29/12/2025. A evidência oficial e os dois fornecedores confirmam 15/01/2026. A correção só admite essa discrepância específica em registro Yahoo, com valor/ex preservados; conserva a linha anterior em `issuer_dividend_reconciliations.prior_row`.

GGG: a tabela oficial confirma 0,295. O 0,30 da Marketstack é arredondamento; fica auditado e rejeitado como valor exato, sem somar pagamentos. As linhas de conflito originais ficam preservadas, com revisão oficial em campo próprio (`issuer_reviewed_at`), separado de diferenças apenas de metadados.

CR: produção já contém a fonte primária correta e adjudicação explícita: Alpha Vantage 0,435 rejeitado contra 0,255 para ex 31/08/2026, pagamento 09/09/2026. Os outros quatro eventos estão confirmados. Não apagar o erro do fornecedor nem alterar o calendário correto para encerrar uma pendência visual.

A migration cria uma lista privada de cinco eventos revisados e uma aplicação idempotente, condicionada a evidência independente já persistida. Fonte contraditória, ex ambígua e conflito público não revisado bloqueiam a operação. Em replay vazio, sem dados do fornecedor, retorna espera. Isto resolve os eventos conhecidos; não implementa descoberta automática de futuros comunicados de todos os RIs.

## Alpaca: vazio não é resposta inválida nem calendário confirmado

O [OpenAPI oficial da Alpaca](https://github.com/alpacahq/cli/blob/main/api/specs/market-data-api.json) define os grupos de `corporate_actions` como opcionais. `{corporate_actions:{},next_page_token:null}` é vazio válido. O adaptador passa a devolver zero observações; o finalizador mantém `supplemental_calendar_unavailable`, sem sucesso falso. Container ausente/nulo, array ou grupo malformado continuam rejeitados.

AMZN e NU não foram consultados novamente com chaves nesta branch, respeitando as esperas/cotas. O formato vazio está coberto por contrato e testes; o reteste HTTP autenticado dos dois casos continua para depois da publicação. Moeda/declaração ausentes dos 68 registros existentes continuam incompletas.

## JPM/SEC e WMT/Nasdaq

- JPM: índice real com 4.663.270 bytes e 26.513 entradas. Limites antigos de 4 MiB/20.000 entradas bloqueavam esse emissor. Apenas submissions passam a 8 MiB/40.000 entradas; demais documentos continuam em 4 MiB, allowlist HTTPS/sem redirect e até quatro filings inspecionados. Reteste público real: dois filings, sem truncamento, nenhum evento extraído e nenhum erro. Leitura resolvida; não significa calendário completo.
- WMT: quatro linhas completas e uma linha recente com declaração `N/A`. O coletor aproveita as completas e informa `nasdaq_partial_coverage` com contagem de linhas ausentes. Não inventa datas e não registra sucesso de cobertura completa. RPC autenticada separada mantém lease atômica; datas malformadas continuam rejeitadas. Reteste do payload real: quatro eventos completos, uma lacuna.

## Validação local

- 279 testes / 29 arquivos de proventos e auditoria aprovados.
- 13 testes Deno de autenticação/OIDC aprovados; tipos Node/TypeScript e Deno aprovados.
- Lint dos arquivos cobertos pelo projeto e build/PWA aprovados. Avisos de anotação de dependência Zod no build não impediram a geração.
- Nova migration aplicada sobre o banco QA isolado com o schema anterior; 20 baterias SQL do CI aprovadas. Nova bateria verifica cinco eventos sem duplicação, histórico DIS, rejeição GGG, preservação da data original GOOGL, ex conflitante, conflito público não revisado, lease e permissões.
- Hash combinado de transações, posições e recebimentos permanece idêntico antes/depois da conciliação no teste SQL. Nenhuma conexão de escrita com produção foi usada.

Falta publicar a branch/migration/função, confirmar os cinco eventos em produção, retestar AMZN/NU de forma limitada e observar o próximo coletor com WMT/JPM. As cotas esgotadas e a cobertura genérica fora desses eventos continuam separadas.

## Retomada em 15/11

O workspace principal estava em outra branch e os ajustes de código anteriores não estavam presentes. Reconstruídos na worktree isolada `output/coverage-worktree`, sem alterar a branch principal de trabalho. A migration e seus testes foram preservados.

Docker reiniciado e QA recuperado. Nova execução das 20 baterias SQL aprovada, inclusive compra e provento sintéticos não vazios com hash financeiro preservado e rollback. Os 27 testes novos/do worker passaram; tipos TypeScript/Deno e lint passaram. A execução ampla com runner da árvore principal encontrou duas cópias de React; a primeira execução local sem variáveis também recusou Supabase. Reteste com árvore única e configuração fictícia CI concluído: **278 testes em 30 arquivos aprovados**. Esta contagem corresponde à reconstrução atual e substitui a contagem anterior para esta entrega.
