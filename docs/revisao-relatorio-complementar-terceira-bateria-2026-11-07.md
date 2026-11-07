# Revisão complementar — PDF da terceira bateria recebido em 07/11/2026

Fonte: arquivo local Downloads/Valora - 3º Bateria de testes.pdf, seis páginas. Este é outro relatório, com dez casos (sete aprovados/três reprovados), três DF e duas observações; não substituir nem somar como duplicatas os vinte casos da outra equipe já registrados em TODO-terceira-bateria.md. Texto e páginas de evidências foram inspecionados. Nenhuma instrução do documento foi tratada como autorização para modificar contas.

## Triagem e reteste atual

| Item | Resultado atual | Encaminhamento |
| --- | --- | --- |
| DF01 — ROE ausente | Superado na versão publicada. Em produção, Visão geral de PETR4 mostrou ROE30,27%, P/L4,32, P/VP1,22 e DY7,97%. No próprio PRT do relatório: ROE5,82%, P/L5,79, P/VP0,63, DY14,4%; Dívida/PL sinalizada Indisponível. | Encerrar a alegação de ausência em todas as telas. Não presumir cobertura de toda fonte/ativo. |
| DF02 — sem score por ativo/detalhamento | Superado quanto à ausência da funcionalidade: aba Score de PETR4 mostrou score Dividendos Premium4, condição, valor observado e pontos de cada critério; soma bruta4/final4 e limite0–100 explícito. O código e testes confirmam cálculo por conjunto escolhido e média ponderada da carteira. | Não confundir score com Bazin/Graham. Conta nova sem regras pode permanecer sem nota; eventual exigência de modelo padrão automático é uma decisão adicional de produto/ERS, não validada nesta conta com regras. Não afirmar homologação da conta do avaliador. |
| DF03 — comparar ativos lado a lado | Lacuna funcional confirmada por inspeção das rotas/componentes e navegação do produto; não há comparador dedicado. | Manter aberto como funcionalidade faltante em relação ao RF010 citado. A conformidade textual integral depende da ERS original, não anexada neste PDF. |
| OBS01 — e-mail chegou atrasado/link expirou | Investigação operacional em aberto. Relatório registra primeira tentativa demorada e segunda bem-sucedida, sem cabeçalhos de entrega, horário de emissão e código da falha. | Correlacionar uma reprodução controlada com logs Auth/provedor de e-mail, horário de entrega/abertura e política de validade/uso único. Não aumentar expiração nem reenviar e-mails reais nesta revisão. Demora não prova sozinha que o vencimento foi causado por ela. |
| OBS02 — rota após logout mostra404 | Não reproduzido nesta revisão, sem URL exata da tentativa. ProtectedRoute retorna /login quando não autenticado; rota desconhecida cai no404 global. | Retestar com a URL exata e sessão isolada: rota cadastrada deve redirecionar; URL inexistente pode legitimamente mostrar404. Não classificar como exposição de dados: o próprio relatório confirma bloqueio. |

## Ressalvas nas evidências

- DF03 usa no print o tipo FIIs e ticker PRT04, enquanto PRT é cadastrado como Stocks US. A mensagem de ativo não encontrado nesse par não comprova defeito de autocomplete nem explica a ausência do comparador. O teste de comparação pode usar ativos válidos do catálogo sem adicioná-los à carteira.
- A tabela CT03 cita PETR4; o corpo/evidência usa PRT. Ambos foram consultados em produção e hoje exibem ROE.
- O caso CT08 foi marcado aprovado pelo avaliador e OBS02 ficou como ressalva de UX, sem vazamento; preservar essa distinção.
- O PDF confirma confirmação de senha, favoritos, períodos de gráfico, senha fraca e busca inexistente aprovados. Não reabrir sem nova reprodução.
- PRT carregou fundamentos, mas sem cotação/histórico nesta consulta. Isso é uma observação de cobertura separada, não evidência de que ROE continua ausente.

