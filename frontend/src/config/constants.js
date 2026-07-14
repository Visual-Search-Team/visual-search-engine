// # Chứa MAX_FILE_SIZE, API_BASE_URL, các key localStorage
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'api/visual-search/v1';
export const LOCAL_STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
};
