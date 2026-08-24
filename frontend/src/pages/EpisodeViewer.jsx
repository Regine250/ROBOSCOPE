import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import SyncedVideo from '../components/SyncedVideo';

function EpisodeViewer() {
  const { repoId: rawRepoId, episodeIndex: routeEpisodeIndex } = useParams();
  const repoId = decodeURIComponent(rawRepoId || '');

  const [dataset, setDataset] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState('observation.images.front');
  const [trajectory, setTrajectory] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingEpisode, setLoadingEpisode] = useState(false);
  const [error, setError] = useState(null);
  const [episodeError, setEpisodeError] = useState(null);

  // Load dataset metadata and episodes list
  useEffect(() => {
    if (!repoId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getDataset(repoId),
      api.listEpisodes(repoId)
    ])
      .then(([dsData, epData]) => {
        if (!isMounted) return;
        setDataset(dsData);
        const epList = epData.episodes || [];
        setEpisodes(epList);

        if (dsData.video_keys && dsData.video_keys.length > 0) {
          setSelectedCamera(dsData.video_keys[0]);
        }

        // Auto select first episode or route episode
        const initialIdx = routeEpisodeIndex !== undefined 
          ? parseInt(routeEpisodeIndex, 10) 
          : epList.length > 0 ? epList[0].episode_index : null;

        if (initialIdx !== null) {
          loadEpisode(initialIdx, dsData.video_keys?.[0] || 'observation.images.front');
        }
      })
      .catch((e) => {
        if (isMounted) setError(e.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [repoId]);

  const loadEpisode = useCallback(async (epIndex, cameraKey = selectedCamera) => {
    setSelectedEpisode(epIndex);
    setLoadingEpisode(true);
    setEpisodeError(null);

    try {
      const traj = await api.getTrajectory(repoId, epIndex);
      setTrajectory(traj);
      const url = api.getVideoUrl(repoId, epIndex, cameraKey);
      setVideoUrl(url);
    } catch (e) {
      setEpisodeError(e.message);
      setTrajectory(null);
      setVideoUrl('');
    } finally {
      setLoadingEpisode(false);
    }
  }, [repoId, selectedCamera]);

  const handleCameraChange = (cameraKey) => {
    setSelectedCamera(cameraKey);
    if (selectedEpisode !== null) {
      setVideoUrl(api.getVideoUrl(repoId, selectedEpisode, cameraKey));
    }
  };

  if (loading) {
    return (
      <div className="state-box loading-box">
        <div className="spinner" />
        <p>Loading dataset episodes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-box error-box">
        <p className="error-title">Failed to load dataset</p>
        <p className="error-msg">{error}</p>
        <Link to="/datasets" className="btn btn-sm">← Back to Datasets</Link>
      </div>
    );
  }

  const cameraOptions = dataset?.video_keys || ['observation.images.front'];

  return (
    <div className="episode-viewer-page">
      <div className="viewer-header">
        <div className="header-breadcrumbs">
          <Link to="/datasets" className="back-link">← Datasets</Link>
          <span className="sep">/</span>
          <h1 className="viewer-title">{dataset?.display_name || repoId}</h1>
          <span className="badge fps-badge">{dataset?.fps || 30} FPS</span>
        </div>

        {cameraOptions.length > 1 && (
          <div className="camera-selector">
            <span className="cam-label">Camera Angle:</span>
            {cameraOptions.map((cam) => (
              <button
                key={cam}
                type="button"
                className={`cam-btn ${selectedCamera === cam ? 'active' : ''}`}
                onClick={() => handleCameraChange(cam)}
              >
                📹 {cam.split('.').pop()}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="viewer-split-layout">
        <aside className="episode-sidebar">
          <div className="sidebar-header">
            <h3>Episodes ({episodes.length})</h3>
          </div>

          <div className="episode-list">
            {episodes.length === 0 ? (
              <p className="empty-sub">No episode files detected in dataset data/ folder.</p>
            ) : (
              episodes.map((ep) => (
                <div
                  key={ep.episode_index}
                  onClick={() => loadEpisode(ep.episode_index)}
                  className={`episode-card ${selectedEpisode === ep.episode_index ? 'active' : ''}`}
                >
                  <div className="ep-card-top">
                    <span className="ep-name">Episode {ep.episode_index}</span>
                    <span className="ep-frames">{ep.length} frames</span>
                  </div>
                  <span className="ep-duration">
                    ~{((ep.length || 0) / (dataset?.fps || 30)).toFixed(1)}s duration
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="playback-section">
          {loadingEpisode && (
            <div className="state-box loading-box">
              <div className="spinner" />
              <p>Loading episode {selectedEpisode} trajectory and video...</p>
            </div>
          )}

          {episodeError && (
            <div className="state-box error-box">
              <p className="error-title">Unable to load episode {selectedEpisode}</p>
              <p className="error-msg">{episodeError}</p>
            </div>
          )}

          {!loadingEpisode && !episodeError && selectedEpisode !== null && (
            <SyncedVideo
              videoUrl={videoUrl}
              trajectory={trajectory}
            />
          )}

          {!loadingEpisode && !episodeError && selectedEpisode === null && (
            <div className="state-box empty-box">
              <p className="empty-title">Select an episode to begin</p>
              <p className="empty-sub">Choose an episode from the left sidebar to view synchronized video and robot actions.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default EpisodeViewer;
