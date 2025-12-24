import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { aiAPI } from '../services/api.service';

const AIRecommendationsScreen = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.generateRecommendations();
      setRecommendations(response.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === 'Low') return '#4caf50';
    if (level === 'Moderate') return '#ff9800';
    if (level === 'High') return '#f44336';
    return '#9e9e9e';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AI Health Recommendations</Text>
      <Text style={styles.subtitle}>
        Get personalized health advice based on your recent readings
      </Text>

      {!recommendations && !loading && (
        <Button
          mode="contained"
          onPress={generateRecommendations}
          style={styles.button}
          icon="robot"
        >
          Generate AI Recommendations
        </Button>
      )}

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Analyzing your health data...</Text>
        </View>
      )}

      {recommendations && (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Risk Assessment</Text>
              <Chip
                style={[styles.riskChip, { backgroundColor: getRiskColor(recommendations.riskLevel) }]}
                textStyle={styles.riskText}
              >
                {recommendations.riskLevel} Risk
              </Chip>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              {recommendations.insights?.map((insight, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.listText}>{insight}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {recommendations.recommendations?.map((rec, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bullet}>✓</Text>
                  <Text style={styles.listText}>{rec}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          {recommendations.medicalAdvice && (
            <Card style={[styles.card, styles.warningCard]}>
              <Card.Content>
                <Text style={styles.sectionTitle}>⚠️ Medical Advice</Text>
                <Text style={styles.warningText}>{recommendations.medicalAdvice}</Text>
              </Card.Content>
            </Card>
          )}

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Next Check-up</Text>
              <Text>{recommendations.nextCheckup}</Text>
            </Card.Content>
          </Card>

          <Button
            mode="outlined"
            onPress={generateRecommendations}
            style={styles.button}
          >
            Regenerate Recommendations
          </Button>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  button: {
    marginVertical: 10,
  },
  centered: {
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  riskChip: {
    alignSelf: 'flex-start',
  },
  riskText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    marginRight: 8,
    color: '#2196F3',
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: '#fff3cd',
  },
  warningText: {
    color: '#856404',
  },
});

export default AIRecommendationsScreen;
