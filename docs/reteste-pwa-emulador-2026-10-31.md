# Reteste PWA — emulador Android — 31/10/2026

Ambiente: Android Emulator, 1080 × 2400, Chrome, Valora publicado em `investvalora.vercel.app`. Abertura pelo ícone da tela inicial, sem barra de endereço. Teste em emulador não substitui homologação em aparelho físico.

## Conferido

- Conta com dados carregada na carteira Minha Carteira; lista exibiu 29 ativos.
- Navegação inferior para Ativos e retorno ao Início.
- Toque em BBAS3 abriu o resumo com quantidade, preço médio, saldo e gráfico.
- Aba Lançamentos de BBAS3 abriu e exibiu compra em 15/09/2026, quantidade 46, preço R$ 21,07 e total R$ 969,22.
- Rolagem vertical até Evolução do patrimônio sem abrir o seletor de carteiras.
- Toque na coluna de novembro/25 exibiu tooltip com patrimônio R$ 321,83, aplicado R$ 321,83 e ganho R$ 0,00.
- Filtro Ações BR alterou o gráfico de todos os tipos para a série da classe, exibindo setembro/26 com R$ 4.614,11.
- Seletor de período abriu e aceitou 1M. Nessa combinação com Ações BR a série ficou sem coluna; causa não conciliada neste ensaio.

## Investigação complementar

- **Gráfico 1M: defeito visual confirmado.** Ao deslizar horizontalmente, a coluna de outubro/26 apareceu com R$ 4.237,88 em Ações BR da Minha Carteira. Não faltavam dados. `EvolucaoChart.tsx` mantém `min-w-[960px]` no mobile mesmo para uma coluna, posicionando-a fora da área inicialmente visível. Solução proposta: dimensionar a largura mínima pela quantidade de meses e manter a coluna única visível; preservar rolagem quando houver muitas colunas e reiniciar a posição horizontal ao trocar filtros/carteira.
- **Carteiras: abertura e seleção confirmadas.** Arrasto de 250 ms iniciado dentro da zona lateral, fora da borda do Android, abriu o seletor por completo. Rolagem vertical revelou Investidor10; seleção atualizou o início para Investidor10 e patrimônio R$ 18.717,27. O ensaio anterior com abertura parcial não comprova falha permanente; permanece a investigação de arrasto lento/cancelamento e conflito com o Voltar da borda. Não aplicar bloqueio horizontal à página inteira, pois o gráfico precisa rolar horizontalmente.
- **Sino:** abriu a lista de alertas normalmente.
- **Push em segundo plano: aprovado neste Android.** Chrome informa notificações permitidas para a origem. Às 13h57 de Brasília foi criado um único alerta temporário, após autorização específica do responsável. Resposta HTTP 200, `sent:5,failed:0`; central do Android exibiu “Novo alerta no Valora” com texto genérico. Alerta `d7462011-4239-45aa-8232-db4349e37456` encerrado como Ignorado às 13h58, preservando a retenção normal de três dias. Não houve novo envio no encerramento. Não foram expostos endpoints nem chaves.
- Toque na notificação retirou a central, mas a tela observada permaneceu no launcher; abertura de `/alertas` pelo push não foi confirmada. Investigar navegação/foco do service worker separadamente da entrega, que foi comprovada.

## Complemento: produção após PR #99 em 31/10

Deployment confirmado para o merge `1397bbacf5691e73c9273be1d641c4c0de82d0c9`. PWA instalado no emulador Android, sem barra de endereço, autenticado pelo responsável.

- Arrasto de 1.100 ms abriu o seletor; retorno à Investidor10 e rolagem vertical aprovados.
- Coluna 1M/Todos os tipos visível sem arrastar, R$ 18.717,36. Valor observado, sem conciliação financeira.
- Push real autorizado: um alerta temporário criado às 18h57 de Brasília, com app em segundo plano. HTTP 200, cinco envios aceitos e uma falha sem motivo individual informado. Notificação exibida; toque abriu Alertas dentro do PWA instalado. Alerta `1322d4d7-4f58-4432-b874-6f16f89525b1` encerrado como Ignorado às 18h58, confirmado no banco; retenção normal de três dias. Nenhum lançamento ou posição alterado. Cinco inscrições restantes, compatível com remoção de inscrição expirada, sem confirmação da causa individual.
- AAPL abriu pelo card. Aba Lançamentos exibiu preço $302.60 e total $20.00. Filtro temporário removido ao terminar. Prévia e BRL cobertos localmente, não repetidos neste recorte.
- Backend: zero perfis internos ausentes, dois triggers ativos, migration registrada uma vez e execução direta por authenticated bloqueada. Migration não reaplicada.

