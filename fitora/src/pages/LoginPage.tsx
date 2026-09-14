import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/services/authService";

export function LoginPage() {
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
      setError("Merci de renseigner votre email et votre mot de passe.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      pushToast("Connexion réussie", "success");
      navigate(redirectTo, { replace: true });
    } catch (e) {
      if (e instanceof AuthError) setError(e.message);
      else setError("Une erreur est survenue. Réessayez.");
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
          <h1 className="mt-4 font-display text-xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-fitora-gray">Accédez à votre compte FITORA.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="vous@email.com"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Mot de passe</span>
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
              Mot de passe oublié ?
            </Link>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Connexion..." : <><LogIn size={16} /> Se connecter</>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fitora-gray">
          Pas encore de compte ?{" "}
          <Link to="/register" className="font-semibold text-fitora-green hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
