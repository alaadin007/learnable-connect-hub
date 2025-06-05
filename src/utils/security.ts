
/**
 * Security utilities for input validation and sanitization
 */

// Email validation with security considerations
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Security: Prevent extremely long emails that could cause DoS
  if (email.length > 254) {
    return false;
  }
  
  // Security: Use a strict email regex that prevents potential exploits
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email);
}

// School code validation
export function validateSchoolCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Security: Limit length and allowed characters
  if (code.length < 3 || code.length > 50) {
    return false;
  }
  
  // Security: Only allow alphanumeric characters, hyphens, and underscores
  const codeRegex = /^[A-Za-z0-9-_]+$/;
  return codeRegex.test(code);
}

// Sanitize text input to prevent XSS
export function sanitizeTextInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Security: Remove potential script tags and other dangerous content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .trim();
}

// Validate user type
export function validateUserType(userType: string): boolean {
  const validTypes = ['student', 'teacher', 'school_admin', 'school'];
  return validTypes.includes(userType);
}

// Sanitize filename for uploads
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }
  
  // Security: Remove dangerous characters and limit length
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100)
    .toLowerCase();
}

// Validate UUID format
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Rate limiting helper for client-side protection
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Content Security Policy helper
export function createCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.openai.com https://generativelanguage.googleapis.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');
}
