
/**
 * Security utilities for input validation, sanitization, and CSRF protection
 */

// Input validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  SCHOOL_CODE: /^[A-Z0-9-_]{6,12}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SAFE_TEXT: /^[a-zA-Z0-9\s\-_.,!?'"()]+$/,
  PHONE: /^\+?[\d\s\-()]{10,}$/
} as const;

// Maximum lengths for different input types
export const MAX_LENGTHS = {
  NAME: 100,
  EMAIL: 320,
  SCHOOL_CODE: 12,
  DESCRIPTION: 1000,
  TITLE: 200,
  PHONE: 20
} as const;

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > MAX_LENGTHS.EMAIL) return false;
  return VALIDATION_PATTERNS.EMAIL.test(email);
}

/**
 * Validate school code format
 */
export function validateSchoolCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  if (code.length > MAX_LENGTHS.SCHOOL_CODE) return false;
  return VALIDATION_PATTERNS.SCHOOL_CODE.test(code);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  return VALIDATION_PATTERNS.UUID.test(uuid);
}

/**
 * Sanitize text input by removing potentially dangerous characters
 */
export function sanitizeText(input: string, maxLength: number = MAX_LENGTHS.DESCRIPTION): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags and script content
  const withoutHtml = input.replace(/<[^>]*>/g, '');
  
  // Remove control characters except newlines and tabs
  const withoutControl = withoutHtml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim and limit length
  return withoutControl.trim().substring(0, maxLength);
}

/**
 * Sanitize name input (stricter than general text)
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  // Only allow letters, spaces, hyphens, and apostrophes
  const sanitized = name.replace(/[^a-zA-Z\s\-']/g, '').trim();
  
  return sanitized.substring(0, MAX_LENGTHS.NAME);
}

/**
 * Validate and sanitize user input for forms
 */
export function validateAndSanitizeForm(data: Record<string, any>): {
  valid: boolean;
  sanitized: Record<string, any>;
  errors: string[];
} {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
      continue;
    }

    switch (key) {
      case 'email':
        sanitized[key] = value.toString().toLowerCase().trim();
        if (!validateEmail(sanitized[key])) {
          errors.push(`Invalid email format: ${key}`);
        }
        break;
        
      case 'school_code':
        sanitized[key] = value.toString().toUpperCase().trim();
        if (!validateSchoolCode(sanitized[key])) {
          errors.push(`Invalid school code format: ${key}`);
        }
        break;
        
      case 'full_name':
      case 'name':
        sanitized[key] = sanitizeName(value.toString());
        if (sanitized[key].length < 1) {
          errors.push(`Name cannot be empty: ${key}`);
        }
        break;
        
      case 'description':
      case 'notes':
      case 'content':
        sanitized[key] = sanitizeText(value.toString());
        break;
        
      case 'id':
      case 'user_id':
      case 'school_id':
        sanitized[key] = value.toString().trim();
        if (!validateUUID(sanitized[key])) {
          errors.push(`Invalid UUID format: ${key}`);
        }
        break;
        
      default:
        // For unknown fields, apply basic sanitization
        if (typeof value === 'string') {
          sanitized[key] = sanitizeText(value);
        } else {
          sanitized[key] = value;
        }
    }
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Generate a CSRF token for forms
 */
export function generateCSRFToken(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Rate limiting helper - tracks requests per user
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the time window
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Export singleton rate limiter instances
export const apiRateLimiter = new RateLimiter(50, 60000); // 50 requests per minute
export const authRateLimiter = new RateLimiter(5, 300000); // 5 auth attempts per 5 minutes

/**
 * Validate file uploads
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file name for suspicious patterns
  const suspiciousPatterns = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.js'];
  const fileName = file.name.toLowerCase();
  
  for (const pattern of suspiciousPatterns) {
    if (fileName.includes(pattern)) {
      return { valid: false, error: 'File type not allowed' };
    }
  }

  return { valid: true };
}

/**
 * Secure headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
} as const;
