export enum SessionState {
  IDLE = 'IDLE',
  VIEWING = 'VIEWING',
  ANALYZING = 'ANALYZING',
  FEEDBACK = 'FEEDBACK',
}

export interface SessionData {
  id: string;
  coordinate: string;
  timestamp: number;
  targetImageUrl: string;
  targetImageBase64: string;
  userSketchBase64: string | null;
  userNotes: string;
  aiScore: number;
  aiFeedback: string;
}

export interface TargetImage {
  url: string;
  base64: string;
}

export interface ScoringResult {
  score: number;
  feedback: string;
}