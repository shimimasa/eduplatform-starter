/**
 * Organization Management, User Admin, Invitations, Role Audit
 * EduPlatform Starter
 */
import { supabase } from './supabase-client';
import type {
  OrganizationRow,
  UserProfile,
  UserRole,
  InvitationRow,
  InvitationPreview,
  RoleChangeLogRow,
} from './supabase-client';

// --- Organization CRUD ---

export async function fetchOrganization(orgId: string): Promise<OrganizationRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Failed to fetch organization:', error);
    return null;
  }
  return data;
}

export async function createOrganization(
  name: string,
  organizationType?: string,
): Promise<OrganizationRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, organization_type: organizationType || null })
    .select()
    .single();

  if (error) {
    console.error('Failed to create organization:', error);
    return null;
  }
  return data;
}

export async function updateOrganization(
  orgId: string,
  updates: { name?: string; organization_type?: string; domain_hint?: string },
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  if (error) {
    console.error('Failed to update organization:', error);
    return false;
  }
  return true;
}

/** Ensure a user has an organization; create one if missing */
export async function ensureUserOrganization(
  userId: string,
  displayName: string,
): Promise<string | null> {
  if (!supabase) return null;

  const { data: user } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (user?.organization_id) return user.organization_id;

  const org = await createOrganization(`${displayName}'s Organization`);
  if (!org) return null;

  const { error } = await supabase
    .from('users')
    .update({ organization_id: org.id })
    .eq('id', userId);

  if (error) {
    console.error('Failed to assign organization:', error);
    return null;
  }
  return org.id;
}

// --- User Management (within organization) ---

export async function fetchOrganizationUsers(
  orgId: string,
): Promise<UserProfile[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch org users:', error);
    return [];
  }
  return (data || []).map((u: UserProfile) => ({
    ...u,
    role: u.role || 'member',
  }));
}

export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  actorUserId: string,
  organizationId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  // Fetch current role for audit log
  const { data: targetUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', targetUserId)
    .single();

  if (!targetUser) return { ok: false, error: 'User not found' };
  const beforeRole = targetUser.role;

  // Update role
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (updateError) return { ok: false, error: updateError.message };

  // Log the change
  await supabase.from('role_change_logs').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    target_user_id: targetUserId,
    before_role: beforeRole,
    after_role: newRole,
  });

  return { ok: true };
}

// --- Role Change Audit Logs ---

export async function fetchRoleChangeLogs(
  orgId: string,
  limit = 20,
): Promise<RoleChangeLogRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('role_change_logs')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

// --- Invitations ---

export async function createInvitation(
  organizationId: string,
  invitedByUserId: string,
  email?: string,
): Promise<{ ok: boolean; token?: string; expiresAt?: string; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      invited_by_user_id: invitedByUserId,
      email: email || null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    token: data.token,
    expiresAt: data.expires_at,
  };
}

export async function fetchInvitations(orgId: string): Promise<InvitationRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return [];
  return data || [];
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  if (!supabase) return { valid: false, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('invitations')
    .select('*, organizations(name)')
    .eq('token', token)
    .is('used_at', null)
    .single();

  if (error || !data) return { valid: false, error: 'Invitation not found' };

  const now = new Date();
  const expires = new Date(data.expires_at);
  if (expires < now) return { valid: false, error: 'Invitation expired' };

  return {
    valid: true,
    organization_name: (data.organizations as { name: string })?.name,
    expires_at: data.expires_at,
  };
}

export async function consumeInvitation(
  token: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };

  // Validate invitation
  const { data: invitation, error: fetchError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .single();

  if (fetchError || !invitation) return { ok: false, error: 'Invalid invitation' };

  const now = new Date();
  if (new Date(invitation.expires_at) < now) {
    return { ok: false, error: 'Invitation expired' };
  }

  // Check if user is already in this org
  const { data: existingUser } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single();

  if (existingUser?.organization_id === invitation.organization_id) {
    return { ok: false, error: 'Already a member' };
  }

  // Assign user to organization
  const { error: assignError } = await supabase
    .from('users')
    .update({ organization_id: invitation.organization_id })
    .eq('id', userId);

  if (assignError) return { ok: false, error: assignError.message };

  // Mark invitation as used
  await supabase
    .from('invitations')
    .update({ used_at: now.toISOString() })
    .eq('id', invitation.id);

  return { ok: true };
}

/** Send invitation email via API route */
export async function sendInvitationEmail(params: {
  email: string;
  inviteLink: string;
  organizationName: string;
  expiresAt: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Failed to send email' };
  }
}
