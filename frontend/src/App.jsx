import React from 'react';
import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import './App.css';

import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import PaperFeed from './pages/paperFeed.jsx';
import DatasetCatalog from './pages/datasetCatalog.jsx';
import EpisodeViewer from './pages/EpisodeViewer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
    >
      <span className="theme-toggle-icon">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      <span className="theme-toggle-label">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}

function NavigationBar() {
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
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <span>📊</span> Dashboard
        </NavLink>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <span>📄</span> Paper Feed
        </NavLink>
        <NavLink to="/datasets" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <span>🤖</span> Dataset Catalog
        </NavLink>
      </nav>

      <div className="nav-auth-section">
        <div className="nav-live-badge">
          <span className="nav-live-dot" />
          <span className="nav-live-text">Public Hub</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

function App() {
  return (
    <ThemeProvider>
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
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>RoboScope — Automated arXiv Robotics Feed & Embodied AI Trajectory Explorer</p>
        </footer>

        {/* Global AI Research Assistant Chatbot Widget */}
        <ChatbotWidget />
      </div>
    </ThemeProvider>
  );
}

export default App;
