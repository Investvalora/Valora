# PRD Quality Review — Valora MVP

## Overall verdict

This PRD is **adequate-to-strong** for its stakes (MVP fintech launch). It demonstrates honest scoping with explicit Non-Goals (§5), genuine user journeys with climax/resolution beats (§2.3), and rigorous functional requirements with testable consequences. The Glossary is consistent and used throughout. However, it suffers from **open-items density** that's borderline-high for a launch-ready PRD (7 open questions in §9, some critical), **orphaned prototypes requiring consolidation** (light vs dark themes, 3+ strategy screen variants), and **strategic coherence gaps** around the v2 boundary—several features are half-committed (mock data "for now", placeholder buttons, assumptions deferring real decisions).

## Decision-readiness — adequate

The PRD makes clear decisions on core features (manual entry + CSV import, dark-only, seed data) and defers integration/notifications to v2. Trade-offs are mostly honest: §5 explicitly excludes brokerage integration, external notifications, and light mode from MVP. §6.2 reinforces the boundary.

**Strengths:**
- Explicit Non-Goals (§5) and Fora de Escopo (§6.2) with version tags (v2, v3, "não-objetivo").
- FR consequences are binary/testable rather than aspirational ("sistema valida formato", "erro detalhado com linha/coluna").
- §9 surfaces 7 open questions including critical ones (API choice, formula validation, prototype consolidation).

**Weaknesses:**
- **[high]** Multiple prototype consolidation questions unresolved (§9 Q4, Q5) — "Qual versão oficial?" for Estratégias/Preço-Teto screens, and Score theme migration. These are **design decisions blocking development**, not research spikes. *Fix:* PM must resolve before handoff; architecture cannot start without knowing which screens are canonical.
- **[medium]** Assumption about Bazin formula (§9 Q3) framed as open question despite being used in FR-17. If formula is uncertain, FR-17 consequences are untestable. *Fix:* Validate formula with domain expert or mark FR-17 as `[PROTOTYPE ONLY]` until confirmed.
- **[medium]** Currency conversion strategy (§9 Q2) punted with fixed R$5/USD assumption, but this affects FR-10 (exposição internacional) and FR-13 (rentabilidade) calculations. For fintech MVP, currency accuracy matters. *Fix:* Either commit to BCB API integration in MVP or document acceptable error margin for international holdings (e.g., "±10% variance acceptable for <20% portfolio exposure").

**Gaps:**
- No decision on alert job timing (§9 Q7) — "on-demand no MVP" is assumption, not decision. If job is user-triggered, UX needs explicit "Refresh Alerts" button (not documented in FR-19/FR-20). If automatic, deployment needs cron setup. *Fix:* Decide and update FR-20 with UX or infra consequence.

### Findings

- **[high]** Prototype consolidation blocking development (§9 Q4, Q5) — Three variants of Estratégias screens exist; Score prototype is light theme but MVP is dark-only. *Fix:* PM must designate canonical screens and theme before architecture phase.
- **[medium]** Bazin formula unvalidated despite FR-17 dependency (§9 Q3) — Formula consequence is testable only if formula is correct. *Fix:* Validate with domain expert or mark FR-17 as prototype-grade.
- **[medium]** Currency conversion punted with fixed rate (§9 Q2, §10 Assumption) — Affects FR-10, FR-13 accuracy for international holdings. *Fix:* Commit to BCB API or document acceptable variance.
- **[low]** Alert job timing undecided (§9 Q7) — On-demand assumption lacks UX spec for trigger button. *Fix:* Decide and update FR-19/FR-20 with UX or cron setup.

## Substance over theater — strong

Personas are replaced with **Jobs To Be Done** (§2.1) grounded in real investor pain points ("Consolidar posições heterogêneas", "Confiar nos números"). User Journeys (§2.3) include **climax and resolution beats** rather than happy-path theater: UJ-1 climax is Ricardo seeing inconsistency alerts (not just consolidated view), UJ-2 climax is Ana realizing 3 assets fail her score threshold, UJ-3 climax is Carlos finding 2 FIIs with +15% margin. Edge cases are explicit in each UJ.

Visão (§1) articulates differentiation vs competitors ("Diferente de agregadores passivos (Kinvo, Investidor10)...") and names B2B2C potential without pretending it's validated. NFRs (§8) are mostly operational (RLS config, p95 latency, WCAG AA for dark theme) rather than aspirational fluff.

