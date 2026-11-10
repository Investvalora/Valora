# Rascunhos das regras de score — 08/11/2026

Branch codex/rascunhos-regras-score. Continuação local de RP-06; sem migrations ou mudanças no cálculo.

- Criação e edição preservam nome/modo do score, indicador, operador, limites e pontos, inclusive formulário incompleto.
- Armazenamento de sessão existente, com expiração de oito horas; não é backup nem envio offline.
- Separação por conta e, na edição, snapshot original completo. Mudança de conta/regra/snapshot remonta o contexto e não restaura campos de outro contexto.
- Restauração explícita; criar/editar continuam exigindo envio e validação existentes. Restaurar não salva regra.
- Cancelar, fechar edição e voltar pelo botão do formulário limpam o rascunho; sucesso também limpa. Falha ao salvar preserva o rascunho.
- Somente campos efetivamente editados podem substituir o rascunho disponível. A montagem de inputs numéricos vazios não deve apagá-lo.

Regressão: restauração de criação incompleta, edição com intervalo, limpeza no sucesso/cancelamento/descarte, falha no envio, mudança do snapshot e isolamento entre contas. Serviços de gravação simulados nos testes; formulário testado também em StrictMode. 39 testes finais de score/rascunhos aprovados e quatro testes existentes de boundary/carregamento aprovados na rodada anterior. Homologação autenticada local sem salvar regras reais: criação restaurada após recarga e limpa ao cancelar; edição reabriu com o valor original 1,5, restaurou 150 somente após escolha e foi cancelada. Evidências não versionadas em output/qa-score-draft/restaurado.png e edicao-restaurada.png.

PR120 já publicada/homologada quanto aos avisos e navegação válida. RP-09 ainda exige revogação/reautenticação entre dispositivos reais; RP-07 exige medição física. Limites antigos de Dívida/PL continuam sem conversão até confirmação da intenção. Esta entrega não encerra essas pendências nem declara cobertura de todos os formulários do produto.

TypeScript, lint e build/PWA aprovados. Entrada JS 737,69 kB / 219,06 kB gzip na primeira validação; não equivale a medição em aparelho físico. Nenhuma mudança de autenticação ou banco nesta continuação. Publicação pendente.

## Reteste local solicitado

Criação em 390 × 844 px: nome, referência 8,5 e pontos 3 restaurados somente após escolha; Cancelar retornou à lista. Documento com largura 390 px, sem transbordamento horizontal. Encontrada sobreposição preexistente da navegação inferior sobre os botões do formulário de criação. Correção restrita à barra móvel de ações: posicionada acima dos 56 px da navegação e safe-area, com espaço final adicional no conteúdo. Botões Criar regra/Cancelar inteiros e Cancelar acionável após correção. Evidências em output/qa-score-draft/mobile-oferta.png e mobile-restaurado-corrigido.png. Isso é viewport simulado, não teste de teclado/aparelho físico.

Edição em 390 px também restaurou 150 após reabrir inicialmente com o valor original 1,5. Encontrados botões Salvar alterações/Cancelar ocultos por classe exclusiva de desktop. Agora são exibidos em todas as larguras na edição; a criação mantém sua barra móvel própria. Cancelar acionado sem salvar; nenhuma alteração no banco.
