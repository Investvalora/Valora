#!/usr/bin/env python3
"""Prova por mutacao: para cada guard, remove-o, roda o alvo e exige falha.

Restaura sempre e confere identidade byte a byte pelo sha256 do arquivo.
"""
import hashlib
import subprocess
import sys

ROOT = "/home/slmoraes/workspace/Valora"

APF = "src/modules/portfolio/components/AddPositionForm.tsx"
APF_T = "src/modules/portfolio/components/AddPositionForm.test.tsx"
CP = "src/modules/portfolio/components/CarteiraPage.tsx"
CP_T = "src/modules/portfolio/components/CarteiraPage.test.tsx"
PT = "src/modules/portfolio/components/PositionsTable.tsx"
PT_T = "src/modules/portfolio/components/PositionsTable.test.tsx"
SVC = "src/modules/portfolio/services/positionService.ts"
SVC_T = "src/modules/portfolio/services/positionService.test.ts"
SCH = "src/modules/portfolio/schemas/positionSchema.ts"
SCH_T = "src/modules/portfolio/schemas/positionSchema.test.ts"
MOD = "src/shared/components/Modal.tsx"
MOD_T = "src/shared/components/Modal.test.tsx"
HOOK = "src/modules/portfolio/hooks/usePositions.ts"

# (id, descricao, arquivo, trecho_original, trecho_mutado, arquivo_de_teste)
MUTATIONS = [
    (
        "A",
        "parseDecimalPtBr volta a tratar ponto como decimal",
        SCH,
        "  if (isAmbiguousDecimal(cleaned)) return Number.NaN\n",
        "",
        SCH_T,
    ),
    (
        "A-msg",
        "campo decimal deixa de distinguir o caso ambiguo",
        SCH,
        """    if (isAmbiguousDecimal(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: AMBIGUOUS_DECIMAL_MESSAGE })
      return
    }

""",
        "",
        SCH_T,
    ),
    (
        "B1",
        "remove o reclamp de highlightedIndex",
        APF,
        """  useEffect(() => {
    setHighlightedIndex((current) => Math.min(current, suggestions.length - 1))
  }, [suggestions.length])
""",
        "",
        APF_T,
    ),
    (
        "B1b",
        "remove a defensiva de selectAsset",
        APF,
        "    if (!asset) return\n\n    setValue('ticker'",
        "    setValue('ticker'",
        APF_T,
    ),
    (
        "B2",
        "CarteiraPage deixa o modal fechavel durante a escrita",
        CP,
        "        dismissible={!isSaving}\n",
        "",
        CP_T,
    ),
    (
        "B2b",
        "Modal ignora o gate no Escape",
        MOD,
        "      if (dismissible) onClose()",
        "      onClose()",
        MOD_T,
    ),
    (
        "B3",
        "findAssetByTicker sem o filtro active",
        SVC,
        "      .eq('ticker', ticker.trim().toUpperCase())\n      .eq('active', true)\n",
        "      .eq('ticker', ticker.trim().toUpperCase())\n",
        SVC_T,
    ),
    (
        "B4-fk",
        "23503 volta a culpar sempre o ticker",
        APF,
        "    case '23503':\n      return describeForeignKeyError(error, ticker)",
        "    case '23503':\n      return `O ativo ${ticker} não está no catálogo.`",
        APF_T,
    ),
    (
        "B4-42501",
        "remove o ramo 42501",
        APF,
        """    case '42501':
      // RLS recusou a escrita. Na prática é sessão vencida ou trocada entre o
      // carregamento da tela e o submit, e não falta de permissão do usuário.
      return 'Sua sessão não está mais válida. Entre novamente e repita o cadastro.'
""",
        "",
        APF_T,
    ),
    (
        "B4-23514",
        "remove o ramo 23514",
        APF,
        """    case '23514':
      return 'Valores fora do permitido: quantidade precisa ser maior que zero e preço médio não pode ser negativo.'
""",
        "",
        APF_T,
    ),
    (
        "B4-sess",
        "remove o ramo de sessao ausente",
        APF,
        """    case MISSING_SESSION_CODE:
      return 'Sessão expirada. Entre novamente para cadastrar posições.'
""",
        "",
        APF_T,
    ),
    (
        "B5",
        "sanitizeSearchTerm deixa o curinga _ passar",
        SVC,
        "return term.replace(/[,.()%*_\\\\\"']/g, ' ').trim()",
        "return term.replace(/[,.()%*\\\\\"']/g, ' ').trim()",
        SVC_T,
    ),
    (
        "B6-cur",
        "formatMoney ignora a moeda do ativo",
        PT,
        "  if (!isCurrencyCode(currency)) return plainMoneyFormatter.format(value)\n\n  return new Intl.NumberFormat('pt-BR', {\n    style: 'currency',\n    currency,",
        "  if (!isCurrencyCode(currency)) return plainMoneyFormatter.format(value)\n\n  return new Intl.NumberFormat('pt-BR', {\n    style: 'currency',\n    currency: 'BRL',",
        PT_T,
    ),
    (
        "B6-range",
        "formatMoney sem a validacao do codigo de moeda",
        PT,
        "  if (!isCurrencyCode(currency)) return plainMoneyFormatter.format(value)\n",
        "",
        PT_T,
    ),
    (
        "B6-nan",
        "formatMoney sem o guard de NaN",
        PT,
        "  if (!Number.isFinite(value)) return MISSING\n  if (!isCurrencyCode(currency))",
        "  if (!isCurrencyCode(currency))",
        PT_T,
    ),
    (
        "B6-qty",
        "formatQuantity sem o guard de NaN",
        PT,
        "function formatQuantity(value: number): string {\n  if (!Number.isFinite(value)) return MISSING\n",
        "function formatQuantity(value: number): string {\n",
        PT_T,
    ),
    (
        "B6-blank",
        "toNumber volta a tratar string vazia como zero",
        PT,
        "  if (typeof value !== 'string' || value.trim() === '') return Number.NaN\n",
        "",
        PT_T,
    ),
    (
        "B7",
        "usePositions ignora o carregamento da sessao",
        HOOK,
        "    isLoading: query.isLoading || isSessionLoading,",
        "    isLoading: query.isLoading,",
        CP_T,
    ),
    (
        "B8",
        "CarteiraPage volta a esconder a lista em caso de erro",
        CP,
        "      ) : hasPositions || !isError ? (",
        "      ) : !isError ? (",
        CP_T,
    ),
    (
        "B9",
        "schema volta a aceitar data futura",
        SCH,
        """    .refine(
      (value) => !isCalendarDate(value) || value <= todayIsoDate(),
      'Data de aquisição não pode estar no futuro',
    ),""",
        "    ,",
        SCH_T,
    ),
    (
        "C-limit",
        "listPositions sem o .limit",
        SVC,
        "      .order('ticker', { ascending: true })\n      .limit(POSITIONS_LIMIT)\n",
        "      .order('ticker', { ascending: true })\n",
        SVC_T,
    ),
    (
        "C-stopprop",
        "combobox sem stopPropagation no Escape",
        APF,
        "      event.stopPropagation()\n      setShowSuggestions(false)",
        "      setShowSuggestions(false)",
        APF_T,
    ),
    (
        "C-mod-esc",
        "Modal sem tratamento de Escape",
        MOD,
        """    if (event.key === 'Escape') {
      event.stopPropagation()
      if (dismissible) onClose()
      return
    }

""",
        "",
        MOD_T,
    ),
    (
        "C-mod-overlay",
        "Modal sem fechamento pelo overlay",
        MOD,
        "        if (dismissible && event.target === event.currentTarget) onClose()",
        "",
        MOD_T,
    ),
    (
        "C-mod-tab",
        "Modal sem prisao de Tab",
        MOD,
        """    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }""",
        "    void first\n    void last\n    void active",
        MOD_T,
    ),
    (
        "C-mod-return",
        "Modal sem devolucao de foco",
        MOD,
        "    return () => {\n      previouslyFocusedRef.current?.focus()\n    }\n",
        "",
        MOD_T,
    ),
    (
        "C-mod-focus",
        "Modal sem recuperacao de foco quando o botao e desabilitado",
        MOD,
        """    const active = document.activeElement
    if (!active || active === document.body || !dialog.contains(active)) {
      dialog.focus()
    }
  }, [isOpen, dismissible])""",
        "    void dialog\n  }, [isOpen, dismissible])",
        MOD_T,
    ),
    (
        "C-mod-init",
        "Modal sem foco inicial",
        MOD,
        "    const target = focusable.length > 0 ? focusable[0] : dialogRef.current\n    target?.focus()\n",
        "",
        MOD_T,
    ),
]


