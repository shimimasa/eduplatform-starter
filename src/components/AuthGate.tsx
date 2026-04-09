/**
 * AuthGate — Shows children only when authenticated.
 * Renders sign-in form when not authenticated.
 */
import { useState, useEffect } from 'preact/hooks';
import type { UserProfile } from '../lib/supabase-client';
import { getCurrentUser, signIn, signUp, signOut, onAuthStateChange } from '../lib/auth';

interface Props {
  children: (user: UserProfile) => preact.ComponentChildren;
}

export default function AuthGate({ children }: Props) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
    const { unsubscribe } = onAuthStateChange(setUser);
    return unsubscribe;
  }, []);

  if (loading) {
    return <div class="text-center mt-8 text-secondary">Loading...</div>;
  }

  if (user) {
    return (
      <div>
        <div class="flex justify-between items-center mb-4" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
          <span>Signed in as <strong>{user.display_name || 'User'}</strong></span>
          <button class="btn btn-secondary" onClick={() => signOut().then(() => setUser(null))}>
            Sign Out
          </button>
        </div>
        {children(user)}
      </div>
    );
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      const { error: err } = await signUp(email, password, name);
      if (err) setError(err);
    } else {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <div class="card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label class="label">Display Name</label>
              <input
                class="input"
                type="text"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
                required
              />
            </div>
          )}

          <div>
            <label class="label">Email</label>
            <input
              class="input"
              type="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              required
            />
          </div>

          <div>
            <label class="label">Password</label>
            <input
              class="input"
              type="password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>
          )}

          <button class="btn btn-primary" type="submit">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p class="text-center text-secondary mt-4" style={{ fontSize: '0.875rem' }}>
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(''); }}>
                Sign up
              </a>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); setError(''); }}>
                Sign in
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
