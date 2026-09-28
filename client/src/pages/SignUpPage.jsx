import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-lg shadow-xl p-6 sm:p-10 flex flex-col items-center">
        {/* App Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-surface-container-low p-2 mb-3 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-primary text-3xl">spa</span>
          </div>
          <h1 className="font-headline-lg text-2xl font-bold text-primary tracking-tight mb-1">
            HabitTrack
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant max-w-[280px]">
            Build better days, one step at a time.
          </p>
        </div>

        {/* Screen Title */}
        <div className="w-full mb-6">
          <h2 className="font-headline-md text-xl font-semibold text-on-surface text-center">
            Create Account
          </h2>
        </div>

        {error && (
          <div className="w-full p-3 bg-error-container text-on-error-container rounded-2xl text-xs font-medium mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-error">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Sign Up Form */}
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="flex flex-col gap-1">
            <div className="relative flex items-center w-full bg-surface-container-low rounded-full px-4 py-3 shadow-sm transition-all focus-within:bg-surface-container-lowest focus-within:shadow-md">
              <span className="material-symbols-outlined text-primary text-xl select-none mr-3">
                person
              </span>
              <input
                autoComplete="username"
                className="w-full bg-transparent font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none"
                placeholder="Choose a username"
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1">
            <div className="relative flex items-center w-full bg-surface-container-low rounded-full px-4 py-3 shadow-sm transition-all focus-within:bg-surface-container-lowest focus-within:shadow-md">
              <span className="material-symbols-outlined text-primary text-xl select-none mr-3">
                lock
              </span>
              <input
                autoComplete="new-password"
                className="w-full bg-transparent font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none pr-8"
                placeholder="Create password (min 6 characters)"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                aria-label="Toggle password visibility"
                className="absolute right-4 text-outline hover:text-primary transition-colors flex items-center justify-center focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                <span className="material-symbols-outlined text-xl select-none">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-1">
            <div className="relative flex items-center w-full bg-surface-container-low rounded-full px-4 py-3 shadow-sm transition-all focus-within:bg-surface-container-lowest focus-within:shadow-md">
              <span className="material-symbols-outlined text-primary text-xl select-none mr-3">
                lock_reset
              </span>
              <input
                autoComplete="new-password"
                className="w-full bg-transparent font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none pr-8"
                placeholder="Confirm password"
                required
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                aria-label="Toggle confirm password visibility"
                className="absolute right-4 text-outline hover:text-primary transition-colors flex items-center justify-center focus:outline-none"
                onClick={() => setShowConfirm(!showConfirm)}
                type="button"
              >
                <span className="material-symbols-outlined text-xl select-none">
                  {showConfirm ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="mt-2">
            <button
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-container text-on-primary py-3.5 px-6 rounded-full font-label-lg text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              type="submit"
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform select-none">
                arrow_forward
              </span>
            </button>
          </div>
        </form>

        {/* Navigation Alternate Flow Link */}
        <div className="mt-6 flex items-center justify-center">
          <Link
            to="/login"
            className="font-body-md text-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <span>Already have an account?</span>
            <span className="font-label-md text-sm text-primary font-semibold hover:underline">
              Log in
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
