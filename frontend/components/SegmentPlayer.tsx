
import React, { useState, useEffect, useRef } from 'react';
import { getSegmentUrl, VIDEO_ID } from '../constants';

interface SegmentPlayerProps {
  currentSegment: number;
  currentCam: string;
  onSegmentEnd: () => void;
  onBufferStatus: (isBuffering: boolean) => void;
}

const SegmentPlayer: React.FC<SegmentPlayerProps> = ({ 
  currentSegment, 
  currentCam, 
  onSegmentEnd,
  onBufferStatus
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  const segmentUrl = getSegmentUrl(VIDEO_ID, currentCam, currentSegment);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(e => {
        console.warn("Autoplay block or loading error:", e);
      });
    }
  }, [segmentUrl]);

  const handleEnded = () => {
    onSegmentEnd();
  };

  const handleWaiting = () => onBufferStatus(true);
  const handlePlaying = () => onBufferStatus(false);

  return (
    <div className="relative w-full h-full bg-[#050505] rounded-xl overflow-hidden border border-white/5 group">
      <video
        ref={videoRef}
        src={segmentUrl}
        className="w-full h-full object-contain"
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onError={() => setError(`Failed to load segment ${currentSegment} for ${currentCam}`)}
        playsInline
        autoPlay
      />
      
      {/* HUD Overlays */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/10 flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-white uppercase">
            {VIDEO_ID} // SEG: {currentSegment.toString().padStart(5, '0')}
          </span>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded border border-white/5">
          <span className="text-[10px] font-mono text-gray-300 uppercase">CAM: {currentCam}</span>
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20 p-8 text-center">
          <div className="max-w-xs">
            <div className="text-red-500 text-3xl mb-4 font-black">X</div>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-tighter leading-relaxed">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-white/10 rounded-lg text-[10px] uppercase font-bold hover:bg-white/20"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentPlayer;
