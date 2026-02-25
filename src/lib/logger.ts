// Centralized logging utility for production hygiene
const isDevelopment = process.env.NODE_ENV === 'development';
const isDebug = process.env.DEBUG === 'true';

export const logger = {
  // Always log errors in production
  error: (message: string, ...args: any[]) => {
    console.error(message, ...args);
  },

  // Log warnings in development and when debug is enabled
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment || isDebug) {
      console.warn(message, ...args);
    }
  },

  // Log info only in development
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },

  // Log debug only when explicitly enabled
  debug: (message: string, ...args: any[]) => {
    if (isDebug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  // Log permissions (controlled)
  permissions: (message: string, ...args: any[]) => {
    if (isDevelopment || isDebug) {
      console.log(`[PERMISSIONS] ${message}`, ...args);
    }
  },

  // Log admin actions (controlled)
  admin: (message: string, ...args: any[]) => {
    if (isDevelopment || isDebug) {
      console.log(`[ADMIN] ${message}`, ...args);
    }
  },

  // Log revalidation (controlled)
  revalidate: (message: string, ...args: any[]) => {
    if (isDevelopment || isDebug) {
      console.log(`🔄 ${message}`, ...args);
    }
  }
};
