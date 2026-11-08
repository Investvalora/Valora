# Recuperação de sessão — continuação técnica em 08/11/2026

## Achado e correção local

SessionRecovery aguardava getUser indefinidamente. Enquanto a chamada não terminasse, o bloqueio de requisição em andamento impedia novas verificações automáticas. A verificação agora tem limite de 15 segundos: falha/timeout mostra indisponibilidade e nova tentativa, sem fazer logout nem aceitar uma sessão revogada. A resposta tardia não substitui o resultado atual.

Nenhuma mudança em escopo de logout, SDK, credenciais, políticas ou configuração do Supabase. onAuthStateChange continua responsável pelos eventos de autenticação. Referência consultada: https://supabase.com/docs/reference/javascript/auth-onauthstatechange .

## Validação

9 testes em três arquivos aprovados, integrando AuthProvider, SessionRecovery, store e QueryClient com respostas Auth simuladas:

- sessão revogada exibe orientação e mantém formulário;
- novo SIGNED_IN da mesma conta verifica o token novo e remove o aviso, preservando cache e rascunho;
- troca de identidade limpa cache e rascunhos anteriores;
- getSession tardio não restaura sessão encerrada;
- erro de rede não é tratado como revogação;
- timeout permite nova tentativa sem logout; resposta tardia revogada não reabre o aviso após recuperação.

TypeScript, lint dos arquivos alterados e build/PWA aprovados. Nenhuma sessão real foi revogada e nenhum dado financeiro foi alterado. Os eventos do SDK são simulados nos testes: isto valida a integração do app, não comprova transporte real entre navegadores/dispositivos. Reteste real entre abas permanece separado, usando conta descartável quando disponível; não revogar a conta da Investidor10.

## Outras pendências

Homologação visual local concluída com o componente real em harness isolado: resposta suspensa disparou indisponibilidade após 15 segundos; Tentar novamente removeu o aviso e preservou o campo. Sessão revogada simulada abriu orientação; Já entrei/verificar recuperou a tela mantendo o texto. Nenhuma chamada Auth real recebeu credencial sintética. Evidência local não versionada: `output/qa-technical/timeout-sessao.png`. Isso não substitui reautenticação real entre dispositivos.

PR119: merge e deploy aprovados. Fluxos atuais de renda fixa e Tesouro conferidos em produção sem salvar aplicações. Formulários legados reais conferidos em harness local com stubs de escrita; não têm entrada na navegação publicada. Evidências em output/qa-legacy e output/homologacao-pr119.

Revisão dos limites personalizados, desempenho físico, CDI e cobertura de calendários não foram alterados nem declarados concluídos nesta rodada.
