import { useEffect, useRef, useState } from "react";

const enabled = import.meta.env.VITE_VIEWPORT_PROBE === "1";
const logKey = "valora:viewport-probe";

interface ViewportSample {
  phase: string;
  at: string;
  route: string;
  activeElement: string | null;
  innerWidth: number;
  innerHeight: number;
  screenHeight: number;
  clientHeight: number;
  scrollY: number;
  documentHeight: number;
  bodyOverflow: string;
  navbarDisplay: string | null;
  navbarParent: string | null;
  navbarInlineBottom: string | null;
  restingHeight: string;
  standalone: boolean;
  shellCssHeight: string | null;
  panelMaxHeight: string | null;
  panelInlineMaxHeight: string | null;
  overlayInlineBottom: string | null;
  visibleBottom: number | null;
  visualViewport: { height: number; offsetTop: number; width: number } | null;
  rects: Record<
    string,
    {
      top: number;
      bottom: number;
      left: number;
      right: number;
      height: number;
    } | null
  >;
}

function readLog(): ViewportSample[] {
  try {
    return JSON.parse(
      sessionStorage.getItem(logKey) || "[]",
    ) as ViewportSample[];
  } catch {
    return [];
  }
}

function rect(selector: string) {
  const bounds = document.querySelector(selector)?.getBoundingClientRect();
  if (!bounds) return null;
  return {
    top: Math.round(bounds.top),
    bottom: Math.round(bounds.bottom),
    left: Math.round(bounds.left),
    right: Math.round(bounds.right),
    height: Math.round(bounds.height),
  };
}

function snapshot(phase: string): ViewportSample {
  const viewport = window.visualViewport;
  const active = document.activeElement;
  return {
    phase,
    at: new Date().toISOString(),
    route: location.pathname,
    activeElement:
      active instanceof HTMLElement
        ? `${active.tagName.toLowerCase()}#${active.id}`
        : null,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenHeight: window.screen.height,
    clientHeight: document.documentElement.clientHeight,
    scrollY: window.scrollY,
    documentHeight: document.scrollingElement?.scrollHeight ?? 0,
    bodyOverflow: getComputedStyle(document.body).overflowY,
    navbarDisplay: document.querySelector(".mobile-navigation")
      ? getComputedStyle(document.querySelector(".mobile-navigation")!).display
      : null,
    navbarParent:
      document.querySelector(".mobile-navigation")?.parentElement?.tagName ??
      null,
    navbarInlineBottom:
      (document.querySelector(".mobile-navigation") as HTMLElement | null)
        ?.style.bottom ?? null,
    restingHeight: document.documentElement.style.getPropertyValue(
      "--valora-resting-height",
    ),
    standalone: document.documentElement.classList.contains("ios-standalone"),
    shellCssHeight: document.querySelector(".app-shell-novo")
      ? getComputedStyle(document.querySelector(".app-shell-novo")!).height
      : null,
    panelMaxHeight: document.querySelector(
      ".transaction-modal-panel, .wallet-modal-panel",
    )
      ? getComputedStyle(
          document.querySelector(
            ".transaction-modal-panel, .wallet-modal-panel",
          )!,
        ).maxHeight
      : null,
    panelInlineMaxHeight:
      (
        document.querySelector(
          ".transaction-modal-panel, .wallet-modal-panel",
        ) as HTMLElement | null
      )?.style.maxHeight ?? null,
    overlayInlineBottom:
      (
        document.querySelector(
          ".transaction-modal-overlay, .wallet-modal-overlay",
        ) as HTMLElement | null
      )?.style.bottom ?? null,
    visibleBottom: viewport
      ? Math.round(viewport.offsetTop - window.scrollY + viewport.height)
      : null,
    visualViewport: viewport
      ? {
          height: viewport.height,
          offsetTop: viewport.offsetTop,
          width: viewport.width,
        }
      : null,
    rects: {
      html: rect("html"),
      body: rect("body"),
      shell: rect("#root > div"),
      main: rect("main"),
      navbar: rect(".mobile-navigation"),
      overlay: rect(".transaction-modal-overlay, .wallet-modal-overlay"),
      panel: rect(".transaction-modal-panel, .wallet-modal-panel"),
      footer: rect(".transaction-modal-panel > :last-child"),
    },
  };
}

