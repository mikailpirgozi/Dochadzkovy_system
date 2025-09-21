import { useCallback, useRef } from 'react';

/**
 * Custom hook for debouncing function calls
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
};

/**
 * Custom hook for throttling function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  ) as T;

  return throttledCallback;
};

/**
 * Custom hook for rate-limited API calls with exponential backoff
 */
export const useRateLimitedCall = <T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    debounceMs?: number;
  } = {}
): {
  call: T;
  isLoading: boolean;
  error: Error | null;
} => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    debounceMs = 300
  } = options;

  const loadingRef = useRef(false);
  const errorRef = useRef<Error | null>(null);

  const retryWithBackoff = async (fn: () => Promise<any>, retryCount = 0): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      if (retryCount < maxRetries && (error.isRateLimit || error.status === 429)) {
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retryCount + 1);
      }
      throw error;
    }
  };

  const debouncedCall = useDebounce(
    async (...args: Parameters<T>) => {
      loadingRef.current = true;
      errorRef.current = null;
      
      try {
        const result = await retryWithBackoff(() => apiCall(...args));
        return result;
      } catch (error) {
        errorRef.current = error as Error;
        throw error;
      } finally {
        loadingRef.current = false;
      }
    },
    debounceMs
  ) as T;

  return {
    call: debouncedCall,
    isLoading: loadingRef.current,
    error: errorRef.current
  };
};
