import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, Activity, Droplets, Phone, Mail, 
  Download, AlertTriangle, Scale, Ruler, TrendingUp,
  Heart, Printer, ShieldCheck, User,
  FileText, X, Pill
} from 'lucide-react';
import { adminAPI } from '../services/api';
import { database } from '../context/AuthContext';
import { ref, onValue, get } from 'firebase/database';
import { useParams } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine, ComposedChart, Legend 
} from 'recharts';
import { formatFloat } from '../utils/format';

interface PatientDetailPageProps {
  onBack: () => void;
}

// Helper: Calculate AHA Blood Pressure category
const getAhaBpCategory = (systolic: number, diastolic: number) => {
  if (!systolic || !diastolic) return { label: 'Unrecorded', color: '#6b7280', bg: '#f3f4f6' };
  if (systolic > 180 || diastolic > 120) return { label: 'Hypertensive Crisis', color: '#991b1b', bg: '#fee2e2' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'Stage 2 Hypertension', color: '#dc2626', bg: '#fee2e2' };
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { label: 'Stage 1 Hypertension', color: '#d97706', bg: '#fef3c7' };
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { label: 'Elevated BP', color: '#ca8a04', bg: '#fef9c3' };
  if (systolic < 120 && diastolic < 80) return { label: 'Normal BP', color: '#16a34a', bg: '#dcfce7' };
  return { label: 'Normal BP', color: '#16a34a', bg: '#dcfce7' };
};

// Helper: WHO BMI category
const getBmiCategory = (bmi: number) => {
  if (!bmi || bmi <= 0) return { label: 'N/A', color: '#6b7280' };
  if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' };
  if (bmi < 25.0) return { label: 'Normal Weight', color: '#16a34a' };
  if (bmi < 30.0) return { label: 'Overweight', color: '#d97706' };
  return { label: 'Obese', color: '#dc2626' };
};

