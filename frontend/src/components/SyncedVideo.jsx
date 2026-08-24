import React, { useRef, useEffect, useState, useCallback } from 'react';
import TrajectoryPlot from './TrajectoryPlot';

function SyncedVideo({ videoUrl, trajectory }) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoadedMetadata = () => setDuration(video.duration || 0);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    let frameId = null;
    let timeHandler = null;

    const updateTime = (t) => setCurrentTime(t);

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const frameCallback = (now, metadata) => {
        updateTime(metadata.mediaTime);
        frameId = video.requestVideoFrameCallback(frameCallback);
      };
      frameId = video.requestVideoFrameCallback(frameCallback);
    } else {
      timeHandler = () => updateTime(video.currentTime);
      video.addEventListener('timeupdate', timeHandler);
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      if (frameId !== null && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        video.cancelVideoFrameCallback(frameId);
      }
      if (timeHandler) {
        video.removeEventListener('timeupdate', timeHandler);
      }
    };
  }, [videoUrl, trajectory]);

  const handleSeek = useCallback((time) => {
    if (videoRef.current) {
      const clamped = Math.max(0, Math.min(time, videoRef.current.duration || 9999));
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    }
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleSpeedChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const stepFrame = (forward = true) => {
    if (!videoRef.current) return;
    const fps = trajectory?.fps || 30;
    const delta = (forward ? 1 : -1) * (1 / fps);
    handleSeek(videoRef.current.currentTime + delta);
  };

  return (
    <div className="synced-video-container">
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          src={videoUrl}
          className="main-video-element"
          controls={false}
          playsInline
          onClick={togglePlay}
        />
      </div>

      <div className="video-control-bar">
        <div className="playback-buttons">
          <button type="button" className="ctrl-btn" onClick={() => stepFrame(false)} title="Previous Frame">
            ⏮ -1f
          </button>
          <button type="button" className="ctrl-btn play-btn" onClick={togglePlay}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button type="button" className="ctrl-btn" onClick={() => stepFrame(true)} title="Next Frame">
            +1f ⏭
          </button>
        </div>

        <div className="time-display">
          <span className="current-time">{currentTime.toFixed(2)}s</span>
          <span className="time-sep">/</span>
          <span className="total-time">{(duration || trajectory?.timestamps?.slice(-1)[0] || 0).toFixed(2)}s</span>
        </div>

        <div className="speed-buttons">
          {[0.5, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              className={`speed-btn ${playbackRate === rate ? 'active' : ''}`}
              onClick={() => handleSpeedChange(rate)}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      <div className="plot-section">
        <TrajectoryPlot
          trajectory={trajectory}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );
}

export default SyncedVideo;
