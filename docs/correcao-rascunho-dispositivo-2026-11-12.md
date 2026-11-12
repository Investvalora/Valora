# Recuperação após recriação da aba e navegação móvel

Correção local na branch codex/recuperacao-pwa-dispositivo. Somente o lançamento rápido passa a guardar rascunho no localStorage do dispositivo por até oito horas. A chave continua incluindo conta, carteira e formulário. Restauração é explícita; cancelar, descartar ou salvar remove a cópia persistente e a legada da aba. Logout/troca de identidade também limpam as cópias persistentes. Os outros formulários continuam limitados à sessão da aba. Nenhum envio automático ou persistência offline de transações foi adicionado.

Rascunhos legados podem ser lidos; a próxima edição migra a cópia para o armazenamento do dispositivo. Expiração, corrupção e quota mantêm o tratamento existente. O texto agora informa “neste dispositivo”, sem prometer sincronização entre dispositivos. Em abas simultâneas da mesma conta/carteira, o último rascunho gravado prevalece; não há mesclagem de campos.

MobileNav agora exige campo editável em foco para interpretar redução da altura como teclado. Redimensionamento sem edição não esconde a navegação. Mantido teste de tolerância ao fechamento parcial do teclado Safari.

Validação local:21 testes em quatro arquivos aprovados, incluindo remount com sessionStorage limpo, restauração explícita, cancelamento, expiração, quota e isolamento. Build/TypeScript/PWA aprovados:130 arquivos, cache `valora-static-6fae12bd7b16`.

Homologação física da versão publicada anterior continua no registro Android. Estas correções ainda precisam de publicação e reteste físico. Inspeção do worker foi bloqueada pela política de navegação da ferramenta; não foi contornada. Revogação somente da conta de teste foi autorizada, mas não executada: observação do navegador foi impedida por falha da revisão automática por limite de uso. Nenhuma sessão real revogada ou lançamento salvo nesta rodada.

Atualização posterior: responsável reconectou os dois ambientes e reiterou que estavam na conta de teste. USB voltou a cair e navegador separado não ficou exposto, então a observação visual foi delegada ao titular. Revogação real executada com autorização prévia: DELETE transacional em auth.sessions com guarda simultânea do UUID e email da conta de teste; cinco sessões encerradas, refresh tokens relacionados removidos pela FK CASCADE. Sem alteração de carteiras, usuários ou sessões de outras contas. Verificação de comportamento e novo login aguardando relato do responsável. Isso substitui o estado “não executada” acima, mas não comprova recuperação visual.
