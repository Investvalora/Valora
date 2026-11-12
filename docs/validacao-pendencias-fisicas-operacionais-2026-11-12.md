# Validação das pendências restantes — 12/11/2026

Auditoria somente leitura às 13h58–14h Brasília. Nenhuma sessão foi revogada ou regra convertida nesta etapa.

## Operação

- Fallback independente Supabase ativo em `11 * * * *`. Execução automática 13h11 identificada no cron e no registro durável `international-providers`: início/fim e sucesso, sem execução incompleta. Alpha/Marketstack avançaram desde a auditoria anterior. Uma execução comprova disparo automático; não comprova cadência sustentada.
- Fila principal: 47 tarefas, 37 vencidas, 12 com erro; entre os ativos com posição, AMZN está com `nasdaq_source_unavailable`. SEC: 43 vencidas, sem erro. Alpha e Marketstack: 43 vencidas cada. Ausência de erro geral não significa fila escoada.
- GitHub: último `schedule` observado em 12/11 às 08h29; execuções 12h21/12h52 foram dispatch manual. Não usar dispatch como evidência de frequência automática.
- Marketstack/META: conflito explícito. Fonte trouxe 0,53; base Yahoo tem 0,525. [RI oficial da Meta, declaração 10/09/2026](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Announces-Quarterly-Cash-Dividend-bf2dec2b8/default.aspx) confirma 0,525, corte21/09 e pagamento28/09. Regra de conflito preservou valor correto; não tolerar arredondamento silencioso para forçar concordância. Eventos públicos não foram editados nesta auditoria.
- Macro/Tesouro: cron ativo às17h/20h Brasília em dias úteis. Último registro durável às12h59 é parcial,13 atualizações e falha do cadastro Selic depois desativado. Não foi executado novo recálculo nesta auditoria. A próxima execução automática precisa confirmar resultado após a desativação.

## Dependências para validação física

- RP04: responsável confirmou explicitamente correção da regra original de Valor & Qualidade <1,5 para <150%, mantendo+2. Salva pela interface de produção; consulta posterior confirmou regra `ad80f63a-e14f-4b62-9d12-db2f357453fc`, `debt_equity`, `lt`, mínimo150, máximo nulo, pontos2. Não houve conversão em massa. A seleção ativa apareceu como Dividendos Premium durante a operação e foi preservada.
- RP06/07: responsável optou pelo Android Studio. Emulador inicialmente offline passou a responder ao ADB; captura da janela falhou duas vezes. Responsável preparando o PWA. Validação em emulador não substitui medição em aparelho/rede reais.
- RP09: conta de teste identificada, com quatro sessões existentes na consulta14h06. Nenhuma revogação executada antes de confirmar os dois clientes. Preparação em Android e navegador/perfil separado, pois abas da mesma origem compartilham identidade e não preservariam a conta principal.

## Complemento — navegador integrado responsivo

A pedido do responsável, substituída a tentativa bloqueada do emulador por conferência web em390×844 e320×740. Score carregou e folha de novo lançamento manteve campos e ações acessíveis. Rascunho quantidade2/preço10 sobreviveu à recarga, foi restaurado com total20 e cancelado. Reabertura confirmou limpeza e campos vazios; nenhuma gravação no banco. Em320px, Importar CSV e Lançamento cabem no cabeçalho de Renda variável.

Encontrado caso separado de redimensionamento: ao reduzir a altura da janela já aberta, a navegação inferior recebeu classe `hidden`. DOM confirmou altura visual844 igual à altura interna844, portanto sem teclado virtual nessa observação. Recarregar em tamanho móvel recuperou a barra. Hipótese sustentada pelo código: MobileNav compara com altura-base anterior e pode confundir redução da janela com teclado. Correção/reteste desse caso pendentes. Não declarar homologação integral sem ressalva.

Essa conferência não comprova instalação/atualização de PWA antigo, teclado Android, desempenho de aparelho real nem revogação entre dispositivos. Nenhuma sessão foi revogada.
