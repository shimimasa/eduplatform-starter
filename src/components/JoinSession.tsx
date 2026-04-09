/**
 * JoinSession — Participant join flow.
 * Enter a join code, then enter your name to join.
 */
import { useState } from 'preact/hooks';
import type { SessionRunRow, SessionParticipantRow } from '../lib/supabase-client';
import { findSessionByCode, joinSession } from '../lib/sessions';
import { subscribeToSessionRun, unsubscribeChannel } from '../lib/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function JoinSession() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [session, setSession] = useState<SessionRunRow | null>(null);
  const [participant, setParticipant] = useState<SessionParticipantRow | null>(null);
  const [liveSession, setLiveSession] = useState<SessionRunRow | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'code' | 'name' | 'joined'>('code');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const handleFindSession = async (e: Event) => {
    e.preventDefault();
    setError('');

    const found = await findSessionByCode(code.trim());
    if (!found) {
      setError('Session not found. Check the code and try again.');
      return;
    }

    setSession(found);
    setStep('name');
  };

  const handleJoin = async (e: Event) => {
    e.preventDefault();
    if (!session) return;
    setError('');

    const p = await joinSession(session.id, name.trim());
    if (!p) {
      setError('Failed to join. Please try again.');
      return;
    }

    setParticipant(p);
    setLiveSession(session);
    setStep('joined');

    // Subscribe to realtime updates
    const ch = subscribeToSessionRun(session.id, (updated) => {
      setLiveSession(updated);
    });
    setChannel(ch);
  };

  const handleLeave = () => {
    unsubscribeChannel(channel);
    setChannel(null);
    setSession(null);
    setParticipant(null);
    setLiveSession(null);
    setCode('');
    setName('');
    setStep('code');
  };

  if (step === 'joined' && liveSession && participant) {
    return (
      <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
        <div class="card text-center">
          <p class="text-secondary" style={{ fontSize: '0.875rem' }}>Joined as</p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{participant.participant_name}</h2>

          <div class="mt-6" style={{ padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius)' }}>
            <p class="text-secondary" style={{ fontSize: '0.875rem' }}>Current Phase</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.25rem' }}>
              {liveSession.current_phase || 'waiting'}
            </p>
          </div>

          {liveSession.template_title && (
            <p class="text-secondary mt-4" style={{ fontSize: '0.875rem' }}>
              {liveSession.template_title}
            </p>
          )}

          {!liveSession.is_active && (
            <div class="mt-4" style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--radius)', color: 'var(--color-danger)' }}>
              Session has ended
            </div>
          )}

          <button class="btn btn-secondary mt-6" onClick={handleLeave}>
            Leave Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div class="card">
        {step === 'code' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Join a Session
            </h2>
            <form onSubmit={handleFindSession} class="flex flex-col gap-4">
              <div>
                <label class="label">Join Code</label>
                <input
                  class="input"
                  type="text"
                  placeholder="ABC123"
                  value={code}
                  onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
                  required
                  maxLength={10}
                  style={{ fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.15em', textAlign: 'center' }}
                />
              </div>
              {error && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>
              )}
              <button class="btn btn-primary" type="submit">
                Find Session
              </button>
            </form>
          </>
        )}

        {step === 'name' && session && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {session.template_title || 'Session'}
            </h2>
            <p class="text-secondary mb-4" style={{ fontSize: '0.875rem' }}>
              Enter your name to join
            </p>
            <form onSubmit={handleJoin} class="flex flex-col gap-4">
              <div>
                <label class="label">Your Name</label>
                <input
                  class="input"
                  type="text"
                  placeholder="Your display name"
                  value={name}
                  onInput={(e) => setName((e.target as HTMLInputElement).value)}
                  required
                />
              </div>
              {error && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>
              )}
              <button class="btn btn-primary" type="submit">
                Join
              </button>
              <button
                class="btn btn-secondary"
                type="button"
                onClick={() => { setStep('code'); setError(''); }}
              >
                Back
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
