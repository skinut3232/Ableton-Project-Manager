import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStatus, useSignIn, useSignUp, useSignOut } from '../../hooks/useAuth';
import { useSyncStatus, useTriggerSync } from '../../hooks/useSync';

export function CloudSyncSection() {
  const { data: auth } = useAuthStatus();
  const { data: syncStatus } = useSyncStatus();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const signOut = useSignOut();
  const triggerSync = useTriggerSync();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');

  if (!auth?.configured) {
    return (
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3">Cloud Sync</h3>
        <p className="text-xs text-neutral-500">
          Cloud sync is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file to enable.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signin') {
        await signIn.mutateAsync({ email, password });
      } else {
        await signUp.mutateAsync({ email, password });
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(String(err));
    }
  };

  if (auth?.logged_in) {
    return (
      <div>
        <h3 className="text-sm font-medium text-neutral-300 mb-3">Cloud Sync</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">
              Logged in as <span className="text-blue-400 font-medium">{auth.email}</span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => signOut.mutate()}
              disabled={signOut.isPending}
            >
              {signOut.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>

          {syncStatus && (
            <div className="text-xs text-neutral-500 space-y-1">
              <p>
                Sync: {syncStatus.enabled ? (
                  syncStatus.pending_push > 0
                    ? <span className="text-yellow-400">{syncStatus.pending_push} items pending</span>
                    : <span className="text-green-400">All synced</span>
                ) : 'Disabled'}
              </p>
              {syncStatus.last_push_at && (
                <p>Last push: {new Date(syncStatus.last_push_at).toLocaleString()}</p>
              )}
              {syncStatus.last_pull_at && (
                <p>Last pull: {new Date(syncStatus.last_pull_at).toLocaleString()}</p>
              )}
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => triggerSync.mutate()}
            disabled={triggerSync.isPending}
          >
            {triggerSync.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-300 mb-3">Cloud Sync</h3>
      <p className="text-xs text-neutral-500 mb-3">
        Sign in to enable cloud sync and access your library from the mobile app.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={signIn.isPending || signUp.isPending}>
            {mode === 'signin'
              ? (signIn.isPending ? 'Signing in...' : 'Sign In')
              : (signUp.isPending ? 'Creating account...' : 'Create Account')
            }
          </Button>
          <button
            type="button"
            className="text-xs text-blue-400 hover:text-blue-300"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
