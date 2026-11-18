# Android físico — 18/11/2026

Galaxy A31 (SM-A315G), PWA de produção em modo standalone, viewport CSS
411 × 869, DPR 2,625. Testes por CDP no Chrome do aparelho, com eventos de toque;
nenhuma emulação de viewport e nenhum lançamento salvo. USB autorizado pelo responsável.

## Tooltips

- Proventos: toque na barra 11/2026 abriu o tooltip com recebido R$ 71,40,
  a receber R$ 0,00 e total R$ 71,40. Retângulo CSS x104,67–334,67,
  y339,46–573,75: integralmente dentro da tela. Captura inspecionada.
  Isso valida interação e apresentação, não conciliação com a corretora.
- Rentabilidade: toque abriu data e quatro séries. Retângulo x259,26–419,26,
  em viewport de largura411: corte de aproximadamente8,26px à direita.
  Corrigido localmente para limitar a posição horizontal à tela e ao trecho
  visível do gráfico rolável. Reteste físico da correção depende da publicação.

## Worker

Cache instalado `valora-static-1d95d5e54fac`, worker ativado, sem worker em
espera. `/sw.js` consultado sem cache publica a mesma versão. Não houve
limpeza de dados ou reinstalação. Logo, esta amostra não comprova atualização
de worker antigo; preservar o aparelho para observar troca após a entrega.

## Desempenho da versão atual

Três recargas normais do início, sem ignorar cache:

| Amostra | DOMContentLoaded | FCP | Dados visíveis na observação |
| --- | ---: | ---: | --- |
| 1 | 536ms | 660ms | Sim, aos2733ms |
| 2 | 583ms | 668ms | Sim, aos1741ms |
| 3 | 434ms | 512ms | Sim, aos1973ms |

Mediana FCP660ms. A observação dos dados começa após a reconexão CDP e não
mede o instante exato de disponibilidade. Não usar esses tempos como TTI.
Network Information reportou effectiveType4g, RTT150ms e downlink2,65Mbps;
isso não comprova transporte celular em vez de Wi-Fi. Sem controle equivalente
antes/depois, não afirmar ganho de desempenho. Evidências brutas e captura
permanecem em `output/phone-*` no workspace principal, fora do Git.

## Disparador

Cron executou automaticamente às16h49 de Brasília com status succeeded.
Como o intervalo19:45UTC já havia sido reservado pelo teste manual, não criou
outro workflow. A execução manual44383559144 concluiu com sucesso.
Falta comprovar dispatch automático em intervalo ainda não reservado.

## Tesouro e verificações locais

Cron do Tesouro acionado automaticamente em18/11 às08h30 de Brasília.
Preços atualizados no banco às08h30:04, com1145 linhas atualizadas nas últimas
24horas e data de referência mais recente17/11. Isso comprova atualização da
tabela, sem afirmar recálculo integral de todas as posições a partir desse dado.
Próxima janela configurada:19h30 de Brasília, em dias úteis.

Correção local do tooltip aprovada por TypeScript, ESLint e teste de regressão
geométrica; comparação com IPCA também passou (3testes em2arquivos).
