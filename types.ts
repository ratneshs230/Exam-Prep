export enum Subject {
  POLITY = 'Polity',
  ECONOMY = 'Economy',
  GOVERNANCE = 'Governance',
  GENERAL_AWARENESS = 'General Awareness'
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export interface Question {
  id: string;
  text: string;
  options: string[]; // [A, B, C, D]
  correctAnswerIndex: number; // 0-3
  explanation: string;
  subject: Subject;
  difficulty: Difficulty;
  monthYear?: string; // e.g., "September 2023"
  tags: string[];
  documentId?: string;
}

export interface Attempt {
  questionId: string;
  userAnswerIndex: number;
  isCorrect: boolean;
  timeTaken: number; // seconds
  timestamp: number;
}

export interface QuizSession {
  id: string;
  mode: 'STANDARD' | 'ADAPTIVE' | 'EXAM' | 'CUSTOM';
  questions: Question[];
  currentQuestionIndex: number;
  attempts: Attempt[];
  startTime: number;
  timeLimit?: number; // duration in seconds
  isComplete: boolean;
}

export interface UploadedDocument {
  id: string;
  name: string;
  uploadDate: number;
  status: 'PARSING' | 'READY' | 'ERROR';
  questionCount: number;
}

export interface AppState {
  questions: Question[];
  attempts: Attempt[];
  documents: UploadedDocument[];
}