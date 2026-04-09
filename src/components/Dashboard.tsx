/**
 * Dashboard — Main facilitator view.
 * Shows groups list, create group form, and active sessions.
 */
import { useState, useEffect } from 'preact/hooks';
import type { UserProfile, GroupWithStats, SessionRunRow } from '../lib/supabase-client';
import { fetchGroups, createGroup } from '../lib/groups';
import { fetchSessionRuns, createSessionRun } from '../lib/sessions';

interface Props {
  user: UserProfile;
}

export default function Dashboard({ user }: Props) {
  const [groups, setGroups] = useState<GroupWithStats[]>([]);
  const [sessions, setSessions] = useState<SessionRunRow[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const [g, s] = await Promise.all([
      fetchGroups(user.id),
      fetchSessionRuns(user.id),
    ]);
    setGroups(g);
    setSessions(s);
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const handleCreateGroup = async (e: Event) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    await createGroup(user.id, newGroupName.trim(), undefined, user.organization_id || undefined);
    setNewGroupName('');
    setCreating(false);
    loadData();
  };

  const handleStartSession = async (groupId: string, groupName: string) => {
    const result = await createSessionRun({
      created_by_user_id: user.id,
      group_id: groupId,
      template_title: 'New Session',
      current_phase: 'waiting',
    });
    if (result) {
      alert(`Session created! Join code: ${result.joinCode}`);
      loadData();
    }
  };

  const activeSessions = sessions.filter((s) => s.is_active);
  const pastSessions = sessions.filter((s) => !s.is_active).slice(0, 5);

  return (
    <div class="flex flex-col gap-4">
      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Active Sessions
          </h2>
          <div class="grid-2">
            {activeSessions.map((s) => (
              <div class="card" key={s.id}>
                <div class="flex justify-between items-center">
                  <strong>{s.template_title || 'Untitled'}</strong>
                  <span class="badge badge-active">Active</span>
                </div>
                <div class="join-code mt-4">{s.join_code}</div>
                <p class="text-secondary text-center mt-2" style={{ fontSize: '0.875rem' }}>
                  Phase: {s.current_phase || 'waiting'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Groups */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Groups
        </h2>

        <form onSubmit={handleCreateGroup} class="flex gap-2 mb-4">
          <input
            class="input"
            type="text"
            placeholder="New group name..."
            value={newGroupName}
            onInput={(e) => setNewGroupName((e.target as HTMLInputElement).value)}
            style={{ maxWidth: '300px' }}
          />
          <button class="btn btn-primary" type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>

        {groups.length === 0 ? (
          <p class="text-secondary">No groups yet. Create your first group above.</p>
        ) : (
          <div class="grid-2">
            {groups.map((g) => (
              <div class="card" key={g.id}>
                <div class="flex justify-between items-center">
                  <strong>{g.group_name}</strong>
                  {g.group_level && (
                    <span class="badge badge-inactive">{g.group_level}</span>
                  )}
                </div>
                <p class="text-secondary mt-2" style={{ fontSize: '0.875rem' }}>
                  {g.participant_count} participants &middot; {g.session_count} sessions
                </p>
                <button
                  class="btn btn-secondary mt-4"
                  onClick={() => handleStartSession(g.id, g.group_name)}
                >
                  Start Session
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Recent Sessions
          </h2>
          <div class="flex flex-col gap-2">
            {pastSessions.map((s) => (
              <div class="card flex justify-between items-center" key={s.id} style={{ padding: '0.75rem 1.25rem' }}>
                <div>
                  <strong>{s.template_title || 'Untitled'}</strong>
                  <span class="text-secondary" style={{ marginLeft: '0.75rem', fontSize: '0.875rem' }}>
                    {s.ended_at ? new Date(s.ended_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <span class="badge badge-inactive">Ended</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
