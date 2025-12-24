import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { readingsAPI } from '../services/api.service';

const AnalyticsScreen = () => {
  const [readings, setReadings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [historyRes, analyticsRes] = await Promise.all([
        readingsAPI.getHistory(period),
        readingsAPI.getAnalytics(period),
      ]);
      setReadings(historyRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (key) => {
    const labels = readings.slice(-7).map((r) => 
      new Date(parseInt(r.timestamp)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    const data = readings.slice(-7).map((r) => parseFloat(r[key]) || 0);

    return {
      labels,
      datasets: [{ data }],
    };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Health Analytics</Text>

      <SegmentedButtons
        value={period}
        onValueChange={setPeriod}
        buttons={[
          { value: '7', label: '7 Days' },
          { value: '30', label: '30 Days' },
          { value: '90', label: '3 Months' },
        ]}
        style={styles.segmented}
      />

      {analytics && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SpO2 Average</Text>
            <Text style={styles.statValue}>{analytics.analytics.spo2.avg}%</Text>
            <Text style={styles.statRange}>
              {analytics.analytics.spo2.min} - {analytics.analytics.spo2.max}%
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Heart Rate Avg</Text>
            <Text style={styles.statValue}>{analytics.analytics.heartRate.avg} bpm</Text>
            <Text style={styles.statRange}>
              {analytics.analytics.heartRate.min} - {analytics.analytics.heartRate.max} bpm
            </Text>
          </View>
        </View>
      )}

      {readings.length > 0 && (
        <>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>SpO2 Levels</Text>
            <LineChart
              data={prepareChartData('spo2')}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Heart Rate</Text>
            <LineChart
              data={prepareChartData('heartRate')}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Blood Pressure (Systolic)</Text>
            <LineChart
              data={prepareChartData('systolic')}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
  },
  segmented: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statRange: {
    fontSize: 10,
    color: '#999',
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 8,
  },
});

export default AnalyticsScreen;
