# Cobertura CDI por dia bancário — 11/11/2026

## Problema e correção local

A guarda anterior só detectava intervalos sem taxas acima de dez dias corridos. Um único dia útil ausente podia reduzir o rendimento calculado sem indicar indisponibilidade.

`cdiPeriod` agora confere todos os dias bancários entre aplicação e corte exclusivo. Fins de semana e feriados nacionais seguem uma cópia verificada do calendário ANBIMA de 2001–2030. Fora desse intervalo, o cálculo informa calendário indisponível e preserva o saldo anterior. Datas impossíveis, duplicadas, futuras no corte, ou CDI em feriado também são recusados.

Uma única referência útil imediatamente anterior à execução pode ainda não ter sido publicada. Essa tolerância é explícita: não aplica rendimento nesse dia e mantém como referência econômica o último CDI efetivamente usado. Não tolera uma falta interna nem duas referências úteis ausentes. O teste da Edge Function comprova que uma lacuna interna não produz PATCH de saldo.

Não usa calendário da bolsa para inferir CDI. Em particular, 31/12 continua dia de CDI quando útil: ausência de atendimento ao público não implica ausência da taxa. Feriados municipais não entram no calendário financeiro nacional.

## Fontes e manutenção

- [ANBIMA — calendário bancário e critérios](https://www.anbima.com.br/feriados/), páginas anuais `fer_nacionais/{ano}.asp`.
- [BCB — série CDI 4389](https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados?formato=json&dataInicial=24/12/2025&dataFinal=05/01/2026): verificada publicação em 24 e 31/12/2025.

`scripts/update-banking-holidays.mjs` atualiza a cópia após validar cada ano, quantidade de datas, unicidade e datas de calendário. Revisar anualmente e quando houver alteração legal. A execução do recálculo não depende de acessar o site ANBIMA nem acrescenta requisições por posição.

## Validação e publicação

- 14 testes aprovados: dias de corte, falta interna/inicial/final, limite de publicação, Carnaval, Corpus Christi, Consciência Negra, 31/12, calendário fora da cobertura e preservação do saldo na Edge Function.
- Comparação com dados públicos BCB de 2024, 2025 e 2026 até 10/11: 719 registros; nenhum dia esperado ausente e nenhuma publicação em dia excluído pelo calendário. Isso não garante alterações futuras de feriados; a cópia exige manutenção.
- ESLint dos testes e script aprovado.
- TypeScript (`tsc -b`) e verificação do diff aprovados.
- Implementação local na branch `codex/cdi-cobertura-dias-uteis`, iniciada sobre a entrega da PR132. Não houve recálculo em produção, edição de lançamentos ou mudança da carteira Investidor10.
- Publicação requer atualizar `calc-fixed-income` com os módulos compartilhados. Não há migration. Após publicação, verificar erros por lote antes de autorizar recálculo de saldos em produção.

Automação internacional, data ex COST e líquido pessoal MA continuam separados desta correção.

## Homologação local — Deno

Concluída em 11/11/2026, sem credenciais e sem acesso ao banco:

- `deno check --no-config supabase/functions/calc-fixed-income/index.ts`: aprovado no runtime de backend.
- Módulo real `cdiPeriod`, executado com `deno run --allow-net=api.bcb.gov.br`, processou as séries públicas completas: 253 taxas em 2024 (referência 31/12), 252 em 2025 (31/12) e 214 em 2026 até 10/11 (10/11). Não rejeitou dias úteis legítimos nem exigiu taxa em feriados.
- Removidas apenas em memória as taxas de 03/07/2024, 07/07/2025 e 10/06/2026: as três execuções recusaram a série e apontaram a data removida. Nenhuma série pública ou privada foi modificada.
- Regressão repetida após essa conferência: 14 testes aprovados, incluindo handler com armazenamento simulado que verifica ausência de PATCH quando falta um dia útil.

Esta é uma correção do backend, sem mudança visual. A homologação não acionou o botão de recálculo do frontend, pois o ambiente local compartilha o banco hospedado. Conferência de saldos reais permanece para publicação/autorização do recálculo, separadamente. Harness usado em `output/qa-pr132/homologacao-cdi.ts`, não versionado.
