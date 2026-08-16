# Reconciliação: README.md

## Gaps Encontrados

### 1. **Tom aspiracional de "painel de controle" ausente na Visão**
- **README menciona:** "reforça a ideia de painel de controle, com métricas e indicações de monitoramento" (§5.2), "visibilidade, confiabilidade e leitura rápida dos principais indicadores" (§1), "apoio à decisão do investidor" (§2).
- **Gap no PRD:** A Visão (§1) foca em features técnicas (Score, Preço-Teto, rastreabilidade) mas não captura o **sentimento de controle**, **confiança em tempo real**, e **clareza instantânea** que o README sugere. O usuário quer sentir que está "no comando" da carteira, não apenas vendo dados.
- **Onde deveria estar:** §1 Visão — adicionar linguagem sobre "dar ao investidor visão de cockpit da sua carteira" ou "transformar dados dispersos em decisões confiantes".

---

### 2. **Experiência visual escura como diferenciador emocional não articulada**
- **README menciona:** "linguagem visual escura, com gradientes sutis, cards bem definidos e hierarquia tipográfica forte" (§8), "Design visual escuro, com contraste adequado e foco em leitura de dados" (RNF02).
- **Gap no PRD:** O PRD trata tema dark como escolha técnica ("dark-only no MVP" em §1, §5, §8 NFRs), mas o README sugere que é um **elemento de identidade visual profissional** — associado a dashboards financeiros sérios, Bloomberg-like, "trader mindset".
- **Onde deveria estar:** §1 Visão ou §2 Usuário-Alvo — articular que o tema dark não é só estética, mas sinaliza **seriedade, foco analítico, e ambiente de trabalho profissional** (vs interfaces "fofinhas" de agregadores passivos).

---

### 3. **Job emocional de "eliminar ansiedade com inconsistências" subexplorado**
- **README menciona:** "A carteira prioriza notificações de inconsistências de precificação" (§7), "Ativos com comportamento fora do esperado recebem destaque visual" (§7), RF05 sobre alertas.
- **Gap no PRD:** Os JTBDs (§2.1) mencionam "Confiar nos números" e "Descobrir oportunidades e riscos", mas não capturam a **angústia emocional** de investidores que já foram pegos de surpresa por dividendos não recebidos, preços errados em planilhas, ou posições "fantasmas". O README implicitamente trata inconsistências como **fonte primária de desconfiança**, não só feature técnica.
- **Onde deveria estar:** §2.1 Jobs To Be Done — adicionar job explícito: *"Dormir tranquilo sabendo que meus dados batem — sem sustos de posição sem lastro ou dividendo sumido"* ou similar.

---

### 4. **Ciclo de uso contínuo ("monitoramento ao longo do tempo") não refletido nas métricas de sucesso**
- **README menciona:** "evolução patrimonial ao longo do tempo" (§3, §5.4), "histórico mensal" (§5.5, §5.6), "acompanhamento financeiro com foco em consolidação de carteira" (§9).
- **Gap no PRD:** As métricas de sucesso (§7) focam em retenção semanal (SM-1) e ações de primeira sessão (SM-2, SM-3), mas não capturam o **hábito de revisão periódica** — o investidor fundamentalista não mexe na carteira todo dia, mas **revisita mensalmente** para conferir proventos, ajustar score, rever preço-teto. O README sugere uso **temporal recorrente**, não engajamento diário.
- **Onde deveria estar:** §7 Métricas de Sucesso — considerar métrica como "% de usuários que voltam pelo menos 1x/mês por 3 meses consecutivos" (padrão de revisão mensal) em vez de foco excessivo em retenção semanal.

---

### 5. **Experiência de "leitura rápida de números" como princípio UX não formalizado**
- **README menciona:** "leitura rápida de números, comparação entre métricas" (§8), "Apresentação de informações financeiras em formato sintético e fácil de interpretar" (RNF05), "Indicadores resumidos no topo das páginas" (§8).
- **Gap no PRD:** O PRD descreve features (cards, gráficos, tabelas) mas não estabelece **princípio de design** de "escanabilidade em <5 segundos" — investidor fundamentalista quer abrir a Carteira e saber instantaneamente: "Estou no lucro? Quanto? Algum alerta crítico?". O README sugere hierarquia visual agressiva para **digestão instantânea**, não exploração profunda.
- **Onde deveria estar:** §8 NFRs Cross-Cutting (UX/Acessibilidade) — adicionar NFR: "Cards de resumo no topo de cada tela apresentam KPIs principais em formato legível em <5s de varredura visual" (hierarquia informacional, não só responsividade).

---

## Conteúdo Bem Capturado

- **Requisitos funcionais completos** — Todos os RFs do README (RF01 a RF16) mapeados para FRs numerados no PRD (FR-1 a FR-26).
- **Estrutura de navegação** — Menu lateral, transições entre telas (§6 README → §4.11 PRD, FR-25).
- **Consolidação por classe de ativo e exposição internacional** — §5.3, §5.4 README → FR-7, FR-10 PRD.
- **Histórico de proventos e rentabilidade com benchmarks** — §5.5, §5.6 README → §4.4 (FR-11, FR-12), §4.5 (FR-13, FR-14) PRD.
- **Alertas de inconsistências** — §7 README → §4.8 (FR-19, FR-20) PRD.
- **Tema dark e responsividade** — RNF01, RNF02 README → §8 NFRs PRD.

---

## Sumário Executivo

**Input:** `README.md` (relatório técnico de levantamento, 185 linhas)

**Gaps principais identificados:**

1. Tom aspiracional de "painel de controle" e sensação de domínio ausente na Visão.
2. Tema dark tratado como escolha técnica, não como diferenciador emocional de seriedade profissional.
3. Job emocional de "eliminar ansiedade com inconsistências" subexplorado nos JTBDs.
4. Métricas de sucesso não refletem padrão de uso **mensal recorrente** (revisão periódica, não engajamento diário).
5. Princípio UX de "leitura rápida de números em <5s" implícito no README, não formalizado como NFR no PRD.

**Arquivo gerado:** `C:\Users\Samuel Leite\wkspaces\Valora\_bmad-output\planning-artifacts\prds\prd-Valora-2026-08-15\reconcile-readme.md`
