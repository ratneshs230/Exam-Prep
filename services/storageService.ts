import { AppState, QuizSession, Attempt } from '../types';

const STORAGE_KEY = 'grade-b-prep-state';
const API_KEY_STORAGE_KEY = 'grade-b-prep-api-key';
const ACTIVE_SESSION_KEY = 'grade-b-prep-active-session';

interface SavedSession {
  session: QuizSession;
  attempts: Attempt[];
  currentIndex: number;
  savedAt: number;
}

export const StorageService = {
  /**
   * Save app state to localStorage
   */
  saveState(state: AppState): void {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  },

  /**
   * Load app state from localStorage
   */
  loadState(): AppState | null {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return null;
      return JSON.parse(serialized) as AppState;
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      return null;
    }
  },

  /**
   * Clear all saved state
   */
  clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear state from localStorage:', error);
    }
  },

  /**
   * Save API key to localStorage
   */
  saveApiKey(apiKey: string): void {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } catch (error) {
      console.error('Failed to save API key to localStorage:', error);
    }
  },

  /**
   * Load API key from localStorage
   */
  loadApiKey(): string | null {
    try {
      return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to load API key from localStorage:', error);
      return null;
    }
  },

  /**
   * Clear API key from localStorage
   */
  clearApiKey(): void {
    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear API key from localStorage:', error);
    }
  },

  /**
   * Save active session to localStorage
   */
  saveActiveSession(session: QuizSession, attempts: Attempt[], currentIndex: number): void {
    try {
      const savedSession: SavedSession = {
        session,
        attempts,
        currentIndex,
        savedAt: Date.now()
      };
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(savedSession));
    } catch (error) {
      console.error('Failed to save active session:', error);
    }
  },

  /**
   * Load active session from localStorage
   */
  loadActiveSession(): SavedSession | null {
    try {
      const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved) as SavedSession;

      // Check if session is too old (more than 24 hours)
      const hoursSinceSave = (Date.now() - parsed.savedAt) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        this.clearActiveSession();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load active session:', error);
      return null;
    }
  },

  /**
   * Clear active session from localStorage
   */
  clearActiveSession(): void {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear active session:', error);
    }
  }
};
