# Pendências técnicas — integridade e homologação

Branch `codex/pendencias-tecnicas-integridade`, iniciada após o merge da PR113. Alterações locais; nenhuma migration aplicada no projeto hospedado, nenhum lançamento real criado e nenhuma sessão real revogada.

## RP-04 — contrato de indicadores

Contrato versionado de unidade/fonte em `src/shared/indicators/contract.json`, consumido pelo catálogo. Leitura compartilhada no score, fundamentos e enriquecimento da tabela; rótulos da tabela também vêm do catálogo. Seeds/synthetic e números não finitos não participam dessa leitura. Dívida/PL é aceita apenas com fonte Yahoo validada, em percentual bruto: 76 continua 76, limite 1,5 continua 1,5; nenhuma regra ou limite antigo foi convertido.

O monitor SQL passa a usar o contrato gerado por `scripts/build-indicator-contract.mjs`. CI verifica que a migration corresponde ao contrato. Valores de Dívida/PL sem convenção conhecida tornam-se indisponíveis, em vez de serem comparados silenciosamente como múltiplos. Dados legados e limiares do usuário não foram regravados. A auditoria individual dos limites personalizados continua dependente da intenção do titular.

## RP-05 — recibo de importação e concorrência

Nova tabela `transaction_import_batches`: conta, carteira, nome de arquivo, hash do conteúdo selecionado normalizado, quantidade e data. Transações ficam ligadas ao recibo com FK composta de proprietário/destino. RLS separa contas; anônimo não executa a RPC.

A RPC `import_owned_transactions` é INVOKER. Verifica carteira da sessão e grava lote/transações na mesma operação. Normaliza campos e precisão numérica no servidor, preservando ordem explícita. Restrição única por conta/carteira/conteúdo serializa solicitações iguais entre dispositivos. Segunda tentativa recebe o recibo existente, inclusive quando a primeira resposta se perdeu. Falha em uma linha desfaz também o recibo. Não existe fallback para INSERT direto quando a migration não estiver publicada.

O nome do arquivo não determina duplicação. Linhas iguais dentro do mesmo arquivo são mantidas. Um novo lote exatamente igual não é inserido automaticamente: a interface explica que uma operação nova idêntica pode ser registrada manualmente. A prévia continua avisando sobre coincidências com lançamentos anteriores; não afirma detectar equivalência de arquivos reorganizados ou lotes parcialmente sobrepostos.

## RP-06 — rascunhos

Prévia CSV e formulário rápido de lançamento guardam campos em `sessionStorage`, separados por conta/carteira/tipo de formulário, com expiração de oito horas. Restauração é explícita. CSV restaurado passa novamente pela validação do catálogo e conferência de duplicatas; o lançamento não é enviado nem recebe um preço automático por restaurar campos. Cancelar/salvar remove o rascunho do lançamento; sucesso/recibo existente remove o da importação. Saída/troca de identidade limpa os rascunhos. Alterar carteira remonta o formulário rápido, evitando reaproveitamento de campos de outro destino.

Não são guardados tokens, senhas, arquivo binário ou dados em servidor. Falha/quota do storage gera orientação; limite de 500 mil caracteres. Isso não é backup: fechar a sessão da aba pode remover o conteúdo. Outros formulários (edição no detalhe e regras/alertas) ainda não receberam persistência nesta rodada; o aviso da boundary continua correto para esses fluxos.

## RP-09 — recuperação de sessão

No navegador integrado, harness local montou o componente real com respostas Auth simuladas: `session_not_found` abriu orientação, a verificação seguinte removeu o diálogo e preservou texto digitado. Indisponibilidade exibiu nova tentativa, sem tratar a conta como revogada; recuperação também preservou o campo. Nenhuma credencial sintética foi enviada ao Auth, e nenhuma sessão real foi revogada. A interface autenticada local de importação e lançamento também foi conferida com a sessão existente.

## RP-07 — medição inicial do build

Entrada: 737,40 kB sem compressão / 218,93 kB gzip. O número inclui as funcionalidades atuais, não é o total de download/instalação.

Uma navegação fria por origem no build local, desktop, usando servidor de ensaio gzip/no-store:

| Condição | Primeiro conteúdo (FCP) | Evento load |
| --- | --- | --- |
| Baseline local | 304 ms | 268 ms |
| 750 kbit/s agregados e latência artificial de 150 ms | 3.228 ms | 3.032 ms |

Instrumentação local apresentou métricas no DOM, sem coletar conteúdo de formulários ou dados pessoais. A carga/renderização React pode ocorrer depois de load. É uma amostra, sem limitação de CPU, não medida de interatividade, dispositivo Android ou SLA. Não mede todas as rotas autenticadas nem instalação completa do cache do PWA. O titular confirmou que testará no Android após publicação.

## Verificações

- 1.087 testes aprovados em 166 arquivos na regressão completa.
- Build/PWA e tipos aprovados; lint dos arquivos alterados aprovado.
- SQL local com rollback: duas linhas iguais preservadas; repetição com outro nome sem duplicar; erro em uma linha sem gravação parcial/recibo; isolamento de leitura e destino; execução anônima negada; unidade da dívida e dados sintéticos.
- Concorrência real entre duas conexões: uma transação, mesmo recibo para as duas, uma resposta marcada como repetida. Fixtures removidas no banco descartável.
- Navegador autenticado local: lançamento com quantidade 2/preço 10 sobreviveu à recarga e foi restaurado explicitamente; cancelado sem clicar em Salvar. Investidor10 permaneceu selecionada e sem escrita financeira.
- Evidências não versionadas em `output/qa-technical/`.

## Aplicação e fechamento

1. Aplicar as duas novas migrations, em ordem, antes de disponibilizar o frontend. Nenhum rebuild ou recálculo de carteira é necessário.
2. Publicar e homologar recibo/repetição com carteira temporária autorizada, sem importar dados fictícios na Investidor10.
3. Android físico: abrir lançamento, digitar, recarregar/reabrir, restaurar e cancelar; navegar com rede limitada e conferir retorno de segundo plano. Não enviar operações de teste à carteira real.
4. Completar rascunhos nos demais formulários e medir outras rotas/instalação antes de encerrar integralmente RP-06/RP-07.
