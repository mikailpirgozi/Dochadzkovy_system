import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

interface MonthlyChartProps {
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

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ data, loading = false }) => {
  if (loading) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-4">Mesačný prehľad</Text>
        <View className="h-40 justify-center items-center">
          <Text className="text-gray-500">Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-4">Mesačný prehľad</Text>
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
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#e5e7eb',
      strokeWidth: 1,
    },
    barPercentage: 0.7,
  };

  // Prepare data for chart - use first dataset for bar chart
  const chartData = {
    labels: data.labels.length > 15 ? 
      data.labels.filter((_, index) => index % 2 === 0) : // Show every 2nd label if too many
      data.labels,
    datasets: [{
      data: data.datasets[0]?.data || [],
    }],
  };

  const monthName = new Date(data.startDate).toLocaleDateString('sk-SK', { 
    year: 'numeric', 
    month: 'long' 
  });

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <Text className="text-lg font-semibold text-gray-800 mb-2">Mesačný prehľad</Text>
      <Text className="text-sm text-gray-600 mb-4 capitalize">{monthName}</Text>
      
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
        showValuesOnTopOfBars={false}
        fromZero={true}
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
