import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, TextInput, Portal, Modal, FAB } from 'react-native-paper';
import { userAPI } from '../services/api.service';

const MedicationsScreen = () => {
  const [medications, setMedications] = useState([]);
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: '',
  });

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const response = await userAPI.getMedications();
      const medsArray = response.data ? Object.entries(response.data).map(([id, med]) => ({ id, ...med })) : [];
      setMedications(medsArray);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const addMedication = async () => {
    try {
      await userAPI.addMedication(formData);
      Alert.alert('Success', 'Medication reminder added');
      setVisible(false);
      setFormData({ name: '', dosage: '', frequency: '', time: '' });
      fetchMedications();
    } catch (error) {
      Alert.alert('Error', 'Failed to add medication');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Medication Reminders</Text>

        {medications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No medication reminders set</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add one</Text>
          </View>
        ) : (
          medications.map((med) => (
            <Card key={med.id} style={styles.card}>
              <Card.Content>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDetail}>Dosage: {med.dosage}</Text>
                <Text style={styles.medDetail}>Frequency: {med.frequency}</Text>
                <Text style={styles.medDetail}>Time: {med.time}</Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setVisible(true)}
      />

      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>Add Medication Reminder</Text>

          <TextInput
            label="Medication Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            style={styles.input}
          />

          <TextInput
            label="Dosage (e.g., 500mg)"
            value={formData.dosage}
            onChangeText={(text) => setFormData({ ...formData, dosage: text })}
            style={styles.input}
          />

          <TextInput
            label="Frequency (e.g., Twice daily)"
            value={formData.frequency}
            onChangeText={(text) => setFormData({ ...formData, frequency: text })}
            style={styles.input}
          />

          <TextInput
            label="Time (e.g., 8:00 AM, 8:00 PM)"
            value={formData.time}
            onChangeText={(text) => setFormData({ ...formData, time: text })}
            style={styles.input}
          />

          <Button mode="contained" onPress={addMedication} style={styles.button}>
            Add Reminder
          </Button>
          <Button onPress={() => setVisible(false)}>Cancel</Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  medName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  medDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 10,
    marginBottom: 10,
  },
});

export default MedicationsScreen;
