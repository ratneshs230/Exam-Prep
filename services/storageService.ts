import { AppState } from '../types';

const STORAGE_KEY = 'grade-b-prep-state';
const API_KEY_STORAGE_KEY = 'grade-b-prep-api-key';

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
  }
};
