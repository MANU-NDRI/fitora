import { supabase } from "@/lib/supabase";

export interface CustomerLocation {
  consent: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  updatedAt: string;
}

function mapRow(row: any): CustomerLocation {
  return {
    consent: row.consent ?? false,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    accuracyMeters: row.accuracy_meters ?? null,
    updatedAt: row.updated_at,
  };
}

/** Lit l'état de partage de position du client connecté (ou null si jamais configuré). */
export async function getMyLocation(): Promise<CustomerLocation | null> {
  const { data, error } = await supabase
    .from("customer_locations")
    .select("consent, latitude, longitude, accuracy_meters, updated_at")
    .maybeSingle();

  if (error) {
    console.error("Erreur lecture position :", error);
    throw error;
  }

  return data ? mapRow(data) : null;
}

/**
 * Demande la position au navigateur (déclenche la boîte de dialogue native
 * de consentement du navigateur) puis l'enregistre en base UNIQUEMENT si
 * l'utilisateur accepte. N'est jamais appelée automatiquement : toujours à
 * l'initiative explicite d'un clic du client.
 */
export async function shareMyLocation(customerId: string): Promise<CustomerLocation> {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

  const { data, error } = await supabase
    .from("customer_locations")
    .upsert(
      {
        customer_id: customerId,
        consent: true,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_meters: position.coords.accuracy,
      },
      { onConflict: "customer_id" }
    )
    .select("consent, latitude, longitude, accuracy_meters, updated_at")
    .single();

  if (error) {
    console.error("Erreur enregistrement position :", error);
    throw error;
  }

  return mapRow(data);
}

/**
 * Retire le consentement : le trigger côté base (guard_customer_location)
 * efface immédiatement les coordonnées stockées, elles ne sont jamais
 * conservées "au cas où".
 */
export async function withdrawLocationConsent(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("customer_locations")
    .upsert(
      { customer_id: customerId, consent: false },
      { onConflict: "customer_id" }
    );

  if (error) {
    console.error("Erreur retrait consentement position :", error);
    throw error;
  }
}

/** Réservé à l'admin : consulte la position d'un client précis (si consenti). */
export async function adminGetCustomerLocation(customerId: string): Promise<CustomerLocation | null> {
  const { data, error } = await supabase
    .from("customer_locations")
    .select("consent, latitude, longitude, accuracy_meters, updated_at")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Erreur lecture position (admin) :", error);
    throw error;
  }

  return data ? mapRow(data) : null;
}
