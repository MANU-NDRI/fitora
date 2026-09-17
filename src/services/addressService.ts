import { supabase } from "@/lib/supabase";
import type { Address } from "@/types";

interface AddressRow {
  id: string;
  customer_id: string;
  label: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  city: string;
  commune: string;
  quartier: string;
  address: string;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
}

type AddressInput = Omit<Address, "id"> & { id?: string };

function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    fullName: row.full_name,
    phone: row.phone,
    whatsapp: row.whatsapp ?? undefined,
    city: row.city,
    commune: row.commune,
    quartier: row.quartier,
    address: row.address,
    isDefault: row.is_default,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  };
}

async function getAuthenticatedUserId(userId: string): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Vous devez être connecté.");
  }

  if (data.user.id !== userId) {
    throw new Error("Utilisateur non autorisé.");
  }

  return data.user.id;
}

export async function getAddresses(userId: string): Promise<Address[]> {
  const authenticatedUserId = await getAuthenticatedUserId(userId);

  const { data, error } = await supabase
    .from("addresses")
    .select(
      "id, customer_id, label, full_name, phone, whatsapp, city, commune, quartier, address, is_default, latitude, longitude",
    )
    .eq("customer_id", authenticatedUserId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapAddress(row as AddressRow));
}

export async function saveAddress(
  userId: string,
  address: AddressInput,
): Promise<Address[]> {
  const authenticatedUserId = await getAuthenticatedUserId(userId);

  const payload = {
    customer_id: authenticatedUserId,
    label: address.label.trim(),
    full_name: address.fullName.trim(),
    phone: address.phone.trim(),
    whatsapp: address.whatsapp?.trim() || null,
    city: address.city.trim(),
    commune: address.commune.trim(),
    quartier: address.quartier.trim(),
    address: address.address.trim(),
    is_default: Boolean(address.isDefault),
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
  };

  if (address.id) {
    const { error } = await supabase
      .from("addresses")
      .update(payload)
      .eq("id", address.id)
      .eq("customer_id", authenticatedUserId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("addresses").insert(payload);

    if (error) {
      throw error;
    }
  }

  // Une seule adresse peut être principale :
  // cette logique reste volontairement côté application
  // jusqu'à vérification de la contrainte SQL correspondante.
  if (payload.is_default) {
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("customer_id", authenticatedUserId)
      .neq("id", address.id ?? "");

    if (error) {
      throw error;
    }

    if (address.id) {
      const { error: restoreError } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", address.id)
        .eq("customer_id", authenticatedUserId);

      if (restoreError) {
        throw restoreError;
      }
    }
  }

  return getAddresses(authenticatedUserId);
}

export async function deleteAddress(
  userId: string,
  addressId: string,
): Promise<Address[]> {
  const authenticatedUserId = await getAuthenticatedUserId(userId);

  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", authenticatedUserId);

  if (error) {
    throw error;
  }

  return getAddresses(authenticatedUserId);
}