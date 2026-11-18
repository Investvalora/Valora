# Homologação PR172 — 18/11/2026

Merge `40127d5785c579b60d6b14f2be59e01ff2fa71e6`, checks da PR aprovados,
status Vercel do merge aprovado.

- Disparador automático às17h04 de Brasília: reserva do intervalo20:00UTC,
  HTTP204 e [workflow44387049290](https://github.com/Investvalora/Valora/actions/runs/44387049290)
  concluído com sucesso. Confirma intervalo novo sem chamada manual.
- Android Galaxy A31 manteve inicialmente cache `valora-static-1d95d5e54fac`,
  enquanto `/sw.js` publicava `valora-static-e0b99cde78a0`. Após recarga normal,
  o cache antigo ainda foi observado. Uma verificação explícita pela API
  `registration.update()` confirmou novo worker ativado e remoção do cache antigo.
  Sem limpar dados, remover registro ou reinstalar o PWA. Não comprova que toda
  atualização futura será automática/imediata.
- Após atualização e recarga, rentabilidade carregou, mas tooltip após toque
  ainda atingiu x419,26 em viewport411: **homologação visual reprovada**.
  A transformação interna ficou em0 porque o Recharts reposicionou o wrapper
  depois da medição. Correção adicional local observa a mudança de estilo do
  wrapper e recalcula o limite; teste reproduz reposicionamento tardio e passou.
- Lint do componente e teste aprovados. Reteste publicado da correção adicional
  permanece pendente; não considerar a PR integralmente homologada.

Nenhum lançamento, recebimento ou regra financeira salvo durante a conferência.