def sha(path):
    with open(f"{ROOT}/{path}", "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def read(path):
    with open(f"{ROOT}/{path}", encoding="utf-8") as fh:
        return fh.read()


def write(path, text):
    with open(f"{ROOT}/{path}", "w", encoding="utf-8") as fh:
        fh.write(text)


def run_tests(target):
    proc = subprocess.run(
        ["pnpm", "test:run", target],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    return proc.returncode, proc.stdout + proc.stderr


results = []
for mid, desc, path, old, new, target in MUTATIONS:
    before_sha = sha(path)
    src = read(path)

    if old not in src:
        results.append((mid, desc, "TRECHO-NAO-ENCONTRADO", "", before_sha == sha(path)))
        print(f"[{mid}] TRECHO NAO ENCONTRADO em {path}", flush=True)
        continue

    if src.count(old) != 1:
        results.append((mid, desc, f"AMBIGUO({src.count(old)}x)", "", True))
        print(f"[{mid}] TRECHO AMBIGUO ({src.count(old)}x) em {path}", flush=True)
        continue

    write(path, src.replace(old, new, 1))
    code, out = run_tests(target)
    write(path, src)
    identical = sha(path) == before_sha

    failed_line = ""
    for line in out.splitlines():
        if "Tests  " in line:
            failed_line = line.strip()

    verdict = "MATA (teste falhou)" if code != 0 else "SOBREVIVE (suite verde)"
    results.append((mid, desc, verdict, failed_line, identical))
    print(f"[{mid}] {verdict} | {failed_line} | restauro-identico={identical}", flush=True)

print("\n=== RESUMO ===")
survived = [r for r in results if not r[2].startswith("MATA")]
for mid, desc, verdict, failed, identical in results:
    print(f"{mid:14} {verdict:26} identico={identical} :: {desc}")

print(f"\nmutantes: {len(results)} | sobreviventes/erros: {len(survived)}")
sys.exit(1 if survived else 0)
