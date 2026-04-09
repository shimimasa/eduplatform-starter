/**
 * Session Run CRUD + Join Code Operations
 * EduPlatform Starter
 */
import { supabase } from './supabase-client';
import type {
  SessionRunRow,
  SessionRunInsert,
  SessionParticipantRow,
  FeedbackRow,
  FeedbackInsert,
} from './supabase-client';

// --- Join Code Generation ---

function generateJoinCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

// --- Session CRUD (facilitator side) ---

export async function createSessionRun(
  params: Omit<SessionRunInsert, 'join_code'>,
): Promise<{ session: SessionRunRow; joinCode: string } | null> {
  if (!supabase) return null;

  const joinCode = generateJoinCode();

  const { data, error } = await supabase
    .from('session_runs')
    .insert({
      ...params,
      join_code: joinCode,
      is_active: true,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create session run:', error);
    return null;
  }

  return { session: data, joinCode };
}

export async function updateSessionRun(
  runId: string,
  updates: Partial<{
    current_phase: string;
    is_active: boolean;
    metadata: Record<string, unknown>;
    ended_at: string;
  }>,
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('session_runs')
    .update(updates)
    .eq('id', runId);

  if (error) {
    console.error('Failed to update session run:', error);
    return false;
  }
  return true;
}

export async function endSessionRun(runId: string): Promise<boolean> {
  return updateSessionRun(runId, {
    is_active: false,
    ended_at: new Date().toISOString(),
  });
}

export async function fetchSessionRuns(userId: string): Promise<SessionRunRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('session_runs')
    .select('*')
    .eq('created_by_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch session runs:', error);
    return [];
  }
  return data || [];
}

export async function fetchSessionRunById(runId: string): Promise<SessionRunRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('session_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) return null;
  return data;
}

// --- Join Session (participant side) ---

export async function findSessionByCode(joinCode: string): Promise<SessionRunRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('session_runs')
    .select('*')
    .eq('join_code', joinCode.toUpperCase().trim())
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function joinSession(
  sessionRunId: string,
  participantName: string,
  participantId?: string,
): Promise<SessionParticipantRow | null> {
  if (!supabase) return null;

  // Generate a session token for anonymous participant auth
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const sessionToken = Array.from(tokenBytes, (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

  const { data, error } = await supabase
    .from('session_participants')
    .insert({
      session_run_id: sessionRunId,
      participant_name: participantName,
      participant_id: participantId || null,
      session_token: sessionToken,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to join session:', error);
    return null;
  }

  // Store token for reconnection
  try {
    localStorage.setItem('edu-session-token', sessionToken);
    localStorage.setItem('edu-session-run-id', sessionRunId);
  } catch {
    /* SSR or private browsing */
  }

  return data;
}

// --- Session Participants (facilitator side) ---

export async function fetchSessionParticipants(
  runId: string,
): Promise<SessionParticipantRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('session_participants')
    .select('*')
    .eq('session_run_id', runId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch session participants:', error);
    return [];
  }
  return data || [];
}

// --- Heartbeat ---

export async function sendHeartbeat(participantId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('session_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', participantId);

  if (error) return false;
  return true;
}

// --- Feedback ---

export async function submitFeedback(
  feedback: FeedbackInsert,
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('feedback')
    .insert(feedback);

  if (error) {
    console.error('Failed to submit feedback:', error);
    return false;
  }
  return true;
}

export async function fetchFeedback(sessionRunId: string): Promise<FeedbackRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('session_run_id', sessionRunId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

// --- Session State Cache (localStorage) ---

export function cacheSessionState(runId: string, run: SessionRunRow): void {
  try {
    localStorage.setItem(
      `edu-session-cache-${runId}`,
      JSON.stringify({ ...run, _cachedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function getCachedSessionState(runId: string): SessionRunRow | null {
  try {
    const raw = localStorage.getItem(`edu-session-cache-${runId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    // Expire after 24 hours
    if (cached._cachedAt && Date.now() - cached._cachedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`edu-session-cache-${runId}`);
      return null;
    }
    delete cached._cachedAt;
    return cached as SessionRunRow;
  } catch {
    return null;
  }
}

export function clearSessionCache(runId: string): void {
  try {
    localStorage.removeItem(`edu-session-cache-${runId}`);
  } catch {
    /* ignore */
  }
}

export function clearSavedSession(): void {
  try {
    localStorage.removeItem('edu-session-token');
    localStorage.removeItem('edu-session-run-id');
  } catch {
    /* ignore */
  }
}
