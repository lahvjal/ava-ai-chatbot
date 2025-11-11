/**
 * Central configuration utility for environment-specific settings
 */

// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
export const isProduction = process.env.NODE_ENV === 'production';

// Determine if we're in staging based on URL or environment variable
export const isStaging = typeof window !== 'undefined' 
  ? window.location.hostname.includes('staging') 
  : process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

/**
 * Get the base URL for the current environment
 */
export function getBaseUrl(): string {
  // First check for explicit override
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // For client-side, use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // For server-side, determine based on environment
  if (isDevelopment) {
    // Check for development port environment variables or use default
    const port = process.env.NEXT_PUBLIC_DEV_PORT || process.env.PORT || '3000';
    return `http://localhost:${port}`;
  }
  
  if (isStaging) {
    return 'https://staging-ava-ai.vercel.app'; // Staging domain
  }
  
  // Default to production
  return 'https://ava-ai-chatbot.vercel.app'; // Production domain
}

/**
 * Get the auth redirect URL for the specified path
 */
export function getAuthRedirectUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Email configuration
 */
export const emailConfig = {
  fromAddress: 'Ava AI Support <onboarding@resend.dev>', // Resend test domain for now
  supportEmail: 'support@aveyo.com'
};
