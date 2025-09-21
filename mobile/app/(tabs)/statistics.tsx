import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { StatisticsService } from '../../src/services/statistics.service';
import { ChartsService } from '../../src/services/charts.service';
import { useAuthStore } from '../../src/stores/authStore';
import { WeeklyChart } from '../../components/charts/WeeklyChart';
import { MonthlyChart } from '../../components/charts/MonthlyChart';
import { ComparisonChart } from '../../components/charts/ComparisonChart';
import type {
  StatisticsResponse,
  DayActivitiesResponse,
  DashboardStats,
  UserActivity,
  EmployeeStatistic,
} from '../../src/services/statistics.service';
import type {
  WeeklyChartData,
  MonthlyChartData,
  ComparisonChartData,
} from '../../src/services/charts.service';

type Period = 'day' | 'week' | 'month';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  padding: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flex: 1,
    marginHorizontal: 4,
  },
  statCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCardContent: {
    flex: 1,
  },
  statCardTitle: {
    color: '#6b7280',
    fontSize: 14,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statCardIcon: {
    padding: 12,
    borderRadius: 20,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  periodSelector: {
    marginBottom: 16,
  },
  periodSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  periodButtonsContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  dateText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  employeeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontWeight: '600',
    color: '#1f2937',
  },
  employeeEmail: {
    color: '#6b7280',
    fontSize: 14,
  },
  employeeStats: {
    flexDirection: 'row',
    marginTop: 8,
  },
  employeeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  employeeStatText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  employeeStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  overtimeText: {
    color: '#ea580c',
    fontSize: 12,
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activityUserName: {
    fontWeight: '600',
    color: '#1f2937',
  },
  activityEventCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryValue: {
    fontWeight: '500',
  },
  summaryValueGreen: {
    fontWeight: '500',
    color: '#10b981',
  },
  summaryValueOrange: {
    fontWeight: '500',
    color: '#f59e0b',
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventType: {
    fontWeight: '500',
    color: '#1f2937',
  },
  eventTime: {
    color: '#6b7280',
    fontSize: 14,
  },
  eventNotes: {
    color: '#9ca3af',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  detailEmail: {
    color: '#6b7280',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statItemCard: {
    borderRadius: 8,
    padding: 12,
  },
  statItemLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activitySection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activitySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityLabel: {
    color: '#6b7280',
  },
  activityValue: {
    fontWeight: '500',
  },
});

export default function StatisticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [employeeStats, setEmployeeStats] = useState<StatisticsResponse | null>(null);
  const [dayActivities, setDayActivities] = useState<DayActivitiesResponse | null>(null);
  
  // Chart data state
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyChartData | null>(null);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartData | null>(null);
  const [comparisonChartData, setComparisonChartData] = useState<ComparisonChartData | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  
  // Modal states
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeStatistic | null>(null);

  const { user } = useAuthStore();

  // Load data when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadAllData();
    }, [selectedPeriod, selectedDate])
  );

  const loadAllData = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      await Promise.all([
        loadDashboardStats(),
        loadEmployeeStatistics(),
        loadDayActivities(),
        loadChartData(),
      ]);
    } catch (error) {
      console.error('Error loading statistics data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const stats = await StatisticsService.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadEmployeeStatistics = async () => {
    try {
      const stats = await StatisticsService.getEmployeeStatistics(selectedPeriod, selectedDate);
      setEmployeeStats(stats);
    } catch (error) {
      console.error('Error loading employee statistics:', error);
    }
  };

  const loadDayActivities = async () => {
    try {
      const activities = await StatisticsService.getDayActivities(selectedDate, user?.id);
      setDayActivities(activities);
    } catch (error) {
      console.error('Error loading day activities:', error);
    }
  };

  const loadChartData = async () => {
    if (!user) return;

    try {
      setChartsLoading(true);
      
      // Load weekly chart data
      const weeklyData = await ChartsService.getWeeklyChartData();
      setWeeklyChartData(weeklyData);
      
      // Load monthly chart data
      const monthlyData = await ChartsService.getMonthlyChartData();
      setMonthlyChartData(monthlyData);
      
      // Load comparison chart data for current week
      const comparisonData = await ChartsService.getComparisonChartData('week');
      setComparisonChartData(comparisonData);
      
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setChartsLoading(false);
    }
  };

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (selectedPeriod) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setSelectedDate(newDate);
  };

  const showEmployeeDetails = (employee: EmployeeStatistic) => {
    setSelectedEmployee(employee);
    setShowDayDetails(true);
  };

  const formatDateRange = () => {
    if (!employeeStats) return '';
    
    const start = new Date(employeeStats.startDate);
    const end = new Date(employeeStats.endDate);
    
    if (selectedPeriod === 'day') {
      return StatisticsService.formatDate(start);
    } else if (selectedPeriod === 'week') {
      return `${StatisticsService.formatDate(start)} - ${StatisticsService.formatDate(end)}`;
    } else {
      return start.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={styles.statCard}>
      <View style={styles.statCardRow}>
        <View style={styles.statCardContent}>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
        </View>
        <View style={[styles.statCardIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  const renderEmployeeRow = (employee: EmployeeStatistic) => (
    <TouchableOpacity
      key={employee.id}
      style={styles.employeeCard}
      onPress={() => showEmployeeDetails(employee)}
    >
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeEmail}>{employee.email}</Text>
          <View style={styles.employeeStats}>
            <View style={styles.employeeStat}>
              <Ionicons name="time" size={16} color="#3b82f6" />
              <Text style={styles.employeeStatText}>
                {StatisticsService.formatWorkingTime(employee.workingHours * 60)}
              </Text>
            </View>
            <View style={styles.employeeStat}>
              <Ionicons name="calendar" size={16} color="#10b981" />
              <Text style={styles.employeeStatText}>
                {employee.workingDays} {employee.workingDays === 1 ? 'deň' : 'dní'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.employeeStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: StatisticsService.getStatusColor(employee.status) + '20' }
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: StatisticsService.getStatusColor(employee.status) }
              ]}
            >
              {employee.status}
            </Text>
          </View>
          {employee.overtime > 0 && (
            <Text style={styles.overtimeText}>
              +{StatisticsService.formatWorkingTime(employee.overtime * 60)} nadčas
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderActivityEvent = (event: any) => (
    <View key={event.id} style={styles.eventRow}>
      <View style={styles.eventDot} />
      <View style={styles.eventContent}>
        <Text style={styles.eventType}>
          {StatisticsService.translateEventType(event.type)}
        </Text>
        <Text style={styles.eventTime}>
          {StatisticsService.formatTime(event.timestamp)}
        </Text>
      </View>
      {event.notes && (
        <Text style={styles.eventNotes}>{event.notes}</Text>
      )}
    </View>
  );

  if (refreshing && !dashboardStats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Načítavam štatistiky...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadAllData} />
      }
    >
      <View style={styles.padding}>
        {/* Dashboard Stats */}
        {dashboardStats && (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>
              Aktuálny prehľad
            </Text>
            <View style={styles.cardRow}>
              {renderStatCard(
                'V práci',
                dashboardStats.employeesAtWork,
                'people',
                '#10b981'
              )}
              {renderStatCard(
                'Na prestávke',
                dashboardStats.employeesOnBreak,
                'restaurant',
                '#f59e0b'
              )}
            </View>
            <View style={styles.cardRow}>
              {renderStatCard(
                'Hodiny dnes',
                `${dashboardStats.totalHoursToday}h`,
                'time',
                '#3b82f6'
              )}
              {renderStatCard(
                'Upozornenia',
                dashboardStats.activeAlerts,
                'warning',
                '#ef4444'
              )}
            </View>
          </View>
        )}

        {/* Charts Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Grafické prehľady</Text>
          
          {/* Weekly Chart */}
          {weeklyChartData && (
            <WeeklyChart data={weeklyChartData} loading={chartsLoading} />
          )}
          
          {/* Monthly Chart */}
          {monthlyChartData && (
            <MonthlyChart data={monthlyChartData} loading={chartsLoading} />
          )}
          
          {/* Comparison Chart */}
          {comparisonChartData && (
            <ComparisonChart data={comparisonChartData} loading={chartsLoading} />
          )}
          
          {chartsLoading && (
            <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <View className="h-40 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-500 mt-2">Načítavam grafy...</Text>
              </View>
            </View>
          )}
        </View>

        {/* Period Selector */}
        <View style={{ marginBottom: 24 }}>
          <View style={styles.periodSelector}>
            <Text style={styles.sectionTitle}>
              Štatistiky zamestnancov
            </Text>
            <View style={styles.periodButtonsContainer}>
              <View style={styles.periodButtons}>
              {(['day', 'week', 'month'] as Period[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive
                  ]}
                  onPress={() => handlePeriodChange(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive
                    ]}
                  >
                    {period === 'day' ? 'Deň' : period === 'week' ? 'Týždeň' : 'Mesiac'}
                  </Text>
                </TouchableOpacity>
              ))}
              </View>
            </View>
          </View>

          {/* Date Navigation */}
          <View style={styles.dateNavigation}>
            <TouchableOpacity
              onPress={() => handleDateChange('prev')}
              style={styles.dateNavButton}
            >
              <Ionicons name="chevron-back" size={20} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.dateText}>
              {formatDateRange()}
            </Text>
            <TouchableOpacity
              onPress={() => handleDateChange('next')}
              style={styles.dateNavButton}
            >
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Employee Statistics */}
        {employeeStats && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={styles.subsectionTitle}>
                Zamestnanci ({employeeStats.totalEmployees})
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Celkom: {StatisticsService.formatWorkingTime(
                  StatisticsService.calculateTotalHours(employeeStats.statistics) * 60
                )}
              </Text>
            </View>
            {employeeStats.statistics.map(renderEmployeeRow)}
          </View>
        )}

        {/* Today's Activities */}
        {dayActivities && selectedPeriod === 'day' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.subsectionTitle}>
              Detailné aktivity - {StatisticsService.formatDate(selectedDate)}
            </Text>
            {dayActivities.activities.map((activity: UserActivity) => (
              <View key={activity.user.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityUserName}>
                    {activity.user.firstName} {activity.user.lastName}
                  </Text>
                  <Text style={styles.activityEventCount}>
                    {activity.events.length} udalostí
                  </Text>
                </View>
                
                {/* Summary */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Príchod</Text>
                      <Text style={styles.summaryValue}>
                        {activity.summary.clockInTime
                          ? StatisticsService.formatTime(activity.summary.clockInTime)
                          : 'Neprihlásený'}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Odchod</Text>
                      <Text style={styles.summaryValue}>
                        {activity.summary.clockOutTime
                          ? StatisticsService.formatTime(activity.summary.clockOutTime)
                          : 'Stále v práci'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Pracovný čas</Text>
                      <Text style={styles.summaryValueGreen}>
                        {StatisticsService.formatWorkingTime(activity.summary.totalWorkingTime)}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Prestávky</Text>
                      <Text style={styles.summaryValueOrange}>
                        {StatisticsService.formatWorkingTime(activity.summary.totalBreakTime)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Events Timeline */}
                <View>
                  <Text style={styles.timelineTitle}>
                    Časová os udalostí:
                  </Text>
                  {activity.events.map(renderActivityEvent)}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Employee Details Modal */}
      <Modal
        visible={showDayDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Detaily zamestnanca
              </Text>
              <TouchableOpacity
                onPress={() => setShowDayDetails(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {selectedEmployee && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailCard}>
                <Text style={styles.detailName}>
                  {selectedEmployee.name}
                </Text>
                <Text style={styles.detailEmail}>{selectedEmployee.email}</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={[styles.statItemCard, { backgroundColor: '#dbeafe' }]}>
                      <Text style={styles.statItemLabel}>Pracovné hodiny</Text>
                      <Text style={[styles.statItemValue, { color: '#2563eb' }]}>
                        {StatisticsService.formatWorkingTime(selectedEmployee.workingHours * 60)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statItemCard, { backgroundColor: '#dcfce7' }]}>
                      <Text style={styles.statItemLabel}>Pracovné dni</Text>
                      <Text style={[styles.statItemValue, { color: '#16a34a' }]}>
                        {selectedEmployee.workingDays}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statItemCard, { backgroundColor: '#fed7aa' }]}>
                      <Text style={styles.statItemLabel}>Prestávky</Text>
                      <Text style={[styles.statItemValue, { color: '#ea580c' }]}>
                        {StatisticsService.formatWorkingTime(selectedEmployee.breakTime * 60)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statItemCard, { backgroundColor: '#e9d5ff' }]}>
                      <Text style={styles.statItemLabel}>Priemer/deň</Text>
                      <Text style={[styles.statItemValue, { color: '#9333ea' }]}>
                        {StatisticsService.formatWorkingTime(selectedEmployee.averageHoursPerDay * 60)}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedEmployee.overtime > 0 && (
                  <View style={[styles.statItemCard, { backgroundColor: '#fee2e2', marginTop: 16 }]}>
                    <Text style={styles.statItemLabel}>Nadčasy</Text>
                    <Text style={[styles.statItemValue, { color: '#dc2626' }]}>
                      {StatisticsService.formatWorkingTime(selectedEmployee.overtime * 60)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.activitySection}>
                <Text style={styles.activitySectionTitle}>
                  Aktivita v období
                </Text>
                <View>
                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Prvá aktivita:</Text>
                    <Text style={styles.activityValue}>
                      {selectedEmployee.firstActivity
                        ? StatisticsService.formatTime(selectedEmployee.firstActivity)
                        : 'Žiadna'}
                    </Text>
                  </View>
                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Posledná aktivita:</Text>
                    <Text style={styles.activityValue}>
                      {selectedEmployee.lastActivity
                        ? StatisticsService.formatTime(selectedEmployee.lastActivity)
                        : 'Žiadna'}
                    </Text>
                  </View>
                  <View style={[styles.activityRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.activityLabel}>Celkový počet udalostí:</Text>
                    <Text style={styles.activityValue}>{selectedEmployee.totalEvents}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}