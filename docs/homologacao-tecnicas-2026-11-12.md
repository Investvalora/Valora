# Homologação local conjunta — técnicas 12/11/2026

Escopo: prévia do score (RP-04), cache de ícones/quota (RP-06), divisão das rotas públicas e shell (RP-07), revogação confirmada na recuperação de sessão (RP-09). Inclui registro documental da desativação Selic já autorizada e executada anteriormente; esta entrega não executa alteração no banco.

## Verificações aprovadas

- Regressão completa: 1.334 testes em 198 arquivos, exit 0. Erros deliberados dos testes de fallback não representam falha da suíte.
- TypeScript pelo build, lint dos arquivos TS/TSX alterados e `git diff --check` aprovados.
- Build/PWA: 130 arquivos, cache `valora-static-0502e03028d2`. Apenas avisos de anotações do Zod.
- Varredura de segredos: zero achados nos arquivos rastreados.
- Navegador integrado autenticado local: recarga do início, dados/gráfico carregados, abertura sob demanda de Adicionar Lançamento e cancelamento. Score e edição real carregados; prévia Dívida/PL < 1,5%, valores percentuais e ausência “Sem dados · 0” conferidos. Edição cancelada. Conferência anterior nesta branch validou pontos negativos e formulário de redefinição sem envio.
- Worker: testes controlados de MIME inválido, versão atual offline, quota, instalação/ativação e notificações.
- Sessão: testes controlados com AuthProvider/SessionRecovery, sem revogar sessões reais; revogação→retry→indisponibilidade→mesma conta válida, usuário ausente/incompatível, timeout, resposta tardia e troca de identidade.

Nenhum lançamento ou regra foi salvo. Investidor10 preservada. Sem migration, mudança da fórmula financeira, conversão de limites antigos ou alteração do escopo de logout.

## Limites

Publicação e homologação em produção após merge pendentes. Atualização de PWA antigo em aparelho físico, medição em Android/rede reais e revogação entre dispositivos reais continuam abertas. RP-04 depende da confirmação da intenção dos limites legados de Dívida/PL. A divisão do bundle reduz bytes iniciais, mas aumenta o total de JS gzip, conforme relatório específico.
