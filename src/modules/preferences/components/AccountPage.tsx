import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  PanelLeft,
  UserRound,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { authService } from "../../auth/services/authService";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { EditProfileForm } from "./EditProfileForm";
import { useSidebarPreference } from "../../../shared/stores/useSidebarPreference";
import { usePushNotifications } from "../../alerts/hooks/usePushNotifications";

const sections = [
  {
    id: "dados",
    label: "Meus dados",
    description: "Nome e telefone",
    icon: UserRound,
  },
  {
    id: "email",
    label: "Alterar meu email",
    description: "Endereço de acesso",
    icon: Mail,
  },
  {
    id: "senha",
    label: "Alterar minha senha",
    description: "Segurança da conta",
    icon: KeyRound,
  },
  {
    id: "preferencias",
    label: "Preferências e notificações",
    description: "Menu e alertas neste dispositivo",
    icon: PanelLeft,
  },
] as const;

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function AccountPage() {
  const { user, logout } = useAuth();
  const { compact, setCompact } = useSidebarPreference(user?.id);
  const push = usePushNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedIndex = sections.findIndex(
    (section) => location.pathname === `/conta/${section.id}`,
  );
  const selected = selectedIndex >= 0 ? sections[selectedIndex] : undefined;
  const previousIndex = useRef(-1);
  const direction = selectedIndex < previousIndex.current ? "up" : "down";
  const returningToMenu = selectedIndex === -1 && previousIndex.current !== -1;
  useEffect(() => {
    previousIndex.current = selectedIndex;
  }, [selectedIndex]);
  const [isLeaving, setIsLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { data: profile } = useQuery({
    queryKey: ["account", "profile", user?.id],
    queryFn: () => authService.getUserProfile(user!.id),
    enabled: Boolean(user?.id),
    retry: false,
  });

  const fullName =
    textValue(profile?.full_name) || textValue(user?.user_metadata?.full_name);
  const email = textValue(user?.email) || textValue(profile?.email);
  const phone = profile
    ? textValue(profile.phone)
    : textValue(user?.user_metadata?.phone) || textValue(user?.phone);
  const displayName = fullName || email.split("@")[0] || "Sua conta";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const notificationStatus = !push.supported
    ? "Indisponíveis neste navegador"
    : !push.configured
      ? "Indisponíveis neste ambiente"
      : !push.ready
        ? "Verificando…"
        : push.enabled
          ? "Ativadas neste dispositivo"
          : "Desativadas neste dispositivo";

  const handleLogout = async () => {
    setIsLeaving(true);
    setLogoutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Não foi possível encerrar a sessão. Tente novamente.");
      setIsLeaving(false);
    }
  };

  return (
    <section className="mr-auto w-full max-w-[1440px] overflow-x-clip px-4 pb-12 pt-6 md:px-0 md:pt-10">
      <header className="mb-7 hidden md:block">
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Perfil e conta
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Gerencie seus dados, acesso e preferências.
        </p>
      </header>
      <div className="grid min-w-0 gap-8 md:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] md:items-start lg:gap-12">
        <div
          data-returning={returningToMenu || undefined}
          className={
            selected ? "account-menu hidden md:block" : "account-menu block"
          }
        >
          <h1 className="mb-6 text-2xl font-semibold text-white md:hidden">
            Perfil e conta
          </h1>
          <div role="group" aria-label="Conta conectada" className="mb-8 flex items-center gap-4 border-b border-white/10 pb-7 md:hidden">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#A66AF4] text-lg font-semibold text-white" aria-hidden="true">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-white">{displayName}</p>
              {email && <p className="mt-0.5 truncate text-sm text-white/60">{email}</p>}
              <p className="mt-0.5 text-sm text-white/50">{phone || "Telefone não informado"}</p>
            </div>
          </div>
          <nav aria-label="Opções da conta" className="space-y-2">
            {sections.map(({ id, label, description, icon: Icon }) => (
              <div key={id}>
                {id === "dados" && (
                  <h3 className="mb-3 px-1 text-sm font-medium text-white/45">
                    Perfil
                  </h3>
                )}
                {id === "email" && (
                  <h3 className="mb-3 mt-7 px-1 text-sm font-medium text-white/45">
                    Acesso
                  </h3>
                )}
                {id === "preferencias" && (
                  <h3 className="mb-3 mt-7 px-1 text-sm font-medium text-white/45">
                    Preferências e Notificações
                  </h3>
                )}
                <Link
                  to={`/conta/${id}`}
                  aria-current={selected?.id === id ? "page" : undefined}
                  className={`account-section-link flex min-h-[72px] items-center gap-3 rounded-2xl  px-4 py-3 transition-[background-color,border-color,color] duration-300 ease-out hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8F91E9] ${selected?.id === id ? "border-[#8F91E9]/40 bg-[#8F91E9]/15 text-white" : "border-white/[0.07] bg-[#242424] text-white/85"}`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-300 ${selected?.id === id ? "bg-[#8F91E9]/20 text-[#B8BAFF]" : "bg-white/[0.08] text-white/65"}`}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="mt-0.5 block text-xs text-white/45">
                      {description}
                    </span>
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-[transform,color] duration-300 ${selected?.id === id ? "translate-x-0.5 text-[#B8BAFF]" : "text-white/35"}`}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            ))}
          </nav>
          <h3 className="mb-3 mt-7 px-1 text-sm font-medium text-white/45">
            Conta
          </h3>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLeaving}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-rose-500/25 bg-rose-950/25 px-4 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-900/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400/60 disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            {isLeaving ? "Saindo…" : "Encerrar sessão"}
          </button>
          {logoutError && (
            <p role="alert" className="px-4 text-sm text-rose-300">
              {logoutError}
            </p>
          )}
        </div>
        <div className={selected ? "min-w-0" : "hidden min-w-0 md:block"}>
          {selected ? (
            <div
              key={selected.id}
              data-direction={direction}
              className="account-section-panel min-w-0 md:rounded-2xl  md:bg-white/[0.065] md:p-7 lg:p-9"
            >
              <header className="sticky top-0 z-10 -mx-4 -mt-6 mb-6 flex min-h-16 items-center border-b border-white/10 bg-[#131313] px-4 md:hidden">
                <Link
                  to="/conta"
                  aria-label="Voltar para perfil e conta"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nf-purple"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Link>
                <h1 className="min-w-0 flex-1 pr-11 text-center text-lg font-semibold text-white">
                  {selected.label}
                </h1>
              </header>
              <header className="mb-7 hidden border-b border-white/10 pb-5 md:block">
                <h2 className="text-xl font-semibold text-white md:text-2xl">
                  {selected.label}
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  {selected.description}
                </p>
              </header>
              {selected.id === "dados" && (
                <EditProfileForm
                  key="dados"
                  fullName={fullName}
                  phone={phone}
                  email={email}
                  section="dados"
                />
              )}
              {selected.id === "email" && (
                <EditProfileForm
                  key="email"
                  fullName={fullName}
                  phone={phone}
                  email={email}
                  section="email"
                />
              )}
              {selected.id === "senha" && <ChangePasswordForm direct />}
              {selected.id === "preferencias" && (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-3">
                      <PanelLeft
                        className="h-5 w-5 text-[#B88AF6]"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold text-white">
                        Barra lateral
                      </h3>
                    </div>
                    <p
                      id="sidebar-preference-help"
                      className="mt-2 text-sm text-white/50"
                    >
                      Escolha como o menu deve abrir neste navegador. O botão de
                      expandir ou recolher também salva sua escolha.
                    </p>
                    <label className="mt-5 block text-sm text-white/75">
                      Estado do menu
                      <select
                        aria-describedby="sidebar-preference-help"
                        value={compact ? "compact" : "expanded"}
                        onChange={(event) =>
                          setCompact(event.target.value === "compact")
                        }
                        className="mt-2 min-h-11 w-full max-w-sm rounded-xl border border-white/15 bg-[#262626] px-3 text-white outline-none transition-colors focus:border-[#A5A0F5] focus:outline-none focus:ring-0 focus-visible:border-[#A5A0F5] focus-visible:outline-none focus-visible:ring-0"
                      >
                        <option value="expanded">Expandida</option>
                        <option value="compact">Retraída</option>
                      </select>
                    </label>
                  </div>
                  <div className="border-t border-white/10 pt-7">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-[#B8BAFF]" aria-hidden="true" />
                      <h3 className="text-sm font-semibold text-white">Notificações</h3>
                    </div>
                    <p className="mt-2 text-sm text-white/50">
                      Receba neste dispositivo os alertas do Valora, mesmo com o app fechado.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">Alertas neste dispositivo</p>
                        <p className="mt-1 text-xs text-white/50" role="status">{notificationStatus}</p>
                      </div>
                      {push.supported && push.configured && (
                        <button
                          type="button"
                          onClick={() => void push.toggle()}
                          disabled={push.busy || !push.ready}
                          aria-pressed={push.enabled}
                          className="min-h-11 rounded-xl border border-[#8F91E9]/40 bg-[#8F91E9]/15 px-4 text-sm font-medium text-[#D5D6FF] transition-colors hover:bg-[#8F91E9]/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#A5A0F5] disabled:opacity-50"
                        >
                          {push.busy ? "Aguarde…" : push.enabled ? "Desativar notificações" : "Ativar notificações"}
                        </button>
                      )}
                    </div>
                    {push.error && <p role="alert" className="mt-3 text-sm text-rose-300">{push.error}</p>}
                    {push.supported && push.configured && (
                      <p className="mt-3 text-xs text-white/45">
                        A permissão do navegador também pode ser alterada nas configurações do dispositivo.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="min-w-0 md:pl-4 lg:pl-8">
              <div className="flex flex-wrap items-center gap-5 pb-8">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#A66AF4] text-2xl font-semibold text-white" aria-hidden="true">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-semibold tracking-tight text-white">{displayName}</h2>
                  {email && <p className="mt-1 break-all text-sm text-white/60">{email}</p>}
                  {phone && <p className="mt-1 text-sm text-white/50">{phone}</p>}
                </div>
              </div>
              <div className="grid border-t border-white/10 md:grid-cols-2">
                <div className="border-b border-white/10 py-5 md:pr-6">
                  <div className="flex items-center gap-2 text-white/50">
                    <PanelLeft className="h-4 w-4" aria-hidden="true" />
                    <h3 className="text-sm">Barra lateral</h3>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">{compact ? "Retraída" : "Expandida"}</p>
                </div>
                <div className="border-b border-white/10 py-5 md:pl-6">
                  <div className="flex items-center gap-2 text-white/50">
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    <h3 className="text-sm">Notificações</h3>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white" role="status">{notificationStatus}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
