import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 30) {
      setError('Username must be between 3 and 30 characters.');
      return;
    }
    if (/\s/.test(trimmed)) {
      setError('Username cannot contain spaces.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(trimmed, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '420px', margin: '40px auto' }}>
      <div className="card">
        <h1 className="headline-lg" style={{ marginBottom: '8px' }}>Create Account</h1>
        <p className="body-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
          Start building your habits and streaks today.
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
              placeholder="Choose a unique username"
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

          <div>
            <label className="label-md" style={{ display: 'block', marginBottom: '6px' }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="body-sm" style={{ textAlign: 'center', marginTop: '12px', color: 'var(--on-surface-variant)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
