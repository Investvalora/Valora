# Homologação de produção — PR #109

Conferência após o merge `d2fd316fe9eb92b61e49269da1f44e86446fcbc3`, realizado em **06/11/2026 às 23:33:24 BRT**. Status Vercel do commit aprovado; CI da main `42329836841` concluída com sucesso. A regressão desta entrega contém 1.019 testes; não foi reexecutada localmente sem mudança de código nesta homologação.

## Versão realmente carregada

A aba aberta desde a versão anterior ainda usava `index-CG3UZvGu.js`, mesmo após navegar pela SPA. Recarregamento normal carregou `index-CuUFESeT.js`, o mesmo arquivo indicado no HTML público do deploy. Não foi necessário apagar sessão, desregistrar service worker ou limpar dados. Navegar entre rotas sem recarregar não substitui o JavaScript já carregado.

## Resultado dos ensaios autenticados

- **Payout:** AAPL exibiu 11,80%, reconciliado com o campo da fonte Yahoo no banco. FIIs como MXRF11 exibiram `—`, conforme a regra de incompatibilidade, em vez do cálculo pessoal anterior. Demais ativos sem payout ingerido também ficam indisponíveis até sincronização/fornecimento da fonte; não foram preenchidos por inferência.
- **Proventos:** Investidor10 exibiu R$ 603,90 em 148 registros no período de um ano. O recebimento importado da AAPL de 13/08/2026 manteve líquido R$ 0,06 e bruto R$ 0,09 na base, com líquido R$ 0,06 na tela de recebidos. A ausência de multiplicação entre bruto/cota e total líquido é intencional: são bases diferentes.
- **YOC e moeda do custo:** coluna YOC exibida temporariamente para o ensaio e depois retirada, restaurando a seleção original. Para AAPL, quantidade 0,0661 × preço médio USD 302,60 = USD 20,00186. PTAX venda do pagamento: 5,1859; R$ 0,06 correspondem a aproximadamente USD 0,01157. YOC calculado de 0,05784% arredondou para **0,06%**. A tabela de rentabilidade mostrou **13,20%**, consistente com ganho de capital + recebimento na moeda do custo.
- **Detalhe móvel AAPL:** Resultado da posição mostrou custo USD 20,00, ganho USD 2,63, proventos USD 0,01 e retorno 13,20%. O card de recebimento manteve explicitamente “Líquido importado = R$ 0,06”. Não houve rotulagem do valor BRL como USD.
- **Histórico Investidor10:** desde o início, retorno observado 24,09% e período até **31/10/2026**; novembro/dezembro de 2026 indisponíveis na tabela de meses fechados. Sem aviso de lacuna no recorte selecionado.
- **Diagnóstico Minha Carteira:** aviso identificou Tesouro IPCA+ 2029, aplicação 23/09/2025, lote e data afetada **31/10/2026**, com falta de série IPCA. Recarregar manteve a ausência; o link abriu `/ativos/lancamentos`. Não foi inserido dado para eliminar o aviso. O acumulado permaneceu indisponível e a linha terminou no trecho disponível, em 30/10/2026.
- **Causa da lacuna confirmada:** `macro_rates` terminava em IPCA de setembro. Consulta direta à série pública SGS 433, de setembro até 06/11/2026, também retornou somente setembro. O aviso remanescente corresponde à disponibilidade da fonte naquele instante. Não comprova falha de atualização nem autoriza estimar outubro como realizado.
- **Layout e console:** tabela desktop e layout móvel do navegador integrado conferidos; diagnóstico legível e ações acessíveis. Nenhum erro/aviso capturado no console durante o recorte testado. Viewport original restaurada. Isso não é um novo ensaio de instalação/push em aparelho físico; esse fluxo não foi alterado pela PR #109 e sua homologação está registrada na PR #108.

## Preservação e conclusão

A seleção original **Investidor10** foi restaurada. Nenhuma posição, lançamento, taxa, evento de renda fixa ou recebimento foi editado/criado/excluído. Não houve reenvio de push nesta homologação. Alterações temporárias de exibição de coluna e viewport foram revertidas.

**ENT-04 concluída no recorte publicado.** A indisponibilidade de IPCA na Minha Carteira permanece explícita e depende da fonte; ausência correta de dado não foi classificada como defeito corrigido. Cenários de erro sem câmbio e demais casos sintéticos continuam cobertos pela regressão, sem induzir falhas ou alterar dados reais em produção.

Evidências locais, fora do commit: `output/homologacao-pr109/diagnostico-mobile.png` e `output/homologacao-pr109/aapl-producao.png`.

Fontes públicas usadas na conferência:

- PTAX: `olinda.bcb.gov.br`, serviço CotacaoDolarPeriodo, data 13/08/2026, última publicação 13:09:15.
- IPCA: `api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados`, janela 01/09/2026–06/11/2026; retorno setembro, 0,82%.
