/**
 * Realtime Subscription Engine
 * EduPlatform Starter
 *
 * Subscribe to live changes on session_runs, session_participants, and feedback.
 * Uses Supabase Realtime (Postgres Changes).
 */
import { supabase } from './supabase-client';
import type { SessionRunRow, SessionParticipantRow, FeedbackRow } from './supabase-client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- Session Run Subscriptions ---

/** Subscribe to session run updates (participant listens to facilitator's phase changes) */
export function subscribeToSessionRun(
  runId: string,
  onUpdate: (run: SessionRunRow) => void,
  onStatus?: (status: string) => void,
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel(`session-run-${runId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_runs',
        filter: `id=eq.${runId}`,
      },
      (payload) => {
        onUpdate(payload.new as SessionRunRow);
      },
    )
    .subscribe((status) => {
      if (onStatus) onStatus(status);
    });

  return channel;
}

/** Subscribe to session run with Promise — resolves on SUBSCRIBED, rejects on error/timeout */
export function subscribeToSessionRunAsync(
  runId: string,
  onUpdate: (run: SessionRunRow) => void,
  onStatus?: (status: string) => void,
  timeoutMs = 10000,
): Promise<RealtimeChannel> {
  return new Promise((resolve, reject) => {
    if (!supabase) {
      reject(new Error('Supabase not configured'));
      return;
    }

    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (supabase) supabase.removeChannel(channel);
        reject(new Error('SUBSCRIPTION_TIMEOUT'));
      }
    }, timeoutMs);

    const channel = supabase
      .channel(`session-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_runs',
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          onUpdate(payload.new as SessionRunRow);
        },
      )
      .subscribe((status) => {
        if (onStatus) onStatus(status);

        if (settled) return;

        if (status === 'SUBSCRIBED') {
          settled = true;
          clearTimeout(timer);
          resolve(channel);
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          settled = true;
          clearTimeout(timer);
          if (supabase) supabase.removeChannel(channel);
          reject(new Error(status));
        }
      });
  });
}

// --- Session Participant Subscriptions ---

/** Subscribe to participant changes (facilitator sees who joined) */
export function subscribeToParticipants(
  runId: string,
  onInsert: (participant: SessionParticipantRow) => void,
  onUpdate?: (participant: SessionParticipantRow) => void,
): RealtimeChannel | null {
  if (!supabase) return null;

  let channel = supabase
    .channel(`session-participants-${runId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'session_participants',
        filter: `session_run_id=eq.${runId}`,
      },
      (payload) => {
        onInsert(payload.new as SessionParticipantRow);
      },
    );

  if (onUpdate) {
    channel = channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_participants',
        filter: `session_run_id=eq.${runId}`,
      },
      (payload) => {
        onUpdate(payload.new as SessionParticipantRow);
      },
    );
  }

  channel.subscribe();
  return channel;
}

// --- Feedback Subscriptions ---

/** Subscribe to feedback submissions (facilitator sees incoming feedback) */
export function subscribeToFeedback(
  runId: string,
  onInsert: (feedback: FeedbackRow) => void,
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel(`session-feedback-${runId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'feedback',
        filter: `session_run_id=eq.${runId}`,
      },
      (payload) => {
        onInsert(payload.new as FeedbackRow);
      },
    )
    .subscribe();

  return channel;
}

// --- Channel Management ---

/** Unsubscribe from a realtime channel */
export function unsubscribeChannel(channel: RealtimeChannel | null): void {
  if (channel && supabase) {
    supabase.removeChannel(channel);
  }
}

/** Unsubscribe from multiple channels at once */
export function unsubscribeAll(channels: (RealtimeChannel | null)[]): void {
  for (const channel of channels) {
    unsubscribeChannel(channel);
  }
}
