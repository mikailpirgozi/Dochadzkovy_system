import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLiveData } from '../../src/hooks/useLiveData';

interface LiveStatusCardsProps {
  className?: string;
}

export const LiveStatusCards: React.FC<LiveStatusCardsProps> = ({ className: _className = '' }) => {
  const { dashboardStats, computedStats, isConnected } = useLiveData();

  if (!dashboardStats) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Načítavam live dáta...</Text>
        </View>
      </View>
    );
  }

  const StatusCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: string; 
    color: string; 
    subtitle?: string;
  }) => (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardValue}>{value}</Text>
          {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {!isConnected && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.connectionStatus}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Live pripojenie aktívne' : 'Offline režim'}
        </Text>
      </View>

      {/* Main Stats */}
      <View style={styles.cardRow}>
        <StatusCard
          title="V práci"
          value={dashboardStats.employeesAtWork}
          icon="people"
          color="#10b981"
          subtitle={`z ${dashboardStats.totalEmployees} zamestnancov`}
        />
        <StatusCard
          title="Na prestávke"
          value={dashboardStats.employeesOnBreak}
          icon="restaurant"
          color="#f59e0b"
        />
      </View>

      <View style={styles.cardRow}>
        <StatusCard
          title="Hodiny dnes"
          value={`${dashboardStats.totalHoursToday}h`}
          icon="time"
          color="#3b82f6"
          subtitle={`Priemer: ${computedStats.averageHoursPerEmployee.toFixed(1)}h/osoba`}
        />
        <StatusCard
          title="Upozornenia"
          value={dashboardStats.activeAlerts}
          icon="warning"
          color="#ef4444"
          subtitle={`${computedStats.criticalAlerts} kritických`}
        />
      </View>

      {/* Additional Stats */}
      <View style={styles.cardRow}>
        <StatusCard
          title="Mimo geofence"
          value={computedStats.employeesOutside}
          icon="location"
          color="#8b5cf6"
        />
        <StatusCard
          title="Nedávna aktivita"
          value={computedStats.recentActivity}
          icon="pulse"
          color="#06b6d4"
          subtitle="Posledných 5 min"
        />
      </View>

      {/* Last Update */}
      <View style={styles.lastUpdate}>
        <Ionicons name="refresh" size={16} color="#6b7280" />
        <Text style={styles.lastUpdateText}>
          Naposledy aktualizované: {new Date().toLocaleTimeString('sk-SK')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  offlineText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
});
