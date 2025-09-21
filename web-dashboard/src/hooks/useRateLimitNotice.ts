import { useState } from 'react';

// Hook for managing rate limit notices
export const useRateLimitNotice = () => {
  const [rateLimitError, setRateLimitError] = useState<any>(null);

  const showRateLimitNotice = (error: any) => {
    if (error?.isRateLimit) {
      setRateLimitError(error);
    }
  };

  const hideRateLimitNotice = () => {
    setRateLimitError(null);
  };

  return {
    rateLimitError,
    showRateLimitNotice,
    hideRateLimitNotice
  };
};
