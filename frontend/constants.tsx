
import { VideoSource, CameraAngle } from './types';

export const VIDEO_ID = 'game_001';
export const INITIAL_CAM = CameraAngle.WIDE;
export const SEGMENT_DURATION_MS = 2000; // Estimated 2s segments
export const MAX_PRELOAD_SEGMENTS = 5;

export const CAM_LIST = [
  { id: CameraAngle.WIDE, label: 'Main Wide' },
  { id: CameraAngle.CLOSE, label: 'Action Close' },
  { id: CameraAngle.CAM11, label: 'Tactical Cam' },
  { id: CameraAngle.BEHIND, label: 'Goal Net' }
];

export const formatSegmentId = (seg: number): string => {
  return seg.toString().padStart(5, '0');
};

export const getSegmentUrl = (videoId: string, camName: string, seg: number): string => {
  const segId = formatSegmentId(seg);
  return `/processed/${videoId}/${camName}/segments/${videoId}_${camName}_${segId}.mp4`;
};

// Fixed: Added missing exports required by MultiCamPlayer
export const VIDEO_SOURCES: VideoSource[] = CAM_LIST.map(cam => ({
  id: cam.id,
  label: cam.label,
  url: getSegmentUrl(VIDEO_ID, cam.id, 1)
}));

export const FALLBACK_ANGLE = CameraAngle.WIDE;
