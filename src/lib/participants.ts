/**
 * Participant CRUD Functions
 * EduPlatform Starter
 */
import { supabase } from './supabase-client';
import type { ParticipantRow } from './supabase-client';

export async function fetchParticipants(groupId: string): Promise<ParticipantRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('group_id', groupId)
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Failed to fetch participants:', error);
    return [];
  }
  return data || [];
}

export async function fetchParticipantById(participantId: string): Promise<ParticipantRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('id', participantId)
    .single();

  if (error) return null;
  return data;
}

export async function addParticipant(
  groupId: string,
  displayName: string,
  externalId?: string,
): Promise<ParticipantRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('participants')
    .insert({
      group_id: groupId,
      display_name: displayName,
      external_id: externalId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add participant:', error);
    return null;
  }
  return data;
}

export async function addParticipantsBulk(
  groupId: string,
  names: string[],
): Promise<ParticipantRow[]> {
  if (!supabase || names.length === 0) return [];

  const rows = names.map((name) => ({
    group_id: groupId,
    display_name: name,
  }));

  const { data, error } = await supabase
    .from('participants')
    .insert(rows)
    .select();

  if (error) {
    console.error('Failed to bulk add participants:', error);
    return [];
  }
  return data || [];
}

export async function updateParticipant(
  participantId: string,
  updates: { display_name?: string; external_id?: string | null },
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('participants')
    .update(updates)
    .eq('id', participantId);

  if (error) {
    console.error('Failed to update participant:', error);
    return false;
  }
  return true;
}

export async function deleteParticipant(participantId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId);

  if (error) {
    console.error('Failed to delete participant:', error);
    return false;
  }
  return true;
}

export async function countParticipants(groupId: string): Promise<number> {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (error) return 0;
  return count || 0;
}

export async function fetchParticipantsByGroups(
  groupIds: string[],
): Promise<(ParticipantRow & { group_name: string })[]> {
  if (!supabase || groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from('participants')
    .select('*, groups(group_name)')
    .in('group_id', groupIds)
    .order('display_name');

  if (error) {
    console.error('Failed to fetch participants by groups:', error);
    return [];
  }

  return (data || []).map(
    (row: ParticipantRow & { groups?: { group_name?: string } }) => ({
      ...row,
      group_name: row.groups?.group_name || '',
    }),
  );
}
