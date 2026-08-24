import { useState, useEffect, useCallback } from 'react';

export function useVideoSync(videoRef, trajectory) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const updateTime = (time) => setCurrentTime(time);

    let callbackId = null;
    let timeHandler = null;

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const callback = (now, metadata) => {
        updateTime(metadata.mediaTime);
        callbackId = video.requestVideoFrameCallback(callback);
      };
      callbackId = video.requestVideoFrameCallback(callback);
    } else {
      timeHandler = () => updateTime(video.currentTime);
      video.addEventListener('timeupdate', timeHandler);
    }

    return () => {
      if (callbackId !== null && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        video.cancelVideoFrameCallback(callbackId);
      }
      if (timeHandler) {
        video.removeEventListener('timeupdate', timeHandler);
      }
    };
  }, [videoRef, trajectory]);

  const seekTo = useCallback((time) => {
    if (videoRef?.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [videoRef]);

  return { currentTime, seekTo };
}
