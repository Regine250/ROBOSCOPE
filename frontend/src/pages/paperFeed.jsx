import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PaperCard from '../components/PaperCard.jsx';

function PaperFeed() {
  const { user, isAuthenticated } = useAuth();
  const [papers, setPapers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ingestion status & trigger
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  // Saved papers
  const [savedPapers, setSavedPapers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('roboscope_saved_papers') || '[]');
    } catch {
      return [];
    }
  });

  // Sync user saved papers from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.listSaved()
        .then((res) => {
          const paperIds = (res.saved || [])
            .filter((item) => item.item_type === 'paper')
            .map((item) => item.item_id);
          if (paperIds.length > 0) {
            setSavedPapers(paperIds);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    localStorage.setItem('roboscope_saved_papers', JSON.stringify(savedPapers));
  }, [savedPapers]);

  const toggleSaved = async (paperId) => {
    const isSaved = savedPapers.includes(paperId);
    if (isSaved) {
      setSavedPapers((prev) => prev.filter((id) => id !== paperId));
      try {
        await api.removeSaved('paper', paperId);
      } catch {
        // ignore
      }
    } else {
      setSavedPapers((prev) => [...prev, paperId]);
      try {
        await api.addSaved('paper', paperId);
      } catch {
        // ignore
      }
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const status = await api.getIngestionStatus();
      setSyncStatus(status);
    } catch {
      // ignore
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      await api.runIngestion();
      setTimeout(async () => {
        await fetchSyncStatus();
        fetchPapers();
        setSyncing(false);
      }, 3000);
    } catch (e) {
      alert(`Sync failed: ${e.message}`);
      setSyncing(false);
    }
  };

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: 15,
        search: debouncedSearch,
        category,
        tag,
        saved_only: savedOnly,
      };
      const res = await api.listPapers(params);
      setPapers(res?.papers ?? []);
      setTotal(res?.total ?? 0);
    } catch (e) {
      setError(e.message);
      setPapers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, tag, savedOnly]);

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, tag, savedOnly]);

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="feed-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Paper Feed</h1>
          <p className="page-subtitle">
            Continuous ingestion of robotics and embodied learning papers from arXiv (cs.RO, cs.LG).
          </p>
        </div>

        <div className="sync-widget">
          <div className="sync-info">
            <span className="sync-stat">Total Papers: <strong>{syncStatus?.paper_count ?? total}</strong></span>
            {syncStatus?.last_ingestion && (
              <span className="sync-date">
                Synced: {new Date(syncStatus.last_ingestion).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-sync"
            onClick={handleTriggerSync}
            disabled={syncing}
          >
            {syncing ? '⟳ Ingesting arXiv...' : '⚡ Fetch arXiv Updates'}
          </button>
        </div>
      </div>

      <div className="search-filter-card">
        <div className="search-row">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search title, abstract, authors, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="clear-btn" onClick={() => setSearch('')}>×</button>
            )}
          </div>

          <select
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="cs.RO">cs.RO (Robotics)</option>
            <option value="cs.LG">cs.LG (Machine Learning)</option>
          </select>

          <input
            type="text"
            className="tag-filter-input"
            placeholder="Filter by #tag..."
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />

          <label className="toggle-saved-label">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => setSavedOnly(e.target.checked)}
            />
            <span>★ {isAuthenticated ? 'My Saved Papers' : 'Saved Only'}</span>
          </label>
        </div>
      </div>

      {loading && (
        <div className="state-box loading-box">
          <div className="spinner" />
          <p>Loading robotics research feed...</p>
        </div>
      )}

      {error && (
        <div className="state-box error-box">
          <p className="error-title">Failed to load papers</p>
          <p className="error-msg">{error}</p>
          <button type="button" className="btn btn-sm" onClick={fetchPapers}>Retry</button>
        </div>
      )}

      {!loading && !error && papers.length === 0 && (
        <div className="state-box empty-box">
          <p className="empty-title">No papers found</p>
          <p className="empty-sub">
            {search || tag || category || savedOnly
              ? 'Try modifying your search criteria or tag filters.'
              : 'Click "Fetch arXiv Updates" to ingest papers into the database.'}
          </p>
        </div>
      )}

      {!loading && papers.length > 0 && (
        <>
          <div className="results-summary">
            <span>Showing {papers.length} of {total} papers</span>
          </div>

          <div className="card-grid">
            {papers.map((paper) => (
              <PaperCard
                key={paper.base_id}
                paper={paper}
                onUpdate={fetchPapers}
                isSaved={savedPapers.includes(paper.base_id)}
                onToggleSave={toggleSaved}
              />
            ))}
          </div>

          <div className="pagination-bar">
            <button
              type="button"
              className="btn btn-pagination"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              className="btn btn-pagination"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default PaperFeed;
