import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Alert } from '@/lib/types';
import { 
  formatRelativeTime, 
  getAlertTypeColor, 
  getAlertTypeText 
} from '@/lib/utils';
// import { dashboardApi } from '@/lib/api';
// import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AlertsListProps {
  alerts: Alert[];
  showActions?: boolean;
}

export function AlertsList({ alerts, showActions = true }: AlertsListProps) {
  // const queryClient = useQueryClient();

  // const resolveAlertMutation = useMutation({
  //   mutationFn: (alertId: string) => dashboardApi.resolveAlert(alertId),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
  //     queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  //   },
  // });

  const handleResolveAlert = async (alertId: string) => {
    try {
      console.log('Resolving alert:', alertId);
      // await resolveAlertMutation.mutateAsync(alertId);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            Žiadne aktívne upozornenia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Všetky upozornenia sú vyriešené. Skvelá práca! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          Aktívne upozornenia ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-2">
                  <Badge 
                    className={getAlertTypeColor(alert.type)}
                    variant="outline"
                  >
                    {getAlertTypeText(alert.type)}
                  </Badge>
                  <div className="flex items-center ml-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatRelativeTime(alert.createdAt)}
                  </div>
                </div>
                
                <p className="text-sm text-gray-900 mb-1">
                  <strong>{alert.user.firstName} {alert.user.lastName}</strong>
                </p>
                
                <p className="text-sm text-gray-600">
                  {alert.message}
                </p>
              </div>

              {showActions && !alert.resolved && (
                <div className="flex-shrink-0 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveAlert(alert.id)}
                    // disabled={resolveAlertMutation.isPending}
                  >
                    Vyriešiť
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
