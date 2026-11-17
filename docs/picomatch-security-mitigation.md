# Mitigação picomatch — 17/11/2026

O check app da PR168 falhou na auditoria, antes dos testes/build: GHSA-fc5q-39xc-vjpf/CVE-2026-112366, ReDoS em extglobs repetidos de ramo único. O aviso GitHub foi revisado em 17/11 e afeta todas as versões publicadas até 4.0.7, inclusive 2.3.2; não há versão oficial corrigida no momento.

Fontes: https://github.com/advisories/GHSA-fc5q-39xc-vjpf e o código do parser em https://github.com/micromatch/picomatch/blob/4.0.7/lib/parse.js. A referência #194 no advisory aponta para uma PR aberta sobre outro comportamento e não foi tratada como correção oficial.

Patches locais pnpm para 2.3.2 e 4.0.7 fazem o parser usar seu fallback literal sempre que o corpo de um extglob repetido contém `*` ou `?`. Isso impede compilar os padrões responsáveis por esta vulnerabilidade como quantificadores aninhados. É uma mitigação conservadora: esses padrões passam a ser literais, inclusive alguns que poderiam ser seguros. Globs comuns e repetições puramente literais permanecem funcionando; build, testes e lint devem passar.

O CI verifica obrigatoriamente os dois pacotes ativos no grafo, a presença do patch e os padrões de regressão em subprocessos com timeout. A auditoria ignora somente este GHSA enquanto o patch estiver instalado e validado; não ignora todos os itens sem correção nem reduz a severidade mínima. O audit bruto ainda reporta as versões originais, pois não interpreta patches locais.

Remover patches, verificação e exceção específica quando houver release oficial corrigida e após nova regressão. Nenhuma dependência de runtime financeiro nem função Supabase foi alterada por esta mitigação.
