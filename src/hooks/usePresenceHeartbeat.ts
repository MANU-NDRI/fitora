import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

// Fréquence du signal de présence. Combinée à la fenêtre de 5 minutes côté
// admin (adminCustomerService.PRESENCE_WINDOW_MS), un client dont l'onglet
// est resté ouvert sans être fermé proprement n'apparaîtra plus "actif"
// que quelques minutes après avoir réellement arrêté d'utiliser le site.
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Envoie périodiquement un signal de présence pour les clients connectés,
 * afin que l'admin puisse distinguer "inscrit" de "actuellement actif".
 * Ne collecte aucune donnée de localisation ni de navigation détaillée —
 * uniquement un horodatage, et seulement pendant que l'onglet est visible
 * (voir NotificationBell pour le même principe appliqué au polling).
 *
 * Le client ne peut pas falsifier cette valeur : un trigger côté base
 * (protect_profile_sensitive_fields) force last_seen_at à l'heure serveur
 * réelle quel que soit ce qui est envoyé.
 */
export function usePresenceHeartbeat() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;

    function sendHeartbeat() {
      // Erreur silencieuse et non bloquante : la présence est une
      // fonctionnalité d'confort admin, jamais critique pour l'expérience client.
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.error("Erreur signal de présence :", error);
        });
    }

    let interval: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (interval) return;
      sendHeartbeat();
      interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    function stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);
}
