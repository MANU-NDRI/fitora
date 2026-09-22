import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserPlus, MailCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { useTranslation } from "@/i18n/i18nStore";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/services/authService";
import { getStoredReferralCode, clearStoredReferralCode } from "@/services/affiliateService";

export function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Bascule l'écran vers un message "vérifiez votre email" quand la
  // confirmation est requise avant de pouvoir se connecter.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const register = useAuthStore((s) => s.register);
  const pushToast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/compte";

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password) {
      setError(t("auth.fillAllFields"));
      return;
    }
    if (form.password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await register({
        ...form,
        referralCode: getStoredReferralCode() || undefined,
      });
      if (needsEmailConfirmation) {
        // Pas de session encore : on ne redirige pas vers une page protégée,
        // on invite plutôt à confirmer l'email d'abord.
        setAwaitingConfirmation(true);
      } else {
        pushToast(t("auth.accountCreated"), "success");
        clearStoredReferralCode();
        navigate(redirectTo, { replace: true });
      }
    } catch (e) {
      if (e instanceof AuthError) setError(e.message);
      else setError(t("auth.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="container-fitora flex min-h-[70vh] items-center justify-center py-14">
        <div className="w-full max-w-sm text-center">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            FIT<span className="text-fitora-green">ORA</span>
          </span>
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-fitora-green/30 bg-fitora-green/5 p-6">
            <MailCheck size={32} className="text-fitora-green" />
            <h1 className="font-display text-lg font-bold">{t("auth.checkEmailTitle")}</h1>
            <p className="text-sm text-fitora-gray">
              {t("auth.checkEmailMessage", { email: form.email })}
            </p>
          </div>
          <Link to="/login" className="mt-6 block text-sm text-fitora-gray hover:text-fitora-green">
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fitora flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            FIT<span className="text-fitora-green">ORA</span>
          </span>
          <h1 className="mt-4 font-display text-xl font-bold">{t("auth.registerTitle")}</h1>
          <p className="mt-1 text-sm text-fitora-gray">{t("auth.registerSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.firstName")}</span>
              <input
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.lastName")}</span>
              <input
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className="input"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.email")}</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="input"
              placeholder={t("auth.emailPlaceholder")}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.phone")}</span>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="input"
              placeholder={t("auth.phonePlaceholder")}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.password")}</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.confirmation")}</span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t("auth.creatingAccount") : <><UserPlus size={16} /> {t("auth.registerButton")}</>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fitora-gray">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="font-semibold text-fitora-green hover:underline">
            {t("auth.loginButton")}
          </Link>
        </p>
      </div>
    </div>
  );
}
