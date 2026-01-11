
export enum CameraAngle {
  WIDE = 'WIDE',
  CLOSE = 'CLOSE',
  CAM11 = 'CAM11',
  BEHIND = 'BEHIND'
}

export interface User {
  id: string;
  name: string;
}

export interface SegmentDecision {
  user_id: string;
  seg: number;
  cam: string;
  confidence: number;
}

export interface PlaybackState {
  currentSegment: number;
  currentCam: string;
  isBuffering: boolean;
  isPaused: boolean;
  videoId: string;
}

export interface DirectorDecision {
  timestamp: number;
  angle: CameraAngle;
  transitionType: 'CUT' | 'FADE';
  reason?: string;
}

export interface VideoSource {
  id: string;
  label: string;
  url: string;
}
