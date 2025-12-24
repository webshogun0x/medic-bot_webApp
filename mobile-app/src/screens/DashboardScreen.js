import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { readingsAPI } from '../services/api.service';
import HealthCard from '../components/HealthCard';

const DashboardScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const [latestReading, setLatestReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLatestReading = async () => {
    try {
      const response = await readingsAPI.getLatest();
      setLatestReading(response.data);
    } catch (error) {
      console.error('Error fetching readings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatestReading();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLatestReading();
  };

  const getStatus = (value, type) => {
    if (type === 'spo2') {
      if (value >= 95) return 'normal';
      if (value >= 90) return 'warning';
      return 'critical';
    }
    if (type === 'heartRate') {
      if (value >= 60 && value <= 100) return 'normal';
      return 'warning';
    }
    if (type === 'bp') {
      if (value <= 120) return 'normal';
      if (value <= 140) return 'warning';
      return 'critical';
    }
    return 'normal';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Health Dashboard</Text>
        <Button onPress={logout}>Logout</Button>
      </View>

      {latestReading ? (
        <>
          <Text style={styles.lastUpdate}>
            Last updated: {new Date(latestReading.timestamp).toLocaleString()}
          </Text>

          <View style={styles.cardsContainer}>
            <HealthCard
              title="SpO2"
              value={latestReading.spo2}
              unit="%"
              icon="🫁"
              status={getStatus(latestReading.spo2, 'spo2')}
            />
            <HealthCard
              title="Heart Rate"
              value={latestReading.heartRate}
              unit="bpm"
              icon="❤️"
              status={getStatus(latestReading.heartRate, 'heartRate')}
            />
            <HealthCard
              title="Blood Pressure"
              value={`${latestReading.systolic}/${latestReading.diastolic}`}
              unit="mmHg"
              icon="🩺"
              status={getStatus(latestReading.systolic, 'bp')}
            />
            <HealthCard
              title="Temperature"
              value={latestReading.temperature}
              unit="°C"
              icon="🌡️"
              status="normal"
            />
            {latestReading.bmi && (
              <HealthCard
                title="BMI"
                value={latestReading.bmi}
                unit=""
                icon="⚖️"
                status="normal"
              />
            )}
          </View>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('Analytics')}
            style={styles.button}
          >
            View Trends & Analytics
          </Button>

          <Button
            mode="contained"
            onPress={() => navigation.navigate('AIRecommendations')}
            style={styles.button}
          >
            Get AI Health Advice
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Medications')}
            style={styles.button}
          >
            Medication Reminders
          </Button>
        </>
      ) : (
        <View style={styles.centered}>
          <Text>No health data available. Visit MediBot station to record your vitals.</Text>
        </View>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  lastUpdate: {
    padding: 20,
    paddingTop: 10,
    color: '#666',
    fontSize: 12,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 0,
  },
  button: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
});

export default DashboardScreen;
