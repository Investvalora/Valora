# RP-06 — cache de ícones e quota de armazenamento

Revisão local identificou que o fluxo de ícones ainda aceitava HTML com HTTP 200 e usava busca global de cache no fallback offline. Diferentemente dos chunks, podia reaproveitar dados de uma versão antiga. Além disso, falha de `cache.put` fazia uma resposta de rede válida falhar para chunks e ícones.

Ícones agora exigem MIME de imagem, usam rede sem reutilizar o cache HTTP e recuperam somente a versão atual. Resposta inválida não é gravada; entrada inválida encontrada no fallback é removida. Gravação de cache após download é opcional: quota esgotada não impede entregar a resposta válida. A validação obrigatória do pré-cache durante instalação permanece intacta.

Regressão do worker: 16 testes em dois arquivos aprovados, incluindo HTML no lugar de ícone, fallback offline, quota esgotada, instalação/ativação e clique de notificação. Testes controlados não equivalem a atualização real de um PWA antigo em aparelho físico. Nenhum dado de conta, carteira ou sessão foi alterado. Publicação e reteste físico continuam pendentes.

Build de produção e geração do PWA aprovados: 106 arquivos no pré-cache, versão `valora-static-7299f6f53a09`. Apenas avisos de anotações do Zod, sem falha de build.
