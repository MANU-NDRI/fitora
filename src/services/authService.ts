import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types";

export class AuthError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

// Résultat du signUp : soit le profil est prêt, soit une confirmation
// email est requise et on n'a pas encore de session active.
export type SignUpResult =
  | { status: "confirmed"; profile: UserProfile }
  | { status: "needs_email_confirmation"; profile: UserProfile };

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

// Traduit les messages Supabase (EN) en messages FR cohérents avec le reste de l'app.
// Matching par mot-clé plutôt qu'égalité stricte, car Supabase peut légèrement
// faire varier la formulation exacte selon les versions.
function translateAuthError(message: string): string {
  const rules: Array<[RegExp, string]> = [
    [/invalid login credentials/i, "Email ou mot de passe incorrect."],
    [/user already registered/i, "Un compte existe déjà avec cet email."],
    [/email not confirmed/i, "Merci de confirmer votre email avant de vous connecter."],
    [/password should be at least/i, "Le mot de passe doit contenir au moins 6 caractères."],
  ];

  for (const [pattern, translated] of rules) {
    if (pattern.test(message)) return translated;
  }
  return message;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Le profil peut être créé par un trigger côté DB juste après l'inscription.
// On retente donc quelques fois avant d'abandonner, au lieu d'échouer immédiatement.
async function fetchProfileWithRetry(
  userId: string,
  attempts = 3,
  delayMs = 400
) {
  let lastError: any = null;

  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }

    lastError = error;
    if (i < attempts - 1) {
      await sleep(delayMs * (i + 1)); // backoff progressif
    }
  }

  throw lastError ?? new Error("Profil introuvable.");
}

export async function signUp(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<SignUpResult> {
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
    throw new AuthError(translateAuthError(error.message), error.code);
  }

  if (!data.user) {
    throw new AuthError("Impossible de créer le compte.");
  }

  // Piège Supabase : si "Confirm email" est activé et que l'email existe déjà,
  // signUp() ne renvoie PAS d'erreur. Il renvoie un user avec identities: []
  // et pas de session — signature identique à un vrai nouvel inscrit en
  // attente de confirmation. Sans cette vérification, un utilisateur existant
  // croirait avoir créé un compte et attendrait un email qui n'arrivera jamais.
  if (data.user.identities && data.user.identities.length === 0) {
    throw new AuthError(
      "Un compte existe déjà avec cet email.",
      "user_already_exists"
    );
  }

  // Pas de session = confirmation email requise (RLS bloquera de toute façon
  // la lecture de "profiles" tant que l'utilisateur n'est pas authentifié).
  // On construit un profil "optimiste" à partir des données saisies plutôt
  // que d'interroger la table.
  if (!data.session) {
    const optimisticProfile: UserProfile = {
      id: data.user.id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      role: "customer",
      createdAt: data.user.created_at,
    };

    return { status: "needs_email_confirmation", profile: optimisticProfile };
  }

  // Session active : on peut lire le profil, avec retry pour laisser le
  // temps au trigger de création de s'exécuter.
  try {
    const profile = await fetchProfileWithRetry(data.user.id);
    return { status: "confirmed", profile: mapProfile(profile) };
  } catch (err: any) {
    throw new AuthError(
      translateAuthError(err.message ?? "Impossible de récupérer le profil.")
    );
  }
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
    throw new AuthError(translateAuthError(error.message), error.code);
  }

  if (!data.user) {
    throw new AuthError("Connexion impossible.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    throw new AuthError(translateAuthError(profileError.message));
  }

  return mapProfile(profile);
}

export async function requestPasswordReset(
  email: string,
  redirectTo?: string
): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo ?? `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new AuthError(translateAuthError(error.message));
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "firstName" | "lastName" | "phone">>
): Promise<UserProfile> {
  const payload: Record<string, string | undefined> = {};
  if (updates.firstName !== undefined) payload.first_name = updates.firstName;
  if (updates.lastName !== undefined) payload.last_name = updates.lastName;
  if (updates.phone !== undefined) payload.phone = updates.phone;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new AuthError(translateAuthError(error.message));
  }

  return mapProfile(data);
}

// Définit un nouveau mot de passe. À utiliser uniquement quand une session
// de récupération est active (l'utilisateur vient de cliquer le lien reçu
// par email depuis requestPasswordReset).
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new AuthError(translateAuthError(error.message));
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AuthError(translateAuthError(error.message));
  }
}
