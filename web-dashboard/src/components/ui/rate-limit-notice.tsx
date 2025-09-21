import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from './button';
import { Clock, X, RefreshCw } from 'lucide-react';

interface RateLimitNoticeProps {
  error?: any;
  onRetry?: () => void;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const RateLimitNotice: React.FC<RateLimitNoticeProps> = ({
  error,
  onRetry,
  onDismiss,
  autoHide = true,
  autoHideDelay = 10000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (error?.retryAfter) {
      const retryAfterSeconds = parseInt(error.retryAfter, 10);
      if (!isNaN(retryAfterSeconds)) {
        setCountdown(retryAfterSeconds);
        
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [error?.retryAfter]);

  useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onDismiss]);

  const handleRetry = () => {
    setIsVisible(false);
    onRetry?.();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || !error?.isRateLimit) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-orange-800">
            Príliš veľa požiadaviek
          </p>
          <p className="text-sm text-orange-700 mt-1">
            {countdown !== null 
              ? `Skúste znovu za ${countdown} sekúnd.`
              : 'Počkajte chvíľu a skúste znovu. Aplikácia načíta dáta automaticky.'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {countdown === null && onRetry && (
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Skúsiť znovu
            </Button>
          )}
          
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-orange-700 hover:bg-orange-100 p-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

