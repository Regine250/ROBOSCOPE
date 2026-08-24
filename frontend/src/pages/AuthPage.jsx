import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthPage({ initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isLogin) {
      if (!username.trim() || !password) {
        setError('Please enter your username/email and password.');
        return;
      }
      setLoading(true);
      try {
        await login(username.trim(), password);
        navigate(redirectPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Login failed. Please verify your credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // Registration validation
      if (!email.trim() || !username.trim() || !password) {
        setError('Please complete all required fields.');
        return;
      }
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters long.');
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
        await register(email.trim(), username.trim(), password, fullName.trim());
        navigate(redirectPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Registration failed. Please try a different username/email.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">⚡</div>
          <h2 className="auth-title">
            {isLogin ? 'Welcome Back to RoboScope' : 'Create Your RoboScope Account'}
          </h2>
          <p className="auth-subtitle">
            {isLogin
              ? 'Sign in to access personalized research bookmarks, custom tags, and dataset streams.'
              : 'Join the robotics research community to bookmark papers, save datasets, and analyze trajectories.'}
          </p>
        </div>

        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="auth-alert error-alert">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="jane@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">
              {isLogin ? 'Username or Email *' : 'Username *'}
            </label>
            <input
              type="text"
              required
              className="form-input"
              placeholder={isLogin ? 'username or email' : 'choose a username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label">Password *</label>
              <button
                type="button"
                className="toggle-pw-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Processing...'
              : isLogin
              ? 'Sign In →'
              : 'Create RoboScope Account →'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : 'Already registered? '}
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
            >
              {isLogin ? 'Sign up here' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
