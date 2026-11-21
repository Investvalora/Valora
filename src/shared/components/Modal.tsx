import {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";
import { useInformationSheet } from "../hooks/useInformationSheet";

interface ModalProps {
  isOpen: boolean;
  title: string;
  titleStyle?: "default" | "subtle";
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** ações sempre visíveis abaixo da área rolável (ex.: formulário no mobile). */
  footer?: ReactNode;
  /**
   * `false` bloqueia Escape, clique no overlay e o botão de fechar. Existe para
   * o intervalo em que uma escrita está em voo: fechar no meio desmonta quem
   * dispara a revalidação e o feedback de sucesso, e a linha gravada só
   * apareceria no próximo carregamento.
   */
  dismissible?: boolean;
  variant?: "default" | "wallet" | "score" | "transaction" | "floating" | "information";
  transactionDrawer?: boolean;
  floatingExpanded?: boolean;
  closing?: boolean;
  initialFocusSelector?: string;
  /** Ajuda com altura ajustável no mobile; o conteúdo permanece contínuo. */
  informationExpandable?: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Impede o rubber band da página sem bloquear a rolagem interna do painel. */
function lockDocumentTouchScroll() {
  let lastY = 0;
  const onStart = (event: TouchEvent) => {
    lastY = event.touches[0]?.clientY ?? 0;
  };
  const onMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const currentY = event.touches[0].clientY;
    const delta = lastY - currentY;
    lastY = currentY;
    let element = event.target instanceof Element ? event.target : null;
    while (
      element &&
      element !== document.body &&
      element !== document.documentElement
    ) {
      const style = getComputedStyle(element);
      const max = element.scrollHeight - element.clientHeight;
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        max > 0 &&
        ((delta < 0 && element.scrollTop > 0) ||
          (delta > 0 && element.scrollTop < max - 1))
      )
        return;
      element = element.parentElement;
    }
    if (event.cancelable) event.preventDefault();
  };
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: false });
  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
  };
}

/**
 * Diálogo modal acessível: renderizado em portal no `body`, com `role="dialog"`
 * e `aria-modal`, foco preso enquanto aberto, Escape e clique no overlay
 * fechando, e foco devolvido ao elemento que o abriu.
 *
 * Não usa `<dialog>` nativo porque o suporte a estilização do backdrop ainda
 * é irregular e o fechamento nativo por Escape escapa ao controle do React.
 */
