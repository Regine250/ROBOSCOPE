import React from 'react';
import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import './App.css';

import PaperFeed from './pages/paperFeed.jsx';
import DatasetCatalog from './pages/datasetCatalog.jsx';
import EpisodeViewer from './pages/EpisodeViewer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChatbotWidget from './components/ChatbotWidget.jsx';

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
          <span className="nav-live-text">Public Research Hub</span>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
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
  );
}

export default App;
