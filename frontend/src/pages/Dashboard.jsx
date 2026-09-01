import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardData();
      setData(res);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setActionMsg({ type: 'info', text: 'arXiv ingestion triggered in background...' });
    try {
      await api.runIngestion();
      setTimeout(async () => {
        await loadDashboard();
        setActionMsg({ type: 'success', text: 'arXiv ingestion cycle completed!' });
        setSyncing(false);
      }, 3000);
    } catch (e) {
      setActionMsg({ type: 'error', text: `Sync failed: ${e.message}` });
      setSyncing(false);
    }
  };

  const handleRemoveSaved = async (paperId) => {
    try {
      await api.removeSaved('paper', paperId);
      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        const updatedPapers = prev.saved_papers.filter((p) => p.base_id !== paperId);
        return {
          ...prev,
          saved_papers: updatedPapers,
          kpis: {
            ...prev.kpis,
            saved_papers_count: updatedPapers.length,
          },
        };
      });
    } catch (e) {
      console.error('Failed to remove bookmark:', e);
    }
  };

  if (loading && !data) {
    return (
      <div className="state-box loading-box">
        <div className="spinner" />
        <p>Loading robotics research dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-box error-box">
        <p className="error-title">Dashboard Error</p>
        <p className="error-msg">{error}</p>
        <button type="button" className="btn btn-sm" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const savedPapers = data?.saved_papers || [];
  const datasets = data?.datasets || [];
  const categoryBreakdown = data?.category_breakdown || [];
  const tags = data?.tags || [];
  const totalCategorySum = categoryBreakdown.reduce((acc, c) => acc + c.count, 0) || 1;

  return (
    <div className="dashboard-page">
      {/* 1. Header Banner */}
      <div className="dashboard-banner">
        <div className="dashboard-banner-left">
          <div
            className="dashboard-user-avatar"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            ⚡
          </div>
          <div>
            <h1 className="dashboard-title">
              RoboScope <span className="highlight-name">Intelligence Hub</span> 📊
            </h1>
            <p className="dashboard-subtitle">
              Public robotics intelligence workspace, continuous arXiv indexing & LeRobot trajectory visualizer.
            </p>
          </div>
        </div>

        <div className="dashboard-quick-actions">
          <Link to="/" className="btn btn-action-outline">
            📄 Research Feed
          </Link>
          <Link to="/datasets" className="btn btn-action-outline">
            📥 Datasets
          </Link>
          <button
            type="button"
            className="btn btn-action-sync"
            onClick={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? '⟳ Syncing arXiv...' : '⚡ Ingest arXiv'}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`action-alert alert-${actionMsg.type}`}>
          {actionMsg.text}
        </div>
      )}

      {/* 2. KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-saved">
          <div className="kpi-icon-wrap">📑</div>
          <div className="kpi-content">
            <span className="kpi-num">{kpis.saved_papers_count ?? 0}</span>
            <span className="kpi-label">Saved Papers</span>
          </div>
          <span className="kpi-subtext">Bookmarked for analysis</span>
        </div>

        <div className="kpi-card kpi-datasets">
          <div className="kpi-icon-wrap">🤖</div>
          <div className="kpi-content">
            <span className="kpi-num">{kpis.ready_datasets_count ?? 0} <span className="kpi-denom">/ {kpis.total_datasets_count ?? 0}</span></span>
            <span className="kpi-label">Ready Datasets</span>
          </div>
          <span className="kpi-subtext">{kpis.total_episodes_available ?? 0} episodes available</span>
        </div>

        <div className="kpi-card kpi-tags">
          <div className="kpi-icon-wrap">🏷️</div>
          <div className="kpi-content">
            <span className="kpi-num">{kpis.tags_count ?? 0}</span>
            <span className="kpi-label">Custom Tags</span>
          </div>
          <span className="kpi-subtext">Taxonomy identifiers</span>
        </div>

        <div className="kpi-card kpi-indexed">
          <div className="kpi-icon-wrap">⚡</div>
          <div className="kpi-content">
            <span className="kpi-num">{kpis.total_papers_indexed ?? 0}</span>
            <span className="kpi-label">Indexed arXiv Papers</span>
          </div>
          <span className="kpi-subtext">Continuous pipeline active</span>
        </div>
      </div>

      {/* 3. Main Dashboard Sections */}
      <div className="dashboard-main-layout">
        {/* Left Column: Bookmarked Research Papers */}
        <section className="dashboard-section saved-papers-section">
          <div className="section-header-row">
            <h2 className="section-heading">
              📑 Bookmarked Research Papers ({savedPapers.length})
            </h2>
            <Link to="/" className="section-link">
              Browse More →
            </Link>
          </div>

          {savedPapers.length === 0 ? (
            <div className="dashboard-empty-card">
              <p className="empty-title">No saved papers yet</p>
              <p className="empty-sub">
                Explore the Paper Feed and click <strong>★ Save</strong> on any arXiv paper to bookmark it here for quick access.
              </p>
              <Link to="/" className="btn btn-sm btn-primary" style={{ marginTop: '0.75rem' }}>
                Go to Paper Feed →
              </Link>
            </div>
          ) : (
            <div className="saved-papers-list">
              {savedPapers.map((paper) => (
                <div key={paper.base_id} className="saved-paper-row">
                  <div className="saved-paper-main">
                    <div className="saved-badges">
                      {paper.primary_category && (
                        <span className="badge category-badge">{paper.primary_category}</span>
                      )}
                      <span className="badge id-badge">arXiv:{paper.base_id}</span>
                    </div>

                    <h4 className="saved-paper-title">
                      <a href={paper.abs_url || `https://arxiv.org/abs/${paper.base_id}`} target="_blank" rel="noreferrer">
                        {paper.title}
                      </a>
                    </h4>

                    {paper.authors && paper.authors.length > 0 && (
                      <p className="saved-authors">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                      </p>
                    )}

                    {paper.referenced_datasets && paper.referenced_datasets.length > 0 && (
                      <div className="saved-dataset-chips">
                        {paper.referenced_datasets.map((d, i) => (
                          <span key={i} className="dataset-chip">📦 {d.name}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="saved-paper-actions">
                    {paper.pdf_url && (
                      <a
                        href={paper.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-pdf-action"
                        title="Read PDF"
                      >
                        PDF ↗
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-remove-saved"
                      onClick={() => handleRemoveSaved(paper.base_id)}
                      title="Remove from saved"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Datasets Launcher & Category Analytics */}
        <div className="dashboard-side-col">
          {/* Dataset Quick Launcher */}
          <section className="dashboard-section dataset-launcher-section">
            <div className="section-header-row">
              <h2 className="section-heading">🤖 Embodied Datasets</h2>
              <Link to="/datasets" className="section-link">
                Manage All →
              </Link>
            </div>

            {datasets.length === 0 ? (
              <div className="dashboard-empty-card">
                <p className="empty-sub">No datasets downloaded yet.</p>
                <Link to="/datasets" className="btn btn-sm btn-primary" style={{ marginTop: '0.5rem' }}>
                  Download Datasets →
                </Link>
              </div>
            ) : (
              <div className="dataset-launcher-list">
                {datasets.slice(0, 4).map((ds) => (
                  <div key={ds.repo_id} className="launcher-card">
                    <div className="launcher-card-top">
                      <h4 className="launcher-title">{ds.display_name || ds.repo_id}</h4>
                      <span className={`status-pill pill-${ds.status}`}>
                        {ds.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="launcher-stats">
                      <span>🎬 {ds.episode_count || 0} episodes</span>
                      <span>⚡ {ds.fps || 30} FPS</span>
                    </div>

                    {ds.status === 'ready' ? (
                      <Link
                        to={`/datasets/${encodeURIComponent(ds.repo_id)}`}
                        className="btn btn-launch-episodes"
                      >
                        View Trajectory Player →
                      </Link>
                    ) : (
                      <span className="downloading-notice" style={{ fontSize: '0.75rem', padding: '0.2rem' }}>
                        ⏳ Status: {ds.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Research Category Analytics */}
          <section className="dashboard-section analytics-section">
            <div className="section-header-row">
              <h2 className="section-heading">📊 Category Distribution</h2>
            </div>

            <div className="category-bars-list">
              {categoryBreakdown.map((cat) => {
                const pct = Math.round((cat.count / totalCategorySum) * 100);
                return (
                  <div key={cat.primary_category} className="cat-bar-item">
                    <div className="cat-bar-labels">
                      <span className="cat-code">{cat.primary_category}</span>
                      <span className="cat-count">{cat.count} papers ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat.primary_category === 'cs.RO' ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {tags.length > 0 && (
              <div className="tags-cloud-widget">
                <span className="cam-label" style={{ display: 'block', marginBottom: '0.4rem' }}>
                  Popular Taxonomy Tags:
                </span>
                <div className="tag-list">
                  {tags.slice(0, 8).map((t) => (
                    <span key={t.name} className="tag-chip">
                      #{t.name} <small style={{ opacity: 0.7 }}>({t.usage_count})</small>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
