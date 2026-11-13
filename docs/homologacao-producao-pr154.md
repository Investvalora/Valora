# Homologação PR154 — 13/11/2026

Merge confirmado: `230e18d6d8a8bfcae1e1aa596d4043701cd1a93c`. Checks da PR aprovados: app, isolamento, replay, identidade do coletor e Vercel.

CI de `main` no mesmo commit: execução `43480674416`, concluída com sucesso.

Conferência autenticada em produção pelo navegador integrado, rota `/ativos/lancamentos`, em layout móvel. A nota de PTAX histórica está publicada e o gráfico carregou sem aviso de dados incompletos. Acesso ao Brave falhou na ferramenta; o integrado funcionou com sessão existente.

## Conciliação independente de novembro

Os seis lançamentos USD visíveis de 13/11 somam USD 104,2954185 (TFLO duas compras, IVV, NU, GOOGL e NVDA). As seis compras BRL somam R$ 537,66.

Consulta direta ao endpoint PTAX do Banco Central retornou venda 5,6518, publicação `2026-11-13 13:03:27.375047`. Cálculo independente: `104,2954185 × 5,6518 = 589,4568462783`; somado a BRL resulta `1127,1168462783`. Tooltip de novembro em produção: **R$ 1.127,12**, coincidente até os centavos.

Filtros verificados na interface:

- Todos os tipos: novembro R$ 1.127,12.
- Stocks US: novembro R$ 245,91 (NU, GOOGL e NVDA em USD convertidos).
- Ações BR: novembro R$ 211,38 (RADL3 + ITSA3, sem reconversão).

Tabela mantém moeda/preços/quantidades originais. Filtro geral restaurado ao terminar. Nenhuma compra, venda, posição, recebimento ou configuração financeira foi alterada; sem migration nesta entrega.

Homologado o defeito reportado para o período e os filtros acima. A PTAX é referência histórica, não representa necessariamente o câmbio efetivo da remessa. O dia corrente pode receber nova publicação oficial antes do fechamento. Falhas de serviço, ausência de câmbio e ativos inativos foram cobertos pelos testes locais; não foram induzidos em produção. Não representa novo reteste físico Android/PWA ou revisão das demais pendências do projeto.
