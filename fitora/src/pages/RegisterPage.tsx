import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { AuthError } from "@/services/authService";

export function RegisterPage() {
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
      setError("Merci de remplir tous les champs.");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
      pushToast("Compte créé", "success");
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
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            FIT<span className="text-fitora-green">ORA</span>
          </span>
          <h1 className="mt-4 font-display text-xl font-bold">Créer un compte</h1>
          <p className="mt-1 text-sm text-fitora-gray">
            Un compte est nécessaire pour passer commande sur FITORA.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Prénom</span>
              <input
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Nom</span>
              <input
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className="input"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="input"
              placeholder="vous@email.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Téléphone</span>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="input"
              placeholder="07 00 00 00 00"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Mot de passe</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Confirmation</span>
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
            {submitting ? "Création..." : <><UserPlus size={16} /> Créer mon compte</>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fitora-gray">
          Déjà un compte ?{" "}
          <Link to="/login" className="font-semibold text-fitora-green hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
