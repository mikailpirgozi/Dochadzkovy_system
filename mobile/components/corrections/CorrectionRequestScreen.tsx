import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceService } from '../../src/services/attendance.service';
import type { AttendanceEvent } from '../../src/types';

interface CorrectionData {
  originalEventId: string;
  requestedChange: {
    timestamp?: string;
    type?: string;
    notes?: string;
  };
  reason: string;
}

interface EventSelectorProps {
  events: AttendanceEvent[];
  selectedEvent: AttendanceEvent | null;
  onSelect: (event: AttendanceEvent) => void;
}

function EventSelector({ events, selectedEvent, onSelect }: EventSelectorProps) {
  const [showModal, setShowModal] = useState(false);

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

  const renderEventItem = ({ item }: { item: AttendanceEvent }) => (
    <TouchableOpacity
      className="flex-row justify-between items-center p-4 border-b border-gray-200"
      onPress={() => {
        onSelect(item);
        setShowModal(false);
      }}
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-900">
          {formatEventType(item.type)}
        </Text>
        <Text className="text-sm text-gray-600">
          {new Date(item.timestamp).toLocaleString('sk-SK')}
        </Text>
        {item.notes && (
          <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>
      {selectedEvent?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        className="border border-gray-300 rounded-lg p-4 bg-white"
        onPress={() => setShowModal(true)}
      >
        {selectedEvent ? (
          <View>
            <Text className="text-lg font-semibold text-gray-900">
              {formatEventType(selectedEvent.type)}
            </Text>
            <Text className="text-sm text-gray-600">
              {new Date(selectedEvent.timestamp).toLocaleString('sk-SK')}
            </Text>
          </View>
        ) : (
          <Text className="text-gray-500">Vyberte udalosť na korekciu</Text>
        )}
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color="#6b7280" 
          style={{ position: 'absolute', right: 16, top: 20 }}
        />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-xl font-bold">Vyberte udalosť</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            className="flex-1"
          />
        </View>
      </Modal>
    </>
  );
}

export default function CorrectionRequestScreen() {
  // const { user } = useAuthStore();
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEvent | null>(null);
  const [reason, setReason] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  // const [requestedType, setRequestedType] = useState('');
  const [requestedNotes, setRequestedNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    loadRecentEvents();
  }, []);

  const loadRecentEvents = async () => {
    try {
      setLoadingEvents(true);
      
      // Get events from last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await AttendanceService.getAttendanceEvents(
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (Array.isArray(response)) {
        // Filter out events that already have pending corrections
        const availableEvents = response.filter((event: AttendanceEvent) => 
          // Only allow corrections for main events (not break/personal)
          ['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'PERSONAL_START', 'PERSONAL_END'].includes(event.type)
        );
        
        setEvents(availableEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      Alert.alert('Chyba', 'Nepodarilo sa načítať udalosti');
    } finally {
      setLoadingEvents(false);
    }
  };

  const validateForm = (): boolean => {
    if (!selectedEvent) {
      Alert.alert('Chyba', 'Vyberte udalosť na korekciu');
      return false;
    }

    if (reason.trim().length < 10) {
      Alert.alert('Chyba', 'Dôvod korekcie musí mať aspoň 10 znakov');
      return false;
    }

    // At least one change must be requested
    if (!requestedTime && !requestedNotes.trim()) {
      Alert.alert('Chyba', 'Musíte špecifikovať aspoň jednu zmenu');
      return false;
    }

    // Validate timestamp if provided
    if (requestedTime) {
      const timestamp = new Date(requestedTime);
      if (isNaN(timestamp.getTime())) {
        Alert.alert('Chyba', 'Neplatný formát času');
        return false;
      }

      if (timestamp > new Date()) {
        Alert.alert('Chyba', 'Čas nemôže byť v budúcnosti');
        return false;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (timestamp < thirtyDaysAgo) {
        Alert.alert('Chyba', 'Nemožno opraviť udalosti staršie ako 30 dní');
        return false;
      }
    }

    return true;
  };

  const submitCorrection = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const requestedChange: {
        timestamp?: string;
        type?: string;
        notes?: string;
      } = {};
      
      if (requestedTime) {
        requestedChange.timestamp = new Date(requestedTime).toISOString();
      }
      
      // Note: requestedType functionality removed for now
      
      if (requestedNotes.trim() && requestedNotes.trim() !== (selectedEvent?.notes || '')) {
        requestedChange.notes = requestedNotes.trim();
      }

      const correctionData: CorrectionData = {
        originalEventId: selectedEvent?.id || '',
        requestedChange,
        reason: reason.trim()
      };

      const response = await AttendanceService.createCorrectionRequest(correctionData);

      if (response.success) {
        Alert.alert(
          'Úspech',
          'Požiadavka na korekciu bola odoslaná. Manažér ju posúdi a informuje vás o rozhodnutí.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        throw new Error(response.error || 'Neznáma chyba');
      }
    } catch (error) {
      console.error('Failed to submit correction:', error);
      Alert.alert(
        'Chyba',
        error instanceof Error ? error.message : 'Nepodarilo sa odoslať požiadavku'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeForInput = (date: Date): string => {
    return date.toISOString().slice(0, 16);
  };

  const setCurrentTime = () => {
    setRequestedTime(formatDateTimeForInput(new Date()));
  };

  const setOriginalTime = () => {
    if (selectedEvent) {
      setRequestedTime(formatDateTimeForInput(new Date(selectedEvent.timestamp)));
    }
  };

  if (loadingEvents) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Načítavam udalosti...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        <View className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Požiadavka na korekciu
          </Text>
          <Text className="text-gray-600 mb-6">
            Požiadajte o opravu času alebo typu udalosti. Manažér posúdi vašu požiadavku.
          </Text>

          {/* Event Selection */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Vyberte udalosť na korekciu *
            </Text>
            {events.length > 0 ? (
              <EventSelector
                events={events}
                selectedEvent={selectedEvent}
                onSelect={setSelectedEvent}
              />
            ) : (
              <View className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <Text className="text-gray-500 text-center">
                  Žiadne udalosti na korekciu
                </Text>
              </View>
            )}
          </View>

          {selectedEvent && (
            <>
              {/* Original Event Info */}
              <View className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Text className="text-sm font-semibold text-blue-900 mb-2">
                  Pôvodné údaje:
                </Text>
                <Text className="text-blue-800">
                  Typ: {selectedEvent.type}
                </Text>
                <Text className="text-blue-800">
                  Čas: {new Date(selectedEvent.timestamp).toLocaleString('sk-SK')}
                </Text>
                {selectedEvent.notes && (
                  <Text className="text-blue-800">
                    Poznámky: {selectedEvent.notes}
                  </Text>
                )}
              </View>

              {/* Requested Changes */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-4">
                  Požadované zmeny
                </Text>

                {/* Time Change */}
                <View className="mb-4">
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Nový čas
                  </Text>
                  <View className="flex-row space-x-2 mb-2">
                    <TouchableOpacity
                      className="bg-blue-500 px-3 py-2 rounded-md flex-1"
                      onPress={setCurrentTime}
                    >
                      <Text className="text-white text-center text-sm">Teraz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-gray-500 px-3 py-2 rounded-md flex-1"
                      onPress={setOriginalTime}
                    >
                      <Text className="text-white text-center text-sm">Pôvodný</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3 bg-white"
                    placeholder="YYYY-MM-DDTHH:mm"
                    value={requestedTime}
                    onChangeText={setRequestedTime}
                  />
                </View>

                {/* Notes Change */}
                <View className="mb-4">
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Nové poznámky
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3 bg-white min-h-[80px]"
                    placeholder="Nové poznámky k udalosti..."
                    value={requestedNotes}
                    onChangeText={setRequestedNotes}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </>
          )}

          {/* Reason */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              Dôvod korekcie *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 8,
                padding: 12,
                backgroundColor: 'white',
                minHeight: 120,
                textAlignVertical: 'top'
              }}
              placeholder="Opíšte dôvod, prečo je potrebná korekcia času... (min. 10 znakov)"
              placeholderTextColor="#9ca3af"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>
              {reason.length}/1000 znakov
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={{
              paddingVertical: 16,
              borderRadius: 8,
              backgroundColor: loading || !selectedEvent || reason.trim().length < 10
                ? '#d1d5db'
                : '#3b82f6'
            }}
            onPress={submitCorrection}
            disabled={loading || !selectedEvent || reason.trim().length < 10}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
                Odoslať požiadavku
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
            * Povinné polia
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
