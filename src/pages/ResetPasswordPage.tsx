import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updatePassword, AuthError, signOut } from "@/services/authService";
import { Button } from "@/components/ui/Button";
import { useToastStore } from "@/store/toastStore";

// Page atteinte en cliquant le lien reçu par email après "Mot de passe
// oublié". Supabase transforme automatiquement le token présent dans l'URL
// en une session de récupération temporaire (voir detectSessionInUrl dans
// lib/supabase.ts) ; cette page se contente de vérifier qu'une session
// existe puis de laisser l'utilisateur choisir un nouveau mot de passe.
export function ResetPasswordPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const pushToast = useToastStore((s) => s.push);
  const navigate = useNavigate();

  useEffect(() => {
    // Le temps que le SDK Supabase lise le fragment d'URL et établisse la
    // session peut prendre un instant après le chargement de la page.
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      // On ferme la session de récupération : l'utilisateur devra se
      // reconnecter avec son nouveau mot de passe, ce qui évite toute
      // confusion entre session "recovery" et session normale.
      await signOut().catch(() => {});
      setDone(true);
      pushToast("Mot de passe mis à jour", "success");
    } catch (e) {
      if (e instanceof AuthError) setError(e.message);
      else setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-fitora flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-sm text-center">
        <span className="font-display text-3xl font-extrabold tracking-tight">
          FIT<span className="text-fitora-green">ORA</span>
        </span>
        <h1 className="mt-4 font-display text-xl font-bold">Nouveau mot de passe</h1>

        {checkingSession ? (
          <p className="mt-6 text-sm text-fitora-gray">Vérification du lien...</p>
        ) : done ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-fitora-green/30 bg-fitora-green/5 p-6">
            <CheckCircle2 size={32} className="text-fitora-green" />
            <p className="text-sm text-fitora-gray">
              Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.
            </p>
            <Button size="sm" onClick={() => navigate("/login", { replace: true })} className="mt-2">
              Se connecter
            </Button>
          </div>
        ) : !hasRecoverySession ? (
          <div className="mt-6 rounded-2xl border border-fitora-border bg-white/5 p-6 text-left">
            <p className="text-sm text-fitora-gray">
              Ce lien de récupération est invalide ou a expiré. Merci de refaire une demande de
              réinitialisation.
            </p>
            <Link
              to="/forgot-password"
              className="mt-4 block text-center text-sm font-semibold text-fitora-green hover:underline"
            >
              Redemander un lien
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">
                Nouveau mot de passe
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">
                Confirmation
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Mise à jour..." : <><KeyRound size={16} /> Mettre à jour</>}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
