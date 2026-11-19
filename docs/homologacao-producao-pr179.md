# PR179 — homologação em produção

Data: 19/11/2026. Merge `d340ab09b549d2d6c1d97306071f0c1f30efc1ee`.

- PR179 mergeada; todos os checks da PR aprovados. CI da main aprovado: https://github.com/Investvalora/Valora/actions/runs/44591181449.
- Deploy Vercel concluído: https://vercel.com/investvalora/investvalora/CQiw2wA51g8C2tu2oGWQVUJc3FU4. Aplicação publicada carregou `/assets/index-BtcPeBKu.js`.
- `/carteiras/planejamento` redirecionou para `/analise/ferramentas`, com título Ferramentas. Carteiras deixou de mostrar o atalho antigo. Acesso por Análise e pela aba Ferramentas confirmado.
- Em 390 px, documento e scrollWidth iguais a 390. Aba Ferramentas revelou-se após redimensionamento (limite direito 374 px), sem overflow da página.
- Painéis de planejamento, meta, saúde, reconciliação e exportação abriram. Meta exibiu dados confirmados após carregamento; não foi salva. Reconciliação completou após a espera. Fontes e datas da saúde carregaram.
- Atualização de saúde sob latência de 1.200 ms manteve a tabela, mudou o botão para Conferindo dados, desabilitou-o e expôs `aria-busy=true`.
- Carregamento inicial da reconciliação apresentou três skeletons, estado ocupado e indicador global indeterminado. Com movimento reduzido, duração computada do skeleton foi `1e-05s` (efetivamente zero). Nenhum percentual fictício.
- Troca de ferramenta por ArrowRight selecionou Exportar carteira; modo keyboard e duração de transição de 0 s confirmados.
- Modal de lançamento abriu pelo botão da barra inferior, fechou pelo controle Fechar e devolveu foco ao botão de origem. Nenhum formulário submetido.
- Navegação de Ativos e Desempenho conferida com a barra inferior preservada. Console sem erros/warnings nos fluxos verificados.
- Sem migrations nesta PR. Sem gravação de meta, lançamento ou recebimento real; estados de gravação permanecem cobertos pelos testes automatizados locais.

Evidências privadas em `output/homologacao-pr179/`, fora do Git. Rede, media e viewport temporários restaurados. Conferência em navegador responsivo; não representa novo teste em Android físico.

## Achado na primeira consulta de carteiras

Uma captura após navegação completa mostrou a página já montada, seletor vazio e a orientação Selecione ou crie uma carteira antes de a consulta de carteiras terminar. A carteira correta aparece depois, mas a orientação transitória é enganosa.

Correção adicional na branch `codex/tools-wallet-loading`: skeleton e seletor desabilitado com rótulo de carregamento durante a consulta; erro com nova tentativa separado de carteira realmente vazia. Nove testes de planejamento/navegação aprovados, incluindo três casos novos para carregamento, falha e vazio concluído. Publicação dessa correção requer o merge da PR adicional.

Homologação local da correção: consulta de carteiras pausada de forma controlada no navegador; skeleton e seletor Carregando carteiras exibidos sem orientação de vazio. Consulta liberada, interceptação removida e carteira carregada normalmente. Build TypeScript/Vite/PWA e lint aprovados.

Resultado: funcionalidades principais da PR179 verificadas em produção; encerramento integral condicionado ao ajuste transitório acima. Regressões locais e decisões de motion em `interface-motion-ferramentas.md`.
