import { useState, type FormEvent } from "react";
import { useState, type FormEvent } from "react";
import { authService } from "../../auth/services/authService";
import {
  PASSWORD_HELP,
  passwordSchema,
} from "../../auth/schemas/passwordSchema";

export function ChangePasswordForm({ direct = false }: { direct?: boolean }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const inputClass =
    "mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-[#262626] px-3 text-white outline-none transition-colors focus:border-[#A5A0F5] focus:outline-none focus:ring-0 focus-visible:border-[#A5A0F5] focus-visible:outline-none focus-visible:ring-0";

  async function sendCode() {
    setPending(true);
    setError("");
    try {
      await authService.requestPasswordChangeCode();
      setMessage(
        "Código enviado ao email da sua conta. Confira também o spam.",
      );
    } catch {
      setError("Não foi possível enviar o código. Aguarde e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    
    if (!currentPassword.trim()) {
      setError("Informe sua senha atual para validação de segurança");
      return;
    }
    
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    try {
      await authService.changePassword(
        currentPassword,
        password,
        needsCode ? nonce.trim() : undefined,
      );
      setCurrentPassword("");
      setPassword("");
      setConfirmation("");
      setNonce("");
      setNeedsCode(false);
      setOpen(false);
      setMessage("Senha alterada com sucesso.");
    } catch (cause) {
      const error = cause as { message?: string; code?: string };
      if (error.message === 'Senha atual está incorreta') {
        setError("Senha atual está incorreta");
      } else if (error.code === "reauthentication_needed") {
        setNeedsCode(true);
        setError(
          "Confirme sua identidade: envie um código ao seu email e informe-o abaixo.",
        );
      } else if (error.code === "reauthentication_not_valid") {
        setError("Código inválido ou expirado. Solicite outro código.");
      } else if (error.code === "same_password") {
        setError("Escolha uma senha diferente da atual.");
      } else {
        setError(
          "Não foi possível alterar a senha. Confira os dados e tente novamente.",
        );
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      {!open && !direct ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage("");
          }}
          className="min-h-11 rounded-xl border border-white/15 px-4 text-sm text-white"
        >
          Alterar senha
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p id="change-password-help" className="text-xs text-white/50">
            {PASSWORD_HELP}
          </p>
          <label className="block text-sm text-white/75">
            Senha atual
            <div className="relative mt-1">
              <input
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                maxLength={256}
                disabled={pending}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={pending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white disabled:opacity-50"
                aria-label={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showCurrentPassword ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM2 10a8 8 0 1111.955 7.293l-1.414-1.414A6 6 0 108 4a6.002 6.002 0 015.364 3.167l1.41-1.41A7.973 7.973 0 002 10zm8-6a1 1 0 100 2 1 1 0 000-2z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="block text-sm text-white/75">
            Nova senha
            <div className="relative mt-1">
              <input
                aria-describedby="change-password-help"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={256}
                disabled={pending}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={pending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white disabled:opacity-50"
                aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showNewPassword ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM2 10a8 8 0 1111.955 7.293l-1.414-1.414A6 6 0 108 4a6.002 6.002 0 015.364 3.167l1.41-1.41A7.973 7.973 0 002 10zm8-6a1 1 0 100 2 1 1 0 000-2z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          <label className="block text-sm text-white/75">
            Confirmar nova senha
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                maxLength={256}
                disabled={pending}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={pending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white disabled:opacity-50"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM2 10a8 8 0 1111.955 7.293l-1.414-1.414A6 6 0 108 4a6.002 6.002 0 015.364 3.167l1.41-1.41A7.973 7.973 0 002 10zm8-6a1 1 0 100 2 1 1 0 000-2z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {needsCode && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={pending}
                className="min-h-11 text-sm text-nf-blue disabled:opacity-50"
              >
                Enviar novo código por email
              </button>
              <label className="block text-sm text-white/75">
                Código de confirmação
                <input
                  autoComplete="one-time-code"
                  value={nonce}
                  onChange={(e) => setNonce(e.target.value)}
                  required
                  disabled={pending}
                  className={inputClass}
                />
              </label>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-xl bg-nf-purple px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Aguarde…" : "Salvar nova senha"}
            </button>
            {!direct && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setCurrentPassword("");
                  setPassword("");
                  setConfirmation("");
                  setNonce("");
                  setError("");
                  setMessage("");
                  setNeedsCode(false);
                }}
                className="min-h-11 px-2 text-sm text-white/60"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-nf-green">
          {message}
        </p>
      )}
    </div>
  );
}