**One red flag:** §8 Acessibilidade note defers WCAG validation to v2 ("fora do escopo MVP"), which is **acceptable for internal tool, risky for consumer fintech**. Given B2C target (§1), accessibility should be table stakes, not post-MVP. However, the PRD does commit to functional keyboard nav and WCAG AA contrast—so this is "theater avoidance" (honest about incomplete validation) rather than "theater" (pretending it's accessible).

### Findings

- **[medium]** WCAG validation deferred to v2 (§8 NFRs Acessibilidade, §10 Assumption) — Consumer fintech with deferred accessibility testing is risky. Commit states keyboard nav + AA contrast but no screen reader testing. *Fix:* Budget 2-3 days for basic screen reader audit (NVDA/JAWS) on critical flows (login, add position, view carteira) before launch, or explicitly accept risk and document in §5 Non-Goals.

## Strategic coherence — adequate

The PRD has a **coherent thesis**: rastreabilidade + customização (Score, Preço-Teto) differentiate Valora from passive aggregators. Features ladder up: Carteira consolidates → Alertas surface gaps → Score/Preço-Teto enable custom analysis → Rentabilidade validates returns. This arc is visible in Visão (§1) and reinforced by UJs (§2.3).

**Weakness:** The **mock data strategy creates strategic ambiguity**. PRD commits to seed data (§4.9) "temporarily" but doesn't articulate **what validates the thesis with fake data**. Success metrics (§7) measure engagement (Score creation, alert clicks) but not **trust in numbers** (§2.1 JTBD), which requires real data. If rastreabilidade is a differentiator, showing "source=seed" on every data point may undermine trust.

**Missing strategic milestone:** What converts MVP users to v2 (real API) users? Is MVP a **product validation** (do users want this?) or **UX validation** (does the interface work?)? If product validation, mock data is fine. If UX validation, users may bounce because data is fake.

### Findings

- **[high]** Mock data strategy lacks validation thesis (§4.9, §1 Visão) — Rastreabilidade is a differentiator, but MVP shows `source='seed'` on all data. Success metrics (§7) don't measure whether users trust fake data. *Fix:* Add SM-7: "≥50% of users who view data source tooltip (FR-24) return for 2nd session" — validates whether transparency compensates for mock data. Or reframe MVP goal in §1 as "UX validation with known-fake data; product validation requires v2 real APIs."
- **[medium]** V2 transition plan missing (§6.2, §9 Q1) — Multiple features deferred to v2 (real APIs, brokerage integration, notifications) but no articulation of **what must be true to justify v2 investment**. *Fix:* Add §7 SM-Primary: "≥100 weekly active users after 2 months → proceed to v2 API integration."

## Done-ness clarity — strong

FRs are exemplary. Each has **Consequências (testáveis)** section with pass/fail conditions. Examples:

- FR-1: "Sistema valida formato de email e força senha com mínimo 8 caracteres" (testable: try 7-char password, expect error).
- FR-5: "CSV com formato incorreto → erro detalhado (linha/coluna/problema)" (testable: upload malformed CSV, assert error message contains line number).
- FR-9: "Se dados históricos incompletos... gráfico exibe lacuna ou linha pontilhada" (testable: remove price_history row, assert dashed line).

**No "user-friendly" or "gracefully" weasel words.** When uncertainty exists, it's marked with `[ASSUMPTION]` (§10) or `[NOTE FOR PM]` (§4.7, §4.9, §6.2).

**One gap:** FR-26 "Sincronizar e Insights exibem mensagem 'Em breve'" is placeholder-as-consequence, which is fine for MVP but should trigger Non-Goal clarification. (It does—§5 lists "Social / comunidade" and implicit AI insights as não-objetivo, so this is consistent.)

### Findings

- **[low]** FR-26 placeholder buttons lack explicit Non-Goal linkage — "Sincronizar dados" and "Gerar insights" are placeholders. Insights tie to AI/suggestions (não-objetivo per §5 implicit), Sync ties to API refresh (v2 per §6.2). *Fix:* Add explicit callout in §5: "AI-driven portfolio insights — não-objetivo v1" to close the loop.

## Scope honesty — adequate

Omissions are mostly explicit. §5 Non-Objetivos is comprehensive (8 items with version tags). §6.2 Fora de Escopo reinforces with detail. Assumptions Index (§10) is present and indexed inline with `[ASSUMPTION]` markers (FR-9, FR-21, §9 Q2/Q6/Q7, §8 Acessibilidade).

**Gaps:**
- **Open-items density:** 7 open questions in §9, several critical (prototype consolidation, formula validation, API choice). For **MVP de lançamento** (stakes = real launch, not prototype), this is borderline-high. Acceptable if PM resolves before handoff; risky if handed to architecture with "figure it out" expectation.
- **`[NOTE FOR PM]` as escape hatch:** §4.7, §4.9, §6.2 use `[NOTE FOR PM: ...]` to defer decisions ("consolidar protótipos", "considerar adicionar um dos itens v2 como nice-to-have"). This is **good hygiene** (flags deferred decisions) but also **risk signal** (too many notes = PRD not done).

**Strength:** §9 Q6 and Q7 show **good assumption documentation**—instead of silently assuming "dividendo esperado" logic, PRD surfaces the ambiguity and proposes testable heuristic (">95 dias desde último dividendo").

### Findings

- **[critical]** Open-items density borderline-high for launch stakes (§9) — 7 open questions, 3 high-impact (prototype consolidation, formula validation, API choice). *Fix:* PM must resolve Q3, Q4, Q5 before architecture handoff. Q1, Q2, Q6, Q7 can be deferred if documented as assumptions in §10.
- **[medium]** Multiple `[NOTE FOR PM]` escape hatches (§4.7, §4.9, §6.2, §5) — Flags deferred decisions but also signals PRD incompleteness. *Fix:* Convert notes to explicit assumptions or decisions before handoff.

## Downstream usability — strong

**Glossário (§3):** Well-structured, 11 core terms, used consistently throughout. Examples:
- "Posição" defined once (§3), then used in FR-4, FR-6, FR-8, UJ-1.
- "Score Fundamentalista" defined once (§3), then used in FR-15, FR-16, UJ-2.
- "Alerta" defined once (§3), then used in FR-8, FR-19, FR-20, UJ-1.

**FR numbering:** Contiguous (FR-1 to FR-26), globally unique, referenced in cross-refs (UJ-1 → FR-4/FR-6, UJ-2 → FR-15/FR-16). No gaps or duplicates.

**Cross-refs resolve:** §4.1 references prototypes `valora_cadastro.html`, `valora_login.html` (exist per §0). §4.2 references `valora_carteira.html` (exists). §7 metrics reference FRs (SM-2 → FR-4/FR-6, SM-3 → FR-15). §10 Assumptions Index references inline markers (FR-9, FR-21, §9 Q2/Q6/Q7).

**Minor inconsistency:** §4.6 mentions prototype `valora_score.html` with "tema light — será migrado para dark" (open question Q5), but this is flagged, not silently inconsistent.

**Structure aids roundtrip:** §0 Propósito anchors downstream (UX, arquitetura, épicos). §1 Visão → §2 JTBD/UJs → §4 Features → §7 Metrics → §9 Open Items is logical flow. Assumptions indexed inline (`[ASSUMPTION]`) and collected in §10 enable architect to grep for deferred decisions.

### Findings

- **[low]** Prototypes referenced but theme-inconsistent (§4.6, §9 Q5) — `valora_score.html` is light theme; MVP is dark-only. Flagged in Q5 but creates downstream confusion. *Fix:* PM must resolve Q5 or architect must budget theme conversion effort.

## Shape fit — strong

**Consumer product → named UJs:** §2.3 provides 4 named UJs with persona-names (Ricardo, Ana, Carlos, Beatriz), climax/resolution structure, and edge cases. This matches **consumer/prosumer** shape (vs internal tool → capability spec). UJs are **specific** (Ricardo adds PETR4, 200 shares, R$28.50) not generic ("user adds position").

**Fintech → security/rastreabilidade emphasis:** §8 NFRs lead with RLS config (critical for multi-tenant fintech), JWT verification, service key isolation. Glossário defines RLS (§3). Rastreabilidade (§4.10, FR-24) is differentiated feature, consistent with fintech trust requirements.

**MVP stakes → pragmatic scope:** Dark-only (§5, §6.2), seed data (§4.9), no brokerage integration (§5, §6.2), CSV import as MVP data entry (§4.2, FR-5). These are **appropriate MVP cuts** for fintech launch (vs enterprise → multi-tenant admin, SSO, audit log; vs hobby → no cuts).

**One shape mismatch:** §2.2 Não-Usuários lists "Traders de day trade" (fine) but also "Investidores que exigem integração direta com corretoras no MVP". This implies **corretora integration is must-have for segment**, but §5 and §6.2 defer to v2. If this segment is core target, deferral is risky. If segment is secondary, it's fine—but §1 Visão lists "assessores independentes" and "fintechs B2B" as targets, and both likely need corretora integration. **Shape tension:** PRD targets prosumer segment that may require v2 feature as table-stakes.

### Findings

- **[medium]** Target user vs MVP scope tension (§1 Visão, §2.2 Não-Usuários, §5 Non-Objetivos) — Visão targets "assessores independentes" and "fintechs B2B", but MVP excludes corretora integration (§5, §6.2). Não-Usuários excludes "investidores que exigem integração com corretoras no MVP", but this may be majority of target segments. *Fix:* Clarify in §1 whether MVP target is "early-adopter PF willing to manual-entry" or broader. If former, narrow Visão to "investidores PF experimentais"; if latter, reconsider corretora integration as MVP feature.

## Mechanical notes

**Glossário drift:** None detected. Terms defined in §3 used consistently in §4 FRs and §2 UJs.

**FR numbering:** Contiguous FR-1 to FR-26, no gaps or duplicates.

**Cross-refs:** All resolve. UJs reference FRs (UJ-1 → FR-4/FR-6, UJ-2 → FR-15/FR-16, UJ-3 → FR-17, UJ-4 → FR-5). Metrics reference FRs (SM-2 → FR-4/FR-6, SM-3 → FR-15, SM-6 → FR-19/FR-8/FR-18). §10 Assumptions Index references inline markers (§4.3, §4.9, §8, §9).

**Assumptions Index roundtrip:** 7 inline `[ASSUMPTION]` markers; 7 entries in §10. Roundtrip complete.

**Prototype references:** §0 mentions 6 prototypes (cadastro, login, carteira, patrimônio, proventos, rentabilidade). §4.1 references cadastro/login, §4.2 references carteira, §4.3 references patrimônio, §4.4 references proventos, §4.5 references rentabilidade, §4.6 references score, §4.7 references 3× estratégias/preço-teto variants. **Caveat:** §9 Q4, Q5 flag theme and version inconsistencies—prototypes exist but need consolidation.

**`[NOTE FOR PM]` markers:** 4 instances (§4.7, §4.9, §6.2, §8). All indexed in open questions (§9) or assumptions (§10). Consistent use.

**One typo:** §4.1 "Realiza **UJ-1** (primeiro acesso), **UJ-2**, **UJ-3**, **UJ-4** (usuários subsequentes)" — overloaded. Feature 4.1 (Auth) only realizes UJ-1 (first login to Carteira). UJ-2/3/4 realized by other features. Not a mechanical error, but imprecise attribution. Should read "Realiza **UJ-1 precondition** (login); usuários autenticados prosseguem para UJ-1 (Carteira), UJ-2 (Score), etc."

---

## Summary

**Verdict:** Adequate

**Top findings:**
1. **[critical]** 7 open questions (§9) with 3 blocking development: prototype consolidation (Q4, Q5), formula validation (Q3). PM must resolve before architecture handoff.
2. **[high]** Mock data strategy lacks validation thesis (§4.9, §1) — Rastreabilidade differentiator undermined by `source='seed'` on all data. Add metric to validate trust or reframe MVP goal.
3. **[medium]** Target user vs MVP scope tension (§1, §5, §6.2) — Visão targets assessores/B2B but MVP excludes corretora integration. Clarify early-adopter PF target or reconsider scope.
4. **[medium]** Currency conversion punted with fixed rate (§9 Q2) — Affects international holdings accuracy (FR-10, FR-13). Commit to BCB API or document acceptable variance.
5. **[medium]** WCAG validation deferred to v2 (§8) — Risky for consumer fintech. Budget basic screen reader audit or accept risk explicitly.

**Strengths:**
- Exemplary FR consequence structure (testable, binary, no weasel words).
- Honest Non-Goals and scope boundaries (§5, §6.2).
- Consistent Glossário and contiguous FR numbering.
- Named UJs with climax/resolution (strong consumer shape fit).

**Fix priority:** Resolve §9 Q3, Q4, Q5 before handoff. Add SM-7 (mock data trust metric) or reframe §1 MVP goal. Clarify §1 target user scope.

**Path:** `C:\Users\Samuel Leite\wkspaces\Valora\_bmad-output\planning-artifacts\prds\prd-Valora-2026-08-15\review-rubric.md`
