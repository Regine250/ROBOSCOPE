import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const FEATURED_DATASETS = [
  { name: 'LeRobot PushT', repoId: 'lerobot/pusht' },
  { name: 'LeRobot Aloha', repoId: 'lerobot/aloha_mobile' },
  { name: 'LeRobot Gym', repoId: 'lerobot/gym' },
  { name: 'Open X-Embodiment', repoId: 'lerobot/open_x_embodiment' },
  { name: 'RoboMimic', repoId: 'amandlek/robomimic' },
];

function DatasetCatalog() {
  const [datasets, setDatasets] = useState([]);
  const [repoInput, setRepoInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const fetchDatasets = async () => {
    try {
      const res = await api.listDatasets();
      setDatasets(res.datasets || []);
    } catch (e) {
      console.error("Failed to fetch datasets:", e);
    }
  };

  useEffect(() => {
    fetchDatasets();
    // Auto refresh while any dataset is downloading
    const interval = setInterval(() => {
      setDatasets((current) => {
        const hasDownloading = current.some(d => d.status === 'downloading');
        if (hasDownloading) {
          fetchDatasets();
        }
        return current;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async (targetRepoId) => {
    const id = (targetRepoId || repoInput).trim();
    if (!id) return;
    setLoading(true);
    setActionMsg({ type: 'info', text: `Initiating download for ${id}...` });

    try {
      await api.downloadDataset(id);
      setRepoInput('');
      setActionMsg({ type: 'success', text: `Download queued for ${id}. Tracking status below.` });
      await fetchDatasets();
    } catch (e) {
      setActionMsg({ type: 'error', text: `Download failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dataset-catalog-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Embodied Robotics Datasets</h1>
          <p className="page-subtitle">
            Hugging Face LeRobot & robot trajectory repositories with synchronized Parquet telemetry and MP4 video streams.
          </p>
        </div>
      </div>

      <div className="download-card">
        <h3 className="download-title">Download Hugging Face Dataset</h3>
        <p className="download-sub">
          Enter any LeRobot or standard Hugging Face dataset repository identifier (e.g. <code>lerobot/pusht</code>).
        </p>

        <div className="download-form">
          <input
            type="text"
            className="download-input"
            placeholder="Hugging Face repo_id (e.g., lerobot/pusht)"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDownload();
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleDownload()}
            disabled={loading || !repoInput.trim()}
          >
            {loading ? 'Starting...' : '📥 Download Dataset'}
          </button>
        </div>

        <div className="featured-row">
          <span className="featured-label">Popular Datasets:</span>
          {FEATURED_DATASETS.map((ds) => (
            <button
              key={ds.repoId}
              type="button"
              className="featured-pill"
              onClick={() => handleDownload(ds.repoId)}
            >
              + {ds.name}
            </button>
          ))}
        </div>

        {actionMsg && (
          <div className={`action-alert alert-${actionMsg.type}`}>
            {actionMsg.text}
          </div>
        )}
      </div>

      <h2 className="section-title">Registered Datasets ({datasets.length})</h2>

      {datasets.length === 0 ? (
        <div className="state-box empty-box">
          <p className="empty-title">No datasets downloaded yet</p>
          <p className="empty-sub">
            Download a dataset above to start exploring synchronized multi-camera views and action trajectories.
          </p>
        </div>
      ) : (
        <div className="dataset-grid">
          {datasets.map((ds) => {
            const isReady = ds.status === 'ready';
            const isDownloading = ds.status === 'downloading';
            const isError = ds.status === 'error';

            return (
              <div key={ds.repo_id} className={`dataset-card ${ds.status}`}>
                <div className="dataset-card-header">
                  <h3 className="dataset-name">{ds.display_name || ds.repo_id}</h3>
                  <span className={`status-pill pill-${ds.status}`}>
                    {isDownloading && <span className="pill-spinner" />}
                    {ds.status.toUpperCase()}
                  </span>
                </div>

                <p className="dataset-repo-id">
                  <a
                    href={`https://huggingface.co/datasets/${ds.repo_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hf-link"
                  >
                    🤗 huggingface.co/datasets/{ds.repo_id} ↗
                  </a>
                </p>

                <div className="dataset-stats">
                  <div className="stat-item">
                    <span className="stat-num">{ds.episode_count || 0}</span>
                    <span className="stat-lbl">Episodes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-num">{ds.fps || 30}</span>
                    <span className="stat-lbl">FPS</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-num">
                      {ds.size_bytes ? `${(ds.size_bytes / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}
                    </span>
                    <span className="stat-lbl">Size</span>
                  </div>
                </div>

                {ds.video_keys && ds.video_keys.length > 0 && (
                  <div className="camera-keys-row">
                    <span className="cam-label">Cameras:</span>
                    {ds.video_keys.map((k) => (
                      <span key={k} className="cam-chip">📹 {k.split('.').pop()}</span>
                    ))}
                  </div>
                )}

                <div className="dataset-card-footer">
                  {isReady && (
                    <Link
                      to={`/datasets/${encodeURIComponent(ds.repo_id)}`}
                      className="btn btn-view-episodes"
                    >
                      Explore Episodes & Trajectories →
                    </Link>
                  )}
                  {isDownloading && (
                    <span className="downloading-notice">
                      ⏳ Downloading snapshot from Hugging Face...
                    </span>
                  )}
                  {isError && (
                    <button
                      type="button"
                      className="btn btn-retry"
                      onClick={() => handleDownload(ds.repo_id)}
                    >
                      ↺ Retry Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DatasetCatalog;
