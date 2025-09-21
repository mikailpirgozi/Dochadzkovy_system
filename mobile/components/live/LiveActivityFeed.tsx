import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLiveData } from '../../src/hooks/useLiveData';

interface LiveActivityFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ 
  maxItems = 20,
  showHeader = true,
  className: _className = ''
}) => {
  const { recentEvents, isConnected, refreshData } = useLiveData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getEventIcon = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case 'CLOCK_IN':
        return 'log-in';
      case 'CLOCK_OUT':
        return 'log-out';
      case 'BREAK_START':
        return 'restaurant';
      case 'BREAK_END':
        return 'play';
      case 'LOCATION_UPDATE':
        return 'location';
      case 'GEOFENCE_ENTER':
        return 'checkmark-circle';
      case 'GEOFENCE_EXIT':
        return 'warning';
      default:
        return 'ellipse';
    }
  };

  const getEventColor = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case 'CLOCK_IN':
        return '#10b981';
      case 'CLOCK_OUT':
        return '#ef4444';
      case 'BREAK_START':
        return '#f59e0b';
      case 'BREAK_END':
        return '#3b82f6';
      case 'LOCATION_UPDATE':
        return '#8b5cf6';
      case 'GEOFENCE_ENTER':
        return '#10b981';
      case 'GEOFENCE_EXIT':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const translateEventType = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case 'CLOCK_IN':
        return 'Príchod do práce';
      case 'CLOCK_OUT':
        return 'Odchod z práce';
      case 'BREAK_START':
        return 'Začiatok prestávky';
      case 'BREAK_END':
        return 'Koniec prestávky';
      case 'LOCATION_UPDATE':
        return 'Aktualizácia polohy';
      case 'GEOFENCE_ENTER':
        return 'Vstup do pracoviska';
      case 'GEOFENCE_EXIT':
        return 'Opustenie pracoviska';
      default:
        return eventType;
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

  const displayEvents = recentEvents.slice(0, maxItems);

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="pulse" size={24} color="#3b82f6" />
            <Text style={styles.headerTitle}>Live aktivita</Text>
            {!isConnected && (
              <View style={styles.offlineIndicator}>
                <Ionicons name="cloud-offline" size={16} color="#ef4444" />
              </View>
            )}
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.feedContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {displayEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Žiadne nedávne aktivity</Text>
            <Text style={styles.emptySubtext}>
              {isConnected ? 'Aktivity sa zobrazia v reálnom čase' : 'Pripojte sa pre live aktualizácie'}
            </Text>
          </View>
        ) : (
          displayEvents.map((event, index) => (
            <View key={`${event.timestamp}-${event.userId}-${index}`} style={styles.eventItem}>
              <View style={styles.eventTimeline}>
                <View style={[styles.eventDot, { backgroundColor: getEventColor(event.type) }]} />
                {index < displayEvents.length - 1 && <View style={styles.timelineLine} />}
              </View>
              
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventUser}>{event.userName}</Text>
                    <Text style={styles.eventType}>
                      {translateEventType(event.type)}
                    </Text>
                  </View>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
                    <Ionicons 
                      name={getEventIcon(event.type) as any} 
                      size={16} 
                      color={getEventColor(event.type)} 
                    />
                  </View>
                </View>
                
                {event.location && (
                  <View style={styles.locationInfo}>
                    <Ionicons name="location" size={14} color="#6b7280" />
                    <Text style={styles.locationText}>
                      {event.location.latitude?.toFixed(6)}, {event.location.longitude?.toFixed(6)}
                      {event.location.accuracy && (
                        <Text style={styles.accuracyText}> (±{Math.round(event.location.accuracy)}m)</Text>
                      )}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {displayEvents.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Zobrazených {displayEvents.length} z {recentEvents.length} aktivít
          </Text>
          {recentEvents.length > maxItems && (
            <Text style={styles.footerSubtext}>
              Scroll up pre viac aktivít
            </Text>
          )}
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
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
  feedContainer: {
    maxHeight: 400,
  },
  eventItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventTimeline: {
    alignItems: 'center',
    marginRight: 12,
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventMeta: {
    alignItems: 'flex-end',
  },
  eventTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  accuracyText: {
    color: '#9ca3af',
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
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
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
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
