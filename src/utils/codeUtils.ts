// Utility functions for generating class codes, similar to your Kotlin CodeUtils

/**
 * Generates a random 6-character alphanumeric class code
 */
export const generateClassCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generates a unique ID for documents
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Validates if a class code is in the correct format (6 alphanumeric characters)
 */
export const isValidClassCode = (code: string): boolean => {
  return /^[A-Za-z0-9]{6}$/.test(code);
};