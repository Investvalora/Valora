# Android físico — Galaxy A31 — 12/11/2026

Teste via depuração USB autorizado pelo responsável, aproximadamente14h34–14h40 Brasília. Aparelho Samsung SM-A315G, captura1080×2400; ícone de Wi-Fi visível. PWA instalado identificado pelo domínio investvalora.vercel.app, sem barra de endereço. Conta com carteira Investidor10; por isso não foi usada para revogação.

## Confirmado

- Abertura do PWA instalado, início, valores e rentabilidade carregados; estado transitório de rentabilidade vazia foi substituído pelo resultado24,09%.
- Novo lançamento pelo botão central: folha legível, campos/ações disponíveis. Digitada somente quantidade2, sem ticker e sem salvar. Teclado numérico real abriu; ações Cancelar/Salvar ficaram acima dele. Fechar teclado recuperou tamanho completo.
- Cancelar retornou ao início, sem gravação. Navegação Análise→Score carregou score0,98/100, cobertura39,04%, com Dividendos Premium ativo.
- HOME→recentes→cartão do Valora preservou a tela de Score e a barra inferior visível.

## Observações e limites

- Na primeira abertura, `am start -W` reportou544ms; em outra516ms. Esses valores medem Activity/Splash nativa, **não** tempo até os dados web ou interatividade. Não há benchmark de três amostras frias/controladas, nem comparação antes/depois. RP07 continua parcial.
- HOME→invocação do launcher via `am start` reportou COLD, recriou o início e não ofereceu o rascunho da quantidade2. Não equivale ao retorno pelo cartão de recentes, que preservou a tela. Investigar ciclo de janela/sessionStorage antes de concluir garantia de recuperação após recriação. Não houve alteração/limpeza de dados do Chrome nem remoção do PWA.
- Não foi obtida evidência da versão do service worker controlador no aparelho. Abrir o PWA existente não prova, sozinho, atualização a partir de um worker antigo.
- A barra ausente após redução de altura no navegador integrado continua como caso separado; teclado real não a reproduziu nesta rodada.
- RP09 permanece pendente: não revogar a conta principal. Nenhuma sessão revogada, alerta/regra salvo ou operação financeira registrada.

Evidências locais não versionadas: output/valora-celular-form.png, valora-celular-teclado.png, valora-celular-sem-teclado.png, valora-celular-score.png, valora-celular-recentes.png e valora-celular-score-retorno.png.

## Reteste complementar — 14h42–14h46

Quantidade3 digitada sem salvar. HOME→recentes→cartão do PWA manteve formulário/quantidade3; foco retornou com teclado, que pôde ser fechado normalmente. Cancelar limpou o teste. Não reproduz perda no retorno normal do segundo plano. Abertura que recria a janela permanece diferente: armazenamento atual é sessionStorage, portanto não garante restauração numa nova sessão de aba. Não migrado para armazenamento persistente nesta rodada.

Três aberturas via launcher, cache e rede habituais sem limpeza/throttle: primeira detecção de “Valor investido” e valor monetário no início em6,51s/4,83s/5,05s. Incluem startup, ADB, serialização e observação da UI, com polling por uiautomator: são limites superiores observados, não LCP/FCP/TTI ou tempo exato do app. Não houve comparação com versão anterior. Evidência output/android-loading-samples.json.

Inspeção da versão do worker no Android não concluída: ferramenta bloqueou chrome://inspect por política de URL; não houve contorno via conexão alternativa. Continua pendente a prova da versão controladora/atualização de worker antigo.

Operação: reconsulta confirmou execuções duráveis international-providers às13h11 e14h11, ambas sucesso; recorrência horária inicial comprovada, sem afirmar escoamento integral da fila.
