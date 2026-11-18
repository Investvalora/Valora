# Homologação PR173 — 18/11/2026

Merge `54df3d35ac4d91c4364fa9e40a339301b99b5ad0`. Checks da PR, execuções
da main e status Vercel do merge aprovados.

Galaxy A31 físico, PWA standalone de produção, viewport CSS411×869.
Cache anterior `valora-static-e0b99cde78a0`, publicado `valora-static-81fb7cba756c`.
Depois da recarga e verificação explícita por `registration.update()`, o novo
worker ficou ativado e o cache anterior foi removido, sem limpar dados ou reinstalar.
Não classificar a verificação explícita como prova de atualização automática imediata.

- Repetido o toque x250/y420 que reproduzia o corte: tooltip de05/07/2025
  inteiro entre x243 e403, em tela411, margem direita8px. Captura inspecionada.
- Após rolar o gráfico até o final, toque x380/y420 abriu31/10/2026:
  tooltip entre x209,71 e369,71, inteiro na tela.
- Datas e quatro séries de rentabilidade legíveis. Nenhum lançamento,
  regra ou recebimento salvo.

Correção específica do tooltip aprovada em produção no aparelho físico.
Evidências locais: `output/phone-pr173-tooltip.json`,
`output/phone-pr173-tooltip.png`, `output/phone-pr173-end.json`, no workspace principal.
Não encerra comparação controlada de desempenho nem a auditoria completa de indicadores.
