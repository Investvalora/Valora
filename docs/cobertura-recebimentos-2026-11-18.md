# Cobertura e conciliação — 18/11/2026

## Resultado da investigação

- **BlackBerry:** os relatórios oficiais confirmam ausência histórica de pagamentos; a FAQ atual não apresenta uma política futura explícita. Manter política futura desconhecida, sem transformar ausência histórica em promessa de não pagar. Fontes: https://investors.blackberry.com/faq e https://www.sec.gov/Archives/edgar/data/1070235/000107023526000039/bbry-20260228.htm.
- **PERT:** a página atual da OTC identifica Permanent Technologies, Inc., Common Stock, no Expert Market, com cotações não solicitadas e sem confirmação de divulgação pública atual. Isso confirma a identidade de mercado, mas não um calendário nem uma política de dividendos. Não classificar como empresa que não paga. Fonte: https://www.otcmarkets.com/stock/pert/quote. A carta de 2017 é somente evidência histórica: https://www.otcmarkets.com/file/company/financial-report/169365/content.
- **PR/Marketstack US$ 0,03:** nenhuma confirmação oficial localizada para o evento com pagamento em 10/07/2026. Continua em revisão e fora do calendário. O relatório oficial do segundo trimestre informa US$ 0,16 trimestral e US$ 0,32 semestral; não confirma esse evento. Fonte: https://www.sec.gov/Archives/edgar/data/1658566/000165856626000101/pr-20260630.htm.

## Erro de fornecedor não significa calendário ausente

A consulta de filas encontrou erros de precisão, resposta vazia ou divergência também em ativos com eventos disponíveis: BMN, CR, GGG, ITA, META, PG, PR, PRT, RA, SAP, VG e WMT. Preservar a evidência oficial e as divergências individuais. Registros seed/sintéticos não contam como cobertura comprovada.

AMZN, TIC, AS, BA, BNC, BRK.B, GO, IT, KN, MX, NU, SA e TSLA já possuem revisão de política registrada. BB e PERT continuam exigindo evidência adicional; não encerrar suas lacunas como ausência comprovada de proventos.

Consulta operacional em 18/11/2026, 23:48 de Brasília: `international_queue_health()` sem itens de coleta vencidos nas quatro filas e sem backlog atrasado; macro com sucesso (13 atualizações, zero erros). Último lote de fornecedores parcial, sem atraso ou execução incompleta. Marketstack com sete chaves disponíveis e orçamento efetivo de 14 chamadas; Alpha Vantage com seis chaves e 114 chamadas efetivas restantes. São contadores instantâneos, não garantia de cobertura completa. As 13 políticas revisadas continuam válidas.

## Importação privada de recebimentos

Novo fluxo CSV em Proventos: validar arquivo, validar no banco, confirmar explicitamente e importar. Campos obrigatórios: corretora, referência estável do extrato, data, ticker, tipo, moeda, bruto, imposto, tarifa e líquido. Quantidade, valor unitário e data COM são opcionais; ausência não vira zero na apresentação nem data COM presumida.

Valores são conciliados exatamente na moeda original. Não estimar imposto, câmbio ou líquido a partir de dados públicos. O identificador corretora/referência evita repetir o mesmo crédito; conteúdo diferente com a mesma referência gera conflito. Créditos antigos sem referência com mesma data de pagamento ou data COM exigem conciliação manual. Referências distintas para o mesmo evento econômico ainda exigem revisão humana.

Importação parcial não substitui a cobertura do mês inteiro. Não altera transações, posições ou anúncios públicos. Migration e testes executados somente no QA nesta etapa; nenhuma importação pessoal em produção.

## Validação

- 307 testes existentes de proventos e tela atual passaram antes da inclusão do caso adicional de data COM.
- Regressão SQL passou no banco QA isolado: prévia sem gravação, importação, repetição idempotente, conflito, rollback integral e isolamento entre usuários.
- Casos adicionais de data COM, custos/moeda e confirmação explícita passaram (22 testes direcionados). Tipos, lint dos módulos novos/serviço e build final passaram.
- Comparação Android concluída no escopo local: seis amostras por versão, FCP mediano 318 ms antes e 322 ms depois, sem ganho demonstrado. Ver `desempenho-android-comparacao-2026-11-18.md` para método e limites. A comparação integral do PWA/CDN em rede real controlada permanece aberta.
- Novos casos SQL para chamadas diretas inválidas, tarifa não zero e sobreposição com crédito legado passaram após a recuperação do Docker. Todas as fixtures foram desfeitas por rollback. Os três testes da interface passaram, incluindo perda de resposta na confirmação e bloqueio de lote inteiramente duplicado; lint do teste aprovado.
- Painel de importação conferido na versão local autenticada no Galaxy A31, 411 px, sem overflow horizontal. Seletor de arquivo ajustado ao padrão visual e retestado (três testes de interface). Nenhum arquivo pessoal enviado nem crédito importado nessa conferência. Captura local: `output/receipt-phone-panel.png` no workspace principal, fora do versionamento.
- Baseline da versão atual em produção: cinco recargas normais no PWA físico em Wi-Fi, FCP mediano 396 ms (328–480 ms), zero exceções e zero respostas de erro do Supabase observadas. Não substitui comparação histórica do CDN.
