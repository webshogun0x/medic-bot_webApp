import React, { useState, useEffect, useContext } from 'react';
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { usersAPI } from '../services/api';

interface MedicationPageProps {
  onBack: () => void;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  active?: boolean;
}

const MedicationPage: React.FC<MedicationPageProps> = ({ onBack }) => {
  const { user } = useContext(AuthContext);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    time: '08:00'
  });

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getMedications();
      
      // Handle both array and object responses
      let medsArray: Medication[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          medsArray = response.data;
        } else if (typeof response.data === 'object') {
          medsArray = Object.entries(response.data).map(([key, value]: any) => ({
            id: key,
            ...value
          }));
        }
      }
      setMedications(medsArray);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMedication = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await usersAPI.addMedication(formData);
      setFormData({ name: '', dosage: '', frequency: 'Once daily', time: '08:00' });
      setShowForm(false);
      setSuccess(response.data.message || 'Medication added successfully!');
      await fetchMedications();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add medication');
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this medication reminder?')) {
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      const response = await usersAPI.deleteMedication(id);
      setSuccess(response.data.message || 'Medication deleted successfully!');
      await fetchMedications();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete medication');
    }
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    button: (primary: boolean) => ({
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: primary ? '#2563eb' : '#e5e7eb',
      color: primary ? '#fff' : '#111827',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }),
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' },
    formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
    label: { fontSize: '14px', fontWeight: '500', color: '#374151' },
    input: { padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    select: { padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' },
    success: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '14px' },
    medicationItem: { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    medicationInfo: { flex: 1 },
    medicationName: { fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' },
    medicationDetails: { fontSize: '14px', color: '#6b7280' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '8px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>Medications</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={styles.button(true) as any}
        >
          <Plus size={16} />
          Add Medication
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {showForm && (
        <div style={styles.card}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Add New Medication</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Medication Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Aspirin"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Dosage</label>
              <input
                type="text"
                name="dosage"
                value={formData.dosage}
                onChange={handleInputChange}
                placeholder="e.g., 500mg"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Frequency</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                style={styles.select}
              >
                <option>Once daily</option>
                <option>Twice daily</option>
                <option>Three times daily</option>
                <option>As needed</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Time</label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                style={styles.input}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleAddMedication}
              style={styles.button(true) as any}
            >
              Add Medication
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={styles.button(false) as any}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading medications...
        </div>
      ) : (
        <div style={styles.card}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            Current Medications ({medications.length})
          </h2>
          {medications.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No medications added yet.</p>
          ) : (
            medications.map(med => (
              <div key={med.id} style={styles.medicationItem}>
                <div style={styles.medicationInfo}>
                  <div style={styles.medicationName}>{med.name}</div>
                  <div style={styles.medicationDetails}>
                    {med.dosage} • {med.frequency} at {med.time}
                  </div>
                </div>
                <button 
                  style={styles.deleteBtn}
                  onClick={() => handleDeleteMedication(med.id)}
                  title="Delete medication"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MedicationPage;
