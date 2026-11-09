# Rascunhos de estratégias — 09/11/2026

Branch codex/rascunhos-estrategias, base PR123 mergeada. Continuação de RP-06. Sem migrations, fórmulas novas ou gravações em carteiras.

- Criação e edição preservam nome, método, taxas, desconto, regras customizadas, combinação E/OU, classes e exibição em Ativos.
- Reutiliza armazenamento de sessão de oito horas, separado por conta. Edição usa snapshot original completo; criação distingue parâmetros iniciais vindos da calculadora.
- Restauração explícita, sem salvar estratégia. Valores numéricos incompletos são preservados como indisponíveis, sem convertê-los em zero nem tornar regras inválidas aptas ao envio.
- Cancelar, X/retorno da página e sucesso limpam o rascunho; falha no envio o preserva. Gerenciador é remontado ao trocar de conta para descartar estado de edição da identidade anterior.
- Ações da edição não tinham barra móvel própria e estavam ocultas por classes de desktop. Agora aparecem no mobile quando não há barra fixa; a criação móvel mantém sua própria barra. Sem alteração das cores/estrutura do restante da tela.
- Defaults extraídos para módulo próprio, com os mesmos valores, mantendo Fast Refresh sem aviso de export misto.

## Validação

22 testes em cinco arquivos aprovados: rascunhos, gerenciador, calculadoras, regras customizadas e simulações. Cobrem restauração incompleta, falha/sucesso no envio, limpeza ao cancelar/X, snapshot alterado, outra conta e parâmetros iniciais diferentes. Serviços de gravação simulados. TypeScript, lint e build/PWA aprovados.

Navegador autenticado local: criação Bazin com nome fictício e DY8% restaurada após recarga em390×844px; cancelada sem salvar. Edição da estratégia existente alterou somente o nome no formulário, recarregou, restaurou e cancelou; reabertura trouxe nome original Preço teto de fiis e nenhum rascunho residual. Botões Cancelar/Salvar estratégia acessíveis no mobile. Nenhuma estratégia criada/atualizada e nenhuma carteira alterada. Viewport original restaurado. Evidências locais não versionadas em output/qa-strategy-draft/mobile-restaurado.png e mobile-edicao-acoes.png.

Publicação e homologação em produção pendentes. Teste móvel é viewport simulado, não validação de teclado/aparelho físico. Regras antigas de score e demais pendências técnicas não foram convertidas nem declaradas concluídas nesta rodada.

Reteste local solicitado: criação FII restaurou inflação4,5% e taxa real7,75%; imposto vazio permaneceu vazio e com validade HTML falsa, sem virar zero. Retorno pelo cabeçalho limpou o rascunho. Edição restaurou inflação4,75% após recarga; fechar pelo X limpou e reabrir mostrou taxa original5%, sem rascunho residual. Rodapé móvel acessível, nenhuma estratégia salva. Rede não foi modificada e viewport original restaurado. Evidência em output/qa-strategy-draft/mobile-fii-incompleta.png. Nenhum código mudou após os checks aprovados.