## TODO delimitada

- [ ] Comparador de dois ou mais ativos: busca sem necessidade de compra, indicadores lado a lado, moeda/data/fonte explícitas e ausência de dados preservada. Definir comparação de preço em base comum e limitar classes/indicadores aplicáveis; não somar preços de moedas diferentes.
- [ ] Diagnosticar latência/expiração de recuperação com uma reprodução e logs correlacionados, sem tratar atraso isolado como defeito de fórmula ou autenticação quebrada.
- [ ] Retestar pós-logout na URL exata do avaliador ou numa sessão de teste isolada, sem encerrar a sessão atual em uso.
- [ ] Confirmar com ERS se é exigido score padrão automático para conta nova, além da configuração personalizada existente.

## Verificação executada

Somente leitura em produção na sessão já autenticada: PETR4 > Visão geral/Score e PRT > Visão geral. Nenhuma compra, venda, regra, cadastro ou carteira alterada. Regressão local:35 testes aprovados em três arquivos (FundamentalsPanel, scoreCalculation, PortfolioScore). Estes testes não comprovam entrega de e-mail nem logout real; essas duas verificações continuam delimitadas acima. Revisão não implementou funcionalidades novas.

## Aprofundamento das pendências — 07/11, 20h BRT

### Comparador: lacuna confirmada, implementação reaproveitável

Não há rota nem tela dedicada de comparação nas rotas de Ativos/Análise. Não depende de cadastrar uma posição nem de comprar um segundo ativo. Pode reutilizar busca do catálogo, consulta de fundamentos por lista de tickers e o catálogo de aplicabilidade dos indicadores. Primeiro recorte recomendado:2–4 ativos, P/L, P/VP, ROE, DY, margem e dívida com unidade, data e fonte por ativo; campos ausentes explícitos. Preço em sua moeda original e sem ranking baseado em preços nominais de moedas diferentes. Score precisa usar o mesmo conjunto de regras para todos os comparados. Isso não exige outra API paga; cobertura continua limitada às fontes atuais. Nada foi implementado nesta investigação.

### Score em conta nova: comportamento esclarecido

useScoreRules consulta somente regras do usuário; o cadastro não cria critérios padrão. AnaliseScore mostra Nenhuma regra criada ainda quando a lista está vazia. PortfolioScore fica Indisponível e pede seleção quando não há regras. Portanto uma conta nova realmente pode não apresentar nota, mesmo que a conta do responsável mostre scores personalizados. Isso é distinto da alegação de inexistência de score em todo o sistema.

Os pontos de cada regra são inteiros e a soma por ativo é limitada a0–100, sem normalização pela soma máxima. Um conjunto cujo máximo é6 não ocupa a faixa toda: atingir todos gera6, não100. A média ponderada da carteira pode ter casas decimais, por ser agregação e não nota individual. Se a ERS exigir nota padrão utilizável imediatamente ou normalização, há uma lacuna de produto a resolver; não mudar os pesos/scores existentes sem especificação. Sugestão: modelo inicial explícito e opcional, com critérios transparentes e explicação da escala, preservando personalizações.

### Recuperação: o que foi e não foi comprovado

Frontend solicita resetPasswordForEmail diretamente e redireciona para /reset-password; não contém fila ou espera de20 minutos. Falha de rede e sessão ausente são tratadas em português e permitem o caminho para novo link, conforme testes. Não há configuração local de SMTP/validade que comprove a configuração hospedada.

Consultas somente de leitura aos logs: fontes Auth disponíveis; a janela padrão das últimas24h não trouxe pedidos /recover ou /verify nos filtros consultados. A janela06/11 00h–07/11 00h BRT trouxe apenas uma mensagem relacionada a e-mail, caminho/, sem status/código de erro; insuficiente para correlacionar o episódio do relatório. Não foram consultados endereços, tokens nem conteúdo de e-mails. Logs do provedor de entrega e a hora exata do pedido continuam necessários. Esses resultados não provam ausência de atraso.

