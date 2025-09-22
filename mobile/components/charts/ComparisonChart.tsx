import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

interface ComparisonChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color: string;
      averageHoursPerDay: number;
      workingDays: number;
    }>;
    period: string;
    startDate: string;
    endDate: string;
    employeeCount: number;
  };
  loading?: boolean;
}

const screenWidth = Dimensions.get('window').width;

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-4">Porovnanie zamestnancov</Text>
        <View className="h-40 justify-center items-center">
          <Text className="text-gray-500">Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-4">Porovnanie zamestnancov</Text>
        <View className="h-40 justify-center items-center">
          <Text className="text-gray-500">Žiadne dáta</Text>
        </View>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
    barPercentage: 0.8,
  };

  // Prepare data for chart
  const chartData = {
    labels: data.datasets.map(dataset => {
      const names = dataset.label.split(' ');
      return names.length > 1 ? `${names[0]} ${names[1][0]}.` : dataset.label;
    }),
    datasets: [{
      data: data.datasets.map(dataset => dataset.data[0] || 0),
    }],
  };

  const periodText = data.period === 'week' ? 'týždeň' : 'mesiac';
  const dateRange = `${new Date(data.startDate).toLocaleDateString('sk-SK')} - ${new Date(data.endDate).toLocaleDateString('sk-SK')}`;

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <Text className="text-lg font-semibold text-gray-800 mb-2">Porovnanie zamestnancov</Text>
      <Text className="text-sm text-gray-600 mb-4">
        {periodText} • {dateRange}
      </Text>
      
      <BarChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withInnerLines={true}
        withVerticalLabels={false}
        withHorizontalLabels={true}
        yAxisLabel="Hodiny"
        yAxisSuffix="h"
        yAxisInterval={1}
        showValuesOnTopOfBars={true}
        fromZero={true}
      />
      
      {/* Employee details */}
      <View className="mt-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Detaily zamestnancov:</Text>
        {data.datasets.map((dataset, index) => (
          <View key={index} className="flex-row justify-between items-center py-2 border-b border-gray-100">
            <View className="flex-row items-center flex-1">
              <View 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: dataset.color }}
              />
              <Text className="text-sm text-gray-800 flex-1" numberOfLines={1}>
                {dataset.label}
              </Text>
            </View>
            <View className="flex-row space-x-4">
              <Text className="text-sm text-gray-600">
                {dataset.data[0]?.toFixed(1)}h
              </Text>
              <Text className="text-sm text-gray-500">
                ⌀ {dataset.averageHoursPerDay?.toFixed(1) || '0.0'}h/deň
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
