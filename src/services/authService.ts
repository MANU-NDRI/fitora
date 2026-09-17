import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types';

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

export class AuthError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type SignUpResult =
  | { status: 'confirmed'; profile: UserProfile }
  | { status: 'needs_email_confirmation'; profile: UserProfile };

function mapProfile(profile: ProfileRow): UserProfile {
  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
    createdAt: profile.created_at,
  };
}

function translateAuthError(message: string): string {
  const rules: Array<[RegExp, string]> = [
    [/invalid login credentials/i, 'Email ou mot de passe incorrect.'],
    [/user already registered/i, 'Un compte existe déjà avec cet email.'],
    [/email not confirmed/i, 'Merci de confirmer votre email avant de vous connecter.'],
    [/password should be at least/i, 'Le mot de passe doit contenir au moins 6 caractères.'],
  ];

  for (const [pattern, translated] of rules) {
    if (pattern.test(message)) return translated;
  }
  return message;
}

async function fetchProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone, role, created_at')
    .eq('id', userId)
    .single<ProfileRow>();

  if (error) {
    throw new AuthError(translateAuthError(error.message), error.code);
  }

  if (!data) {
    throw new AuthError('Profil utilisateur introuvable.');
  }

  return mapProfile(data);
}

/** Reads the authenticated user's authoritative profile from Supabase. */
export async function getCurrentProfile(userId: string): Promise<UserProfile> {
  return fetchProfile(userId);
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

  if (error || !data.user) {
    throw new AuthError(
      translateAuthError(error?.message ?? 'Impossible de créer le compte.'),
      error?.code,
    );
  }

  if (!data.session) {
    return {
      status: 'needs_email_confirmation',
      profile: {
        id: data.user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: 'customer',
        createdAt: data.user.created_at,
      },
    };
  }

  return { status: 'confirmed', profile: await getCurrentProfile(data.user.id) };
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    throw new AuthError(
      translateAuthError(error?.message ?? 'Connexion impossible.'),
      error?.code,
    );
  }

  return getCurrentProfile(data.user.id);
}

export async function requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo ?? `${window.location.origin}/reset-password`,
  });

  if (error) throw new AuthError(translateAuthError(error.message), error.code);
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'phone'>>,
): Promise<UserProfile> {
  const payload: Partial<Pick<ProfileRow, 'first_name' | 'last_name' | 'phone'>> = {};
  if (updates.firstName !== undefined) payload.first_name = updates.firstName;
  if (updates.lastName !== undefined) payload.last_name = updates.lastName;
  if (updates.phone !== undefined) payload.phone = updates.phone;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, first_name, last_name, email, phone, role, created_at')
    .single<ProfileRow>();

  if (error) throw new AuthError(translateAuthError(error.message), error.code);
  if (!data) throw new AuthError('Profil utilisateur introuvable.');
  return mapProfile(data);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new AuthError(translateAuthError(error.message), error.code);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthError(translateAuthError(error.message), error.code);
}
