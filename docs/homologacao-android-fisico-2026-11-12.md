# Android físico — Galaxy A31 — 12/11/2026

## Atualização vigente — após PR148

### Reteste físico aprovado — aproximadamente17h16–17h21 Brasília

Capturas ADB voltaram a retornar PNG completo; leitura uiautomator permaneceu sem conteúdo web. Pela imagem real do Galaxy A31, início e barra inferior legíveis; botão central abriu lançamento. Quantidade3 digitada sem ativo e sem salvar, com teclado numérico real. HOME→launcher abriu novamente o início. Novo lançamento ofereceu explicitamente o rascunho no dispositivo; Restaurar recuperou quantidade3. Cancelar retornou ao início; reabertura confirmou quantidade0, campos vazios e ausência da oferta. Cancelado novamente ao final. Nenhum lançamento foi salvo.

Fecha o reteste físico de persistência após recriação da janela e limpeza, mas não comprova versão anterior/atual do worker ou comparação de desempenho. A captura intermediária de splash não é falha; uma captura posterior mostrou início carregado normalmente. Evidências locais output/android-debug-atual.png, android-qty-atual.png, android-draft-oferta.png, android-draft-restaurado.png e android-draft-limpo.png. O registro de tentativas incompletas abaixo permanece histórico.

### Nova tentativa de depuração

ADB reconectado (transport 6). A primeira leitura uiautomator voltou a expor o conteúdo real do início: carteira Investidor10, investido R$18.483,17 e rentabilidade24,09%. A captura permaneceu truncada em62bytes. Três retomadas pelo launcher foram aceitas, porém as leituras seguintes retornaram shell Chrome sem textos; logo, os intervalos observados de8,97/5,00/4,94s não representam tempo até dados disponíveis e não entram no benchmark. Evidência técnica local output/android-debug-reteste-tempos.json. Leitura da interface está intermitente; não comprova tela branca visível ao usuário.

Responsável confirmou o aviso após revogação real em produção. Rascunho após recriar aba e barra após redimensionar passaram na web publicada, conforme homologacao-producao-pr148.md; os estados anteriores abaixo são históricos.

Na retomada por USB, aparelho SM-A315G conectado e getprop respondeu. ADB lançou o PWA instalado com Status ok/WaitTime315ms, que continua sendo medida nativa e não carregamento web. Leitura uiautomator retornou shell Chrome sem textos do aplicativo, inclusive após reabertura; captura binária retornou PNG truncado de 62 bytes. Responsável confirmou que vê o Valora carregado normalmente. Não atribuir esses artefatos incompletos a tela branca no app nem usá-los como tempo de carregamento.

Não foram limpos dados/cache nem reinstalado o PWA. Sem observação instrumental confiável, não foi produzida nova série física ou comparação antes/depois. Prova de atualização de worker antigo e desempenho comparável continuam abertas. As três amostras anteriores permanecem apenas observacionais.

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
