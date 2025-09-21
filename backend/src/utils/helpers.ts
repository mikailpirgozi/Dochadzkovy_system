import * as crypto from 'crypto';

/**
 * Generate a unique QR code for a company
 */
export const generateQRCode = (companySlug: string): string => {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256')
    .update(`${companySlug}-${timestamp}-${randomBytes}`)
    .digest('hex');
  
  // Return first 16 characters for a manageable QR code
  return `QR-${hash.substring(0, 16).toUpperCase()}`;
};

/**
 * Generate a URL-friendly slug from company name
 */
export const generateCompanySlug = (companyName: string): string => {
  return companyName
    .toLowerCase()
    .trim()
    // Replace Slovak characters
    .replace(/[áä]/g, 'a')
    .replace(/[čć]/g, 'c')
    .replace(/[ď]/g, 'd')
    .replace(/[éě]/g, 'e')
    .replace(/[íì]/g, 'i')
    .replace(/[ľĺ]/g, 'l')
    .replace(/[ň]/g, 'n')
    .replace(/[óô]/g, 'o')
    .replace(/[ŕ]/g, 'r')
    .replace(/[š]/g, 's')
    .replace(/[ť]/g, 't')
    .replace(/[úů]/g, 'u')
    .replace(/[ý]/g, 'y')
    .replace(/[ž]/g, 'z')
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-|-$/g, '')
    // Ensure it's not empty
    || 'company';
};

/**
 * Generate a secure random string
 */
export const generateRandomString = (length = 32): string => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if a point is within a geofence
 */
export const isWithinGeofence = (
  userLat: number,
  userLng: number,
  geofenceLat: number,
  geofenceLng: number,
  radius: number
): boolean => {
  const distance = calculateDistance(userLat, userLng, geofenceLat, geofenceLng);
  return distance <= radius;
};

/**
 * Format duration in seconds to human readable format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes)}m`;
  } else if (minutes > 0) {
    return `${String(minutes)}m ${String(remainingSeconds)}s`;
  } else {
    return `${String(remainingSeconds)}s`;
  }
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize string for database storage
 */
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

/**
 * Generate pagination metadata
 */
export const getPaginationMeta = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    offset: (page - 1) * limit,
  };
};

/**
 * Validate Slovak phone number
 */
export const isValidSlovakPhone = (phone: string): boolean => {
  // Slovak mobile: +421 9XX XXX XXX or 09XX XXX XXX
  // Slovak landline: +421 X XXXX XXXX or 0X XXXX XXXX
  const phoneRegex = /^(\+421|0)(2|3[0-8]|4[1-9]|5[0-8]|9[0-9])\d{7}$/;
  const cleanPhone = phone.replace(/\s/g, '');
  return phoneRegex.test(cleanPhone);
};

/**
 * Format Slovak phone number
 */
export const formatSlovakPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\s/g, '');
  
  if (cleanPhone.startsWith('+421')) {
    const number = cleanPhone.substring(4);
    return `+421 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  } else if (cleanPhone.startsWith('0')) {
    return `${cleanPhone.substring(0, 4)} ${cleanPhone.substring(4, 7)} ${cleanPhone.substring(7)}`;
  }
  
  return phone;
};

/**
 * Generate a unique filename with timestamp
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = generateRandomString(8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  
  return `${nameWithoutExt}-${String(timestamp)}-${randomString}.${extension ?? ''}`;
};

/**
 * Convert bytes to human readable format
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)))} ${sizes[i] ?? ''}`;
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
