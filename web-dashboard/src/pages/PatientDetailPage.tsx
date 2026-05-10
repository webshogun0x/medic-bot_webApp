import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Heart, Activity, Thermometer, Droplets, Calendar, Phone, Mail, CreditCard, Download, Edit } from 'lucide-react';
import { adminAPI, readingsAPI } from '../services/api';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PatientDetailPageProps {
  onBack: () => void;
}

const PatientDetailPage: React.FC<PatientDetailPageProps> = ({ onBack }) => {
  const { uid } = useParams<{ uid: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const [rfidInput, setRfidInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    if (uid) {
      fetchPatientDetails();
    }
  }, [uid]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getPatientDetails(uid!);
      setPatient(response.data);
      
      // Format history data for chart
      if (response.data.latestReading) {
        // In real scenario, fetch history from readings endpoint
        // For now, create sample data based on latest reading
        const latest = response.data.latestReading;
        setHistoryData([
          { date: 'Day 1', heartRate: latest.heartRate - 5, spo2: latest.spo2 - 1 },
          { date: 'Day 2', heartRate: latest.heartRate - 3, spo2: latest.spo2 },
          { date: 'Day 3', heartRate: latest.heartRate - 2, spo2: latest.spo2 + 1 },
          { date: 'Day 4', heartRate: latest.heartRate, spo2: latest.spo2 },
          { date: 'Today', heartRate: latest.heartRate, spo2: latest.spo2 }
        ]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRFID = async () => {
    if (!rfidInput.trim()) {
      setError('Please enter an RFID number');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const response = await adminAPI.assignRFID(uid!, rfidInput);
      setSuccess(response.data.message || 'RFID assigned successfully');
      setRfidInput('');
      setShowRFIDModal(false);
      await fetchPatientDetails();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign RFID');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPDF = () => {
    // In a real implementation, use a library like jsPDF
    alert('PDF export functionality would be implemented here using jsPDF library');
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    button: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' },
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' },
    cardTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    infoRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' },
    infoLabel: { fontSize: '14px', color: '#6b7280' },
    infoValue: { fontSize: '14px', fontWeight: '500', color: '#111827' },
    vitalCard: { backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '12px' },
    vitalLabel: { fontSize: '14px', color: '#6b7280', marginBottom: '4px' },
    vitalValue: { fontSize: '24px', fontWeight: 'bold', color: '#111827' },
    vitalUnit: { fontSize: '14px', color: '#6b7280', marginLeft: '4px' },
    medicationItem: { padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '8px' },
    medicationName: { fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' },
    medicationDetails: { fontSize: '13px', color: '#6b7280' },
    modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%' },
    modalTitle: { fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
    input: { width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
    modalButtons: { display: 'flex', gap: '12px' },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' },
    success: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '14px' }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading patient details...
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Patient not found
        </div>
      </div>
    );
  }

  const profile = patient.profile || {};
  const medications = patient.medications ? Object.values(patient.medications) : [];
  const latestReading = patient.latestReading;
  const hasRFID = profile.rfidNumber && profile.rfidNumber !== 'Not assigned';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>
            {profile.firstName} {profile.lastName}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportPDF} style={styles.button}>
            <Download size={16} />
            Export PDF
          </button>
          <button onClick={() => setShowRFIDModal(true)} style={styles.button}>
            <CreditCard size={16} />
            {hasRFID ? 'Update RFID' : 'Assign RFID'}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Patient Information */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <User size={20} />
            Personal Information
          </h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Full Name</span>
            <span style={styles.infoValue}>{profile.firstName} {profile.lastName}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{profile.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Date of Birth</span>
            <span style={styles.infoValue}>{profile.dateOfBirth || 'Not provided'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Gender</span>
            <span style={styles.infoValue}>{profile.gender || 'Not provided'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Phone</span>
            <span style={styles.infoValue}>{profile.phone || 'Not provided'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Blood Type</span>
            <span style={styles.infoValue}>{profile.bloodType || 'Not provided'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>RFID Card</span>
            <span style={styles.infoValue}>
              {hasRFID ? profile.rfidNumber : 'Not assigned'}
            </span>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <Activity size={20} />
            Medical Information
          </h2>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Emergency Contact</span>
            <span style={styles.infoValue}>{profile.emergencyContact || 'Not provided'}</span>
          </div>
          <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={styles.infoLabel}>Allergies</div>
            <div style={{ ...styles.infoValue, marginTop: '8px' }}>
              {profile.allergies || 'None reported'}
            </div>
          </div>
          <div style={{ padding: '12px 0' }}>
            <div style={styles.infoLabel}>Medical History</div>
            <div style={{ ...styles.infoValue, marginTop: '8px' }}>
              {profile.medicalHistory || 'No history recorded'}
            </div>
          </div>
        </div>
      </div>

      {/* Latest Health Reading */}
      {latestReading && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <Heart size={20} />
            Latest Health Reading
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>
                <Heart size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Heart Rate
              </div>
              <div style={styles.vitalValue}>
                {latestReading.heartRate}
                <span style={styles.vitalUnit}>bpm</span>
              </div>
            </div>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>
                <Droplets size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                SpO2
              </div>
              <div style={styles.vitalValue}>
                {latestReading.spo2}
                <span style={styles.vitalUnit}>%</span>
              </div>
            </div>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>
                <Activity size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Blood Pressure
              </div>
              <div style={styles.vitalValue}>
                {latestReading.systolic}/{latestReading.diastolic}
                <span style={styles.vitalUnit}>mmHg</span>
              </div>
            </div>
            <div style={styles.vitalCard}>
              <div style={styles.vitalLabel}>
                <Thermometer size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Temperature
              </div>
              <div style={styles.vitalValue}>
                {latestReading.temperature}
                <span style={styles.vitalUnit}>°C</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Last updated: {new Date(latestReading.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {/* Health Trends */}
      {historyData.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            <Activity size={20} />
            Health Trends (Last 5 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="heartRate" stroke="#dc2626" strokeWidth={2} name="Heart Rate" />
              <Line type="monotone" dataKey="spo2" stroke="#2563eb" strokeWidth={2} name="SpO2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Medications */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          Current Medications ({medications.length})
        </h2>
        {medications.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No medications recorded</p>
        ) : (
          medications.map((med: any, idx: number) => (
            <div key={idx} style={styles.medicationItem}>
              <div style={styles.medicationName}>{med.name}</div>
              <div style={styles.medicationDetails}>
                {med.dosage} • {med.frequency} at {med.time}
              </div>
            </div>
          ))
        )}
      </div>

      {/* RFID Assignment Modal */}
      {showRFIDModal && (
        <div style={styles.modal} onClick={() => setShowRFIDModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {hasRFID ? 'Update RFID Card' : 'Assign RFID Card'}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              {hasRFID 
                ? `Current RFID: ${profile.rfidNumber}. Enter a new RFID number to update.`
                : 'Enter the RFID card number to assign to this patient.'
              }
            </p>
            <input
              type="text"
              value={rfidInput}
              onChange={(e) => setRfidInput(e.target.value)}
              placeholder="Enter RFID number (8-16 alphanumeric)"
              style={styles.input}
            />
            <div style={styles.modalButtons}>
              <button
                onClick={handleAssignRFID}
                disabled={actionLoading}
                style={{ ...styles.button, flex: 1, opacity: actionLoading ? 0.6 : 1 }}
              >
                {actionLoading ? 'Assigning...' : hasRFID ? 'Update RFID' : 'Assign RFID'}
              </button>
              <button
                onClick={() => {
                  setShowRFIDModal(false);
                  setRfidInput('');
                  setError(null);
                }}
                style={{ ...styles.button, backgroundColor: '#6b7280', flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetailPage;
