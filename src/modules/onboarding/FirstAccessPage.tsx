import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  ChartNoAxesCombined,
  Wallet,
} from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/hooks/useAuth";
import { PriceAlertForm } from "../alerts/components/PriceAlertForm";
import {
  deferPushPrompt,
  usePushNotifications,
} from "../alerts/hooks/usePushNotifications";
import type { Alert } from "../alerts/types";
import { fmtMoney } from "../ativos/utils/fmt";
import type { Asset } from "../portfolio/types";
import { AssetComparison } from "../analise/components/AssetComparison";
import type { PriceHistoryPeriod } from "../assets/hooks/usePriceHistory";
import { AssetPreview } from "./AssetPreview";
import { AlertCelebration } from "./AlertCelebration";
import { CatalogStep } from "./CatalogStep";
import { saveFirstAccess, shouldShowFirstAccess } from "./firstAccess";
import { primaryButton } from "./styles";
import { PortfolioDemo } from "./PortfolioDemo";
import { WalletStep } from "./WalletStep";

const steps = [
  "welcome",
  "demo",
  "wallets",
  "search",
  "chart",
  "compare",
  "priceTip",
  "alert",
  "notifications",
] as const;
type Step = (typeof steps)[number] | "done";
const headings: Record<Step, string> = {
  welcome: "Escolha o preço.",
  search: "Encontre um ativo que você acompanha",
  chart: "Veja como o preço do ativo evoluiu",
  priceTip: "Defina um preço de interesse",
  alert: "Configure seu primeiro alerta",
  done: "Alerta criado",
  notifications: "Receba avisos neste dispositivo",
  compare: "Compare ativos lado a lado",
  demo: "Veja como uma carteira rende",
  wallets: "Crie e gerencie suas carteiras",
};
const WELCOME_REVEAL_MS = 940;

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-[#5cc8ff] disabled:opacity-45";
const nextButton = `${secondaryButton} border-[#5cc8ff]/50 bg-[#3f7dff]/10 hover:bg-[#3f7dff]/20`;

export function FirstAccessPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const replay = params.get("rever") === "1";
  if (!user) return <Navigate to="/login" replace />;
  if (!replay && !shouldShowFirstAccess(user))
    return <Navigate to="/inicio" replace />;
  return (
    <FirstAccessFlow
      key={`${user.id}:${replay}`}
      userId={user.id}
      replay={replay}
    />
  );
}

