# TODO da quarta bateria de testes

Triagem em 11/11/2026. Fontes: relatório PDF de 12 páginas e planilha “Valora - Entrega Semanal Semana 4.xlsx”, publicados em 10/11 na [pasta Semana 4](https://drive.google.com/drive/u/3/folders/18WI9b-x-slS2ZP2ka2GMxHviojhT18RH). Ambos apresentam CT143 a CT156: 14 executados, 10 aprovados e 4 reprovados. Esses números representam o recorte do avaliador, não a qualidade geral do produto.

A leitura do PDF e da aba Casos de Teste da planilha foi confrontada com o código local. Não foi executado um novo reteste autenticado em produção nesta triagem, nem alterados dados de carteiras. As classificações abaixo distinguem relato externo, evidência estática e comportamento intencional.

## Pendências priorizadas

- [ ] **S4-01 / DF60 / CT151 — Média: investigar tooltip da rentabilidade comparada.** Relatório, páginas 7–8: Carteira, CDI, IBOV e IFIX aparecem todos com +0,49%, apesar de alturas diferentes das curvas. Em `PerformanceLineChart`, as linhas recebem arrays próprios, mas compartilham `dataKey="normalized"`. Isso é uma hipótese de associação incorreta do payload no Recharts; o tooltip já lê `entry.value` individualmente, portanto não há evidência de simples repetição de `payload[0]` no código. Reproduzir com séries deliberadamente diferentes na mesma data, pontos ausentes e atualização animada. Aceite: data completa identificável, cada valor igual ao ponto da própria curva, lacunas preservadas e nenhum valor emprestado de outra série; conferir desktop e toque móvel. Não alterar retornos financeiros apenas para alinhar a aparência.

- [ ] **S4-02 / DF05 / CT143 — Média: tornar inequívoca a comparação entre retorno de meses fechados e resultado atual.** Relatório, páginas 3 e 5–6: ativo ITUB4 e tabela por ativo +4,30%, lucro atual +R$17,20, retorno da carteira -3,28%. A própria fonte identifica que -3,28% corresponde ao fechamento de outubro (386,90 contra custo 400), enquanto os demais valores incluem novembro. A regra de meses fechados foi deliberadamente adotada no projeto; esses números não comprovam erro aritmético, pois têm períodos e possivelmente métodos distintos. Revisar rótulo, data de referência e proximidade dos cards em Início e Visão geral para evitar leitura como se fossem a mesma medida. Retestar com carteira controlada de um ativo, sem proventos e com preços fixos; depois com aportes/proventos. Aceite: período e método explícitos e resultados conciliáveis na mesma base, preservando a regra de meses encerrados. Reaproveita o acompanhamento de DF05 na terceira bateria, sem duplicar uma correção financeira já encerrada.

- [ ] **S4-03 / DF61 / CT152 — Baixa: título de Explorar ativos.** Relatório, páginas 8–9: página funcional com título “Página não encontrada | Valora”. Confirmado estaticamente: existem as rotas `/ativos/explorar` e `/ativos/explorar/:ticker`, mas `titleForPath` não as cobre. Aceite: título próprio na busca e no resumo acessado por Explorar; 404 continua reservada a rotas inexistentes. Incluir navegação entre rotas e carregamento direto no reteste.

- [ ] **S4-04 / DF62 / CT153 — Baixa, melhoria de consistência: distinguir ícone de classe de avatar do ativo.** Relatório, páginas 9–10: ITUB4 aparece com “A” em Lançamentos e “I” no detalhe. `ClassIcon` usa intencionalmente a inicial de `TYPE_BADGE_LABEL` (“Ações”), portanto não identifica outro ativo nem comprova associação financeira incorreta. Avaliar avatar por ticker ou símbolo inequívoco de classe, mantendo o badge e as cores existentes. Aceite: a identificação visual não sugere um ticker diferente, em desktop e móvel, inclusive ativos de outras classes. Não há motivo para alterar lançamentos ou cadastro de ITUB4.

Os textos acima preservam o diagnóstico inicial. A implementação local está registrada abaixo; os checkboxes de entrega permanecem abertos até a publicação e o reteste dos critérios pertinentes.

## Implementação e homologação local — 11/11/2026

- [x] **S4-01 implementado e reproduzido antes/depois.** Massa controlada no navegador com quatro curvas: no dia 20/10, a versão anterior repetiu +2,00% nas quatro linhas do tooltip. Com uma tabela compartilhada por data e chaves distintas por série, a mesma massa mostrou Carteira +20,00%, CDI +0,49%, IBOV -1,00% e IFIX +2,00%. Tooltip passou a identificar o dia completo. Em 21/10, a carteira sem ponto não recebeu valor de outra série; lacuna mantida. Atualização animada terminou em +21,00%, +1,49%, 0,00% e +3,00%, respectivamente. Série inteiramente ausente continua sem gráfico disponível.
- [x] **S4-02 implementado sem mudança de fórmula.** Resumo histórico agora expõe a última data efetivamente considerada. Início e Visão geral apresentam essa referência junto da distinção entre retorno histórico e lucro atual. Para carteira iniciada no mês corrente, o texto informa período inicial parcial; ausência de período não promete fechamento. Cenário automatizado de 10 unidades compradas a 40, fechamento de outubro a 38,69 e preço de novembro a 41,72 confirma retorno fechado -3,275% e ganho atual +17,20, sem igualar as bases por suposição. Testes existentes de aportes, vendas e proventos continuam aprovados.
- [x] **S4-03 implementado.** Títulos observados na aplicação autenticada: `Explorar ativos | Valora` e `ITUB4 | Valora` em `/ativos/explorar/ITUB4`. Teste cobre também a rota inexistente e ticker com codificação inválida.
- [x] **S4-04 implementado.** Avatar em Lançamentos usa a inicial do ticker, mantendo cor de classe e badge. Na interface real, RADL3→R, GARE11→G, VGHF11→V e ITSA3→I. Variantes desktop e móvel usam a mesma regra; nenhum cadastro ou lançamento foi alterado.

Validação: 16 arquivos de teste / 113 testes aprovados nos módulos de desempenho, resumo, Início e títulos; build de produção aprovado; lint dos arquivos alterados aprovado. Conferência autenticada local somente de leitura na carteira Investidor10. Layout de 390 px sem transbordamento horizontal na Visão geral e no cenário controlado do gráfico. Interação por clique em viewport móvel conferida; não equivale a toque físico Android/iOS.

Evidências locais, fora do código de produto: `output/qa-semana4/antes.png`, `depois.png`, `mobile.png` e `visao-geral-mobile.png`. A página controlada de homologação usa dados sintéticos e não faz parte das rotas publicadas do app.

- [ ] Publicar a entrega por PR e repetir os quatro roteiros na versão publicada.
- [ ] Conferir toque do tooltip no PWA físico; preservar carteiras e lançamentos existentes.

Homologação adicional das telas reais concluída: [roteiros, resultados e limites](homologacao-local-quarta-bateria.md). Conferidos tooltip com dados da carteira, troca de período, leitura dos indicadores, títulos por navegação e avatares em desktop/móvel. Entrega local aprovada; publicação e PWA físico continuam separados acima.

## Correções anteriores confirmadas pelo avaliador

- [x] DF48 / CT144: patrimônio da rota legada coerente com Início.
- [x] DF12 / CT145: composição por setor disponível.
- [x] DF07 / CT146: percentuais em pt-BR.
- [x] DF58 / CT147: percentual da posição com vírgula e duas casas.
- [x] DF46 / CT148: falha de conexão na recuperação com mensagem amigável; requisição simulada, sem envio.
- [x] DF49 / CT149: títulos próprios nas rotas avaliadas, com exceção separada em S4-03.
- [x] DF59 / CT150: inclusão com botão “Salvar”.

CT154 (validação do modal vazio), CT155 (busca sem resultado) e CT156 (institucionais/404) também foram aprovados. Não equivalem a teste de gravação, exclusão ou exportação.

## Limites e relação com entregas recentes

- O avaliador usou Chrome desktop e uma carteira com 10 ITUB4, PM de R$40,00. Não testou celular, persistência/exclusão de lançamentos ou exportação CSV. Repetir os cenários de nossa responsabilidade sem modificar a carteira Investidor10.
- DF34, DF56, DF44 e DF24 ficaram fora desta entrega. Isso não reabre nem invalida as implementações/homologações anteriores de IPCA, cadastro e redefinição de senha; manter o histórico da terceira bateria.
- O relatório não avaliou os problemas recentes de custo histórico, formato numérico do CSV e calendário de proventos. A PR128 e a correção do calendário da PR129 devem continuar acompanhadas pelos respectivos documentos, sem atribuir a elas a resolução de DF60–62.
- DF05 não deve ser encerrado apenas por existir explicação textual, nem tratado automaticamente como cálculo errado. A pendência desta rodada é demonstrar a conciliação por período e melhorar a leitura dos indicadores.
