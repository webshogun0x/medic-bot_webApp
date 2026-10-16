import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Users, UserCheck, UserX, Eye, Download, 
  Activity, Heart, Droplets, ShieldCheck, UserPlus, CreditCard, 
  Sparkles, X
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { database } from '../context/AuthContext';
import { ref, get, set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { formatFloat, generateMedicalId } from '../utils/format';

interface Patient {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  rfidNumber: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  medicalId?: string;
  bloodType?: string;
  createdAt: number;
}

interface AdminPatientsPageProps {
  onBack: () => void;
}

const getAhaBpBadge = (systolic?: number, diastolic?: number) => {
  if (!systolic || !diastolic) return null;
  if (systolic >= 140 || diastolic >= 90) return { label: `${systolic}/${diastolic}`, color: '#dc2626', bg: '#fee2e2' };
  if (systolic >= 130 || diastolic >= 80) return { label: `${systolic}/${diastolic}`, color: '#d97706', bg: '#fef3c7' };
  return { label: `${systolic}/${diastolic}`, color: '#16a34a', bg: '#dcfce7' };
};

const AdminPatientsPage: React.FC<AdminPatientsPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [readingsMap, setReadingsMap] = useState<Record<string, any>>({});
  const [biometricsMap, setBiometricsMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRFID, setFilterRFID] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [stats, setStats] = useState({ total: 0, withRFID: 0, withoutRFID: 0 });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignRfidModal, setAssignRfidModal] = useState<{ open: boolean; patient: Patient | null; newRfid: string }>({
    open: false,
    patient: null,
    newRfid: ''
  });

  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Male',
    dateOfBirth: '',
    bloodType: 'O+',
    medicalId: generateMedicalId(),
    rfidNumber: '',
    emergencyContact: '',
    allergies: '',
    medicalHistory: ''
  });

  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, []);

  useEffect(() => {
    let filtered = [...patients];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        (p.rfidNumber && p.rfidNumber.toLowerCase().includes(query)) ||
        (p.medicalId && p.medicalId.toLowerCase().includes(query))
      );
    }

    if (filterRFID === 'assigned') {
      filtered = filtered.filter(p => p.rfidNumber && p.rfidNumber !== 'Not assigned');
    } else if (filterRFID === 'unassigned') {
      filtered = filtered.filter(p => !p.rfidNumber || p.rfidNumber === 'Not assigned');
    }

    setFilteredPatients(filtered);
  }, [patients, searchQuery, filterRFID]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getPatients();
      const patientList = response.data.patients || [];
      setPatients(patientList);

      try {
        const readingsSnap = await get(ref(database, 'READINGS'));
        const usersSnap = await get(ref(database, 'USERS'));
        const rMap: Record<string, any> = {};
        const bMap: Record<string, boolean> = {};

        if (readingsSnap.exists()) {
          const allReadings = readingsSnap.val();
          Object.entries(allReadings).forEach(([rfidKey, rData]: [string, any]) => {
            if (rData?.latest) {
              rMap[rfidKey] = rData.latest;
            }
          });
        }

        if (usersSnap.exists()) {
          const allUsers = usersSnap.val();
          Object.entries(allUsers).forEach(([userKey, uData]: [string, any]) => {
            const hasBio = Boolean(
              uData?.fingerprint_registered ||
              uData?.biometric_enrolled ||
              uData?.profile?.biometric_enrolled ||
              uData?.profile?.fingerprint_registered
            );
            if (hasBio) {
              bMap[userKey] = true;
              if (uData?.profile?.rfidNumber) bMap[uData.profile.rfidNumber] = true;
            }
          });
        }

        setReadingsMap(rMap);
        setBiometricsMap(bMap);
      } catch (fbErr) {
        console.warn('Could not load readings map from Firebase:', fbErr);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats({
        total: response.data.totalPatients,
        withRFID: response.data.patientsWithRFID,
        withoutRFID: response.data.patientsWithoutRFID
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleGenerateNewMedicalId = () => {
    setAddForm(prev => ({ ...prev, medicalId: generateMedicalId() }));
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      // 1. Call backend API endpoint
      try {
        await adminAPI.createPatient(addForm);
      } catch (apiErr) {
        // Fallback: Direct Firebase creation if backend route is unavailable
        const newUid = 'pt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const profileData = {
          ...addForm,
          createdAt: Date.now(),
          biometric_enrolled: false,
          fingerprint_registered: false
        };
        await set(ref(database, `USERS/${newUid}/profile`), profileData);
        if (addForm.rfidNumber) {
          await set(ref(database, `RFID_MAPPING/${addForm.rfidNumber}`), { userId: newUid, linkedAt: Date.now() });
          await set(ref(database, `USERS/${addForm.rfidNumber}`), {
            name: `${addForm.firstName} ${addForm.lastName}`,
            rfid: addForm.rfidNumber,
            medical_id: addForm.medicalId,
            linkedAt: Date.now()
          });
        }
      }

      setSuccess(`Patient ${addForm.firstName} ${addForm.lastName} (${addForm.medicalId}) created successfully!`);
      setShowAddModal(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: 'Male',
        dateOfBirth: '',
        bloodType: 'O+',
        medicalId: generateMedicalId(),
        rfidNumber: '',
        emergencyContact: '',
        allergies: '',
        medicalHistory: ''
      });
      await fetchPatients();
      await fetchStats();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignRfid = async () => {
    if (!assignRfidModal.patient || !assignRfidModal.newRfid.trim()) {
      setError('Please provide a valid RFID card number');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const uid = assignRfidModal.patient.uid;
      const rfid = assignRfidModal.newRfid.trim();

      // Call API or direct Firebase update
      try {
        await adminAPI.assignRFID(uid, rfid);
      } catch (apiErr) {
        await set(ref(database, `USERS/${uid}/profile/rfidNumber`), rfid);
        await set(ref(database, `RFID_MAPPING/${rfid}`), { userId: uid, linkedAt: Date.now() });
        await set(ref(database, `USERS/${rfid}`), {
          name: `${assignRfidModal.patient.firstName} ${assignRfidModal.patient.lastName}`,
          rfid: rfid,
          linkedAt: Date.now()
        });
      }

      setSuccess(`RFID card ${rfid} assigned to ${assignRfidModal.patient.firstName} ${assignRfidModal.patient.lastName}!`);
      setAssignRfidModal({ open: false, patient: null, newRfid: '' });
      await fetchPatients();
      await fetchStats();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to assign RFID');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewPatient = (uid: string) => {
    navigate(`/dashboard/admin-patient-detail/${uid}`);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Medical Record ID', 'Email', 'RFID', 'Biometrics', 'Latest BP', 'Heart Rate', 'SpO2', 'Optical BMI', 'Acoustic BMI', 'Date of Birth', 'Gender', 'Phone', 'Registered'];
    const rows = filteredPatients.map(p => {
      const reading = readingsMap[p.rfidNumber];
      const hasBio = biometricsMap[p.uid] || biometricsMap[p.rfidNumber];
      return [
        `${p.firstName} ${p.lastName}`,
        p.medicalId || 'N/A',
        p.email || '',
        p.rfidNumber || 'Not assigned',
        hasBio ? 'Enrolled' : 'Pending',
        reading?.systolic ? `${reading.systolic}/${reading.diastolic}` : 'N/A',
        reading?.heartRate || reading?.heart_rate || 'N/A',
        reading?.spo2 ? `${reading.spo2}%` : 'N/A',
        formatFloat(reading?.bmiLaser ?? reading?.bmi_laser ?? reading?.bmi, 4),
        formatFloat(reading?.bmiSonar ?? reading?.bmi_sonar, 4),
        p.dateOfBirth || 'N/A',
        p.gender || 'N/A',
        p.phone || 'N/A',
        new Date(p.createdAt).toLocaleDateString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical_patients_roster_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '16px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#0284c7' },
    title: { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
    statValue: { fontSize: '30px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' },
    statLabel: { fontSize: '13px', fontWeight: '600', color: '#64748b' },
    card: { backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const, alignItems: 'center' },
    searchBox: { flex: 1, minWidth: '250px', position: 'relative' as const },
    searchInput: { width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' },
    searchIcon: { position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' },
    filterBtn: (active: boolean) => ({
      padding: '9px 16px',
      borderRadius: '8px',
      border: '1px solid #cbd5e1',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      backgroundColor: active ? '#0284c7' : '#fff',
      color: active ? '#fff' : '#475569'
    }),
    button: { padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' },
    addBtn: { padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', backgroundColor: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(22,163,74,0.2)' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '12px 14px', textAlign: 'left' as const, borderBottom: '2px solid #e2e8f0', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
    td: { padding: '14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' },
    actionBtn: { 
      backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', cursor: 'pointer', 
      color: '#0284c7', padding: '6px 10px', fontSize: '12px', fontWeight: '700',
      borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px'
    },
    assignBtn: {
      backgroundColor: '#fef3c7', border: '1px solid #fde68a', cursor: 'pointer',
      color: '#b45309', padding: '6px 10px', fontSize: '12px', fontWeight: '700',
      borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px'
    },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' },
    success: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '14px' },
    modalOverlay: {
      position: 'fixed' as const, top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    },
    modalContent: {
      backgroundColor: '#fff', borderRadius: '16px', maxWidth: '640px', width: '100%',
      maxHeight: '90vh', overflowY: 'auto' as const, padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
    },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' },
    formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
    input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={styles.title}>
              <Users size={26} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle', color: '#0284c7' }} />
              Clinical Patient Management & Telemetry Roster
            </h1>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Admin panel for registering patients, assigning RFID badges, and viewing 4-decimal vital telemetries
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>
            <UserPlus size={16} /> Add Patient
          </button>
          <button onClick={handleExportCSV} style={styles.button}>
            <Download size={16} /> Export Clinical CSV
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* STATS CARDS */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Registered Patients</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#16a34a' }}>{stats.withRFID}</div>
          <div style={styles.statLabel}>With Clinic RFID Linked</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#d97706' }}>{stats.withoutRFID}</div>
          <div style={styles.statLabel}>Pending Card Assignment</div>
        </div>
      </div>

      {/* PATIENT LIST TABLE */}
      <div style={styles.card}>
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by patient name, email, MRN, or RFID UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <button
            onClick={() => setFilterRFID('all')}
            style={styles.filterBtn(filterRFID === 'all')}
          >
            All Patients ({patients.length})
          </button>
          <button
            onClick={() => setFilterRFID('assigned')}
            style={styles.filterBtn(filterRFID === 'assigned')}
          >
            <UserCheck size={15} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            RFID Linked ({stats.withRFID})
          </button>
          <button
            onClick={() => setFilterRFID('unassigned')}
            style={styles.filterBtn(filterRFID === 'unassigned')}
          >
            <UserX size={15} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Pending Assignment ({stats.withoutRFID})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <Activity size={32} style={{ margin: '0 auto 12px', color: '#0284c7' }} />
            <div>Loading clinical patient roster...</div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            No matching patient records found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Patient & MRN</th>
                  <th style={styles.th}>RFID & Biometrics</th>
                  <th style={styles.th}>Latest BP</th>
                  <th style={styles.th}>Heart Rate</th>
                  <th style={styles.th}>SpO2</th>
                  <th style={styles.th}>Optical BMI</th>
                  <th style={styles.th}>Acoustic BMI</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const hasRFID = !!(patient.rfidNumber && patient.rfidNumber !== 'Not assigned');
                  const reading = readingsMap[patient.rfidNumber];
                  const hasBio = biometricsMap[patient.uid] || biometricsMap[patient.rfidNumber];
                  const bpBadge = getAhaBpBadge(reading?.systolic, reading?.diastolic);
                  const bmiLaser = reading?.bmiLaser ?? reading?.bmi_laser ?? reading?.bmi ?? null;
                  const bmiSonar = reading?.bmiSonar ?? reading?.bmi_sonar ?? null;

                  return (
                    <tr key={patient.uid}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          MRN: <strong>#{patient.medicalId || (patient.uid ? patient.uid.slice(0, 8).toUpperCase() : 'N/A')}</strong> &bull; {patient.email || 'No email'}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                            UID: <strong>{hasRFID ? patient.rfidNumber : 'None'}</strong>
                          </span>
                          <div>
                            {hasBio ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                <ShieldCheck size={11} /> Fingerprint + Card Active
                              </span>
                            ) : hasRFID ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#0284c7', border: '1px solid #bfdbfe' }}>
                                Card Linked (FP Pending)
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                Card Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        {bpBadge ? (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', backgroundColor: bpBadge.bg, color: bpBadge.color }}>
                            {bpBadge.label} mmHg
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {reading ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontWeight: '600' }}>
                            <Heart size={14} color="#e11d48" /> {reading.heartRate || reading.heart_rate || '--'} bpm
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {reading?.spo2 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontWeight: '600' }}>
                            <Droplets size={14} color="#0284c7" /> {formatFloat(reading.spo2, 4)}%
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      {/* 4 DECIMAL PLACES FOR BMI LASER */}
                      <td style={styles.td}>
                        {bmiLaser !== null ? (
                          <span style={{ fontWeight: '700', color: '#0284c7' }}>
                            {formatFloat(bmiLaser, 4)}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      {/* 4 DECIMAL PLACES FOR BMI SONAR */}
                      <td style={styles.td}>
                        {bmiSonar !== null ? (
                          <span style={{ fontWeight: '600', color: '#9333ea' }}>
                            {formatFloat(bmiSonar, 4)}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleViewPatient(patient.uid)}
                            style={styles.actionBtn}
                            title="View Clinical Report"
                          >
                            <Eye size={13} />
                            Report
                          </button>
                          <button
                            onClick={() => setAssignRfidModal({ open: true, patient, newRfid: patient.rfidNumber || '' })}
                            style={styles.assignBtn}
                            title="Assign or Change RFID Card"
                          >
                            <CreditCard size={13} />
                            {hasRFID ? 'Re-link' : 'Assign RFID'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
          Showing {filteredPatients.length} of {patients.length} patient records &bull; All floating vital signs rendered to 4 decimal precision
        </div>
      </div>

      {/* MODAL 1: ADD NEW PATIENT */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Register New Clinical Patient</h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Create patient record, auto-generate Medical ID, and link clinic RFID badge
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePatient}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                    placeholder="e.g. John"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                    placeholder="e.g. Doe"
                    style={styles.input}
                  />
                </div>
              </div>

              {/* MEDICAL ID WITH AUTO-GENERATE BUTTON */}
              <div style={{ ...styles.formGroup, marginBottom: '16px' }}>
                <label style={styles.label}>Medical Record Number (MRN) *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    value={addForm.medicalId}
                    onChange={(e) => setAddForm({ ...addForm, medicalId: e.target.value })}
                    style={{ ...styles.input, flex: 1, fontWeight: '700', letterSpacing: '0.5px' }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateNewMedicalId}
                    style={{
                      padding: '8px 14px', backgroundColor: '#e0f2fe', color: '#0284c7',
                      border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '12px',
                      fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <Sparkles size={14} /> Generate Medical ID
                  </button>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="john.doe@example.com"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Clinic RFID Smart Badge UID</label>
                  <input
                    type="text"
                    value={addForm.rfidNumber}
                    onChange={(e) => setAddForm({ ...addForm, rfidNumber: e.target.value })}
                    placeholder="e.g. 04A1B2C3"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Blood Group</label>
                  <select
                    value={addForm.bloodType}
                    onChange={(e) => setAddForm({ ...addForm, bloodType: e.target.value })}
                    style={{ ...styles.input, backgroundColor: '#fff' }}
                  >
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Gender</label>
                  <select
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                    style={{ ...styles.input, backgroundColor: '#fff' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date of Birth</label>
                  <input
                    type="date"
                    value={addForm.dateOfBirth}
                    onChange={(e) => setAddForm({ ...addForm, dateOfBirth: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ ...styles.formGroup, marginBottom: '16px' }}>
                <label style={styles.label}>Emergency Contact</label>
                <input
                  type="text"
                  value={addForm.emergencyContact}
                  onChange={(e) => setAddForm({ ...addForm, emergencyContact: e.target.value })}
                  placeholder="Person Name & Phone Number"
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '9px 18px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {actionLoading ? 'Creating Patient...' : 'Create Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN RFID CARD */}
      {assignRfidModal.open && assignRfidModal.patient && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Assign Clinic RFID Badge</h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Patient: {assignRfidModal.patient.firstName} {assignRfidModal.patient.lastName}
                </div>
              </div>
              <button onClick={() => setAssignRfidModal({ open: false, patient: null, newRfid: '' })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Physical Card UID (8-16 alphanumeric characters)</label>
              <input
                type="text"
                autoFocus
                value={assignRfidModal.newRfid}
                onChange={(e) => setAssignRfidModal({ ...assignRfidModal, newRfid: e.target.value })}
                placeholder="Scan or type RFID UID e.g. 04A1B2C3"
                style={{ ...styles.input, width: '100%', marginTop: '6px' }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>
                Tap the card on the kiosk RFID sensor or enter the hex UID printed on the card.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setAssignRfidModal({ open: false, patient: null, newRfid: '' })}
                style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAssignRfid}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                {actionLoading ? 'Assigning...' : 'Save & Link RFID'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPatientsPage;
