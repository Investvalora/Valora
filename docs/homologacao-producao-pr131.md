# Homologação em produção da PR131

Executada em 11/11/2026 no navegador integrado, domínio `https://investvalora.vercel.app`. PR131 mergeada no commit `09c1764dbde3c8284175aad4dd63eb1ba64023fe`. Checks app, database-isolation, migration-replay e Vercel da PR aprovados; deploy Vercel do commit de merge também aprovado.

## Roteiros e resultados

- **Novembro no gráfico:** R$40,55 a receber + R$30,92 recebidos = **R$71,47**, confirmados no tooltip da versão publicada. O total corresponde à soma das parcelas visíveis.
- **Ancoragem desktop:** tooltip junto à barra de novembro, entre x=923,375 e x=1153,375 numa viewport de 1280 px; deixou de ficar no canto esquerdo do gráfico.
- **Escape:** fechou o tooltip, sem alteração de filtro ou dados.
- **Layout de 390 px:** tooltip entre x=83 e x=313; largura total da página igual a 390 px, sem transbordamento horizontal. Clique na barra abriu o mesmo detalhamento legível.
- **Parcela KLBN4:** anunciados mostra pagamento em 12/11/2026, quantidade elegível 116, R$0,04559717224 por ação e total estimado R$5,2893. A data ex real permanece 16/12/2025. A parcela é exibida sem reproduzir o anúncio anual agregado.
- **COST:** pagamento em 13/11, US$1,47 por ação, quantidade elegível 0,03405616 e total estimado US$0,0501.
- **AAPL:** pagamento em 16/11, US$0,27 por ação e quantidade estimada 0,0661. Data ex futura de 12/11 continua sinalizada como direito não consolidado.
- Os demais eventos de novembro, HGLG11, MXRF11, XPSF11 e CXSE3, permanecem no calendário. Eventos sem data continuam separados, sem preencher a previsão por suposição.

Conferência somente de leitura na carteira Investidor10. Nenhuma posição, movimentação ou renda pessoal alterada. Aba restaurada em Pagos; dimensões temporárias do navegador removidas. Evidências locais em `output/qa-semana4/pr131-producao-desktop.png` e `pr131-producao-mobile.png`.

## Limites e pendências preservadas

Homologação aprovada no navegador desktop e layout móvel emulado; não substitui o reteste de toque em PWA físico ou de atualização de instalação antiga. A passagem de uma parcela futura para paga foi coberta em testes controlados, sem adiantar a data de produção nem registrar recebimento pessoal fictício.

A diferença remanescente com o Investidor10 está conciliada no [diagnóstico](correcao-tooltip-calendario-proventos-2026-11-11.md): critérios bruto/líquido, câmbio e data efetiva da Nomad. A PR não transforma estimativas em créditos confirmados, nem adiciona adaptadores automáticos de RI de AAPL/COST para anúncios dos próximos trimestres. Essa cobertura e a confirmação do líquido de MA permanecem pendentes.
