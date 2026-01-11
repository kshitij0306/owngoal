
import React, { useState, useEffect, useRef } from 'react';
import { MediaLibrary, MediaSegment } from '../types';

interface SegmentPlayerProps {
  videoId: string;
  currentSegment: number;
  currentCam: string;
  library: MediaLibrary;
  onSegmentEnd: () => void;
  onBufferStatus: (isBuffering: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

const resolveSegmentSource = (
  segments: Record<number, MediaSegment>,
  targetSegment: number
): MediaSegment | null => {
  const direct = segments[targetSegment];
  if (direct) return direct;

  const keys = Object.keys(segments)
    .map(key => Number(key))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (keys.length === 0) return null;

  const fallbackKey = keys.filter(key => key <= targetSegment).pop() ?? keys[0];
  return segments[fallbackKey] ?? null;
};

const SegmentPlayer: React.FC<SegmentPlayerProps> = ({ 
  videoId,
  currentSegment, 
  currentCam, 
  library,
  onSegmentEnd,
  onBufferStatus,
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchFileAndPlay = async () => {
      try {
        const session = library[videoId];
        if (!session) throw new Error(`Session ${videoId} not in library`);

        const cam = session.cams[currentCam];
        if (!cam) throw new Error(`Cam ${currentCam} not in session`);

        const segment = resolveSegmentSource(cam.segments, currentSegment);
        if (!segment) throw new Error(`Segment ${currentSegment} not found for ${currentCam}`);

        const currentTime = videoRef.current?.currentTime ?? 0;
        pendingSeekTimeRef.current = currentTime;
        videoRef.current?.pause();

        const url = typeof segment === 'string' ? segment : URL.createObjectURL(segment);
        
        // Clean up previous URL to avoid memory leaks
        if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
        
        setBlobUrl(url);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    };

    fetchFileAndPlay();
  }, [videoId, currentSegment, currentCam, library]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const pendingTime = pendingSeekTimeRef.current;
    if (pendingTime != null) {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      const safeTime = duration && duration > 0 ? Math.min(pendingTime, Math.max(0, duration - 0.05)) : pendingTime;
      if (safeTime > 0.01) {
        video.currentTime = safeTime;
      }
      pendingSeekTimeRef.current = null;
    }

    video.play().catch(e => console.warn("Autoplay block:", e));
  };

  return (
    <div className="relative w-full h-full bg-black group">
      {blobUrl ? (
        <video
          ref={videoRef}
          src={blobUrl}
          className="w-full h-full object-contain"
          onEnded={onSegmentEnd}
          onWaiting={() => onBufferStatus(true)}
          onPlaying={() => onBufferStatus(false)}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={() => {
            if (videoRef.current) {
              onTimeUpdate?.(videoRef.current.currentTime);
            }
          }}
          playsInline
          autoPlay
          muted
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <div className="text-[10px] text-gray-700 font-black tracking-[0.4em] uppercase">Loading Asset</div>
           </div>
        </div>
      )}
      
      {/* Dynamic HUD */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 z-30">
        <div className="flex items-center gap-4 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-lg border border-white/10 shadow-2xl">
           <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{videoId} // {currentCam}</span>
             <span className="text-[8px] font-mono text-gray-500 font-bold">SEG: {currentSegment.toString().padStart(5, '0')}</span>
           </div>
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-50 p-12 text-center">
          <div className="max-w-md">
            <div className="text-red-500 text-4xl font-black italic mb-4 tracking-tighter">PLAYBACK_ERROR</div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-relaxed border border-white/10 p-4 rounded-xl">{error}</p>
            <button 
              onClick={onSegmentEnd}
              className="mt-8 text-[10px] font-black uppercase text-blue-500 border border-blue-500/30 px-6 py-2 rounded hover:bg-blue-500 hover:text-white transition-all"
            >
              Skip to Next Segment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentPlayer;
