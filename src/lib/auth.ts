/**
 * Authentication & User Profile Functions
 * EduPlatform Starter
 */
import { supabase } from './supabase-client';
import type { UserProfile, SubscriptionPlan } from './supabase-client';

// --- Plan limits ---

export interface PlanLimits {
  maxGroups: number;
  maxParticipantsPerGroup: number;
  maxActiveSessions: number;
}

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: { maxGroups: 2, maxParticipantsPerGroup: 30, maxActiveSessions: 1 },
  pro: { maxGroups: 20, maxParticipantsPerGroup: 100, maxActiveSessions: 5 },
  enterprise: { maxGroups: Infinity, maxParticipantsPerGroup: Infinity, maxActiveSessions: Infinity },
};

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function isPremiumFeature(plan: SubscriptionPlan): boolean {
  return plan === 'pro' || plan === 'enterprise';
}

// --- Auth Functions ---

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Supabase not configured' };

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError || !authData.user) {
    return { user: null, error: authError?.message || 'Sign up failed' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({ auth_user_id: authData.user.id, display_name: displayName })
    .select()
    .single();

  if (profileError) return { user: null, error: profileError.message };
  return { user: profile, error: null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message || null };
}

export async function signInWithOAuth(
  provider: 'google' | 'github' | 'azure',
  redirectTo?: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo || `${window.location.origin}/dashboard`,
    },
  });
  return { error: error?.message || null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function resetPasswordForEmail(
  email: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error: error?.message || null };
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Try to fetch existing profile
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (data) {
    return {
      ...data,
      role: data.role || 'member',
      subscription_plan: data.subscription_plan || 'free',
    };
  }

  // First OAuth login: auto-create user profile from auth metadata
  const meta = user.user_metadata || {};
  const displayName =
    meta.full_name || meta.name || user.email?.split('@')[0] || 'User';

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ auth_user_id: user.id, display_name: displayName })
    .select()
    .single();

  if (insertError) {
    console.error('Auto-create user profile failed:', insertError);
    return null;
  }

  return {
    ...newUser,
    role: newUser.role || 'member',
    subscription_plan: newUser.subscription_plan || 'free',
  };
}

export function onAuthStateChange(
  callback: (user: UserProfile | null) => void,
) {
  if (!supabase) return { unsubscribe: () => {} };

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      const user = await getCurrentUser();
      callback(user);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}
