import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/habits') return 'My Habits';
    if (path === '/habits/new') return 'Add Habit';
    if (path.startsWith('/habits/') && path.endsWith('/edit')) return 'Edit Habit';
    if (path.startsWith('/habits/')) return 'Habit Details & Stats';
    if (path === '/todos') return 'Todos';
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
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body-md antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Fixed Header matching Stitch mockup */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/20 pt-safe">
        <div className="h-16 px-4 md:px-6 max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shadow-sm">
              HT
            </div>
            <Link to="/" className="font-headline-sm text-lg text-primary font-bold tracking-tight">
              HabitTrack
            </Link>
            <span className="text-outline-variant font-label-md px-1 select-none">/</span>
            <span className="font-label-lg text-sm text-on-surface-variant truncate max-w-[140px] sm:max-w-[200px] font-medium">
              {getBreadcrumb()}
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-container-low/80 p-1 rounded-full shadow-sm">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div
                  title={`Logged in as @${user.username}`}
                  className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-bold uppercase shadow-sm select-none"
                >
                  {user.username.slice(0, 2)}
                </div>
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary text-on-primary px-4 py-1.5 rounded-full font-label-md text-xs font-semibold shadow-sm hover:bg-primary-container transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Routed Page Content */}
      <main className="flex-1 flex flex-col pt-20 pb-24 md:pb-12 px-4 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (< 768px) matching Stitch */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/25 pb-safe shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  isActive ? 'text-primary scale-105' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <div className={`p-1 rounded-full ${isActive ? 'bg-primary-fixed text-on-primary-fixed' : ''}`}>
                  <span
                    className="material-symbols-outlined text-[20px] block"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10px] font-semibold mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
