# Demora na exibição das telas — 20/11/2026

## Evidências observadas

Consulta de leitura no navegador integrado de produção, sem mudar conta ou carteira:

- Abertura do Início: DOMContentLoaded em 12.982 ms; CSS de Google Fonts levou 12.269 ms. Era um stylesheet bloqueante no head, embora a Nunito só seja usada pontualmente na interface.
- A renovação de sessão `/auth/v1/token` levou 12.757 ms; consultas privadas começaram depois. Essa espera não é duração de animação e não foi contornada. É uma amostra de rede, não comprovação de indisponibilidade persistente do Auth.
- Na amostra, chunks de navegação posteriores levaram aproximadamente 54–69 ms e a maioria das consultas finais 49–219 ms. O buffer de recursos chegou a 250 entradas durante o carregamento histórico; não concluir que essas consultas estavam todas em série nem atribuir todo esse custo ao motion.
- Há trabalho adicional nas trocas de rota: a implementação de motion chamava `startViewTransition` e `flushSync` em cada clique. Isso acrescenta captura da página inteira e força commits React; pode antecipar fallbacks do Suspense. As durações visuais declaradas de 90–180 ms não explicam sozinhas as esperas de vários segundos.

Não foi comprovado que toda tela sofria o mesmo atraso. A navegação de produção para Ativos levou cerca de 3,1 s entre clique e heading visível, incluindo o custo das chamadas de automação; não é uma medida precisa de frame ou de conclusão dos dados.

## Correção local

- Nunito latina variável servida pelo próprio build, mesma família/pesos, `font-display: swap`, com licença OFL incluída. Retirada a folha externa bloqueante do HTML. Asset WOFF2 de aproximadamente 39 kB, incluído no pré-cache do PWA.
- Navegação delegada ao NavLink normal, sem screenshot nativo global nem flushSync. Preservados MotionRegion de 180 ms, skeletons, indicador de progresso e respeito a movimento reduzido. Não há espera artificial antes de trocar a URL.
- Nenhuma alteração na autenticação, expiração, validação de sessão ou cálculos financeiros.

Referência técnica: [React — limitações de flushSync](https://react.dev/reference/react-dom/flushSync). Fonte e licença: [Fontsource Nunito](https://fontsource.org/fonts/nunito/use).

## Verificação

Regressão direcionada inicial: oito testes aprovados, incluindo navegação mesmo quando uma API nativa simulada nunca chama seu callback. Build aprovado, fonte resolvida em asset local; tipos e lint direcionados aprovados.

Regressão ampliada dos layouts e feedbacks: 13 testes em cinco arquivos aprovados.

Comparação isolada dos builds locais na tela de login: anterior em `127.0.0.1:5184` registrou DOMContentLoaded 1.248 ms e Google CSS 17 ms; corrigido em `127.0.0.1:5185`, 114 ms e zero requisições Google Fonts. Portas/cache/estado de sessão distintos e somente uma amostra: não é benchmark controlado nem permite prometer esse ganho em produção. A fonte local só é solicitada quando algum texto usa a família.

Mudança ainda não publicada. Após merge, conferir navegação fria/quente no PWA e distinguir carregamento do código, consulta histórica e renovação de sessão. Uma renovação Auth lenta pode continuar atrasando a abertura autenticada mesmo com estes ajustes.
