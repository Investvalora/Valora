# Polish Report — PRD Valora MVP

## Pass 1: Estrutura

**Mudanças aplicadas:**

1. **FR-18 simplificado** — Removida descrição de métodos Graham, Múltiplos e Custom que estavam marcados como v2. FR-18 agora documenta apenas Bazin, consistente com escopo MVP (§6.1, §11.2).

2. **§4.7 descrição corrigida** — Removida menção a múltiplos métodos de Preço-Teto; agora documenta apenas Bazin.

3. **§9 Questão 4 removida** — Questão sobre consolidação de protótipos de Estratégias era redundante após decisão de usar apenas Bazin no MVP.

4. **§6.2 formatação padronizada** — Lista de fora de escopo com formatação consistente, sem marcadores em negrito redundantes.

5. **§11 enxugado** — Seção "Decisões Arquiteturais" condensada para evitar repetição de informações já presentes em FRs e escopo. Agora funciona como índice rápido de decisões tomadas.

**Nenhuma mudança estrutural necessária em:**
- Glossário (§3) — completo e bem utilizado
- User Journeys (§2.3) — bem integradas nos FRs
- Organização de features (§4) — proporção adequada
- Assumptions e Q&A (§9, §10) — indexação clara

## Pass 2: Prosa

**Mudanças aplicadas:**

1. **User Journeys simplificadas:**
   - UJ-1: "já autenticado (fez cadastro e login anteriormente)" → "já autenticado" (redundante)
   - UJ-2: "Ana ordena por score decrescente. **Climax:** ela vê que 3 ativos..." → "Ana ordena por score decrescente e vê que 3 ativos..." (fluxo mais natural)
   - UJ-3: "Carlos, em **Estratégias** (ou tela de Preço-Teto)" → "Carlos acessa **Estratégias**" (clareza)
   - UJ-4: "são inseridas; posições recalculadas" → "são inseridas e posições recalculadas" (pontuação mais fluida)

2. **§4.6 descrição corrigida** — Removida contradição sobre tema do protótipo (claim de "light theme" removido, consistente com §11.6).

3. **§4.7 nota simplificada** — Removida nota redundante para PM sobre consolidação de protótipos; referência cruzada a §6.2 e §11.2 é suficiente.

**Nenhuma correção de prosa necessária em:**
- Glossário — termos claros e bem definidos
- FRs e consequências testáveis — linguagem precisa e objetiva
- NFRs e métricas — especificações quantitativas corretas

## Resultado Final

PRD está estruturalmente consistente e pronto para desenvolvimento:
- ✅ Escopo MVP claramente delimitado (apenas Bazin, sem Graham/Múltiplos)
- ✅ Contradições entre FR-18 e §6/§11 resolvidas
- ✅ User Journeys mais fluidas e concisas
- ✅ Questões abertas relevantes (3 questões, Q4 removida como resolvida)
- ✅ Assumptions indexadas e rastreáveis
- ✅ Decisões arquiteturais documentadas sem redundância

**Próximos passos sugeridos:** Validar com PM se protótipos `valora_estrategias.html` e `valora_preco_teto.html` devem ser consolidados antes de UX/Dev (mencionado em descrição §4.7).
