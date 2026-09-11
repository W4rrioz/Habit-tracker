import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'admin', 'user'

  useEffect(() => {
    if (user?.is_admin) {
      fetchUsers();
    }
  }, [user]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Forbidden: Admin access required.');
        }
        throw new Error(`Failed to fetch users (status ${res.status}).`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load admin users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 1. Loading session state
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Checking permissions...</p>
      </div>
    );
  }

  // 2. Access Denied banner if user is not an admin
  if (!user || !user.is_admin) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto 0', padding: '0 16px' }}>
        <div
          className="card"
          style={{
            backgroundColor: 'var(--error-container)',
            borderColor: 'var(--error)',
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(186, 26, 26, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--error)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
              lock
            </span>
          </div>

          <div>
            <h2 className="headline-md" style={{ color: 'var(--on-error-container)', marginBottom: '6px' }}>
              Access Denied: Admin privileges required
            </h2>
            <p className="body-md" style={{ color: 'var(--on-error-container)', opacity: 0.9 }}>
              You do not have administrative rights to view this page. This section is restricted strictly to authorized platform administrators.
            </p>
          </div>

          <Link
            to="/"
            className="btn-primary"
            style={{
              marginTop: '10px',
              backgroundColor: 'var(--error)',
              color: '#ffffff',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Format date helper
  function formatJoinDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchesRole =
      filterRole === 'all' ||
      (filterRole === 'admin' && u.is_admin) ||
      (filterRole === 'user' && !u.is_admin);
    return matchesSearch && matchesRole;
  });

  const totalAdmins = users.filter(u => u.is_admin).length;
  const totalStandard = users.filter(u => !u.is_admin).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>
              admin_panel_settings
            </span>
            <h1 className="headline-lg">Admin Panel</h1>
          </div>
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--surface-container-high)',
              color: 'var(--on-surface-variant)',
              fontSize: '12px',
              padding: '6px 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--secondary)' }}></span>
            Read-only v1.0
          </span>
        </div>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
          Directory of registered users, roles, and engagement counts. Scoped strictly for platform administrators.
        </p>
      </div>

      {/* Controls: Search and Filter Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--outline)',
              pointerEvents: 'none',
              fontSize: '20px'
            }}
          >
            search
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Search users by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '44px', borderRadius: 'var(--radius-full)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--outline)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setFilterRole('all')}
            className={`btn-secondary ${filterRole === 'all' ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              backgroundColor: filterRole === 'all' ? 'var(--primary)' : 'var(--surface-container)',
              color: filterRole === 'all' ? 'var(--on-primary)' : 'var(--on-surface-variant)',
              border: 'none'
            }}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setFilterRole('admin')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              backgroundColor: filterRole === 'admin' ? 'var(--primary)' : 'var(--surface-container)',
              color: filterRole === 'admin' ? 'var(--on-primary)' : 'var(--on-surface-variant)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Admins ({totalAdmins})
          </button>
          <button
            onClick={() => setFilterRole('user')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              backgroundColor: filterRole === 'user' ? 'var(--primary)' : 'var(--surface-container)',
              color: filterRole === 'user' ? 'var(--on-primary)' : 'var(--on-surface-variant)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Standard Users ({totalStandard})
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--error-container)',
            color: 'var(--on-error-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <span className="body-md">{error}</span>
          <button onClick={fetchUsers} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
            Retry
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--surface-container-lowest)'
        }}
      >
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Loading user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline-variant)', marginBottom: '8px' }}>
              person_search
            </span>
            <p className="headline-sm" style={{ color: 'var(--on-surface)', marginBottom: '4px' }}>No users found</p>
            <p className="body-md" style={{ color: 'var(--on-surface-variant)' }}>
              {searchQuery ? `No user accounts matching "${searchQuery}"` : 'No registered users available.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--surface-container)',
                    borderBottom: '1px solid var(--surface-container-high)',
                    color: 'var(--on-surface-variant)'
                  }}
                >
                  <th style={{ padding: '14px 18px', fontWeight: '600', fontSize: '13px' }}>Username</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600', fontSize: '13px' }}>Role</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600', fontSize: '13px' }}>Join Date</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Habits Count</th>
                  <th style={{ padding: '14px 18px', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>Todos Count</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const isCurrent = u.id === user.id;
                  const initials = u.username ? u.username.slice(0, 2).toUpperCase() : '??';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: idx === filteredUsers.length - 1 ? 'none' : '1px solid var(--surface-container)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--surface-container-low)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Username Column */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: u.is_admin ? 'var(--primary-fixed)' : 'var(--surface-container-high)',
                              color: u.is_admin ? 'var(--on-primary-fixed)' : 'var(--on-surface-variant)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '12px',
                              flexShrink: 0
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--on-surface)' }}>
                              @{u.username}
                              {isCurrent && (
                                <span
                                  style={{
                                    marginLeft: '6px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    color: 'var(--primary)',
                                    backgroundColor: 'var(--primary-fixed)',
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-full)'
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--outline)' }}>
                              ID: {u.id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td style={{ padding: '14px 18px' }}>
                        {u.is_admin ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'var(--primary)',
                              color: 'var(--on-primary)',
                              fontSize: '12px',
                              gap: '4px'
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              shield_person
                            </span>
                            Admin
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'var(--surface-container-high)',
                              color: 'var(--on-surface-variant)',
                              fontSize: '12px'
                            }}
                          >
                            User
                          </span>
                        )}
                      </td>

                      {/* Join Date Column */}
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                        {formatJoinDate(u.created_at)}
                      </td>

                      {/* Habits Count Column */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: u.total_habits > 0 ? 'var(--secondary-container)' : 'var(--surface-container-high)',
                            color: u.total_habits > 0 ? 'var(--on-secondary-container)' : 'var(--outline)',
                            fontSize: '12px',
                            minWidth: '50px',
                            justifyContent: 'center'
                          }}
                        >
                          {u.total_habits}
                        </span>
                      </td>

                      {/* Todos Count Column */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: u.total_todos > 0 ? 'var(--primary-fixed)' : 'var(--surface-container-high)',
                            color: u.total_todos > 0 ? 'var(--on-primary-fixed)' : 'var(--outline)',
                            fontSize: '12px',
                            minWidth: '50px',
                            justifyContent: 'center'
                          }}
                        >
                          {u.total_todos}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
