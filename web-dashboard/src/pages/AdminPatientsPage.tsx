import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, UserCheck, UserX, Eye, Download, Activity, Heart, Droplets, ShieldCheck } from 'lucide-react';
import { adminAPI } from '../services/api';
import { database } from '../context/AuthContext';
import { ref, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

interface Patient {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  rfidNumber: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRFID, setFilterRFID] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [stats, setStats] = useState({ total: 0, withRFID: 0, withoutRFID: 0 });

  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, []);

  useEffect(() => {
    let filtered = [...patients];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        (p.rfidNumber && p.rfidNumber.toLowerCase().includes(query))
      );
    }

    // RFID filter
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

      // Fetch live readings and biometric flags from Firebase for all patients with RFID
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

  const handleViewPatient = (uid: string) => {
    navigate(`/dashboard/admin-patient-detail/${uid}`);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'RFID', 'Biometrics', 'Latest BP', 'Heart Rate', 'SpO2', 'Laser BMI', 'Date of Birth', 'Gender', 'Phone', 'Registered'];
    const rows = filteredPatients.map(p => {
      const reading = readingsMap[p.rfidNumber];
      const hasBio = biometricsMap[p.uid] || biometricsMap[p.rfidNumber];
      return [
        `${p.firstName} ${p.lastName}`,
        p.email || '',
        p.rfidNumber || 'Not assigned',
        hasBio ? 'Enrolled' : 'Pending',
        reading?.systolic ? `${reading.systolic}/${reading.diastolic}` : 'N/A',
        reading?.heartRate || reading?.heart_rate || 'N/A',
        reading?.spo2 ? `${reading.spo2}%` : 'N/A',
        reading?.bmiLaser || reading?.bmi_laser || reading?.bmi || 'N/A',
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
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#0284c7' },
    title: { fontSize: '26px', fontWeight: '800', color: '#0f172a' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
    statValue: { fontSize: '30px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' },
    statLabel: { fontSize: '13px', fontWeight: '600', color: '#64748b' },
    card: { backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const },
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
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '12px 14px', textAlign: 'left' as const, borderBottom: '2px solid #e2e8f0', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
    td: { padding: '14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#0f172a' },
    badge: (hasRFID: boolean) => ({
      padding: '3px 10px',
      borderRadius: '9999px',
      fontSize: '11px',
      fontWeight: '700',
      backgroundColor: hasRFID ? '#dcfce7' : '#fef2f2',
      color: hasRFID ? '#16a34a' : '#dc2626',
      border: `1px solid ${hasRFID ? '#bbf7d0' : '#fecaca'}`
    }),
    actionBtn: { 
      backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', cursor: 'pointer', 
      color: '#0284c7', padding: '6px 12px', fontSize: '12px', fontWeight: '700',
      borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px'
    },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }
  };

  return (
    <div style={styles.container}>
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
              Real-time physiological vitals and biometric enrollment monitoring
            </div>
          </div>
        </div>
        <button onClick={handleExportCSV} style={styles.button}>
          <Download size={16} /> Export Clinical CSV
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Statistics */}
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

      {/* Patient List */}
      <div style={styles.card}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by patient name, email, or RFID UID..."
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

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <Activity size={32} style={{ margin: '0 auto 12px', color: '#0284c7' }} />
            <div>Loading clinical roster...</div>
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
                  <th style={styles.th}>Patient</th>
                  <th style={styles.th}>Biometric Status</th>
                  <th style={styles.th}>Latest BP</th>
                  <th style={styles.th}>Heart Rate</th>
                  <th style={styles.th}>SpO2</th>
                  <th style={styles.th}>Laser BMI</th>
                  <th style={styles.th}>Registered</th>
                  <th style={styles.th}>Clinical Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const hasRFID = !!(patient.rfidNumber && patient.rfidNumber !== 'Not assigned');
                  const reading = readingsMap[patient.rfidNumber];
                  const hasBio = biometricsMap[patient.uid] || biometricsMap[patient.rfidNumber];
                  const bpBadge = getAhaBpBadge(reading?.systolic, reading?.diastolic);
                  const bmiVal = reading?.bmiLaser ?? reading?.bmi_laser ?? reading?.bmi ?? null;

                  return (
                    <tr key={patient.uid}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {patient.email} &bull; RFID: <strong>{hasRFID ? patient.rfidNumber : 'None'}</strong>
                        </div>
                      </td>

                      <td style={styles.td}>
                        {hasBio ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                            <ShieldCheck size={13} /> FP & RFID Active
                          </span>
                        ) : hasRFID ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: '#eff6ff', color: '#0284c7', border: '1px solid #bfdbfe' }}>
                            RFID Linked (FP Pending)
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            Unassigned
                          </span>
                        )}
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
                            <Droplets size={14} color="#0284c7" /> {reading.spo2}%
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      <td style={styles.td}>
                        {bmiVal ? (
                          <span style={{ fontWeight: '700', color: '#0284c7' }}>
                            {bmiVal} kg/m²
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>--</span>
                        )}
                      </td>

                      <td style={{ ...styles.td, color: '#64748b', fontSize: '12px' }}>
                        {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'Active'}
                      </td>

                      <td style={styles.td}>
                        <button
                          onClick={() => handleViewPatient(patient.uid)}
                          style={styles.actionBtn}
                        >
                          <Eye size={14} />
                          Clinical View & Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
          Showing {filteredPatients.length} of {patients.length} patient records &bull; Telemetry queried live from Firebase
        </div>
      </div>
    </div>
  );
};

export default AdminPatientsPage;