/** ativado apenas em builds temporários para medir o Safari do pwa instalado desse carai */
export function ViewportProbe() {
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [count, setCount] = useState(() => (enabled ? readLog().length : 0));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const syncPosition = () => {
      // um elemento fixed no WebKit anda com o layout viewport quando a página
      // é deslocada para exibir o teclado. Compensar offsetTop mantém o controle
      // de diagnóstico dentro da região visível.
      if (barRef.current) {
        barRef.current.style.top = `calc(${viewport.offsetTop}px + env(safe-area-inset-top) + 0.5rem)`;
      }
    };
    syncPosition();
    viewport.addEventListener("resize", syncPosition);
    viewport.addEventListener("scroll", syncPosition);
    return () => {
      viewport.removeEventListener("resize", syncPosition);
      viewport.removeEventListener("scroll", syncPosition);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !active) return;
    const viewport = window.visualViewport;
    const timers: number[] = [];
    let baseline = viewport?.height ?? window.innerHeight;
    let keyboardOpen = false;
    const record = (phase: string) => {
      const samples = readLog();
      if (samples.length >= 200) return;
      samples.push(snapshot(phase));
      sessionStorage.setItem(logKey, JSON.stringify(samples));
      setCount(samples.length);
    };
    const later = (phase: string) => {
      timers.push(window.setTimeout(() => record(`${phase}+300ms`), 300));
      timers.push(window.setTimeout(() => record(`${phase}+700ms`), 700));
    };
    const onViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      const keyboard = height < baseline - 120;
      setKeyboardVisible(keyboard);
      if (keyboard && !keyboardOpen) record("keyboard-open");
      else if (!keyboard && keyboardOpen) {
        record("keyboard-dismissed");
        later("keyboard-dismissed");
      } else record("viewport-change");
      keyboardOpen = keyboard;
      if (!keyboard && height > baseline) baseline = height;
    };
    const onFocus = () => record("focusin");
    const onBlur = () => {
      record("focusout");
      later("focusout");
    };
    record("start");
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onBlur, true);
    viewport?.addEventListener("resize", onViewport);
    viewport?.addEventListener("scroll", onViewport);
    window.addEventListener("resize", onViewport);
    return () => {
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", onBlur, true);
      viewport?.removeEventListener("resize", onViewport);
      viewport?.removeEventListener("scroll", onViewport);
      window.removeEventListener("resize", onViewport);
      timers.forEach(window.clearTimeout);
    };
  }, [active]);

  if (!enabled) return null;

  const exportLog = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(readLog(), null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "valora-viewport-iphone.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copyLog = async () => {
    const json = JSON.stringify(readLog(), null, 2);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard API indisponível");
      await navigator.clipboard.writeText(json);
      setMessage("Copiado");
    } catch {
      // Acesso por IP em HTTP pode não expor navigator.clipboard no Safari.
      const field = document.createElement("textarea");
      field.value = json;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      } finally {
        field.remove();
      }
      setMessage(copied ? "Copiado" : "Use Exportar");
    }
  };

  return (
    <div
      ref={barRef}
      className="fixed right-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[100] flex max-w-[calc(100vw-1rem)] flex-wrap items-center gap-1 rounded-lg bg-zinc-800 p-1 text-[11px] text-white shadow-xl md:hidden"
    >
      {keyboardVisible ? (
        <button
          type="button"
          onClick={() => {
            if (document.activeElement instanceof HTMLElement)
              document.activeElement.blur();
          }}
          className="rounded bg-blue-600 px-2 py-1"
        >
          Dispensar teclado
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setActive(!active)}
            className="rounded bg-blue-600 px-2 py-1"
          >
            {active ? "Pausar" : "Medir"}
          </button>
          <span>{count}</span>
          <button
            type="button"
            onClick={() => {
              void copyLog();
            }}
            className="rounded bg-zinc-700 px-2 py-1"
          >
            Copiar
          </button>
          <button
            type="button"
            onClick={exportLog}
            className="rounded bg-zinc-700 px-2 py-1"
          >
            Exportar
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem(logKey);
              setCount(0);
              setMessage("");
            }}
            className="rounded bg-zinc-700 px-2 py-1"
          >
            Limpar
          </button>
          {message && <span role="status">{message}</span>}
        </>
      )}
    </div>
  );
}
