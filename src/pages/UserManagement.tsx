import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { UserPermissions } from '../contexts/AuthContext';

interface ManagedUser {
  id: string;
  user_id: string;
  email: string;
  role: string;
  can_read_token_wallet: boolean;
  can_edit_token_wallet: boolean;
  can_read_payments: boolean;
  can_edit_payments: boolean;
  can_read_app_wallet: boolean;
  can_edit_app_wallet: boolean;
  created_at: string;
}

const PERMISSION_COLS: { key: keyof UserPermissions; label: string }[] = [
  { key: 'can_read_token_wallet', label: 'Read Token Wallet' },
  { key: 'can_edit_token_wallet', label: 'Edit Token Wallet' },
  { key: 'can_read_payments', label: 'Read Payments' },
  { key: 'can_edit_payments', label: 'Edit Payments' },
  { key: 'can_read_app_wallet', label: 'Read App Wallet' },
  { key: 'can_edit_app_wallet', label: 'Edit App Wallet' },
];

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

  async function loadUsers() {
    setIsLoading(true);
    const { data } = await supabase
      .from('aw_user_permissions')
      .select('*')
      .order('created_at', { ascending: true });
    setUsers((data as ManagedUser[]) ?? []);
    setIsLoading(false);
  }

  async function togglePermission(
    user: ManagedUser,
    key: keyof UserPermissions,
    value: boolean
  ) {
    setSavingId(user.user_id);
    const updated = { ...user, [key]: value, updated_at: new Date().toISOString() };
    await supabase
      .from('aw_user_permissions')
      .update({ [key]: value, updated_at: new Date().toISOString() })
      .eq('user_id', user.user_id);
    setUsers(prev => prev.map(u => u.user_id === user.user_id ? updated : u));
    setSavingId(null);
  }

  async function toggleRole(user: ManagedUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setSavingId(user.user_id);
    await supabase
      .from('aw_user_permissions')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('user_id', user.user_id);
    setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, role: newRole } : u));
    setSavingId(null);
  }

  if (!isAdmin) {
    return (
      <div className="protected-wall">
        <div className="protected-wall-icon">🚫</div>
        <h2>Access Denied</h2>
      </div>
    );
  }

  return (
    <div className="user-mgmt-container" style={{ padding: '0.25rem 0' }}>
      <div className="user-mgmt-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>User Management & RBAC Permissions</h3>
        <button className="btn btn-secondary" onClick={loadUsers} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
          🔄 Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="protected-loading" style={{ padding: '2rem 0' }}>
          <div className="protected-spinner" />
          <p>Loading user list...</p>
        </div>
      ) : (
        <div className="user-mgmt-table-wrap" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="user-mgmt-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                {PERMISSION_COLS.map(c => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} className={savingId === u.user_id ? 'saving' : ''}>
                  <td className="user-email-cell">
                    <span className="user-avatar-mini">
                      {u.email.charAt(0).toUpperCase()}
                    </span>
                    {u.email}
                  </td>
                  <td>
                    <button
                      className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}
                      onClick={() => toggleRole(u)}
                      title="Click to toggle role"
                    >
                      {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </button>
                  </td>
                  {PERMISSION_COLS.map(c => (
                    <td key={c.key} className="perm-cell">
                      <input
                        type="checkbox"
                        className="perm-checkbox"
                        checked={!!u[c.key as keyof ManagedUser]}
                        onChange={e => togglePermission(u, c.key, e.target.checked)}
                        disabled={savingId === u.user_id}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={2 + PERMISSION_COLS.length} style={{ textAlign: 'center', opacity: 0.5, padding: '1.5rem' }}>
                    No users found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
