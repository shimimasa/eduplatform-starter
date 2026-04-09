/**
 * Group CRUD Functions
 * EduPlatform Starter
 */
import { supabase } from './supabase-client';
import type { GroupRow, GroupWithStats } from './supabase-client';

export async function fetchGroups(userId: string): Promise<GroupWithStats[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('created_by_user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const groupIds = data.map((g: GroupRow) => g.id);
  if (groupIds.length === 0) return data.map((g: GroupRow) => ({ ...g, participant_count: 0, session_count: 0 }));

  const [participantRes, sessionRes] = await Promise.all([
    supabase.from('participants').select('group_id').in('group_id', groupIds),
    supabase.from('session_runs').select('group_id').in('group_id', groupIds),
  ]);

  const participantCounts: Record<string, number> = {};
  const sessionCounts: Record<string, number> = {};

  (participantRes.data || []).forEach((r: { group_id: string }) => {
    participantCounts[r.group_id] = (participantCounts[r.group_id] || 0) + 1;
  });
  (sessionRes.data || []).forEach((r: { group_id: string }) => {
    sessionCounts[r.group_id] = (sessionCounts[r.group_id] || 0) + 1;
  });

  return data.map((g: GroupRow) => ({
    ...g,
    participant_count: participantCounts[g.id] || 0,
    session_count: sessionCounts[g.id] || 0,
  }));
}

export async function fetchGroupById(groupId: string): Promise<GroupRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) return null;
  return data;
}

export async function createGroup(
  userId: string,
  groupName: string,
  groupLevel?: string,
  organizationId?: string,
): Promise<GroupRow | null> {
  if (!supabase) return null;

  const row: Record<string, unknown> = {
    created_by_user_id: userId,
    group_name: groupName,
    group_level: groupLevel || null,
  };
  if (organizationId) row.organization_id = organizationId;

  const { data, error } = await supabase
    .from('groups')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Failed to create group:', error);
    return null;
  }
  return data;
}

export async function updateGroup(
  groupId: string,
  updates: { group_name?: string; group_level?: string; is_archived?: boolean },
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId);

  if (error) {
    console.error('Failed to update group:', error);
    return false;
  }
  return true;
}

export async function archiveGroup(groupId: string): Promise<boolean> {
  return updateGroup(groupId, { is_archived: true });
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Failed to delete group:', error);
    return false;
  }
  return true;
}
