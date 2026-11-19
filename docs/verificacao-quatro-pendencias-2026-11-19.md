# Verificação adicional das quatro pendências — 19/11/2026

Esta rodada revisou a evidência externa, sem alteração de banco ou publicação. As mudanças de descoberta/armazenamento FNET da branch continuam preparadas separadamente, conforme `fnet-cobertura-pendente-2026-11-19.md`.

## XPML11

O aviso oficial FNET 1387873 confirma COM 17/11, pagamento 25/11 e R$0,80 da cota BRXPMLCTF000. Não contém data ex. Uma página secundária, https://obm.com.br/fiis/xpml11, informa ex 18/11 e atribui eventos à B3; isso é uma pista, não foi reapresentado como resposta obtida diretamente da B3.

Reconsulta pública ao chart Yahoo XPML11.SA (range 1mo, interval 1d, events dividends) retornou identidade/currency BRL e somente o evento de R$0,92 de outubro, timestamp 1792414800. Não confirma novembro.

Tentativas oficiais adicionais:

- A lista B3 https://bvmf.bmfbovespa.com.br/Fundos-Listados/FundosListados.aspx?Idioma=pt-br&tipoFundo=imobiliario identifica XP Malls. Seu link de detalhe redirecionou para “Sistema indisponível”.
- Portal `https://sistemaswebb3-listados.b3.com.br/fundsPage/`: HTTP500.
- COTAHIST D17112026 e D18112026, no caminho oficial `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/`: HTTP403. Sem registros lidos.
- BDI `https://arquivos.b3.com.br/bdi/download/bdi/2026-11-18/BDI_03-2_20261118.pdf`: HTTP500. Sem boletim lido.

O layout oficial https://www.b3.com.br/data/files/33/67/B9/50/D84057102C784E47AC094EA8/SeriesHistoricas_Layout.pdf define CI ER como ex-rendimento. Essa é uma rota de verificação, mas sem as linhas de negociação de XPML11 não há prova de transição nessa data. Variação de preço e dia seguinte à COM não foram usados como substitutos.

Critério de encerramento: registro oficial explícito da B3/administrador ou observação independente verificável do evento com identidade/valor coerentes. Até lá, manter o aviso oficial visível como pendente de ex, separado dos totais.

## BlackBerry

Fontes revistas: https://investors.blackberry.com/faq e https://www.sec.gov/Archives/edgar/data/1070235/000107023526000039/bbry-20260228.htm.

O FAQ traz literalmente um traço como resposta de “Dividends for Shareholders”. A conferência do HTML bruto confirmou o mesmo valor na resposta estruturada JSON-LD e no conteúdo do acordeão; não há texto de política escondido por JavaScript nesse item. O 10-K informa ausência de pagamentos nos três exercícios passados, sem localizar compromisso explícito de política futura. Políticas históricas de 2018 não foram tratadas como atuais. Resultados de busca de outros emissores foram descartados por CIK diferente de 1070235.

Critério de encerramento: declaração atual do RI/companhia ou filing com política futura explícita. Classificação permanece desconhecida quanto ao futuro, não “não pagadora confirmada”.

## PERT

Fonte atual: https://www.otcmarkets.com/stock/pert/quote . Identidade Permanent Technologies, Inc. confirmada, com indicação de que a OTC não confirma divulgação pública atual. Isso não define calendário, pagamento zero ou encerramento da companhia.

Foi localizado outro documento do emissor em https://www.otcmarkets.com/file/company/financial-report/171914/content . A tentativa web e a leitura direta expiraram por timeout; não se tomou a data de indexação do buscador como data do documento. A carta https://www.otcmarkets.com/file/company/financial-report/169365/content é de 2017 e não comprova calendário atual.

Critério de encerramento: divulgação atual acessível do emissor ou confirmação explícita sobre política de caixa. Sem fonte atual, manter cobertura indisponível, preservando identidade e observações.

## PR / Marketstack USD0,03

Registro em disputa: declaração 21/04/2026, ex/registro 30/06/2026, pagamento 10/07/2026, USD0,03 por ação.

O comunicado primário https://permianres.com/permian-resources-declares-quarterly-cash-dividend-13/ declara USD0,16, registro 16/06 e pagamento 30/06, com data de publicação 06/05/2026 (formato americano na página). O 10-Q https://www.sec.gov/Archives/edgar/data/1658566/000165856626000124/pr-20260930.htm informa três dividendos trimestrais de USD0,16, totalizando USD0,48 nos nove meses, e USD0,16 no terceiro trimestre.

O evento USD0,03 não coincide com o comunicado primário e não é comprovado por esses totais. Continua excluído. Não foi atribuída sua origem a outro emissor apenas porque outro ativo distribuiu o mesmo valor. Falta explicação do fornecedor ou documento do emissor que justifique uma distribuição adicional; não há confirmação nova para promover esse registro.

## Consultas preparadas, não enviadas

As mensagens abaixo são rascunhos para obter a evidência exata; nenhum contato externo foi feito nesta rodada.

**XP Asset / administrador de XP Malls**

Assunto: XPML11 — confirmação de data ex do rendimento de novembro/2026

O aviso FNET 1387873 informa COM 17/11/2026, pagamento 25/11/2026 e R$0,80 por cota do ISIN BRXPMLCTF000. Poderiam indicar o comunicado ou registro oficial que informe explicitamente a data ex desse evento? Precisamos distinguir a cota XPML11 dos recibos XPML13/XPML15.

**BlackBerry Investor Relations**

Subject: Current common-share cash dividend policy

Could you point us to a current official statement of BlackBerry's policy or intention regarding future cash dividends on its common shares? The FY2026 annual report describes the past three years, while the current investor FAQ's dividend answer is a dash. We need the current policy rather than an inference from historical payments.

**Permanent Technologies / confirmação de divulgação pela OTC**

Subject: PERT — current issuer disclosure and cash dividend policy

Could you identify an accessible current issuer disclosure for Permanent Technologies, Inc. (OTC: PERT), including any statement of its current cash dividend policy or declared payments? The current OTC profile indicates that current public disclosure cannot be confirmed. Historical 2017 documents do not establish a current calendar.

**Marketstack support**

Subject: PR dividend event — issuer/exchange and source verification

Please verify the dividend row for PR with declaration date 2026-04-21, ex/record date 2026-06-30, payment date 2026-07-10 and amount USD0.03. Which issuer, exchange, event identifier and primary announcement support this row? Permian Resources' May 6 announcement instead declares USD0.16, record June 16 and payment June 30; its September 2026 Form 10-Q reports USD0.48 of quarterly dividends in the first nine months. Please confirm whether the USD0.03 row requires correction. No account credentials are included in this request.
