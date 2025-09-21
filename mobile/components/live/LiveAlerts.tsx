import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLiveData } from '../../src/hooks/useLiveData';

interface LiveAlertsProps {
  maxItems?: number;
  showHeader?: boolean;
  onAlertPress?: (alertId: string) => void;
  className?: string;
}

export const LiveAlerts: React.FC<LiveAlertsProps> = ({ 
  maxItems = 10,
  showHeader = true,
  onAlertPress,
  className: _className = ''
}) => {
  const { activeAlerts, computedStats, isConnected } = useLiveData();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const getSeverityColor = (severity: string): string => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return '#dc2626';
      case 'HIGH':
        return '#ea580c';
      case 'MEDIUM':
        return '#d97706';
      case 'LOW':
        return '#65a30d';
      default:
        return '#6b7280';
    }
  };


  const getAlertTypeIcon = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'GEOFENCE_VIOLATION':
        return 'location';
      case 'OVERTIME_WARNING':
        return 'time';
      case 'BREAK_OVERRUN':
        return 'restaurant';
      case 'LOCATION_DISABLED':
        return 'location-off';
      case 'LATE_ARRIVAL':
        return 'alarm';
      case 'EARLY_DEPARTURE':
        return 'exit';
      default:
        return 'alert';
    }
  };

  const translateAlertType = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'GEOFENCE_VIOLATION':
        return 'Porušenie geofence';
      case 'OVERTIME_WARNING':
        return 'Nadčasové upozornenie';
      case 'BREAK_OVERRUN':
        return 'Predĺžená prestávka';
      case 'LOCATION_DISABLED':
        return 'Vypnutá poloha';
      case 'LATE_ARRIVAL':
        return 'Meškanie';
      case 'EARLY_DEPARTURE':
        return 'Predčasný odchod';
      default:
        return type;
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) {
      return 'Práve teraz';
    } else if (diffMins < 60) {
      return `Pred ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Pred ${diffHours}h`;
    } else {
      return date.toLocaleDateString('sk-SK', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleAlertPress = (alert: any) => {
    if (onAlertPress) {
      onAlertPress(alert.id);
    } else {
      setExpandedAlert(expandedAlert === alert.id ? null : alert.id);
    }
  };

  const handleResolveAlert = (alertId: string, alertMessage: string) => {
    Alert.alert(
      'Vyriešiť upozornenie',
      `Naozaj chcete označiť toto upozornenie ako vyriešené?\n\n"${alertMessage}"`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        { 
          text: 'Vyriešiť', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement alert resolution
            // console.log('Resolving alert:', alertId);
          }
        }
      ]
    );
  };

  const displayAlerts = activeAlerts.slice(0, maxItems);

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="warning" size={24} color="#ef4444" />
            <Text style={styles.headerTitle}>Aktívne upozornenia</Text>
            {!isConnected && (
              <View style={styles.offlineIndicator}>
                <Ionicons name="cloud-offline" size={16} color="#ef4444" />
              </View>
            )}
          </View>
          <View style={styles.alertStats}>
            <View style={styles.statBadge}>
              <Text style={styles.statText}>{computedStats.criticalAlerts}</Text>
              <Text style={styles.statLabel}>Kritické</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.alertsContainer} showsVerticalScrollIndicator={false}>
        {displayAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.emptyText}>Žiadne aktívne upozornenia</Text>
            <Text style={styles.emptySubtext}>
              Všetko v poriadku! Upozornenia sa zobrazia automaticky.
            </Text>
          </View>
        ) : (
          displayAlerts.map((alert, _index) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertItem,
                { borderLeftColor: getSeverityColor(alert.severity) }
              ]}
              onPress={() => handleAlertPress(alert)}
              activeOpacity={0.7}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertInfo}>
                  <View style={styles.alertTitleRow}>
                    <Ionicons 
                      name={getAlertTypeIcon(alert.type) as any} 
                      size={20} 
                      color={getSeverityColor(alert.severity)} 
                    />
                    <Text style={styles.alertType}>
                      {translateAlertType(alert.type)}
                    </Text>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) + '20' }]}>
                      <Text style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}>
                        {alert.severity.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.alertUser}>{alert.userName}</Text>
                  <Text style={styles.alertTime}>{formatTime(alert.timestamp)}</Text>
                </View>
                <View style={styles.alertActions}>
                  <Ionicons 
                    name={expandedAlert === alert.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#6b7280" 
                  />
                </View>
              </View>

              <Text style={styles.alertMessage} numberOfLines={expandedAlert === alert.id ? 0 : 2}>
                {alert.message}
              </Text>

              {expandedAlert === alert.id && (
                <View style={styles.expandedContent}>
                  <View style={styles.alertDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>ID:</Text>
                      <Text style={styles.detailValue}>{alert.id}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Typ:</Text>
                      <Text style={styles.detailValue}>{alert.type}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Používateľ:</Text>
                      <Text style={styles.detailValue}>{alert.userName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Čas:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(alert.timestamp).toLocaleString('sk-SK')}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.resolveButton}
                    onPress={() => handleResolveAlert(alert.id, alert.message)}
                  >
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                    <Text style={styles.resolveButtonText}>Vyriešiť</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {displayAlerts.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Zobrazených {displayAlerts.length} z {activeAlerts.length} upozornení
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  offlineIndicator: {
    marginLeft: 8,
  },
  alertStats: {
    flexDirection: 'row',
  },
  statBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  statText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  statLabel: {
    fontSize: 10,
    color: '#dc2626',
    marginTop: 2,
  },
  alertsContainer: {
    maxHeight: 400,
  },
  alertItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertUser: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  alertActions: {
    marginLeft: 12,
  },
  alertMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  alertDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  resolveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
