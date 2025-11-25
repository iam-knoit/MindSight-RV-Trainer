
export enum SessionState {
  IDLE = 'IDLE',
  VIEWING = 'VIEWING',
  ANALYZING = 'ANALYZING',
  FEEDBACK = 'FEEDBACK',
  DOJO = 'DOJO', // New state for Intuition Dojo
  DRAWING_DOJO = 'DRAWING_DOJO', // New state for Drawing Dojo
  RESET = 'RESET', // New state for Mental Reset
}

export type SessionType = 'TRAINING' | 'OPEN';

export interface SessionData {
  id: string;
  sessionType: SessionType; // New field to distinguish mode
  coordinate: string;
  timestamp: number;
  
  // Target data is optional for OPEN sessions
  targetImageUrl?: string;
  targetImageBase64?: string;
  targetIntent?: string; // What the user is looking for (e.g. "Lost Keys")

  userSketchBase64: string | null;
  userNotes: string;
  
  // AI Data is optional for OPEN sessions
  aiScore?: number;
  drawingScore?: number; // Added: sub-score for sketch
  notesScore?: number;   // Added: sub-score for notes
  aiFeedback?: string;
  aiGuessedSubject?: string; // The AI's guess in Open Mode
  generatedImageUrl?: string; // AI reconstruction of the target
  
  durationSeconds?: number;
  postSessionRemarks?: string; 
}

export interface IntuitionStats {
  totalGuesses: number;
  correctGuesses: number;
  currentStreak: number;
  bestStreak: number;
}

export interface TargetImage {
  url: string;
  base64: string;
}

export interface ScoringResult {
  score: number;
  drawingScore?: number;
  notesScore?: number;
  feedback: string;
}

export interface OpenAnalysisResult {
  subject: string;
  analysis: string;
}

export interface CoachReport {
  trendSummary: string;
  strengths: string[];
  weaknesses: string[];
  trainingTips: string[];
  immediateAction: string; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
