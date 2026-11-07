# Validação após merge da PR #108

Merge confirmado no commit `88f7a77aac143075527ced1f273fdb6c87bbe4a6`, em 07/11/2026 às 01:06 UTC (06/11 às 22:06 BRT). CI da main `42322173533` concluída com sucesso; status Vercel do commit também aprovado.

Conferência HTTP em `https://investvalora.vercel.app`:

- Login, início e rota de análise/score responderam 200 com HTML da SPA. Esse resultado confirma entrega das rotas, não autenticação ou renderização dos seus dados.
- Bundle publicado `index-CG3UZvGu.js` retornou 200 e contém o controle de espera do login, cancelamento de consultas e integração das regras configuráveis.
- Cabeçalhos reais confirmados: CSP em enforcement, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy e Permissions-Policy.
- `sw.js` respondeu 200 como JavaScript; manifesto respondeu 200 como `application/manifest+json`. Isso não equivale a teste de instalação, push ou atualização em dispositivo físico.

Evidência técnica local: `output/security-2026-11-06/postmerge-public.json`, fora do commit.

Nenhum problema confirmado no recorte técnico publicado. Validação visual autenticada, OAuth com CSP e PWA físico permanecem pendentes: a tentativa de usar o navegador integrado foi impedida porque a revisão automática atingiu o limite de uso da sessão. Nenhuma ação do navegador foi executada nessa tentativa e não foi usado outro mecanismo para contornar o bloqueio.

## Complemento: navegador reconectado e sessão autenticada

Após o responsável reativar o acesso e entrar na conta, conferidos em produção:

- Início carregou a carteira Investidor10, patrimônio e gráfico mensal com valores.
- Análise → Score exibiu média ponderada 0,97/100 e cobertura 38,61% no instante observado. Ajuda de DY explicou fórmula, limitações e soma de três pontos ao atender o limite configurado.
- PETR4 exibiu fundamentos com fonte Yahoo e referência 06/11/2026. Aba Score mostrou P/VP não atendido (0), margem atendida (+1) e DY atendido (+3), totalizando o mesmo score 4 do resumo.
- Análise → Alertas abriu Nova regra; autocomplete retornou PETR4 com nome, classe e moeda. Seleção e alternância para Provento anunciado funcionaram. Formulário cancelado sem gravar regra nem gerar push.
- Nenhum erro ou aviso capturado no console durante esses fluxos, incluindo violações de CSP. Isso não substitui teste completo de todas as integrações.

Validação visual desse recorte concluída. Permanecem sem novo ensaio: login OAuth Google completo, CRUD persistente das novas regras e PWA em dispositivo físico. Os valores acima são capturas de mercado, não expectativas fixas. A presença de alerta antigo ignorado foi observada, mas não permite inferir falha da limpeza sem conferir o instante em que foi ignorado.

## Encerramento da homologação de 06/11 BRT

- Responsável confirmou saída/entrada com Google, ajuda dos indicadores e score médio ponderado no ensaio solicitado para o PWA. Não foi registrado o modelo/OS do dispositivo; não atribuir automaticamente esse resultado a todos os aparelhos.
- No navegador integrado de produção, regra temporária PETR4/DY ≥ 999.999 criada, pausada, editada para ≥ 999.998, ativada e conferida após reload. Como o formulário cria regras ativas, usou-se uma condição não atendida antes de pausar. A exclusão foi confirmada pelo responsável no diálogo do navegador e a ausência da regra foi reconferida. Não houve alteração de regra existente.
- O erro na verificação de preço foi reproduzido: a mesma sessão chegava a REST e à função, mas o Auth recusava `/user` com `session_not_found`. Após novo login pelo responsável, a verificação funcionou. Logout atual usa o escopo global padrão e pode revogar outras sessões; não foi relaxada a autorização para aceitar sessão revogada. Melhorar a mensagem desse caso fica como evolução de recuperação de sessão.
- O botão de atualização normal gerou avisos de oportunidade/sobrevalorização compatíveis com as posições e preservou o alerta de preço existente. Esses avisos não são dados sintéticos e não foram apagados na limpeza do teste.
- Novo ensaio autorizado de indicador: regra PETR4/DY ≥ 0 criada às 01:40:30 UTC; o cron normal gerou um único alerta de indicador às 01:45 UTC. Regra pausada e depois excluída por ID/conta, com retorno confirmado. O responsável pediu reenvio do mesmo aviso para confirmar: `send-alert-push` retornou HTTP 200, cinco destinos aceitos, zero falhas. Não foi criado um segundo alerta para reenviar.
- Responsável confirmou: “chegou a notificao e ele leva para a tela de alertas”. O aviso temporário foi encerrado como Ignorado; segue a exclusão automática de três dias. O push usa texto genérico de privacidade; o detalhe PETR4/DY está dentro do app.

ENT-02/ENT-03 da entrega #108 concluídos dentro desse recorte. Homologações anteriores não substituíram este ensaio. Novas correções de payout/moedas/histórico aguardam seu próprio merge/deploy e reteste, conforme [registro da implementação](correcoes-payout-moedas-historico-2026-11-06.md).
