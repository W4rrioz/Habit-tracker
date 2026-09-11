import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        if (res.status === 403) throw new Error('Forbidden: Admin access required.');
        throw new Error(`Failed to fetch users (status ${res.status}).`);
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <p className="text-xs text-on-surface-variant font-medium">Checking authorization...</p>
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return (
      <div className="max-w-[480px] mx-auto pt-8">
        <div className="bg-error-container text-on-error-container p-6 rounded-lg text-center flex flex-col items-center shadow-sm">
          <span className="material-symbols-outlined text-4xl text-error mb-2">lock</span>
          <h2 className="font-headline-md text-base font-bold mb-1">Access Denied</h2>
          <p className="font-body-md text-xs mb-4">
            Administrator privileges are required to view this panel.
          </p>
          <Link
            to="/"
            className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm hover:opacity-95 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalHabits = users.reduce((acc, u) => acc + parseInt(u.total_habits || 0, 10), 0);
  const totalTodos = users.reduce((acc, u) => acc + parseInt(u.total_todos || 0, 10), 0);

  return (
    <div className="flex flex-col w-full max-w-[680px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Admin Panel
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
            <span>Platform Overview & User Directory</span>
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface-container-lowest p-3.5 rounded-lg shadow-sm flex flex-col">
          <span className="text-[11px] font-medium text-on-surface-variant">Total Users</span>
          <span className="text-xl font-bold text-primary mt-1">{users.length}</span>
        </div>
        <div className="bg-surface-container-lowest p-3.5 rounded-lg shadow-sm flex flex-col">
          <span className="text-[11px] font-medium text-on-surface-variant">Active Habits</span>
          <span className="text-xl font-bold text-secondary mt-1">{totalHabits}</span>
        </div>
        <div className="bg-surface-container-lowest p-3.5 rounded-lg shadow-sm flex flex-col">
          <span className="text-[11px] font-medium text-on-surface-variant">Total Todos</span>
          <span className="text-xl font-bold text-on-surface mt-1">{totalTodos}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center mb-4">
        <span className="material-symbols-outlined absolute left-4 text-outline text-[18px] pointer-events-none">
          search
        </span>
        <input
          type="text"
          className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-full pl-11 pr-4 py-2.5 shadow-sm outline-none focus:bg-surface-container-low transition-all"
          placeholder="Filter by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* User Directory Table / Cards */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between text-xs font-bold text-on-surface">
          <span>User Directory</span>
          <span className="text-[11px] text-on-surface-variant font-normal">{filteredUsers.length} accounts</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-on-surface-variant font-medium">Loading user directory...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-xs text-on-surface-variant font-medium">No users match your query.</div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filteredUsers.map((item) => (
              <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-surface-container-low/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant font-bold text-xs flex items-center justify-center uppercase">
                    {item.username.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface">@{item.username}</span>
                      {item.is_admin ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-medium">
                          Member
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-on-surface-variant">
                      Joined {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant shrink-0">
                  <div className="text-right">
                    <span className="text-primary font-bold">{item.total_habits}</span>
                    <span className="text-[10px] ml-1 font-normal">habits</span>
                  </div>
                  <div className="text-right">
                    <span className="text-secondary font-bold">{item.total_todos}</span>
                    <span className="text-[10px] ml-1 font-normal">todos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
