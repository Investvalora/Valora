# RP-07 — separação de autenticação e shell

Formulários de login, cadastro, recuperação e redefinição de senha e o shell autenticado eram importados imediatamente pelas rotas. Agora são carregados por `React.lazy`, usando o fallback existente. A proteção de acesso permanece fora do import dinâmico: usuário sem sessão não monta o shell. Conteúdo, validação, aparência e persistência dos formulários não foram alterados.

Medição com Vite/manifest na mesma árvore antes/depois, relatada por `scripts/report-build-size.mjs` (agora inclui rotas de autenticação). Bytes gzip calculados localmente por arquivo; soma dos imports estáticos, sem duplicação. Não é medição de tempo, rede, CPU ou instalação do PWA.

| Conjunto JS | Antes bytes/gzip | Depois bytes/gzip |
|---|---:|---:|
| Entrada | 713.089 / 211.948 | 611.993 / 181.564 |
| Login e dependências | 713.089 / 211.948 | 668.040 / 202.470 |
| Cadastro e dependências | 713.089 / 211.948 | 669.512 / 202.743 |
| Recuperação e dependências | 713.089 / 211.948 | 663.991 / 201.528 |
| Redefinição e dependências | 713.089 / 211.948 | 658.168 / 198.961 |
| Início e dependências | 803.078 / 248.046 | 732.911 / 229.758 |
| Posições e dependências | 867.103 / 266.780 | 834.137 / 261.664 |
| Todo JS | 1.792.682 / 553.839 | 1.800.271 / 564.072 |

Entrada gzip diminuiu 14,3%; início 7,4%; login 4,5%. Total gzip aumentou 1,8% pela fragmentação; são mais requisições no primeiro acesso a cada rota. O worker ainda pré-armazena todos os arquivos: não há redução do tamanho total de instalação nem promessa de ganho de tempo em aparelho físico.

Validação: 45 testes em 13 arquivos de autenticação, páginas públicas e shell aprovados. TypeScript, lint das rotas e build/PWA aprovados (130 arquivos, `valora-static-742ae6b0e3a8`). Navegador local autenticado carregou score, formulário de redefinição e início sem editar ou enviar dados. Medição em Android/rede reais e publicação continuam pendentes; RP-07 permanece parcial.
