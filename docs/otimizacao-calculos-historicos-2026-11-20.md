# Otimização dos cálculos históricos

## Diagnóstico

Após a PR 189, a navegação em produção ainda executava até 2.732 ms de JavaScript ao voltar ao Início. Uma captura amostrada de CPU com dados em cache concentrou aproximadamente 1.712 ms nos módulos de rentabilidade histórica e avaliação histórica da renda fixa. Os nomes minificados não identificam cada função isoladamente; a leitura do código confirmou ordenações repetidas e reconstruções redundantes.

## Alterações

- Consulta pontual de câmbio sem filtrar/ordenar a série inteira. Consultas diárias usam índice preparado com busca binária, mantendo a primeira publicação válida por data, o limite de dez dias e a proibição de dados futuros.
- Índices macroeconômicos separados e ordenados uma vez por reconstrução de renda fixa. Fórmulas, eventos, deflação e lacunas permanecem preservados. Não há cache global de dados pessoais.
- Resumo anual deriva da mesma série diária do resumo total, evitando reconstrução duplicada.
- O gráfico do Início não calcula novamente a rentabilidade que já é calculada pelo resumo da página.
- O cartão de proventos da Análise totaliza os recebimentos já convertidos que consulta, sem carregar o dashboard inteiro.
- Mapa de custo de aquisição memoizado por posições, movimentos, taxas e disponibilidade, evitando invalidação do gráfico a cada renderização sem mudança de entradas.

## Comparação controlada do cálculo

Execução local Vitest, implementação anterior extraída de HEAD e implementação nova com as mesmas entradas fictícias: 1.096 dias a partir de 01/01/2023; 40 posições USD de duas unidades e custo unitário 10; cotação diária `10 + índice/1000`; câmbio diário `5 + índice/10000`; séries CDI 10% e IPCA 0,5% em ordem invertida; um contrato CDI de principal 1.000 e taxa 120%. Sem movimentos ou proventos. Igualdade exata de toda a série diária verificada com `toEqual`, incluindo valores, retornos, decomposição e diagnósticos. Arquivos temporários com o código anterior removidos após a comparação.

| Amostra | Anterior | Otimizada |
| --- | ---: | ---: |
| 1 | 1.316,34 ms | 331,35 ms |
| 2 | 1.140,22 ms | 278,02 ms |
| 3 | 1.195,58 ms | 288,47 ms |
| Mediana | 1.195,58 ms | 288,47 ms |

Redução de aproximadamente 76% no cálculo desse cenário. Esse percentual não mede rede, autenticação nem carregamento completo de páginas.

## Homologação local

Navegador integrado, Vite local em 127.0.0.1:5176, conta já autenticada e dados em cache. Tempos exploratórios entre clique e conteúdo principal disponível: Início 522 ms; Análise 57 ms; Desempenho 669 ms; Carteiras 38 ms. Para Análise/Desempenho, foi exigido o título da subpágina Visão Geral, além da ausência de texto de carregamento; amostras anteriores que mediam apenas o cabeçalho do shell foram descartadas. Observadores temporários e coleta de métricas removidos ao final. Não é comparação controlada com produção nem medição Android.

Conferidos em leitura: custo investido R$ 19.810,15; proventos 12M R$ 643,33; recebidos totais R$ 845,02; retorno total 24,09%; retorno 12M 7,85%. Correspondem à produção consultada. Patrimônio atual varia com cotações; fechamentos históricos conferidos visualmente sem divergência. Nenhum lançamento ou carteira alterado.

143 testes em 20 arquivos aprovados, build/PWA e TypeScript aprovados, lint dos arquivos alterados aprovado, varredura de segredos sem achados. Testes permanentes cobrem publicações duplicadas/inválidas, ordem das séries, limite de validade, CDI, IPCA/deflação, encerramento por evento e consumidores sem necessidade de rentabilidade.

Ainda necessário após publicação: repetir as medições no CDN e no Android. Esta entrega reduz o trabalho de CPU identificado; não promete tempos de rede nem elimina a necessidade de investigar refresh de autenticação lento caso volte a ocorrer.