Evidências fora do commit: `output/android-pwa/prod-1m.png`, `prod-push-pr99.png`, `prod-push-destino-pr99.png`, `prod-aapl-lancamentos.png`.

Permanecem aparelho físico/iOS e processo do navegador encerrado. Nesta etapa, somente documentação atualizada, sem alteração de código ou nova publicação. As referências abaixo a publicação pendente descrevem a etapa local anterior a este complemento.

## Ainda não homologado na etapa anterior

### Correções locais posteriores

Reteste visual concluído no Chrome do emulador, origem local `http://127.0.0.1:5174`, após login pelo responsável:

- Arrasto lento de 1.100 ms abriu completamente o seletor. Selecionar a carteira atual retornou ao início; rolagem vertical até o gráfico não abriu o seletor.
- 1M/Todos os tipos: coluna de outubro/26 visível sem rolar horizontalmente, R$ 12.892,98. 1M/Ações BR: coluna visível, R$ 4.237,88. Números somente observados, sem mudanças de cálculo ou dados.
- Aviso local autorizado, criado por `ServiceWorkerRegistration.showNotification`, exibido com Chrome em segundo plano. Toque abriu `127.0.0.1:5174/alertas` com a lista da conta. Exercita o handler corrigido de `notificationclick`; não repete o transporte FCM já validado anteriormente. Nenhum alerta novo foi criado no banco e nenhum outro dispositivo recebeu esse aviso local.
- Evidências em `output/android-pwa/local-gesto-lento.png`, `local-1m.png`, `local-1m-acoes.png`, `local-notificacao.png` e `local-push-destino.png` (fora do commit).
- Limite: Chrome no emulador, não instalação standalone local nem aparelho físico. Publicação e reteste da versão instalada continuam pendentes.

- Gráfico: largura mínima proporcional aos meses, medição da largura real por ResizeObserver e região de rolagem recriada ao mudar carteira/tipo/período. Uma coluna deixa de exigir 960 px. Tooltip, valores acima das colunas e rolagem de séries longas preservados.
- Push: prioriza janela visível, foca antes de navegar e tenta outra janela ou `openWindow` quando foco/navegação falham ou o cliente foi descartado. Destino permanece fixo em `/alertas`, na mesma origem.
- Carteiras: área lateral agora aceita toque e usa `touch-action: pan-y`, assim como os cartões e a lista aberta. O tratamento é restrito ao seletor; gráficos continuam aceitando rolagem horizontal. Cancelamento do arrasto restaura a posição inicial.
- Regressão: 864 testes aprovados em 117 arquivos; novos testes cobrem coluna única/série longa, cancelamento/toque no seletor e cinco cenários de abertura pelo push. Lint e build/PWA aprovados. Validação visual local concluída conforme acima. Alterações locais, ainda não publicadas.

- Consistência do gesto em arrastos lentos e cancelamento; abertura e seleção por arrasto curto aprovadas conforme complemento acima.
- Rolagem horizontal completa dos meses, demais abas do ativo e renda fixa.
- Abertura de Alertas pelo toque no push; teste com processo do navegador encerrado (o teste aprovado deixou-o em segundo plano).
- Aparelho físico, incluindo iOS.

Houve respostas intermitentes aos primeiros toques; navegação e abas responderam posteriormente. Log de crashes do Android consultado sem registros; isso não determina a causa da lentidão. Nenhum lançamento ou posição foi alterado; somente o alerta temporário autorizado foi criado e encerrado no complemento. Não houve alteração de código ou publicação nesta etapa.
