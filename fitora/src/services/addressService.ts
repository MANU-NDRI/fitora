import type { Address } from "@/types";

// Préfigure la table Supabase `profiles` / `addresses` (adresses liées au client).
function key(userId: string) {
  return `fitora-addresses-${userId}`;
}

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function read(userId: string): Address[] {
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, addresses: Address[]) {
  localStorage.setItem(key(userId), JSON.stringify(addresses));
}

export async function getAddresses(userId: string): Promise<Address[]> {
  return delay(read(userId));
}

export async function saveAddress(
  userId: string,
  address: Omit<Address, "id"> & { id?: string }
): Promise<Address[]> {
  const addresses = read(userId);
  if (address.id) {
    const index = addresses.findIndex((a) => a.id === address.id);
    if (index !== -1) addresses[index] = address as Address;
  } else {
    const newAddress: Address = { ...address, id: `addr-${Date.now()}` };
    if (newAddress.isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }
    addresses.push(newAddress);
  }
  write(userId, addresses);
  return delay(addresses);
}

export async function deleteAddress(userId: string, addressId: string): Promise<Address[]> {
  const addresses = read(userId).filter((a) => a.id !== addressId);
  write(userId, addresses);
  return delay(addresses);
}
