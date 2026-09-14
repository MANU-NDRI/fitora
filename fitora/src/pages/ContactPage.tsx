import { useState } from "react";
import { MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { buildWhatsAppLink, whatsappGenericMessage, FITORA_WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { sendContactMessage } from "@/services/messageService";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

const displayNumber = `+225 ${FITORA_WHATSAPP_NUMBER.slice(3, 5)} ${FITORA_WHATSAPP_NUMBER.slice(5, 7)} ${FITORA_WHATSAPP_NUMBER.slice(7, 9)} ${FITORA_WHATSAPP_NUMBER.slice(9, 11)} ${FITORA_WHATSAPP_NUMBER.slice(11, 13)}`;

export function ContactPage() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({
    name: user ? `${user.firstName} ${user.lastName}` : "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.phone.trim() || !form.subject.trim() || !form.message.trim()) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }

    setSending(true);
    try {
      await sendContactMessage({ ...form, customerId: user?.id });
      setSent(true);
      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container-fitora py-8 md:py-14">
      <h1 className="font-display text-2xl font-bold md:text-3xl">Contactez FITORA</h1>
      <p className="mt-2 max-w-xl text-sm text-fitora-gray">
        Une question sur un produit, une commande ou une livraison ? Écrivez-nous
        sur WhatsApp ou envoyez-nous un message via le formulaire ci-dessous.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <a
            href={buildWhatsAppLink(whatsappGenericMessage())}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl bg-fitora-green px-6 py-5 text-fitora-black transition-transform hover:scale-[1.01]"
          >
            <MessageCircle size={28} />
            <div>
              <p className="font-display font-bold">Contacter FITORA sur WhatsApp</p>
              <p className="text-sm opacity-80">{displayNumber}</p>
            </div>
          </a>

          <div className="mt-6 rounded-2xl border border-fitora-border p-6 text-sm text-fitora-gray">
            <p className="font-display mb-2 font-semibold text-fitora-white">Nos horaires</p>
            <p>Lundi – Samedi : 9h00 – 20h00</p>
            <p>Dimanche : 10h00 – 16h00</p>
          </div>
        </div>

        <div>
          {sent ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-fitora-green/30 bg-fitora-green/5 p-10 text-center">
              <CheckCircle2 size={36} className="text-fitora-green" />
              <p className="font-display font-semibold">Votre message a bien été envoyé à FITORA.</p>
              <p className="text-sm text-fitora-gray">Nous vous répondrons dans les plus brefs délais.</p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Envoyer un autre message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom complet *">
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="input"
                    placeholder="Votre nom"
                  />
                </Field>
                <Field label="Téléphone *">
                  <input
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="input"
                    placeholder="07 00 00 00 00"
                  />
                </Field>
              </div>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="input"
                  placeholder="vous@email.com"
                />
              </Field>
              <Field label="Sujet *">
                <input
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  className="input"
                  placeholder="Objet de votre message"
                />
              </Field>
              <Field label="Message *">
                <textarea
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  rows={5}
                  className="input resize-none"
                  placeholder="Écrivez votre message ici..."
                />
              </Field>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button type="submit" size="lg" className="w-full" disabled={sending}>
                {sending ? "Envoi en cours..." : (
                  <>
                    <Send size={16} /> Envoyer le message
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fitora-gray">{label}</span>
      {children}
    </label>
  );
}
