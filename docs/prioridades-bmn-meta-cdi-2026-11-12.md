# Prioridades altas — BMN, META e CDI — 12/11/2026

Branch `codex/cobertura-blackrock-meta-cdi`. Correções novas locais; sem publicação ou alteração de carteiras/recebimentos em produção.

## BMN — fonte primária automática

O índice oficial https://www.blackrock.com/us/individual/education/closed-end-funds/press-releases contém o endereço público da listagem carregada por AJAX. O coletor descobre esse endereço no HTML, seleciona comunicados de distribuição datados e descobre os PDFs; não inventa nomes de arquivos.

Foram consultados seis PDFs publicados nos últimos 366 dias. O parser municipal encontrou 13 distribuições BMN, de dezembro/2025 até dezembro/2026. Os comunicados de 2026 anunciam três meses de cada vez. Novembro e dezembro são anúncios existentes, não projeções. O PDF de setembro confirma USD 0,099250 e ex/record 15/10, pagamento 02/11: https://www.blackrock.com/us/individual/literature/press-release/9-10-2026-pr-div-release.pdf.

O parser distingue a tabela municipal das tabelas tributáveis e de ações, cujos pagamentos diferem. Confere ex e record explícitos, identidade, declaração, precisão, datas e duplicatas. Também aceita o layout anterior com colunas ex/record separadas. Não inclui automaticamente outros tipos de fundos ou distribuições especiais.

A infraestrutura recebe ticker como parâmetro; nesta entrega apenas BMN é roteado e autorizado na conciliação. Outros fundos exigem confirmar classificação e layout antes de ativar. PDF limitado a 2 MB/12 páginas/15 segundos. Mesma autenticação OIDC e reserva de tarefas existente; não consome cota Alpha/Marketstack para descobrir esses anúncios.

## META — data pública corrigida com auditoria

RI confirma pagamento em 23/12/2025 para record 15/12 e USD 0,525: https://investor.atmeta.com/investor-news/press-release-details/2025/Meta-Announces-Quarterly-Cash-Dividend-521d69f9e/default.aspx. O release oficial distribuído no Nasdaq informa a mesma data.

A migration permite corrigir pagamento Yahoo quando o anúncio primário de META coincide com valor e uma única âncora ex independente. A data anterior fica em `prior_row`. Divergências de outro fornecedor, de record ou de valor continuam preservadas; ex não é deduzida da record. Nenhum crédito pessoal é substituído por uma data teórica.

## CDI — critério técnico já publicado e conferido

`calc-fixed-income` v16 contém `cdiPeriod` e o calendário bancário, ambos iguais aos arquivos locais testados. Consulta somente de leitura retornou 541 observações CDI entre 16/09/2024 e 11/11/2026. A validação de todos os dias bancários desse intervalo passou, com referência econômica 11/11 separada da execução em 12/11. Testes cobrem lacuna de um dia útil, duplicatas, feriados e a única publicação recente ainda pendente.

Encerra o critério antigo de diagnóstico da referência e cobertura interna. Não garante séries anteriores a 16/09/2024, calendários fora dos anos disponíveis ou futuras publicações. Não houve recálculo de saldos nesta investigação.

## Cobertura operacional — acompanhamento

Observação em 12/11 às 19h59 Brasília: B3 com 22 tarefas e zero erros, último sucesso 19h27; iShares com duas tarefas e zero erros, último sucesso 17h40. Fallback automático 19h51 com sucesso. Alpha 33 tarefas sem primeira tentativa e Marketstack 37; cotas globais usadas 15/20 e 10/16, respectivamente. Cota global restante não comprova disponibilidade por chave Marketstack. Não forçar consultas além desses controles nem declarar cobertura universal.

## Validação local

- Consulta real BlackRock: 13 eventos, precisão e datas esperadas; primeira página do PDF de setembro renderizada e conferida visualmente.
- 55 testes de parsers/coletores/CDI/auditoria aprovados; TypeScript e lint direcionado aprovados.
- Migration aplicada no Supabase Docker isolado. Cinco regressões SQL aprovadas, incluindo rotação/cotas/filas e novas proteções de BMN/META.
- Replay dos 13 anúncios BMN no banco isolado: 13 conciliados, nove valores Yahoo anteriores auditados. Fixtures usam rollback. Não altera produção.

Publicação: migration `20261112225456_blackrock_primary_calendar.sql`, função internacional e workflow atualizado. Após merge, reprocessar BMN/META e conferir auditoria, liberação das tarefas e preservação de recebimentos pessoais. Cobertura e cadência reais seguem em acompanhamento.
