import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/services/authService";

export function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const user = useAuthStore.getState().user;
      if (user?.role !== "admin") {
        useAuthStore.getState().logout();
        setError("Ce compte n'a pas les droits administrateur.");
        return;
      }
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      if (e instanceof AuthError) setError(e.message);
      else setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fitora-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green">
            <ShieldCheck size={26} />
          </div>
          <span className="font-display text-2xl font-extrabold tracking-tight text-fitora-white">
            FIT<span className="text-fitora-green">ORA</span>
          </span>
          <p className="mt-1 text-sm text-fitora-gray">Espace administrateur</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@fitora.ci"
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
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-fitora-gray-dim">
          Le premier compte créé via /register sur cet environnement de démonstration
          possède automatiquement le rôle administrateur.
        </p>
      </div>
    </div>
  );
}
