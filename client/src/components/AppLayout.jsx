import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Daily Dashboard';
    if (path === '/habits') return 'My Habits';
    if (path === '/habits/new') return 'Add Habit';
    if (path.startsWith('/habits/') && path.endsWith('/edit')) return 'Edit Habit';
    if (path.startsWith('/habits/')) return 'Habit Details & Stats';
    if (path === '/todos') return 'Todo List';
    if (path === '/todos/new') return 'Add Todo';
    if (path.startsWith('/todos/') && path.endsWith('/edit')) return 'Edit Todo';
    if (path === '/timer') return 'Focus Timer';
    if (path === '/journal') return 'Daily Journal';
    if (path === '/leaderboard') return 'Leaderboard';
    if (path === '/admin') return 'Admin Panel';
    if (path === '/login') return 'Sign In';
    if (path === '/signup') return 'Create Account';
    return 'HabitTrack';
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/habits', label: 'Habits', icon: 'check_circle' },
    { to: '/todos', label: 'Todos', icon: 'format_list_bulleted' },
    { to: '/timer', label: 'Timer', icon: 'timer' },
    { to: '/journal', label: 'Journal', icon: 'menu_book' },
    { to: '/leaderboard', label: 'Ranks', icon: 'leaderboard' },
    ...(user?.is_admin ? [{ to: '/admin', label: 'Admin', icon: 'admin_panel_settings' }] : []),
  ];

  return (
    <div className="app-container">
      {/* Top Header with corrected dynamic breadcrumb */}
      <header className="app-header">
        <div>
          <div className="breadcrumb">
            <Link to="/" style={{ color: 'var(--primary)', fontWeight: '700' }}>HabitTrack</Link>
            <span>/</span>
            <span className="active-crumb">{getBreadcrumb()}</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname === item.to ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user ? (
            <>
              <span className="label-sm" style={{ color: 'var(--on-surface-variant)', fontWeight: '600' }}>
                @{user.username}
              </span>
              <button
                onClick={logout}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Routed Page Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