Documentação oficial Supabase confirma links de uso único e possibilidade de consumo por scanners de e-mail ou deformação por rastreamento. São hipóteses, não causas demonstradas deste incidente: https://supabase.com/docs/guides/deployment/going-into-prod#email-link-validity . Verificar tempo até aceitação SMTP, entrega, primeira abertura/verificação e eventual nova solicitação. Não alongar validade como correção presumida.

### Pós-logout: guarda validada sem encerrar sessão real

Adicionado teste de regressão do ProtectedRoute: /inicio e /analise/score sem sessão vão para login, sem dados privados ou404; carregamento aguarda restauração; rota inexistente fica no fallback404. O cenário usa MemoryRouter e a guarda real com estado de autenticação isolado; não é logout no navegador nem teste integral de deploy. Rotas reais e fallback foram confrontados com routes.tsx; rewrite SPA da Vercel está presente. A URL /dashboard não está cadastrada: nela404 seria coerente, mas o relatório não fornece URL exata, então não atribuir essa causa ao avaliador.

Resultado: falha genérica da guarda não reproduzida; reteste específico do relato depende da URL usada. Não pedir logout global do responsável, pois authService.logout chama signOut sem scope e pode afetar outras sessões. Não foi alterado o comportamento de logout.

Rodada direcionada:35 testes aprovados em cinco arquivos (ProtectedRoute, RecoveryRetest, ReauthenticationRoute, PortfolioScore e scoreValidation); lint do novo teste aprovado. Nenhum código de produto, configuração de Auth ou dado financeiro alterado.

## Implementação das pendências confirmadas

- Comparador local em Análise > Comparar (/analise/comparar), carregado sob demanda. Seleção de2–4 ativos do catálogo, sem criar posições; remoção, bloqueio de repetidos/limite, busca com estados de erro/vazio, fundamentos lado a lado, fontes/datas/unidades e aplicabilidade por classe. Dados seed/synthetic não são apresentados como reais. Não há ranking ou conversão indevida entre moedas. Neste recorte compara fundamentos, sem cotação/série histórica ou score comparativo.
- Score: modelo inicial opcional, somente para tela sem regras. Cinco critérios de20 pontos, exibidos antes da criação e editáveis depois; total100. Inserção única de todas as regras e consulta prévia evitam sobrescrever grupos existentes. A escolha Usar este score permanece explícita. Ajuda explica que grupos personalizados não são normalizados: máximo6 continua6. Não foi criado modelo na conta real durante homologação.
- Recuperação desktop/móvel orienta conferir spam, usar link mais recente uma vez e solicitar outro se inválido. Página desconhecida oferece Entrar novamente. Isso melhora UX, mas não é correção comprovada de entrega SMTP ou de um404 reproduzido.
- Testes de guarda mostram rotas conhecidas sem sessão redirecionando; não foi necessário alterar o logout ou enfraquecer autenticação.

Homologação local autenticada no navegador integrado: seleção PETR4/VALE3, seis indicadores lado a lado, fontes Yahoo com referências distintas, sem escrita na carteira. Evidência não versionada output/revisao-pdf-s3/comparador-local.png.15 testes aprovados em cinco arquivos, incluindo criação explícita do modelo e preservação de regras existentes. TypeScript do app aprovado; build de produção/PWA em verificação. A nota padrão automática de toda conta não foi imposta. Diagnóstico operacional de e-mail continua aberto até correlação com entrega/abertura.

Fechamento local: build de produção/PWA concluído, incluindo TypeScript do projeto; lint dos arquivos alterados sem erros. Rodada final ampliada cobre16 testes únicos (seis dos dois componentes novos mais dez dos arquivos de guarda, recuperação e ajuda); limite de quatro e duplicatas também aprovados. Funcionalidades novas ainda dependem de merge/deploy e reteste publicado. O diagnóstico SMTP permanece pendente, não encerrado pela melhoria de texto.