const PatientDetailPage: React.FC<PatientDetailPageProps> = ({ onBack }) => {
  const { uid } = useParams<{ uid: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchPatientDetails = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getPatientDetails(uid);
      const patientData = response.data;
      setPatient(patientData);

      const profile = patientData?.profile || patientData;
      const rfid = profile?.rfidNumber || profile?.rfid || patientData?.rfidNumber || patientData?.rfid || '';

      // Set initial latest reading if returned from backend
      if (patientData?.latestReading) {
        setLatestReading(patientData.latestReading);
      }

      // If RFID exists, attach live realtime listeners for history & latest
      if (rfid) {
        // 1. Latest Reading Listener
        const latestRef = ref(database, `READINGS/${rfid}/latest`);
        onValue(latestRef, (snap) => {
          if (snap.exists()) {
            setLatestReading(snap.val());
          } else {
            // Check global /READINGS/latest fallback
            get(ref(database, 'READINGS/latest')).then((gSnap) => {
              if (gSnap.exists()) setLatestReading(gSnap.val());
            }).catch(() => {});
          }
        });

        // 2. History Listener
        const histRef = ref(database, `READINGS/${rfid}/history`);
        onValue(histRef, (snap) => {
          if (snap.exists()) {
            const histObj = snap.val();
            const processed = Object.entries(histObj).map(([key, rawItem]: [string, any]) => {
              const item = rawItem || {};
              const rawTs = parseInt(key) || parseInt(item.timestamp) || Date.now();
              const ts = rawTs > 1e11 ? rawTs : rawTs * 1000;
              const d = new Date(ts);
              return {
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                fullDate: d.toLocaleString(),
                timestamp: ts,
                heartRate: item.heartRate || item.heart_rate || 0,
                spo2: item.spo2 || 0,
                systolic: item.systolic || 0,
                diastolic: item.diastolic || 0,
                temperature: item.temperature || 0,
                weight: item.weight || 0,
                bmiLaser: item.bmiLaser ?? item.bmi_laser ?? item.bmi ?? 0,
                bmiSonar: item.bmiSonar ?? item.bmi_sonar ?? 0,
                heightLaser: item.heightLaser ?? item.height_laser ?? item.height ?? 0,
                heightSonar: item.heightSonar ?? item.height_sonar ?? 0,
              };
            }).sort((a, b) => a.timestamp - b.timestamp);
            setHistoryData(processed);
          } else {
            // Try global history if RFID has no history
            get(ref(database, 'READINGS/history')).then((gHistSnap) => {
              if (gHistSnap.exists()) {
                const histObj = gHistSnap.val();
                const processed = Object.entries(histObj).map(([key, rawItem]: [string, any]) => {
                  const item = rawItem || {};
                  const rawTs = parseInt(key) || parseInt(item.timestamp) || Date.now();
                  const ts = rawTs > 1e11 ? rawTs : rawTs * 1000;
                  const d = new Date(ts);
                  return {
                    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    fullDate: d.toLocaleString(),
                    timestamp: ts,
                    heartRate: item.heartRate || item.heart_rate || 0,
                    spo2: item.spo2 || 0,
                    systolic: item.systolic || 0,
                    diastolic: item.diastolic || 0,
                    temperature: item.temperature || 0,
                    weight: item.weight || 0,
                    bmiLaser: item.bmiLaser ?? item.bmi_laser ?? item.bmi ?? 0,
                    bmiSonar: item.bmiSonar ?? item.bmi_sonar ?? 0,
                    heightLaser: item.heightLaser ?? item.height_laser ?? item.height ?? 0,
                    heightSonar: item.heightSonar ?? item.height_sonar ?? 0,
                  };
                }).sort((a, b) => a.timestamp - b.timestamp);
                setHistoryData(processed);
              } else {
                setHistoryData([]);
              }
            }).catch(() => setHistoryData([]));
          }
        });
      } else {
        // Fallback global check
        get(ref(database, 'READINGS/latest')).then(snap => {
          if (snap.exists()) setLatestReading(snap.val());
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Failed to load patient details:', err);
      setError(err.response?.data?.error || 'Failed to load patient details');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchPatientDetails();
  }, [fetchPatientDetails]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (historyData.length === 0) {
      alert('No readings recorded to export.');
      return;
    }
    const headers = ['Timestamp', 'Date', 'Time', 'Systolic BP (mmHg)', 'Diastolic BP (mmHg)', 'Heart Rate (bpm)', 'SpO2 (%)', 'Laser Height (m)', 'Sonar Height (m)', 'Laser BMI', 'Sonar BMI', 'Weight (kg)', 'Temperature (°C)'];
    const rows = historyData.map(h => [
      h.timestamp,
      h.date,
      h.time,
      h.systolic,
      h.diastolic,
      h.heartRate,
      h.spo2,
      formatFloat(h.heightLaser, 4),
      formatFloat(h.heightSonar, 4),
      formatFloat(h.bmiLaser, 4),
      formatFloat(h.bmiSonar, 4),
      formatFloat(h.weight, 4),
      formatFloat(h.temperature, 4)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Medical_Telemetry_${profile?.firstName || 'Patient'}_${profile?.lastName || ''}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const styles = {
    container: { padding: '28px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' },
    topNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    profileCard: { 
      backgroundColor: '#fff', padding: '28px', borderRadius: '16px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', 
      marginBottom: '24px', display: 'flex', gap: '24px', border: '1px solid #e2e8f0',
      alignItems: 'center'
    },
    avatar: { 
      width: '88px', height: '88px', borderRadius: '18px', 
      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      color: '#fff', fontSize: '32px', fontWeight: '800', flexShrink: 0 
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' },
    chartCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
    title: { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 },
    subTitle: { fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    badge: (critical: boolean) => ({
      padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700',
      backgroundColor: critical ? '#fef2f2' : '#f0fdf4', color: critical ? '#dc2626' : '#16a34a',
      border: `1px solid ${critical ? '#fecaca' : '#bbf7d0'}`
    })
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 20px', color: '#64748b' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', fontSize: '16px', fontWeight: '600' }}>Loading Patient Clinical Telemetry...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: '#dc2626' }}>
        <AlertTriangle size={48} style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{error || 'Patient Record Not Found'}</h2>
        <button onClick={onBack} style={{ marginTop: '16px', padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          Back to Patients Roster
        </button>
      </div>
    );
  }

  const profile = patient?.profile || patient || {};
  const medications = patient?.medications || {};
  const rfid = profile?.rfidNumber || profile?.rfid || 'Not Assigned';
  const hasBiometrics = Boolean(profile?.biometric_enrolled || profile?.fingerprint_registered);
  const bpCategory = getAhaBpCategory(latestReading?.systolic, latestReading?.diastolic);
  const bmiLaserVal = latestReading?.bmiLaser ?? latestReading?.bmi_laser ?? latestReading?.bmi ?? 0;
  const bmiSonarVal = latestReading?.bmiSonar ?? latestReading?.bmi_sonar ?? 0;
  const bmiCategory = getBmiCategory(bmiLaserVal || bmiSonarVal);

  return (
    <div style={styles.container}>
      {/* PRINT-ONLY MEDICAL REPORT STYLES */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          body * { visibility: hidden !important; }
          #printable-medical-report, #printable-medical-report * { visibility: visible !important; }
          #printable-medical-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* TOP NAV BAR */}
      <div style={styles.topNav} className="no-print">
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#475569', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>
          <ArrowLeft size={20} /> Back to Patient Roster
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportCSV} style={{ padding: '10px 18px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '600', fontSize: '14px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} /> Export Telemetry (.CSV)
          </button>
          <button onClick={() => setShowReportModal(true)} style={{ padding: '10px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(2,132,199,0.3)' }}>
            <FileText size={18} /> Official Medical Report
          </button>
        </div>
      </div>

      {/* CLINICAL PATIENT HEADER CARD */}
      <div style={styles.profileCard} className="no-print">
        <div style={styles.avatar}>
          {profile.firstName ? profile.firstName[0].toUpperCase() : 'P'}
          {profile.lastName ? profile.lastName[0].toUpperCase() : 'T'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={styles.title}>{profile.firstName || 'Unknown'} {profile.lastName || 'Patient'}</h1>
                {profile.bloodType && (
                  <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>
                    Blood: {profile.bloodType}
                  </span>
                )}
                <span style={styles.badge(false)}>Verified Patient Record</span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Medical Record: <strong>#{profile.medicalId || (uid ? uid.slice(0, 10).toUpperCase() : 'MED-0000')}</strong> &bull; Registered: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Active'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasBiometrics ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                  <ShieldCheck size={16} /> Biometrics Verified (Kiosk FP + RFID)
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                  <AlertTriangle size={16} /> Biometric Enrollment Pending
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={15} color="#0284c7" /> {profile.email || 'No email registered'}
            </div>
            <div style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={15} color="#0284c7" /> {profile.phone || 'No phone recorded'}
            </div>
            <div style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={15} color="#0284c7" /> RFID Badge UID: <strong>{rfid}</strong>
            </div>
            <div style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} color="#0284c7" /> Emergency: {profile.emergencyContact || 'None on file'}
            </div>
          </div>
        </div>
      </div>

      {/* LATEST VITALS TELEMETRY SUMMARY */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Latest Kiosk Physiological Examination</h2>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              {latestReading?.timestamp 
                ? `Last examination: ${new Date(parseInt(latestReading.timestamp) > 1e11 ? parseInt(latestReading.timestamp) : parseInt(latestReading.timestamp) * 1000).toLocaleString()}`
                : 'Directly linked to MediBot Smart Health Kiosk Telemetry'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            Live Cloud RTDB Active
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
          {/* BP */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Blood Pressure</span>
              <Activity size={16} color="#dc2626" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              {latestReading?.systolic ? `${latestReading.systolic}/${latestReading.diastolic}` : '--'}
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>mmHg</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: bpCategory.bg, color: bpCategory.color }}>
                {bpCategory.label}
              </span>
            </div>
          </div>

          {/* HR */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Heart Rate</span>
              <Heart size={16} color="#e11d48" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              {latestReading ? (latestReading.heartRate || latestReading.heart_rate || '--') : '--'}
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>bpm</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                Resting: 60-100
              </span>
            </div>
          </div>

          {/* SPO2 */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Oxygen Saturation</span>
              <Droplets size={16} color="#0284c7" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              {latestReading?.spo2 ? `${latestReading.spo2}%` : '--'}
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{
                fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                backgroundColor: (latestReading?.spo2 && latestReading.spo2 < 95) ? '#fee2e2' : '#dcfce7',
                color: (latestReading?.spo2 && latestReading.spo2 < 95) ? '#dc2626' : '#16a34a'
              }}>
                {latestReading?.spo2 ? (latestReading.spo2 >= 95 ? 'Normal (≥95%)' : 'Hypoxia Alert') : 'Normal (≥95%)'}
              </span>
            </div>
          </div>

          {/* BMI LASER */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Laser BMI (Optical)</span>
              <TrendingUp size={16} color="#0284c7" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284c7' }}>
              {bmiLaserVal ? formatFloat(bmiLaserVal, 4) : '--'}
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>kg/m²</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: bmiCategory.color }}>
                {bmiCategory.label}
              </span>
            </div>
          </div>

          {/* BMI SONAR */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Sonar BMI (Acoustic)</span>
              <TrendingUp size={16} color="#9333ea" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#9333ea' }}>
              {bmiSonarVal ? formatFloat(bmiSonarVal, 4) : '--'}
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>kg/m²</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
                Acoustic Verification
              </span>
            </div>
          </div>

          {/* WEIGHT */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Weight</span>
              <Scale size={16} color="#059669" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              {latestReading?.weight ? formatFloat(latestReading.weight, 4) : '--'}
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>kg</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                Precision Load Cell Platform
              </span>
            </div>
          </div>

          {/* TEMPERATURE */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Body Temp</span>
              <Activity size={16} color="#d97706" />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              {latestReading?.temperature ? formatFloat(latestReading.temperature, 4) : '--'}
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>°C</span>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{
                fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                backgroundColor: (latestReading?.temperature && latestReading.temperature > 37.5) ? '#fee2e2' : '#f1f5f9',
                color: (latestReading?.temperature && latestReading.temperature > 37.5) ? '#dc2626' : '#475569'
              }}>
                {latestReading?.temperature ? (latestReading.temperature > 37.5 ? 'Fever / Pyrexia' : 'Normal Range') : 'Normal: 36.5-37.5'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div style={styles.grid} className="no-print">
        {/* BMI COMPARISON */}
        <div style={styles.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={styles.subTitle}><TrendingUp size={20} color="#0284c7" /> Dual Sensor BMI Precision Analysis</h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
              Laser vs Sonar
            </span>
          </div>
          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
              <Activity size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No telemetry data recorded yet</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Sessions from the kiosk will plot automatically.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis domain={[15, 35]} tick={{fontSize: 10}} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'right', value: 'Overweight (25)', fill: '#d97706', fontSize: 10 }} />
                <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'right', value: 'Underweight (18.5)', fill: '#2563eb', fontSize: 10 }} />
                <Line name="Laser BMI" type="monotone" dataKey="bmiLaser" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} />
                <Line name="Sonar BMI" type="monotone" dataKey="bmiSonar" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* BLOOD PRESSURE */}
        <div style={styles.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={styles.subTitle}><Activity size={20} color="#dc2626" /> Blood Pressure Progression</h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '6px' }}>
              AHA Clinical Thresholds
            </span>
          </div>
          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
              <Activity size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No BP readings recorded yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis domain={[50, 180]} tick={{fontSize: 10}} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={140} stroke="#dc2626" strokeDasharray="3 3" label={{ position: 'right', value: 'Stage 2 HTN (140)', fill: '#dc2626', fontSize: 10 }} />
                <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'right', value: 'Diastolic Limit (90)', fill: '#2563eb', fontSize: 10 }} />
                <Line name="Systolic (mmHg)" type="monotone" dataKey="systolic" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} />
                <Line name="Diastolic (mmHg)" type="monotone" dataKey="diastolic" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SPO2 */}
        <div style={styles.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={styles.subTitle}><Droplets size={20} color="#0284c7" /> Pulse Oximetry (SpO2)</h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
              Optical Pulse Sensor
            </span>
          </div>
          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
              <Droplets size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No SpO2 readings recorded yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis domain={[85, 100]} tick={{fontSize: 10}} />
                <Tooltip />
                <ReferenceLine y={95} stroke="#dc2626" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'Hypoxia Threshold (95%)', fill: '#dc2626', fontSize: 10 }} />
                <Area type="monotone" dataKey="spo2" stroke="#0284c7" fill="#e0f2fe" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* HEIGHT SENSORS */}
        <div style={styles.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={styles.subTitle}><Ruler size={20} color="#16a34a" /> Stature Sensing (Meters)</h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
              Precision Stadiometer
            </span>
          </div>
          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
              <Ruler size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No height telemetry yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{fontSize: 10}} />
                <Tooltip />
                <Legend />
                <Line name="Laser Stadiometer (m)" type="monotone" dataKey="heightLaser" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                <Line name="Sonar Sensor (m)" type="monotone" dataKey="heightSonar" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* OFFICIAL CLINICAL REPORT MODAL & PRINTABLE DOCUMENT */}
      {showReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '850px', width: '100%',
            maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Control Header (hidden on print) */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc'
            }} className="no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#0f172a' }}>
                <FileText size={20} color="#0284c7" /> Official Clinical Examination Report
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handlePrint}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                    backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px',
                    fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  <Printer size={16} /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PRINTABLE REPORT CONTENT BODY */}
            <div id="printable-medical-report" ref={reportRef} style={{ padding: '36px', backgroundColor: '#ffffff', color: '#0f172a' }}>
              {/* Report Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', paddingBottom: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#0284c7', letterSpacing: '-0.5px' }}>
                    MEDIBOT CLINICAL HEALTH MONITOR
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginTop: '2px' }}>
                    Department of Automated Physiological Triage & Biometric Health Intelligence
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Facility Kiosk Unit #K-01 &bull; Cloud RTDB Connected
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>EXAMINATION REPORT</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Time: {new Date().toLocaleTimeString()}</div>
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>DOC-REF: #MB-{Date.now().toString().slice(-8)}</div>
                </div>
              </div>

              {/* Patient Identity Block */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>PATIENT NAME</span>
                    <strong style={{ fontSize: '15px' }}>{profile.firstName} {profile.lastName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>MEDICAL RECORD NUMBER</span>
                    <strong style={{ fontSize: '14px' }}>#{profile.medicalId || (uid ? uid.slice(0, 10).toUpperCase() : 'N/A')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>BLOOD GROUP</span>
                    <strong style={{ color: '#b91c1c', fontSize: '14px' }}>{profile.bloodType || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>GENDER / AGE</span>
                    <span>{profile.gender || 'Not specified'} &bull; {profile.dateOfBirth || 'DOB on file'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>CLINIC RFID BADGE</span>
                    <span>{rfid}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>BIOMETRIC AUTHENTICATION</span>
                    <span style={{ color: hasBiometrics ? '#16a34a' : '#d97706', fontWeight: '700' }}>
                      {hasBiometrics ? 'Verified (FP + RFID)' : 'Pending Fingerprint'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vital Signs Observation Table */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  1. Physiological Vital Signs & Anthropometrics
                </h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Parameter</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Primary Sensor</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Observed Value</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Reference Range</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '700', color: '#334155' }}>Clinical Evaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Systolic Blood Pressure</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Oscillometric Cuff</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{latestReading?.systolic ? `${latestReading.systolic} mmHg` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>&lt; 120 mmHg</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontWeight: '700', color: bpCategory.color }}>{bpCategory.label}</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Diastolic Blood Pressure</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Oscillometric Cuff</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{latestReading?.diastolic ? `${latestReading.diastolic} mmHg` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>&lt; 80 mmHg</td>
                      <td style={{ padding: '8px', color: '#16a34a' }}>Standard Range</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Heart Rate (Resting)</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Photoplethysmography (PPG) Optical</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{latestReading?.heartRate || latestReading?.heart_rate || 'N/A'} bpm</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>60 - 100 bpm</td>
                      <td style={{ padding: '8px', color: '#16a34a' }}>Normal Sinus Rhythm</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Blood Oxygen (SpO2)</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Optical Pulse Oximeter (Spectrophotometry)</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{latestReading?.spo2 ? `${latestReading.spo2}%` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>95 - 100%</td>
                      <td style={{ padding: '8px', color: (latestReading?.spo2 && latestReading.spo2 < 95) ? '#dc2626' : '#16a34a' }}>
                        {latestReading?.spo2 ? (latestReading.spo2 >= 95 ? 'Normal Saturation' : 'Hypoxia Alert') : 'Normal'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Body Mass Index (Laser)</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Optical Time-of-Flight Laser Stadiometer</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{bmiLaserVal ? `${formatFloat(bmiLaserVal, 4)} kg/m²` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>18.5 - 24.9</td>
                      <td style={{ padding: '8px', color: bmiCategory.color, fontWeight: '700' }}>{bmiCategory.label}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Body Mass Index (Sonar)</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Acoustic Ultrasonic Stadiometer</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{bmiSonarVal ? `${formatFloat(bmiSonarVal, 4)} kg/m²` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>18.5 - 24.9</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Auxiliary Correlation</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Patient Weight</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Precision Load Cell Platform</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{latestReading?.weight ? `${formatFloat(latestReading.weight, 4)} kg` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Individual Baseline</td>
                      <td style={{ padding: '8px', color: '#16a34a' }}>Calibrated</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Body Temperature</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Medical Infrared / Contact</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{latestReading?.temperature ? `${formatFloat(latestReading.temperature, 4)} °C` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>36.5 - 37.5 °C</td>
                      <td style={{ padding: '8px', color: '#16a34a' }}>Afebrile</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Automated Clinical Assessment */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                  2. Automated Triage Impression & Findings
                </h4>
                <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
                  • Blood Pressure demonstrates <strong>{bpCategory.label}</strong> ({latestReading?.systolic || '--'}/{latestReading?.diastolic || '--'} mmHg) per AHA guidelines.<br />
                  • Oxygenation index is verified at <strong>{latestReading?.spo2 || '--'}%</strong> via continuous photoplethysmography.<br />
                  • Dual stadiometer sensor agreement (Laser ToF: {latestReading?.heightLaser ? formatFloat(latestReading.heightLaser, 4) : '--'}m vs Sonar: {latestReading?.heightSonar ? formatFloat(latestReading.heightSonar, 4) : '--'}m) indicates reliable stature acquisition.<br />
                  • Patient baseline BMI classified as <strong>{bmiCategory.label}</strong> ({bmiLaserVal ? formatFloat(bmiLaserVal, 4) : (bmiSonarVal ? formatFloat(bmiSonarVal, 4) : '--')} kg/m²).
                </div>
              </div>

              {/* Active Clinical Alerts, Allergies & Medications */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#c2410c', marginBottom: '4px' }}>KNOWN ALLERGIES</div>
                  <div style={{ fontSize: '13px', color: '#7c2d12' }}>{profile.allergies || 'No known allergies reported.'}</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>CHRONIC MEDICAL HISTORY</div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>{profile.medicalHistory || 'No prior chronic conditions logged.'}</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Pill size={14} /> ACTIVE MEDICATIONS
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    {typeof medications === 'object' && Object.keys(medications).length > 0
                      ? Object.values(medications).map((m: any) => `${m.name || m} ${m.dosage ? `(${m.dosage})` : ''}`).join(', ')
                      : 'No active medications registered.'}
                  </div>
                </div>
              </div>

              {/* Physician Review & Signature Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px', borderTop: '1px dashed #cbd5e1' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Examined via MediBot Clinical Health Station</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Secure Telehealth Digital Signature Verification Token</div>
                </div>
                <div style={{ textAlign: 'center', width: '220px' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', width: '100%', marginBottom: '4px' }}>
                    <div style={{ fontFamily: 'cursive', fontSize: '18px', color: '#1e3a8a' }}>Dr. Kiosk Attending, MD</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Attending Physician / Reviewer</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetailPage;
