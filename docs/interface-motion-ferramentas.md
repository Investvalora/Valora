# Ferramentas em Análise e estados de interface

Data: 19/11/2026. Branch: `codex/interface-motion-tools`.

## Navegação

- Acesso canônico: **Análise → Ferramentas**, `/analise/ferramentas`.
- `/carteiras/planejamento` redireciona com replace; o atalho foi retirado de Carteiras.
- As seis abas de Análise têm rolagem interna no mobile, com revelação da aba selecionada após navegar ou redimensionar. A página não precisa rolar horizontalmente.
- As cinco funções continuam associadas à carteira selecionada. Nenhuma regra financeira ou estrutura do banco mudou.

## Princípios e implementação

Skill solicitada: [design-motion-principles](https://github.com/kylezantos/design-motion-principles/tree/main/skills/design-motion-principles). O endereço abreviado fornecido não existia; foi localizado o repositório correto do mesmo autor. Skill e referências de criação, acessibilidade, performance, Emil Kowalski e Jakub Krehel lidas. Contexto: dashboard financeiro, com Emil como referência principal e Jakub como secundária.

- `LoadingState`: skeletons por formato (linha, tabela, gráfico, formulário e página), texto acessível e `aria-busy`. Os placeholders reservam espaço sem inventar números financeiros.
- Estados textuais de espera padronizados nos módulos de autenticação, início, ativos, carteiras/lançamentos, renda fixa, desempenho, proventos, fundamentos, análise/score, estratégias, planejamento e onboarding. Skeletons estruturais existentes de tabelas e cards foram mantidos.
- Rotas e gráficos já divididos em chunks permanecem sob demanda. Suspense no shell mantém navegação disponível enquanto o código da próxima página chega; o fallback inclui skeleton e mantém a recuperação de conexão/carregamento lento anterior.
- `ActivityFeedback`: indicador indeterminado após 250 ms para consultas iniciais e mutações React Query. Nenhum percentual fictício. Consultas em segundo plano com conteúdo em cache não substituem a tela por skeleton. Operações locais de leitura/validação de CSV e backup têm feedback próprio.
- Controles de gravação/importação com estado pendente expõem `aria-busy`, além do bloqueio e dos textos existentes. Meta, exportação, validação de backup e atualização de saúde têm rótulos explícitos de andamento.
- Entrada de rota: até 180 ms, sem remontar o conteúdo por troca de URL nem repetir em cada atualização de cotação. Navegação principal/abas usam View Transitions quando suportado, com saída de 90 ms e entrada de 160 ms. Fallback continua navegável sem essa API.
- Modal padrão: entrada curta; botão de fechar/overlay dos modais sem animação de saída própria usam saída de 100 ms, limitada por um timeout. Escape é imediato. Fluxos de sheets que já controlam a saída conservam sua implementação.
- Carregamento concluído recebe fade discreto no contêiner; painéis das ferramentas têm entrada CSS progressiva. Apenas opacity/transform/scale são acrescentados à animação; não há biblioteca adicional de motion.
- Movimento reduzido tem tratamento global, incluindo animações antigas. Navegação e controles por teclado permanecem imediatos. Press feedback é restrito a ponteiro e botões habilitados.
- Meta de renda distingue consulta em andamento de falha/indisponibilidade.

## Homologação

- Regressão completa final: **222 arquivos e 1.540 testes aprovados**, 219,80 s, oito workers. Lint dos arquivos alterados e varredura de segredos aprovados. Build TypeScript/Vite/PWA aprovado.
- Ajuste final do fechamento animado: painel fica inert durante a saída e cancela callbacks ao desmontar. Os 18 testes de Modal passaram após esse ajuste, incluindo os dois novos cenários de segurança da interação.

- Rota antiga redirecionou para a nova, autenticada; acesso também verificado pelo menu Análise e pela aba Ferramentas.
- Em 390 px, largura de documento e scrollWidth iguais a 390; aba Ferramentas visível após redimensionamento. Sem erro/warning no console durante os fluxos conferidos.
- Rede limitada a 1.200 ms de latência: skeletons e estados ocupados observados de fato, com progresso global. Em `prefers-reduced-motion: reduce`, duração computada do skeleton equivalente a zero. Rede, media e viewport temporários restaurados ao concluir.
- Troca de ferramenta por seta do teclado chegou ao painel correto, com modo keyboard e duração de transição computada em 0 s.
- Testes de progresso cobrem atraso, conclusão, gravação, ausência de percentual e silêncio de refresh com cache. Testes de navegação cobrem fallback sem API, teclado, transição sem duplicação de conteúdo e movimento reduzido. Abas de Análise verificam Ferramentas e preservação do editor de Score.
- Evidências privadas em `output/homologacao-motion/`, fora do Git. Conta com ativos usada somente para consultas; nenhum lançamento ou meta real salvo.

Esta conferência usa navegador responsivo; não substitui um novo ensaio em aparelho físico. Progresso é indeterminado quando a operação não fornece total mensurável. Skeleton se aplica à espera por dados/código, não a elementos estáticos que já estão disponíveis.
