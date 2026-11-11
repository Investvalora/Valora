# Homologação de produção PR135 — 11/11/2026

## Resultado: automação ainda não aprovada

PR135 mergeada na main `57e287298c163150fb1052149a42075f4b688dab`. Checks da PR e da main aprovados, incluindo replay SQL. Função e migration publicadas; a consulta real à Nasdaq falhou na infraestrutura hospedada. Não considerar cobertura internacional operacional.

## Publicação e teste real

- Função `sync-international-announcements` publicada com autenticação interna de serviço. POST sem credencial retornou401.
- Migration `international_dividend_announcements` aplicada sob versão hospedada `20261111225143` (arquivo local equivalente `20261111215720`). A correção MA já aplicada não foi reaplicada.
- Lote limitado request4954 retornou503: AAPL/AMZN com `nasdaq_source_unavailable`, zero eventos gravados e zero recebimentos pessoais criados. A descoberta/fila funcionou.
- Diagnóstico temporário, restrito a serviço e sem gravação: transporte Node HTTPS retornou `Request was cancelled`; fetch nativo recebeu falha HTTP/2; fetch forçando HTTP/1.1 expirou. Requests4957/4960 não escreveram dados.
- O mesmo adaptador funcionou no Deno local. Isso comprova que sucesso local não era suficiente para afirmar compatibilidade hospedada. A causa específica da diferença de transporte/origem ainda precisa investigação; não afirmar um bloqueio por IP sem evidência.

## Estado final seguro

- Apenas o cron novo `sync-international-announcements` foi desativado (`active=false`) para evitar tentativas repetidas sem resultado.
- Diagnóstico temporário removido; função versão4 restaurada ao código mergeado, sem endpoint adicional de probe. Não houve relaxamento de TLS, proxy, alteração de permissões públicas ou exposição de credenciais.
- Consulta final confirmou zero eventos `source=nasdaq`. Fontes anteriores e cronogramas existentes preservados. Nenhum lançamento, quantidade, saldo ou recebimento pessoal alterado.
- Correção pública MA preservada: ex10/01/2025, record09/01/2025, pagamento07/02/2025, USD0,76, fonte `mastercard_ri`.
- Advisor de saúde sem avisos durante a investigação.

## Pendência de alta prioridade

Encontrar transporte/ambiente de coleta acessível ou outra fonte gratuita compatível, validar primeiro em modo de leitura hospedado e só então reativar a fila. Não usar scraping via navegador conectado como substituto permanente de um job de servidor e não apresentar ausência de dados como inexistência de anúncios.
