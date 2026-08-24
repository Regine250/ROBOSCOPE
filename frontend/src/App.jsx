import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import './App.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import PaperFeed from './pages/paperFeed.jsx';
import DatasetCatalog from './pages/datasetCatalog.jsx';
import EpisodeViewer from './pages/EpisodeViewer.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';

function NavigationBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/" className="brand-link">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">RoboScope</span>
        </Link>
        <span className="brand-tag">Robotics & Embodied AI</span>
      </div>

      <nav className="nav-links">
        {isAuthenticated && (
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span>📊</span> Dashboard
          </NavLink>
        )}
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <span>📄</span> Paper Feed
        </NavLink>
        <NavLink to="/datasets" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <span>🤖</span> Dataset Catalog
        </NavLink>
      </nav>

      <div className="nav-auth-section">
        {isAuthenticated && user ? (
          <div className="user-menu-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span
                className="user-avatar"
                style={{ backgroundColor: user.avatar_color || '#06b6d4' }}
              >
                {(user.username || 'U')[0].toUpperCase()}
              </span>
              <span className="user-name-label">@{user.username}</span>
              <span className="dropdown-caret">▾</span>
            </button>

            {dropdownOpen && (
              <div className="user-dropdown-menu">
                <div className="dropdown-user-info">
                  <p className="dropdown-fullname">{user.full_name || user.username}</p>
                  <p className="dropdown-email">{user.email}</p>
                </div>
                <div className="dropdown-divider" />
                <Link
                  to="/dashboard"
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  📊 My Dashboard
                </Link>
                <Link
                  to="/"
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  📄 Research Feed
                </Link>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons-group">
            <Link to="/login" className="btn btn-outline-auth">
              Sign In
            </Link>
            <Link to="/signup" className="btn btn-primary-auth">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="roboscope-app">
        <NavigationBar />

        <main className="app-container">
          <Routes>
            <Route path="/" element={<PaperFeed />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/datasets" element={<DatasetCatalog />} />
            <Route path="/datasets/:repoId" element={<EpisodeViewer />} />
            <Route path="/datasets/:repoId/episodes" element={<EpisodeViewer />} />
            <Route path="/datasets/:repoId/episodes/:episodeIndex" element={<EpisodeViewer />} />
            <Route path="/login" element={<AuthPage initialMode="login" />} />
            <Route path="/signup" element={<AuthPage initialMode="signup" />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>RoboScope — Automated arXiv Robotics Feed & Embodied AI Trajectory Explorer</p>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
