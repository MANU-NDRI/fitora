import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types";

export class AuthError extends Error {}

function mapProfile(profile: any): UserProfile {
  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    phone: profile.phone ?? "",
    role: profile.role ?? "customer",
    createdAt: profile.created_at,
  };
}

export async function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
      },
    },
  });

  if (error) {
    throw new AuthError(error.message);
  }

  if (!data.user) {
    throw new AuthError("Impossible de créer le compte.");
  }

  // Récupération du profil créé dans la table profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    throw new AuthError(profileError.message);
  }

  return mapProfile(profile);
}

export async function signIn(
  email: string,
  password: string
): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AuthError(error.message);
  }

  if (!data.user) {
    throw new AuthError("Connexion impossible.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    throw new AuthError(profileError.message);
  }

  return mapProfile(profile);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw new AuthError(error.message);
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<UserProfile, "firstName" | "lastName" | "phone">
  >
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: updates.firstName,
      last_name: updates.lastName,
      phone: updates.phone,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new AuthError(error.message);
  }

  return mapProfile(data);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AuthError(error.message);
  }
}