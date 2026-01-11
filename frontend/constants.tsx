
import { VideoSource, CameraAngle, StreamEvent } from './types';

export const INITIAL_CAM = CameraAngle.WIDE;
export const SEGMENT_DURATION_MS = 2000;
export const MAX_PRELOAD_SEGMENTS = 5;

export const CAM_LIST = [
  { id: CameraAngle.WIDE, label: 'Main Wide' },
  { id: CameraAngle.CLOSE, label: 'Action Close' },
  { id: CameraAngle.CAM11, label: 'Tactical Cam' },
  { id: CameraAngle.BEHIND, label: 'Goal Net' }
];

/**
 * 🛠️ USER CONFIGURATION
 * Add your folder names from public/processed/ here.
 * Example: if you have public/processed/match_day_01, add 'match_day_01'
 */
export const REAL_VIDEO_REGISTRY: string[] = [
  'game_001', 
  'game_002'
];

export const MOCK_EVENTS: StreamEvent[] = REAL_VIDEO_REGISTRY.map(id => ({
  id,
  title: `Stream Source: ${id}`,
  thumbnail: `https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400&sig=${id}`,
  date: 'LOCAL_UPLINK',
  status: 'LIVE'
}));

// Utility to create a stream object for custom folders found in public/processed/
export const createDynamicEvent = (id: string): StreamEvent => ({
  id,
  title: `Manual Feed: ${id}`,
  thumbnail: 'https://images.unsplash.com/photo-1518091043644-c1d445bb51ed?auto=format&fit=crop&q=80&w=400',
  date: new Date().toLocaleDateString(),
  status: 'LIVE'
});

export const formatSegmentId = (seg: number): string => {
  return seg.toString().padStart(5, '0');
};

/**
 * 📂 FOLDER STRUCTURE EXPECTATION:
 * public/processed/<videoId>/<camName>/<videoId>_<camName>_<segId>.mp4
 * Example: public/processed/game_001/WIDE/game_001_WIDE_00001.mp4
 */
export const getSegmentUrl = (videoId: string, camName: string, seg: number): string => {
  const segId = formatSegmentId(seg);
  return `/processed/${videoId}/${camName}/${videoId}_${camName}_${segId}.mp4`;
};

export const getSourcesForEvent = (videoId: string): VideoSource[] => {
  return CAM_LIST.map(cam => ({
    id: cam.id,
    label: cam.label,
    url: getSegmentUrl(videoId, cam.id, 1)
  }));
};

export const VIDEO_SOURCES: VideoSource[] = getSourcesForEvent(REAL_VIDEO_REGISTRY[0] || 'game_001');

export const FALLBACK_ANGLE = CameraAngle.WIDE;
