# Comparação Android — 18/11/2026

## Método

Galaxy A31 físico autorizado, viewport de 411 px. Chrome autenticado na origem local `http://127.0.0.1:5181`, sem copiar sessão do PWA de produção. Comparados os commits `54df3d35ac4d91c4364fa9e40a339301b99b5ad0` (PR173) e `ef0b2d370a117b567e01309871d2f802cb140a5c` (PR174).

Ordem ABBA, três recargas normais por bloco, seis amostras por versão. Aquecimento de 12 segundos por bloco, cache HTTP aquecido, sem limpar dados de autenticação. Worker ignorado igualmente nos dois builds apenas na sessão de depuração da origem local. O PWA de produção não foi reinstalado nem teve seu cache limpo.

Arquivos do app servidos pelo computador via ADB reverse/USB; consultas ao backend usam a rede do aparelho. Não houve mudança deliberada da rede, mas o transporte ativo Wi-Fi/celular não foi confirmado: ambos estavam habilitados e `navigator.connection.effectiveType` retornou `4g` em todas as amostras. Bateria 10%, carregando, temperatura observada 33,5 °C.

## Resultados

| Medida | Antes | Depois |
|---|---:|---:|
| Amostras | 6 | 6 |
| FCP mediana | 318 ms | 322 ms |
| FCP mínimo–máximo | 276–340 ms | 264–1.260 ms |
| Indicador visual, mediana | 575 ms | 572 ms |
| Indicador visual, mínimo–máximo | 516–643 ms | 489–1.529 ms |

Indicador visual: observador instalado antes do app, marcando a primeira aparição do texto “Patrimônio total” e de um valor monetário na página. É uma aproximação de renderização, não prova de conclusão de todas as consultas, de atualização dos valores ou de interatividade completa. Todas as amostras permaneceram em `/inicio`.

Não há ganho demonstrado pelas medianas; elas ficaram praticamente iguais. A abertura mais lenta permanece incluída, sem descarte. As versões comparadas tratam de correções funcionais; não constituem uma otimização isolada.

## Limites e pendências

Este ensaio completa a comparação dos dois builds no mesmo aparelho/origem local. Não encerra a comparação do PWA completo pelo CDN de produção em rede real controlada, nem compara workers antigos e novos sob carga equivalente. A coleta inicial interrompida por falta de resposta do worker local foi descartada integralmente; o conjunto acima usa o protocolo uniforme com bypass local.

Dados técnicos brutos, sem valores da carteira, ficam em `output/performance-android-controlled.json` no workspace principal, fora do versionamento.

## Complemento: versão atual em produção no aparelho físico

Cinco recargas normais consecutivas do PWA instalado, em Wi-Fi confirmado pelo transporte ativo do Android, sem limpar cache ou alterar worker. Viewport 411 × 869. Asset principal observado em todas: `/assets/index-Bo000kdU.js`.

| Medida | Resultado |
|---|---:|
| FCP mediana | 396 ms |
| FCP mínimo–máximo | 328–480 ms |
| Indicador visual mediano | 661 ms |
| Indicador visual mínimo–máximo | 607–837 ms |
| Respostas de erro do Supabase observadas | 0 |
| Exceções JavaScript observadas | 0 |

Worker controlando e modo standalone ativos nas cinco amostras; início autenticado presente ao final de cada espera de nove segundos. O indicador visual tem a mesma limitação metodológica descrita acima: não comprova conclusão de todas as consultas. “4g” retornado pelo navegador é uma estimativa de qualidade, não o transporte celular; o transporte ativo foi confirmado separadamente como Wi-Fi.

Uma coleta anterior interrompida por perda do encaminhamento USB foi separada e não entrou nesse conjunto. Arquivo bruto: `output/phone-production-performance.json` no workspace principal. A medição estabelece baseline real da versão atual. Não deve ser comparada numericamente ao ensaio local como se fosse a mesma condição nem apresentada como comparação histórica antes/depois pelo CDN.