function FirstAccessFlow({
  userId,
  replay,
}: {
  userId: string;
  replay: boolean;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [term, setTerm] = useState("");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [period, setPeriod] = useState<PriceHistoryPeriod>("3M");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [welcomeReady, setWelcomeReady] = useState(false);
  const [footerActions, setFooterActions] = useState<HTMLDivElement | null>(
    null,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const page = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stepIndex = steps.indexOf(step === "done" ? "alert" : step);

  useEffect(() => {
    if (!replay) saveFirstAccess(userId, "pending");
  }, [userId, replay]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (content.current) content.current.scrollTop = 0;
  }, [step]);
  useEffect(() => {
    if (step !== "welcome") return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (motion?.matches) {
      setWelcomeReady(true);
      return;
    }
    setWelcomeReady(false);
    const timeout = window.setTimeout(
      () => setWelcomeReady(true),
      WELCOME_REVEAL_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [step]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = page.current;
    if (!viewport || !root) return;
    let fullHeight = viewport.height;
    let width = viewport.width;
    function update() {
      if (!viewport || !root || viewport.scale !== 1) return;
      if (Math.abs(viewport.width - width) > 80) {
        fullHeight = viewport.height;
        width = viewport.width;
      }
      fullHeight = Math.max(fullHeight, viewport.height);
      root.style.setProperty("--welcome-height", `${viewport.height}px`);
      root.style.setProperty("--welcome-top", `${viewport.offsetTop}px`);
      root.dataset.keyboard =
        fullHeight - viewport.height > 120 ? "open" : "closed";
    }
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  function finish() {
    saveFirstAccess(userId, "completed");
    if (!replay || step === "notifications" || alert) deferPushPrompt(userId);
    navigate("/inicio", { replace: true });
  }

  function back() {
    if (step === "notifications" && alert) setStep("done");
    else if (step === "done") setStep("alert");
    else if (stepIndex > 0) setStep(steps[stepIndex - 1]);
  }

  function next() {
    if (step === "done") setStep("notifications");
    else if (stepIndex + 1 < steps.length) setStep(steps[stepIndex + 1]);
  }

  return (
    <main
      ref={page}
      className="first-access-page fixed inset-x-0 flex h-[var(--welcome-height,100dvh)] flex-col overflow-hidden bg-[#131313] text-white [top:var(--welcome-top,0px)]"
    >
      <header className="shrink-0 border-b border-white/10 bg-[#131313] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid min-h-14 max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:min-h-16 sm:px-8">
          <div
            aria-label={`Etapa ${stepIndex + 1} de ${steps.length}`}
            role="group"
            className="flex flex-col items-start gap-1 text-xs tabular-nums text-white/65 sm:flex-row sm:items-center sm:gap-2"
          >
            <span aria-hidden="true">
              {stepIndex + 1}/{steps.length}
            </span>
            <span aria-hidden="true" className="flex items-center gap-1">
              {steps.map((item, index) => (
                <span
                  key={item}
                  className={`h-1.5 rounded-full ${index === stepIndex ? "w-3 bg-[#3f7dff]" : index < stepIndex ? "w-1.5 bg-[#3f7dff]/60" : "w-1.5 bg-white/20"}`}
                />
              ))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="/icons/valora-192.png"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-[9px]"
            />
            <span className="text-sm font-semibold tracking-wide sm:text-base">
              Valora
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="min-h-11 justify-self-end rounded-lg px-2 text-sm font-medium text-white/70 hover:text-white focus-visible:outline focus-visible:outline-[#5cc8ff]"
          >
            Pular
          </button>
        </div>
      </header>

      <div
        ref={content}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      >
        <section
          key={step}
          className={`mx-auto w-full max-w-5xl px-4 py-4 sm:px-8 sm:py-6 ${
            step === "welcome"
              ? "grid min-h-full content-evenly gap-6 py-[clamp(1.5rem,6dvh,4rem)] md:grid-cols-[1.2fr_1fr] md:items-center md:gap-14"
              : step === "priceTip"
                ? "grid min-h-full grid-rows-[auto_1fr]"
                : step === "done" || step === "notifications"
                  ? "grid min-h-full content-center text-center"
                  : ""
          }`}
        >
          <div
            className={
              step === "welcome" ? "" : "first-access-reveal mb-5 sm:mb-8"
            }
          >
            {step === "done" && <AlertCelebration />}
            {step === "notifications" && (
              <div className="mx-auto mb-5 grid size-20 place-items-center rounded-[26px] border border-[#5cc8ff]/30 bg-[#3f7dff]/10 text-[#5cc8ff]">
                <BellRing size={34} aria-hidden="true" />
              </div>
            )}
            <h1
              ref={heading}
              tabIndex={-1}
              className={`font-semibold tracking-tight focus:outline-none ${step === "welcome" ? "max-w-xl text-[clamp(2rem,5vw,3.5rem)] leading-[1.08]" : "max-w-3xl text-[clamp(1.8rem,4.5vw,3rem)] leading-[1.12]"}`}
            >
              {step === "welcome" ? (
                <>
                  <span className="first-access-reveal block">
                    {headings.welcome}
                  </span>{" "}
                  <span
                    data-reveal="1"
                    className="first-access-reveal block text-[#5cc8ff]"
                  >
                    O Valora acompanha por você.
                  </span>
                </>
              ) : (
                headings[step]
              )}
            </h1>
            {step === "welcome" && (
              <p
                data-reveal="2"
                className="first-access-reveal mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base"
              >
                Defina alertas de preço para os ativos que você acompanha, mesmo
                com a carteira vazia.
              </p>
            )}
          </div>

          {step === "welcome" && (
            <ul className="divide-y divide-white/10 border-y border-white/10 text-sm text-white/90 sm:text-base">
              <li
                data-reveal="3"
                className="first-access-reveal flex min-h-[clamp(3.5rem,10dvh,5.5rem)] items-center gap-3 py-3"
              >
                <BellRing
                  size={22}
                  className="shrink-0 text-[#5cc8ff]"
                  aria-hidden="true"
                />{" "}
                Crie alertas de preço
              </li>
              <li
                data-reveal="4"
                className="first-access-reveal flex min-h-[clamp(3.5rem,10dvh,5.5rem)] items-center gap-3 py-3"
              >
                <ChartNoAxesCombined
                  size={22}
                  className="shrink-0 text-[#7ea7ff]"
                  aria-hidden="true"
                />{" "}
                Analise ativos e seu histórico
              </li>
              <li
                data-reveal="5"
                className="first-access-reveal flex min-h-[clamp(3.5rem,10dvh,5.5rem)] items-center gap-3 py-3"
              >
                <Wallet
                  size={22}
                  className="shrink-0 text-[#5cc8ff]"
                  aria-hidden="true"
                />{" "}
                Acompanhe carteiras e proventos
              </li>
            </ul>
          )}

          {step !== "welcome" && (
            <div data-reveal="2" className="first-access-reveal min-w-0">
              {step === "search" && (
                <CatalogStep
                  term={term}
                  selectedTicker={asset?.ticker}
                  onChange={(value) => {
                    setTerm(value);
                    setAsset(null);
                  }}
                  onSelect={(selected) => {
                    if (selected.ticker !== asset?.ticker) setPeriod("3M");
                    setAsset(selected);
                  }}
                />
              )}

              {step === "chart" && (
                <AssetPreview
                  key={asset?.ticker ?? "example"}
                  asset={asset ?? undefined}
                  period={period}
                  onPeriodChange={setPeriod}
                />
              )}
              {step === "compare" && (
                <AssetComparison initialAsset={asset ?? undefined} embedded />
              )}

              {step === "priceTip" && (
                <PriceTargetPreview ticker={asset?.ticker} />
              )}

              {step === "demo" && <PortfolioDemo />}
              {step === "wallets" && <WalletStep />}

              {step === "alert" && (
                <>
                  <p className="mb-4 text-sm text-white/70">
                    Ao salvar, o Valora começa a monitorar o preço que você
                    escolher.
                  </p>
                  <PriceAlertForm
                    initialTicker={asset?.ticker}
                    onClose={back}
                    onAdvance={next}
                    actionsContainer={footerActions}
                    onCreated={(created) => {
                      setAlert(created);
                      setStep("done");
                    }}
                  />
                </>
              )}

              {step === "done" && alert && (
                <div className="space-y-5">
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-white/75">
                    {asset?.ticker === alert.ticker &&
                    alert.target_price != null
                      ? `O Valora está monitorando ${alert.ticker} para avisar quando o preço ficar ${alert.condition === "below" ? "abaixo de" : "acima de"} ${fmtMoney(Number(alert.target_price), asset.currency)}.`
                      : `Você pode acompanhar seu alerta de ${alert.ticker} na tela de Alertas.`}
                  </p>
                </div>
              )}
              {step === "notifications" && (
                <NotificationStep
                  onBack={back}
                  onFinish={finish}
                  actionsContainer={footerActions}
                />
              )}
            </div>
          )}
        </section>
      </div>
      <footer className="shrink-0 border-t border-white/10 bg-[#131313] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-5xl px-4 py-2 sm:px-8 sm:py-3">
          <div ref={setFooterActions} />
          {step === "welcome" && (
            <nav
              aria-label="Navegação da apresentação"
              className="flex justify-end"
            >
              <button
                type="button"
                onClick={next}
                disabled={!welcomeReady}
                className={primaryButton}
              >
                Próximo <ArrowRight size={17} aria-hidden="true" />
              </button>
            </nav>
          )}
          {step !== "welcome" &&
            step !== "alert" &&
            step !== "notifications" && (
              <div className="space-y-2">
                <nav
                  aria-label="Navegação da apresentação"
                  className="flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={back}
                    className={secondaryButton}
                  >
                    <ArrowLeft size={16} aria-hidden="true" /> Voltar
                  </button>
                  <button type="button" className={nextButton} onClick={next}>
                    Próximo <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </nav>
              </div>
            )}
        </div>
      </footer>
    </main>
  );
}

function PriceTargetPreview({ ticker }: { ticker?: string }) {
  return (
    <div className="grid min-h-full content-evenly gap-5 pb-3 sm:gap-8">
      <div className="flex max-w-2xl items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#5cc8ff]/25 bg-[#3f7dff]/15 text-[#5cc8ff]">
          <BellRing size={25} aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-white/80 sm:text-lg">
          O Valora acompanha o preço de {ticker ?? "um ativo do catálogo"} mesmo
          se o ativo estiver fora da sua carteira.
        </p>
      </div>
      <div
        aria-label="Condições do alerta"
        className="grid gap-3 sm:grid-cols-2"
      >
        <div className="flex min-h-[clamp(6rem,16dvh,10rem)] flex-col justify-center rounded-2xl border border-nf-green/25 bg-nf-green/10 p-4 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-nf-green">
            <ArrowDownRight size={20} aria-hidden="true" /> Abaixo de
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Receba um aviso se o preço cair abaixo do alvo.
          </p>
        </div>
        <div className="flex min-h-[clamp(6rem,16dvh,10rem)] flex-col justify-center rounded-2xl border border-nf-pink/25 bg-nf-pink/10 p-4 sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold text-nf-pink">
            <ArrowUpRight size={20} aria-hidden="true" /> Acima de
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Receba um aviso se o preço subir acima do alvo.
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationStep({
  onBack,
  onFinish,
  actionsContainer,
}: {
  onBack: () => void;
  onFinish: () => void;
  actionsContainer: HTMLElement | null;
}) {
  const push = usePushNotifications();
  const blocked = push.supported && Notification.permission === "denied";
  const available = push.supported && push.configured && !blocked;
  return (
    <section aria-label="Notificações" className="mx-auto max-w-md space-y-3">
      <p className="text-sm text-white/70">
        {push.enabled
          ? "As notificações já estão ativadas neste dispositivo."
          : blocked
            ? "As notificações estão bloqueadas. Você pode liberar a permissão nas configurações do navegador."
            : available
              ? "Ative as notificações para receber o aviso mesmo com o Valora fechado."
              : "As notificações push estão indisponíveis neste dispositivo. Você pode acompanhar seus alertas no Valora."}
      </p>
      {push.error && (
        <p role="alert" className="text-sm text-rose-300">
          {push.error}
        </p>
      )}
      {actionsContainer &&
        createPortal(
          <div className="grid gap-2">
            <nav
              aria-label="Navegação da apresentação"
              className="flex justify-between gap-3"
            >
              <button
                type="button"
                onClick={onBack}
                disabled={push.busy}
                className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={onFinish}
                disabled={push.busy}
                className={nextButton}
              >
                Começar a usar o Valora{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </nav>
            {available && !push.enabled && (
              <button
                type="button"
                className={`${primaryButton} sm:w-full`}
                disabled={push.busy || !push.ready}
                onClick={() => void push.toggle()}
              >
                {push.busy ? "Ativando…" : "Ativar notificações"}
              </button>
            )}
          </div>,
          actionsContainer,
        )}
    </section>
  );
}
