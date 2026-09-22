import { useEffect, useState } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import {
  getMyLocation,
  shareMyLocation,
  withdrawLocationConsent,
  type CustomerLocation,
} from "@/services/locationService";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export function LocationConsentCard() {
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.push);
  const [location, setLocation] = useState<CustomerLocation | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyLocation()
      .then(setLocation)
      .catch(() => setLocation(null));
  }, [user]);

  if (!user) return null;

  async function handleShare() {
    setBusy(true);
    try {
      const result = await shareMyLocation(user!.id);
      setLocation(result);
      pushToast("Position partagée avec FITORA", "success");
    } catch (error) {
      // L'utilisateur a refusé la demande native du navigateur, ou une
      // erreur technique est survenue — dans les deux cas, aucune donnée
      // n'est enregistrée.
      pushToast(
        error instanceof Error
          ? error.message
          : "Position non partagée : autorisation refusée ou indisponible.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    setBusy(true);
    try {
      await withdrawLocationConsent(user!.id);
      setLocation((prev) => (prev ? { ...prev, consent: false, latitude: null, longitude: null } : prev));
      pushToast("Partage de position désactivé", "success");
    } finally {
      setBusy(false);
    }
  }

  const isSharing = location?.consent && location.latitude != null;

  return (
    <div className="max-w-lg rounded-2xl bg-fitora-charcoal p-6">
      <div className="mb-2 flex items-center gap-2">
        <MapPin size={18} className="text-fitora-green" />
        <h2 className="font-display text-lg font-bold">Position pour la livraison</h2>
      </div>
      <p className="mb-4 text-sm text-fitora-gray">
        Partagez votre position pour aider notre équipe de livraison à vous localiser plus
        précisément. C'est entièrement optionnel : nous ne l'activons jamais sans votre accord,
        et vous pouvez le désactiver à tout moment.
      </p>

      {isSharing ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-fitora-green/10 p-3 text-sm text-fitora-green">
          <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Position partagée avec FITORA</p>
            <p className="text-fitora-green/80">
              Dernière mise à jour : {formatDateTime(location!.updatedAt)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-xs text-fitora-gray-dim">
          Aucune position n'est actuellement partagée avec FITORA.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleShare} disabled={busy}>
          {isSharing ? "Actualiser ma position" : "Partager ma position"}
        </Button>
        {isSharing && (
          <Button variant="outline" onClick={handleWithdraw} disabled={busy}>
            Retirer mon consentement
          </Button>
        )}
      </div>
    </div>
  );
}
