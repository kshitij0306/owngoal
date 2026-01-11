
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

export interface StreamEvent {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  status: 'LIVE' | 'ARCHIVE';
  availableCams: string[];
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

export type MediaSegment = File | string;

export interface MediaLibrary {
  [sessionId: string]: {
    cams: {
      [camName: string]: {
        segments: { [segId: number]: MediaSegment }
      }
    }
  }
}

/**
 * Represents a video source configuration for a specific camera angle.
 */
export interface VideoSource {
  id: string;
  label: string;
  url: string;
}

/**
 * Represents a transition decision made by the AI director.
 */
export interface DirectorDecision {
  timestamp: number;
  angle: CameraAngle;
  transitionType: 'CUT' | 'FADE';
  reason?: string;
}
