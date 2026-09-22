import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { useTranslation } from "@/i18n/i18nStore";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/services/authService";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const pushToast = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/compte";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(t("auth.fillCredentials"));
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      pushToast(t("auth.loginSuccess"), "success");
      navigate(redirectTo, { replace: true });
    } catch (e) {
      if (e instanceof AuthError) setError(e.message);
      else setError(t("auth.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-fitora flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            FIT<span className="text-fitora-green">ORA</span>
          </span>
          <h1 className="mt-4 font-display text-xl font-bold">{t("auth.loginTitle")}</h1>
          <p className="mt-1 text-sm text-fitora-gray">{t("auth.loginSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{t("auth.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-fitora-gray hover:text-fitora-green">
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t("auth.connecting") : <><LogIn size={16} /> {t("auth.loginButton")}</>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fitora-gray">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="font-semibold text-fitora-green hover:underline">
            {t("auth.registerTitle")}
          </Link>
        </p>
      </div>
    </div>
  );
}