export function Modal({
  isOpen,
  title,
  titleStyle = "default",
  description,
  onClose,
  children,
  footer,
  dismissible = true,
  variant = "default",
  transactionDrawer = false,
  floatingExpanded,
  closing = false,
  initialFocusSelector,
  informationExpandable = false,
}: ModalProps) {
  const isSheet = variant === "wallet" || variant === "score";
  const extendsBehindKeyboard = variant === "wallet" || transactionDrawer;
  const isTransaction = variant === "transaction";
  const isFloating = variant === "floating";
  const isInformation = variant === "information";
  const isMobile = useIsMobile();
  const expandableInformation = isInformation && informationExpandable && isMobile;
  const informationSheet = useInformationSheet(expandableInformation, isOpen);
  const hasCompactLayout = isTransaction || isFloating || isInformation;
  const dialogRef = useRef<HTMLDivElement>(null);
  const informationHandleRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = useRef(initialFocusSelector);
  initialFocusRef.current = initialFocusSelector;
  const titleId = useId();
  const informationContentId = useId();
  const closeAnimation = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!isOpen) closeAnimation.current?.();
    return () => closeAnimation.current?.();
  }, [isOpen]);
  useLayoutEffect(() => {
    if (!isOpen || variant !== 'default' || document.documentElement.dataset.inputMode === 'keyboard' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = dialogRef.current?.animate?.([{ opacity: 0, transform: 'translateY(6px) scale(0.99)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 180, easing: 'cubic-bezier(0.22,1,0.36,1)' });
    return () => animation?.cancel();
  }, [isOpen, variant]);
  const dismissWithMotion = () => {
    const panel = dialogRef.current;
    if (!dismissible || closeAnimation.current) return;
    if (isSheet || !panel?.animate || document.documentElement.dataset.inputMode === 'keyboard' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    panel.inert = true;
    const animation = panel.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(2px)' }], { duration: 100, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' });
    let done = false;
    const finish = () => { if (done) return; done = true; window.clearTimeout(timer); closeAnimation.current = null; animation.cancel(); panel.inert = false; onClose(); };
    const timer = window.setTimeout(finish, 140);
    closeAnimation.current = () => { done = true; window.clearTimeout(timer); animation.cancel(); panel.inert = false; closeAnimation.current = null; };
    void animation.finished.then(finish, () => {});
  };

  const getFocusable = useCallback((): HTMLElement[] => {
    const dialog = dialogRef.current;
    if (!dialog) return [];

    return Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      // `offsetParent` nulo = elemento oculto; `tabIndex` negativo = fora da
      // ordem de tabulação por decisão do componente (ex.: opções do
      // autocomplete, navegadas por setas).
      (element) => element.offsetParent !== null && element.tabIndex >= 0,
    );
  }, []);

  // Foco inicial dentro do diálogo e devolução ao fechar.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusable = getFocusable();
    const preferred = initialFocusRef.current
      ? dialogRef.current?.querySelector<HTMLElement>(initialFocusRef.current)
      : null;
    const target =
      preferred ?? (isInformation ? dialogRef.current : focusable.length > 0 ? focusable[0] : dialogRef.current);
    target?.focus();

    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, getFocusable, isInformation]);

  // O foco continua no diálogo quando a responsividade troca os controles.
  useEffect(() => {
    if (isOpen && isInformation && !dialogRef.current?.contains(document.activeElement)) {
      (expandableInformation ? informationHandleRef.current : dialogRef.current)?.focus();
    }
  }, [isOpen, isInformation, expandableInformation, informationSheet.expanded]);

  useEffect(() => {
    if (isOpen && !closing && initialFocusSelector) {
      dialogRef.current
        ?.querySelector<HTMLElement>(initialFocusSelector)
        ?.focus();
    }
  }, [isOpen, closing, initialFocusSelector]);

  // Impede a página de fundo de rolar sob o modal.
  useEffect(() => {
    if (!isOpen) return;

    if ((hasCompactLayout || isSheet) && window.innerWidth < 768) {
      return lockDocumentTouchScroll();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, hasCompactLayout, isSheet]);

  // O teclado do iOS reduz a área visível, mas 100dvh pode continuar alto.
  // Limitamos só a altura do painel; mover o overlay causa deslocamento no PWA.
  useEffect(() => {
    if (
      !isOpen ||
      (variant !== "transaction" && variant !== "wallet" && variant !== "score" && variant !== "information")
    )
      return;
    if (window.innerWidth >= 768) return;
    const viewport = window.visualViewport;
    const panel = dialogRef.current;
    const overlay = overlayRef.current;
    if (!viewport || !panel || !overlay) return;
    const syncHeight = () => {
      const standalone =
        document.documentElement.classList.contains("ios-standalone");
      const fullHeight = document.body.getBoundingClientRect().height;
      const keyboardOpen = standalone && viewport.height < fullHeight - 120;
      const availableHeight =
        standalone && !keyboardOpen ? fullHeight : viewport.height;
      // Atualizar maxHeight diretamente força o WebKit a recalcular o painel
      // mesmo quando 100dvh e variáveis CSS ficam com o valor pré-teclado.
      panel.style.maxHeight =
        variant === "transaction" || variant === "information"
          ? `calc(${availableHeight}px - env(safe-area-inset-top) - 0.5rem)`
          : `calc(${availableHeight}px - env(safe-area-inset-top))`;
      if (isInformation) panel.style.setProperty('--information-available-height', `${availableHeight}px`);
      // O WebKit mantém o overlay preso ao layout viewport, atrás do teclado.
      // Reduzir apenas sua base preserva o topo e coloca as ações na borda
      // inferior do visualViewport, sem o salto causado por mudar top/height.
      const bottomInset = standalone
        ? keyboardOpen
          ? Math.max(0, fullHeight - viewport.height)
          : 0
        : Math.max(
            0,
            document.documentElement.clientHeight -
              viewport.offsetTop -
              viewport.height,
          );
      if (extendsBehindKeyboard) {
        const keyboardInset =
          standalone && !keyboardOpen
            ? 0
            : Math.max(
                0,
                (standalone
                  ? fullHeight
                  : document.documentElement.clientHeight) -
                  viewport.offsetTop -
                  viewport.height,
              );
        overlay.style.setProperty(
          "--modal-keyboard-inset",
          `${keyboardInset}px`,
        );
        overlay.toggleAttribute("data-keyboard-underlay", keyboardInset > 0);
      } else {
        overlay.style.bottom = `${bottomInset}px`;
      }
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    syncHeight();
    viewport.addEventListener("resize", syncHeight);
    viewport.addEventListener("scroll", syncHeight);
    window.addEventListener("resize", syncHeight);
    return () => {
      viewport.removeEventListener("resize", syncHeight);
      viewport.removeEventListener("scroll", syncHeight);
      window.removeEventListener("resize", syncHeight);
      panel.style.removeProperty("max-height");
      panel.style.removeProperty('--information-available-height');
      overlay.style.removeProperty("bottom");
      overlay.style.removeProperty("--modal-keyboard-inset");
      overlay.removeAttribute("data-keyboard-underlay");
    };
  }, [isOpen, variant, extendsBehindKeyboard, isInformation]);

  // Desabilitar o controle que está com o foco o joga para o `body`, e a partir
  // dali Tab volta a percorrer a página de fundo — o foco escapa do diálogo sem
  // que ninguém tenha pedido. Acontece de verdade quando `dismissible` vira
  // `false` no submit e o botão de fechar é desabilitado sob o foco do usuário.
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const active = document.activeElement;
    if (!active || active === document.body || !dialog.contains(active)) {
      dialog.focus();
    }
  }, [isOpen, dismissible]);

  // Escape e Tab tratados no container do diálogo: o foco está sempre preso
  // dentro dele, e assim um filho (ex.: o autocomplete de ticker) pode
  // interceptar Escape antes com `stopPropagation`, para fechar só a própria
  // lista de sugestões em vez do modal inteiro.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (dismissible) onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={
        isInformation
          ? "information-modal-overlay fixed inset-0 z-50 flex items-end justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:items-center md:p-6"
          : isFloating
          ? "floating-sheet-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/[0.47] px-2"
          : isTransaction
            ? `transaction-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/75 ${transactionDrawer ? "transaction-drawer-overlay md:items-stretch md:justify-end" : "md:items-center md:px-4 md:py-6"}`
            : isSheet
              ? `wallet-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-stretch md:justify-end ${variant === "wallet" ? "wallet-keyboard-overlay" : ""}`
              : "fixed inset-0 z-50 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-black/70 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:items-center"
      }
      data-closing={isSheet ? closing : undefined}
      data-information-sheet={expandableInformation ? (informationSheet.expanded ? 'expanded' : 'compact') : undefined}
      data-dragging={expandableInformation && informationSheet.dragging ? 'true' : undefined}
      style={expandableInformation ? { '--information-sheet-progress': informationSheet.progress } as CSSProperties : undefined}
      // `mousedown` no overlay, e não `click`, para que arrastar de dentro do
      // diálogo e soltar no overlay não feche o modal.
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) dismissWithMotion();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? `${titleId}-description` : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={
          isInformation
            ? "information-modal-panel relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-[26px] border border-white/[0.04] bg-[#1b1b1b] shadow-[0_24px_90px_rgba(0,0,0,0.4)] outline-none"
            : isFloating
            ? "floating-sheet-panel flex w-full max-w-[420px] flex-col overflow-hidden border text-white focus:outline-none"
            : isTransaction
              ? `transaction-modal-panel flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.5rem)] w-full flex-col overflow-hidden rounded-t-[28px] border border-zinc-900/50 bg-[#181818] shadow-2xl focus:outline-none ${transactionDrawer ? "transaction-drawer-panel md:max-h-none md:max-w-[480px] md:rounded-none md:border-y-0 md:border-r-0" : "md:max-h-[calc(100dvh-3rem)] md:max-w-lg md:rounded-[28px]"}`
              : isSheet
                ? `wallet-modal-panel max-h-[calc(100dvh-env(safe-area-inset-top))] w-full overflow-x-hidden overflow-y-auto rounded-t-3xl border border-zinc-800 bg-[var(--wallet-panel-bg)] pb-[env(safe-area-inset-bottom)] shadow-xl focus:outline-none md:max-h-none md:h-dvh md:rounded-none md:border-y-0 md:bg-[#1c1c1c]/95 md:backdrop-blur-md md:pb-0 ${variant === "score" ? "md:w-[min(100vw,520px)]" : "md:w-[min(100vw,400px)]"}`
                : "max-h-full w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0f0f0f] shadow-xl focus:outline-none"
        }
      >
        {expandableInformation ? (
          <button ref={informationHandleRef} type="button" aria-label={informationSheet.expanded ? 'Recolher informações' : 'Expandir informações'}
            aria-expanded={informationSheet.expanded} aria-controls={informationContentId}
            className="information-sheet-handle flex h-8 w-full shrink-0 touch-none items-center justify-center rounded-t-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
            {...informationSheet.handleProps}>
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-white/30" />
          </button>
        ) : (isTransaction || isInformation) && (
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-600/70 md:hidden"
          />
        )}
        <div
          className={
            isInformation
              ? `flex shrink-0 items-start justify-between gap-4 px-6 pb-3 ${expandableInformation ? 'pr-16 pt-1' : 'pt-5 md:pt-6'}`
              : titleStyle === "subtle"
              ? "flex shrink-0 items-start justify-between gap-4 px-6 pb-2 pt-6"
              : hasCompactLayout
              ? "flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6 md:py-5"
              : "flex items-start justify-between gap-4 border-b border-zinc-800 p-6"
          }
        >
          <div className="min-w-0">
          {isInformation && !expandableInformation && <p className="mb-2 text-[11px] font-medium text-white/45">Informações</p>}
          <h2 id={titleId} className={isInformation ? "text-[17px] font-medium leading-snug tracking-tight text-white/90" : titleStyle === "subtle" ? "text-base font-medium tracking-tight text-white" : "text-xl font-bold text-white"}>
            {title}
          </h2>
          {description && <p id={`${titleId}-description`} className="mt-1.5 text-xs leading-relaxed text-white/45">{description}</p>}
          </div>
          <button
            type="button"
            onClick={dismissWithMotion}
            disabled={!dismissible}
            aria-label="Fechar"
            className={
              isInformation
                ? `grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:h-9 md:w-9 ${expandableInformation ? 'absolute right-3 top-2 z-10' : ''}`
                : hasCompactLayout || titleStyle === "subtle"
                ? "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-2xl leading-none text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                : "rounded-lg px-2 py-1 text-2xl leading-none text-gray-400 transition-colors hover:bg-zinc-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent"
            }
          >
            {isInformation ? <X className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" /> : <>&times;</>}
          </button>
        </div>

        <div
          id={informationContentId}
          data-sheet-expanded={isFloating ? floatingExpanded : undefined}
          role={isInformation ? "region" : undefined}
          aria-label={isInformation ? "Detalhes da informação" : undefined}
          tabIndex={isInformation ? 0 : undefined}
          className={
            isInformation
              ? `min-h-0 overflow-x-hidden overscroll-contain px-6 pb-6 pt-1 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40 ${expandableInformation ? 'information-sheet-content flex-1' : 'overflow-y-auto'}`
              : isFloating
              ? "min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 pt-2"
              : isTransaction
                ? `min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5 md:px-6 md:py-6 ${transactionDrawer && !footer ? "max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))]" : ""}`
                : "p-6"
          }
        >
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-white/10 bg-[#181818] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
