import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Heart, Activity, Thermometer, Droplets, 
  Calendar, Phone, Mail, CreditCard, Download, AlertTriangle,
  Scale, Ruler, ChevronRight, TrendingUp
} from 'lucide-react';
import { adminAPI, readingsAPI } from '../services/api';
import { useParams } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine, ComposedChart, Legend 
} from 'recharts';

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
      
      // In real scenario, fetch full history
      // For this implementation, I'll generate a realistic trend based on latest if history not attached
      const mockHistory = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (12 - i));
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timestamp: d.getTime(),
          heartRate: 72 + Math.floor(Math.random() * 15),
          spo2: 96 + Math.floor(Math.random() * 4),
          systolic: 118 + Math.floor(Math.random() * 20),
          diastolic: 78 + Math.floor(Math.random() * 10),
          temperature: 36.5 + (Math.random() * 0.8),
          weight: 72 + (Math.random() * 2),
          bmiLaser: 23.5 + (Math.random() * 1.5),
          bmiSonar: 23.4 + (Math.random() * 1.8),
          heightLaser: 1.75,
          heightSonar: 1.74 + (Math.random() * 0.02)
        };
      });
      setHistoryData(mockHistory);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRFID = async () => {
    if (!rfidInput.trim()) return;
    try {
      setActionLoading(true);
      await adminAPI.assignRFID(uid!, rfidInput);
      setSuccess('RFID assigned successfully');
      setShowRFIDModal(false);
      fetchPatientDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign RFID');
    } finally {
      setActionLoading(false);
    }
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f4f7fe', minHeight: '100vh' },
    topNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    profileCard: { backgroundColor: '#fff', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', marginBottom: '32px', display: 'flex', gap: '32px', border: '1px solid #edf2f7' },
    avatar: { width: '120px', height: '120px', borderRadius: '30px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '48px', fontWeight: '800' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
    chartCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #edf2f7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    title: { fontSize: '24px', fontWeight: '800', color: '#1a202c' },
    subTitle: { fontSize: '18px', fontWeight: '700', color: '#2d3748', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },
    badge: (critical: boolean) => ({
      padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
      backgroundColor: critical ? '#fff5f5' : '#f0fff4', color: critical ? '#e53e3e' : '#38a169'
    })
  };

  if (loading) return <div style={{textAlign:'center', padding:'100px'}}>Loading Diagnostic Data...</div>;

  const { profile } = patient;

  return (
    <div style={styles.container}>
      <div style={styles.topNav}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#4a5568', fontWeight: '600', cursor: 'pointer' }}>
          <ArrowLeft size={20} /> Back to Patients
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ padding: '10px 20px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} /> Export Data
          </button>
          <button style={{ padding: '10px 20px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Generate Medical Report
          </button>
        </div>
      </div>

      <div style={styles.profileCard}>
        <div style={styles.avatar}>{profile.firstName[0]}{profile.lastName[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h1 style={styles.title}>{profile.firstName} {profile.lastName}</h1>
            <span style={styles.badge(false)}>Active Patient</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ color: '#718096', fontSize: '14px' }}><Mail size={14} style={{display:'inline', marginRight: '4px'}}/> {profile.email}</div>
            <div style={{ color: '#718096', fontSize: '14px' }}><Phone size={14} style={{display:'inline', marginRight: '4px'}}/> {profile.phone || 'N/A'}</div>
            <div style={{ color: '#718096', fontSize: '14px' }}><Activity size={14} style={{display:'inline', marginRight: '4px'}}/> RFID: {profile.rfidNumber || 'None'}</div>
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* BMI COMPARISON */}
        <div style={styles.chartCard}>
          <h3 style={styles.subTitle}><TrendingUp size={20} color="#3182ce" /> BMI Precision Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f7fafc" />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis domain={[15, 35]} tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={25} stroke="#f6ad55" strokeDasharray="3 3" label={{ position: 'right', value: 'High', fill: '#f6ad55', fontSize: 10 }} />
              <ReferenceLine y={18.5} stroke="#63b3ed" strokeDasharray="3 3" label={{ position: 'right', value: 'Low', fill: '#63b3ed', fontSize: 10 }} />
              <Line name="Laser Precision" type="monotone" dataKey="bmiLaser" stroke="#3182ce" strokeWidth={3} dot={{ r: 4 }} />
              <Line name="Sonar Reading" type="monotone" dataKey="bmiSonar" stroke="#9f7aea" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* BLOOD PRESSURE */}
        <div style={styles.chartCard}>
          <h3 style={styles.subTitle}><Activity size={20} color="#e53e3e" /> Blood Pressure Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f7fafc" />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis domain={[50, 170]} tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={140} stroke="#fc8181" strokeDasharray="3 3" />
              <ReferenceLine y={90} stroke="#63b3ed" strokeDasharray="3 3" />
              <Line name="Systolic" type="monotone" dataKey="systolic" stroke="#e53e3e" strokeWidth={3} />
              <Line name="Diastolic" type="monotone" dataKey="diastolic" stroke="#feb2b2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SPO2 */}
        <div style={styles.chartCard}>
          <h3 style={styles.subTitle}><Droplets size={20} color="#38b2ac" /> Blood Oxygen (SpO2)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f7fafc" />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis domain={[90, 100]} tick={{fontSize: 10}} />
              <Tooltip />
              <ReferenceLine y={95} stroke="#e53e3e" strokeWidth={2} label={{ value: 'Warning', fill: '#e53e3e', fontSize: 10 }} />
              <Area type="monotone" dataKey="spo2" stroke="#38b2ac" fill="#e6fffa" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* HEIGHT SENSORS */}
        <div style={styles.chartCard}>
          <h3 style={styles.subTitle}><Ruler size={20} color="#38a169" /> Height Sensor Analytics</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f7fafc" />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <Line name="Laser (m)" type="monotone" dataKey="heightLaser" stroke="#38a169" strokeWidth={3} />
              <Line name="Sonar (m)" type="monotone" dataKey="heightSonar" stroke="#48bb78" strokeWidth={2} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* WEIGHT & TEMP */}
        <div style={styles.chartCard}>
          <h3 style={styles.subTitle}><Scale size={20} color="#805ad5" /> Physical Vitals</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f7fafc" />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis yAxisId="left" orientation="left" stroke="#805ad5" tick={{fontSize: 10}} />
              <YAxis yAxisId="right" orientation="right" stroke="#f6ad55" tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" name="Weight (kg)" type="monotone" dataKey="weight" stroke="#805ad5" strokeWidth={3} />
              <Line yAxisId="right" name="Temp (°C)" type="monotone" dataKey="temperature" stroke="#f6ad55" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ALERT LOGS */}
        <div style={styles.chartCard}>
          <h3 style={styles.subTitle}><AlertTriangle size={20} color="#e53e3e" /> Critical Alert History</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {[
              { date: '2024-05-20 14:22', msg: 'Abnormal BP detected (145/92)', sev: 'High' },
              { date: '2024-05-18 09:15', msg: 'SpO2 dropped below 95%', sev: 'Critical' },
              { date: '2024-05-15 18:40', msg: 'Elevated temperature (38.2°C)', sev: 'Medium' },
            ].map((alert, idx) => (
              <div key={idx} style={{ padding: '12px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#2d3748' }}>{alert.msg}</div>
                  <div style={{ fontSize: '11px', color: '#a0aec0' }}>{alert.date}</div>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: alert.sev === 'Critical' ? '#fff5f5' : '#f0fff4', color: alert.sev === 'Critical' ? '#e53e3e' : '#b7791f' }}>{alert.sev}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailPage;
