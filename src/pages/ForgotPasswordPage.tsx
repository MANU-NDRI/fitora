import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/services/authService";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    await requestPasswordReset(email.trim());
    setSubmitting(false);
    setSent(true);
  }

  return (
    <div className="container-fitora flex min-h-[70vh] items-center justify-center py-14">
      <div className="w-full max-w-sm text-center">
        <span className="font-display text-3xl font-extrabold tracking-tight">
          FIT<span className="text-fitora-green">ORA</span>
        </span>
        <h1 className="mt-4 font-display text-xl font-bold">Mot de passe oublié</h1>

        {sent ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-fitora-green/30 bg-fitora-green/5 p-6">
            <CheckCircle2 size={32} className="text-fitora-green" />
            <p className="text-sm text-fitora-gray">
              Si un compte existe pour <strong className="text-fitora-white">{email}</strong>, un lien de
              récupération vient de lui être envoyé.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fitora-gray">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="vous@email.com"
              />
            </label>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Envoi..." : <><Mail size={16} /> Envoyer le lien</>}
            </Button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-sm text-fitora-gray hover:text-fitora-green">
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
