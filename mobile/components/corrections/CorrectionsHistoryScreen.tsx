import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService } from '../../src/services/attendance.service';

interface Correction {
  id: string;
  originalEventId: string;
  requestedChange: {
    timestamp?: string;
    type?: string;
    notes?: string;
  };
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  originalEvent?: {
    type: string;
    timestamp: string;
    notes?: string;
  };
  reviewedByUser?: {
    firstName: string;
    lastName: string;
  };
}

interface CorrectionItemProps {
  correction: Correction;
  onPress: (correction: Correction) => void;
}

function CorrectionItem({ correction, onPress }: CorrectionItemProps) {

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Schválená';
      case 'REJECTED': return 'Zamietnutá';
      case 'PENDING': return 'Čaká na schválenie';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'checkmark-circle';
      case 'REJECTED': return 'close-circle';
      case 'PENDING': return 'time';
      default: return 'help-circle';
    }
  };

  const formatEventType = (type: string): string => {
    const translations: Record<string, string> = {
      'CLOCK_IN': 'Príchod',
      'CLOCK_OUT': 'Odchod',
      'BREAK_START': 'Začiatok prestávky',
      'BREAK_END': 'Koniec prestávky',
      'PERSONAL_START': 'Začiatok súkromných vecí',
      'PERSONAL_END': 'Koniec súkromných vecí'
    };
    return translations[type] || type;
  };

  const formatRequestedChanges = (changes: Correction['requestedChange']): string => {
    const changeTexts: string[] = [];

    if (changes.timestamp) {
      changeTexts.push(`Čas: ${new Date(changes.timestamp).toLocaleString('sk-SK')}`);
    }

    if (changes.type) {
      changeTexts.push(`Typ: ${formatEventType(changes.type)}`);
    }

    if (changes.notes) {
      changeTexts.push(`Poznámky: ${changes.notes}`);
    }

    return changeTexts.join(', ') || 'Žiadne zmeny';
  };

  return (
    <TouchableOpacity
      style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f3f4f6'
      }}
      onPress={() => onPress(correction)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
            {correction.originalEvent ? formatEventType(correction.originalEvent.type) : 'Neznáma udalosť'}
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            {correction.originalEvent 
              ? new Date(correction.originalEvent.timestamp).toLocaleString('sk-SK')
              : 'Neznámy čas'
            }
          </Text>
        </View>
        
        <View style={{
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: correction.status === 'PENDING' ? '#fef3c7' : 
                          correction.status === 'APPROVED' ? '#dcfce7' : '#fef2f2'
        }}>
          <Ionicons 
            name={getStatusIcon(correction.status) as keyof typeof Ionicons.glyphMap} 
            size={16} 
            color={correction.status === 'PENDING' ? '#d97706' : 
                   correction.status === 'APPROVED' ? '#059669' : '#dc2626'} 
            style={{ marginRight: 4 }}
          />
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: correction.status === 'PENDING' ? '#d97706' : 
                   correction.status === 'APPROVED' ? '#059669' : '#dc2626'
          }}>
            {getStatusText(correction.status)}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
          Požadované zmeny:
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>
          {formatRequestedChanges(correction.requestedChange)}
        </Text>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
          Dôvod:
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280' }} numberOfLines={2}>
          {correction.reason}
        </Text>
      </View>

      {correction.status !== 'PENDING' && correction.reviewedByUser && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
          <Text style={{ fontSize: 14, color: '#6b7280' }}>
            {correction.status === 'APPROVED' ? 'Schválil' : 'Zamietol'}: {' '}
            {correction.reviewedByUser.firstName} {correction.reviewedByUser.lastName}
          </Text>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>
            {new Date(correction.reviewedAt!).toLocaleString('sk-SK')}
          </Text>
          {correction.reviewNotes && (
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }} numberOfLines={2}>
              {correction.reviewNotes}
            </Text>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>
          Vytvorené: {new Date(correction.createdAt).toLocaleString('sk-SK')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
}

export default function CorrectionsHistoryScreen() {
  // const { user } = useAuthStore();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadCorrections(1);
  }, []);

  const loadCorrections = async (pageNum: number, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await AttendanceService.getMyCorrections({
        page: pageNum,
        limit: 10
      });

      if (response.success && Array.isArray(response.data)) {
        const newCorrections = response.data as Correction[];
        
        if (pageNum === 1) {
          setCorrections(newCorrections);
        } else {
          setCorrections(prev => [...prev, ...newCorrections]);
        }

        setHasMore(newCorrections.length === 10);
        setPage(pageNum);
      } else {
        throw new Error(response.error || 'Nepodarilo sa načítať korekcie');
      }
    } catch (error) {
      console.error('Failed to load corrections:', error);
      Alert.alert('Chyba', 'Nepodarilo sa načítať korekcie');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    loadCorrections(1, true);
  }, []);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadCorrections(page + 1);
    }
  };

  const handleCorrectionPress = (_correction: Correction) => {
    // Navigate to correction detail screen
    // router.push(`/(tabs)/corrections/${correction.id}`);
  };

  const navigateToNewCorrection = () => {
    // router.push('/(tabs)/corrections/new');
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={{ paddingVertical: 16 }}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
      <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
      <Text style={{ fontSize: 20, fontWeight: '600', color: '#6b7280', marginTop: 16, marginBottom: 8 }}>
        Žiadne korekcie
      </Text>
      <Text style={{ color: '#9ca3af', textAlign: 'center', marginBottom: 24, paddingHorizontal: 32 }}>
        Zatiaľ ste nepožiadali o žiadne korekcie času. Môžete požiadať o opravu svojich záznamov dochádzky.
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        onPress={navigateToNewCorrection}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          Požiadať o korekciu
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Načítavam korekcie...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Moje korekcie
            </Text>
            <Text style={{ color: '#6b7280' }}>
              História požiadaviek na korekcie
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            onPress={navigateToNewCorrection}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics */}
      {corrections.length > 0 && (
        <View style={{ 
          backgroundColor: 'white', 
          marginHorizontal: 24, 
          marginTop: 16, 
          padding: 16, 
          borderRadius: 8, 
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
            Štatistiky
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#d97706' }}>
                {corrections.filter(c => c.status === 'PENDING').length}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>Čakajú</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#059669' }}>
                {corrections.filter(c => c.status === 'APPROVED').length}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>Schválené</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#dc2626' }}>
                {corrections.filter(c => c.status === 'REJECTED').length}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>Zamietnuté</Text>
            </View>
          </View>
        </View>
      )}

      {/* Corrections List */}
      <FlatList
        data={corrections}
        renderItem={({ item }) => (
          <CorrectionItem
            correction={item}
            onPress={handleCorrectionPress}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ 
          padding: 24,
          paddingTop: corrections.length > 0 ? 16 : 24
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
