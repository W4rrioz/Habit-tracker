import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';

import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import HabitsPage from './pages/HabitsPage';
import HabitDetailPage from './pages/HabitDetailPage';
import HabitFormPage from './pages/HabitFormPage';
import TodosPage from './pages/TodosPage';
import TodoFormPage from './pages/TodoFormPage';
import FocusTimerPage from './pages/FocusTimerPage';
import JournalPage from './pages/JournalPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <Routes>
      {/* Public Auth Pages (Redirect to / if already logged in) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Route>

      {/* Protected App Routes (Redirect to /login if not logged in) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          
          {/* Habits */}
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/habits/new" element={<HabitFormPage />} />
          <Route path="/habits/:id" element={<HabitDetailPage />} />
          <Route path="/habits/:id/edit" element={<HabitFormPage />} />

          {/* Todos */}
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/todos/new" element={<TodoFormPage />} />
          <Route path="/todos/:id/edit" element={<TodoFormPage />} />

          {/* Focus Timer & Journal */}
          <Route path="/timer" element={<FocusTimerPage />} />
          <Route path="/journal" element={<JournalPage />} />

          {/* Leaderboard & Admin */}
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
