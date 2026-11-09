# Recuperação após reconexão — 08/11/2026

Branch codex/recuperacao-conexao, baseada no merge da PR122. Continuação RP-06, sem mudança de autenticação, gravações financeiras ou migrations.

AppErrorBoundary consultava navigator.onLine apenas ao renderizar o erro. Sem outra atualização React, reconectar não atualizava a orientação. Agora acompanha os eventos online/offline, removendo os listeners ao desmontar. Em falhas de chunk/recurso, recarregar fica desabilitado enquanto o navegador informa offline e é disponibilizado ao reconectar. Falha comum de renderização mantém a tentativa explícita existente. Não há recarga automática, repetição de operação nem limpeza de sessão/rascunhos.

O estado online indica conectividade percebida pelo navegador; não comprova disponibilidade do Supabase ou de qualquer servidor. Recarga ainda pode perder campos não persistidos; o aviso existente foi mantido. O componente não passa a capturar erros assíncronos arbitrários.

Validação: seis testes em dois arquivos aprovados (boundary e carregamento), incluindo transições offline/online/offline, ausência de nova renderização automática após reconectar, recuperação comum mediante clique e ocultação dos detalhes internos. TypeScript, lint e build/PWA aprovados nesta rodada.

Homologação local em harness com AppErrorBoundary real e exceção de chunk simulada: rede offline via CDP mostrou Sem conexão e Aguardando conexão desabilitado; rede restabelecida atualizou o aviso e habilitou Recarregar aplicativo; somente após clique voltou à tela inicial do harness. Nenhuma conta ou dado financeiro usado. Rede restaurada ao normal. Evidências não versionadas em output/qa-reconexao/offline.png e reconectado.png. Não equivale a falha real de deploy ou teste em aparelho físico. Publicação pendente.

Reteste solicitado: em 390×844 px, repetidas transições offline→online→offline→online. Botão desabilitado nas duas quedas, habilitado nas reconexões e nenhuma recuperação automática. Clique explícito recarregou a tela isolada com sucesso. Texto e botão legíveis, sem cortes. Evidências em output/qa-reconexao/mobile-offline.png e mobile-online.png. Rede normal e viewport original restaurados. Nenhuma mudança de código após os checks aprovados.
