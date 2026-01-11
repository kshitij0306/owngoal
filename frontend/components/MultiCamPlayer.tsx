
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CameraAngle, PlaybackState, DirectorDecision } from '../types';
import { VIDEO_SOURCES, FALLBACK_ANGLE } from '../constants';

interface MultiCamPlayerProps {
  currentAngle: CameraAngle;
  onAngleChange: (angle: CameraAngle) => void;
  onTimeUpdate: (time: number) => void;
  onBufferChange: (isBuffering: boolean) => void;
}

const MultiCamPlayer: React.FC<MultiCamPlayerProps> = ({ 
  currentAngle, 
  onAngleChange, 
  onTimeUpdate,
  onBufferChange
}) => {
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [lastSwitchTime, setLastSwitchTime] = useState(0);
  const [pendingAngle, setPendingAngle] = useState<CameraAngle | null>(null);

  // Sync all videos when the active one plays/pauses/seeks
  const syncPlayback = useCallback((masterTime: number) => {
    // Fix: Explicitly cast values to HTMLVideoElement array to avoid 'unknown' type errors
    const videos = Object.values(videoRefs.current) as (HTMLVideoElement | null)[];
    videos.forEach((v) => {
      if (v && Math.abs(v.currentTime - masterTime) > 0.3) {
        v.currentTime = masterTime;
      }
    });
  }, []);

  useEffect(() => {
    const masterVideo = videoRefs.current[currentAngle];
    if (!masterVideo) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(masterVideo.currentTime);
      // Periodically sync background angles
      if (Math.floor(masterVideo.currentTime) % 2 === 0) {
        syncPlayback(masterVideo.currentTime);
      }
    };

    const handleWaiting = () => onBufferChange(true);
    const handlePlaying = () => onBufferChange(false);
    
    const handleError = () => {
      console.error(`Error loading angle: ${currentAngle}. Falling back.`);
      onAngleChange(FALLBACK_ANGLE);
    };

    masterVideo.addEventListener('timeupdate', handleTimeUpdate);
    masterVideo.addEventListener('waiting', handleWaiting);
    masterVideo.addEventListener('playing', handlePlaying);
    masterVideo.addEventListener('error', handleError);

    return () => {
      masterVideo.removeEventListener('timeupdate', handleTimeUpdate);
      masterVideo.removeEventListener('waiting', handleWaiting);
      masterVideo.removeEventListener('playing', handlePlaying);
      masterVideo.removeEventListener('error', handleError);
    };
  }, [currentAngle, onTimeUpdate, onBufferChange, syncPlayback, onAngleChange]);

  // Handle "Late Messages" or rapid switching
  const switchAngle = useCallback((newAngle: CameraAngle) => {
    const now = Date.now();
    // Throttle switches to prevent visual jitter (e.g., min 2 seconds between cuts)
    if (now - lastSwitchTime < 2000) {
      console.warn("Director switch ignored: too frequent.");
      return;
    }

    const nextVideo = videoRefs.current[newAngle];
    if (nextVideo && nextVideo.readyState < 2) {
      // Not enough data for playback, buffer it first
      setPendingAngle(newAngle);
      onBufferChange(true);
      return;
    }

    setLastSwitchTime(now);
    onAngleChange(newAngle);
  }, [lastSwitchTime, onAngleChange, onBufferChange]);

  // Pre-load and sync all videos
  useEffect(() => {
    // Fix: Explicitly cast values to HTMLVideoElement array to avoid 'unknown' type errors
    const videos = Object.values(videoRefs.current) as (HTMLVideoElement | null)[];
    videos.forEach(v => {
      if (v) {
        v.play().catch(() => {
          // Autoplay might be blocked until user interaction
        });
      }
    });
  }, []);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-xl">
      {VIDEO_SOURCES.map((source) => (
        <video
          key={source.id}
          // Fix: Wrap ref assignment in braces to avoid returning the value, satisfying Ref type requirements
          ref={(el) => { videoRefs.current[source.id] = el; }}
          src={source.url}
          muted={source.id !== currentAngle} // Only audio from active cam
          playsInline
          loop
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            currentAngle === source.id ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          onCanPlayThrough={() => {
            if (pendingAngle === source.id) {
              setPendingAngle(null);
              onBufferChange(false);
              switchAngle(source.id as CameraAngle);
            }
          }}
        />
      ))}
      
      {/* Visual Indicator of Camera Metadata */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase">{VIDEO_SOURCES.find(s => s.id === currentAngle)?.label}</span>
        </div>
      </div>
    </div>
  );
};

export default MultiCamPlayer;
