import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface WeeklyChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      color: string;
      label: string;
    }>;
    period: string;
    startDate: string;
    endDate: string;
  };
  loading?: boolean;
}

const screenWidth = Dimensions.get('window').width;

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-4">Týždenný prehľad</Text>
        <View className="h-40 justify-center items-center">
          <Text className="text-gray-500">Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-4">Týždenný prehľad</Text>
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
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#3b82f6',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
  };

  // Prepare data for chart
  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, _index) => ({
      data: dataset.data,
      color: (opacity = 1) => dataset.color + Math.floor(opacity * 255).toString(16).padStart(2, '0'),
      strokeWidth: 2,
    })),
  };

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <Text className="text-lg font-semibold text-gray-800 mb-2">Týždenný prehľad</Text>
      <Text className="text-sm text-gray-600 mb-4">
        {new Date(data.startDate).toLocaleDateString('sk-SK')} - {new Date(data.endDate).toLocaleDateString('sk-SK')}
      </Text>
      
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={true}
        withHorizontalLines={true}
        withDots={true}
        withShadow={false}
        yAxisSuffix="h"
        yAxisInterval={1}
      />
      
      {/* Legend */}
      <View className="flex-row justify-center mt-2">
        {data.datasets.map((dataset, index) => (
          <View key={index} className="flex-row items-center mx-2">
            <View 
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: dataset.color }}
            />
            <Text className="text-xs text-gray-600">{dataset.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
