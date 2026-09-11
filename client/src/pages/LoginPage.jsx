import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '420px', margin: '40px auto' }}>
      <div className="card">
        <h1 className="headline-lg" style={{ marginBottom: '8px' }}>Sign In</h1>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
          Welcome back to HabitTrack.
        </p>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--error-container)',
            color: 'var(--on-error-container)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label-md" style={{ display: 'block', marginBottom: '6px' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)',
                backgroundColor: 'var(--surface-container-low)'
              }}
            />
          </div>

          <div>
            <label className="label-md" style={{ display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)',
                backgroundColor: 'var(--surface-container-low)'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '8px', padding: '12px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="body-sm" style={{ textAlign: 'center', marginTop: '12px', color: 'var(--on-surface-variant)' }}>
            Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: '600' }}>Create Account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
