import React, { useState, useEffect, useContext, useCallback } from 'react';
import { ArrowLeft, Download, Activity } from 'lucide-react';
import { AuthContext, database } from '../context/AuthContext';
import { ref, get } from 'firebase/database';
import { readingsAPI } from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine, ComposedChart, ReferenceArea 
} from 'recharts';
import { formatFloat } from '../utils/format';

interface AnalyticsPageProps {
  onBack: () => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const { userProfile } = useContext(AuthContext);
  const [days, setDays] = useState(30);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const rfid = userProfile?.rfidNumber || userProfile?.rfid;
      const cutoffTime = Date.now() - (days * 86400000);

      // 1. Try Firebase Realtime Database directly
      let historyObj: any = null;
      if (rfid) {
        const snap = await get(ref(database, `READINGS/${rfid}/history`));
        if (snap.exists()) {
          historyObj = snap.val();
        }
      }
      if (!historyObj) {
        const globalSnap = await get(ref(database, 'READINGS/history'));
        if (globalSnap.exists()) {
          historyObj = globalSnap.val();
        }
      }

      if (historyObj && typeof historyObj === 'object') {
        const processed = Object.entries(historyObj)
          .map(([key, rawItem]: [string, any]) => {
            const item = rawItem || {};
            const rawTs = parseInt(key) || parseInt(item.timestamp) || Date.now();
            const ts = rawTs > 1e11 ? rawTs : rawTs * 1000;
            const date = new Date(ts);
            return {
              timestamp: ts,
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              fullDate: date.toLocaleString(),
              spo2: item.spo2 || 0,
              heartRate: item.heartRate || item.heart_rate || 0,
              systolic: item.systolic || 0,
              diastolic: item.diastolic || 0,
              temperature: item.temperature || 0,
              weight: item.weight || 0,
              heightLaser: item.heightLaser || item.height_laser || item.height || 0,
              heightSonar: item.heightSonar || item.height_sonar || 0,
              bmiLaser: item.bmiLaser || item.bmi_laser || item.bmi || 0,
              bmiSonar: item.bmiSonar || item.bmi_sonar || 0,
            };
          })
          .filter(reading => reading.timestamp >= cutoffTime)
          .sort((a, b) => a.timestamp - b.timestamp);

        setHistoryData(processed);
        return;
      }

      // 2. Fallback to API if available
      const historyResp = await readingsAPI.getHistory(days);
      if (historyResp.data && Array.isArray(historyResp.data)) {
        const processed = historyResp.data.map((reading: any) => {
          const date = new Date(parseInt(reading.timestamp));
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: date.toLocaleString(),
            spo2: reading.spo2 || 0,
            heartRate: reading.heartRate || reading.heart_rate || 0,
            systolic: reading.systolic || 0,
            diastolic: reading.diastolic || 0,
            temperature: reading.temperature || 0,
            weight: reading.weight || 0,
            heightLaser: reading.heightLaser || reading.height_laser || reading.height || 0,
            heightSonar: reading.heightSonar || reading.height_sonar || 0,
            bmiLaser: reading.bmiLaser || reading.bmi_laser || reading.bmi || 0,
            bmiSonar: reading.bmiSonar || reading.bmi_sonar || 0,
          };
        });
        setHistoryData(processed);
      } else {
        setHistoryData([]);
      }
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  }, [days, userProfile]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const styles = {
    container: { padding: '24px', backgroundColor: '#f3f4f6', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    titleSection: { display: 'flex', alignItems: 'center', gap: '16px' },
    title: { fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 },
    backBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: '#4b5563', transition: 'all 0.2s' },
    controls: { display: 'flex', backgroundColor: '#fff', padding: '6px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    periodBtn: (active: boolean) => ({
      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
      backgroundColor: active ? '#2563eb' : 'transparent', color: active ? '#fff' : '#6b7280',
      transition: 'all 0.2s'
    }),
    grid: { display: 'flex', flexDirection: 'column' as const, gap: '24px', width: '100%' },
    card: { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
    cardTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' },
    cardSub: { fontSize: '14px', color: '#6b7280' },
    thresholdLabel: { fontSize: '12px', fontWeight: '500', padding: '4px 8px', borderRadius: '6px' }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: '800', marginBottom: '8px', color: '#0f172a', fontSize: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
            {payload[0].payload.fullDate || label}
          </p>
          {payload.map((item: any, index: number) => {
            if (item.name === 'Pulse Pressure Span' || item.name === 'BMI Trend Area') return null;
            return (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px', margin: '3px 0' }}>
                <span style={{ color: item.color, fontWeight: '600' }}>{item.name}:</span>
                <span style={{ fontWeight: '800', color: '#0f172a' }}>{typeof item.value === 'number' ? formatFloat(item.value, 4) : item.value}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <button onClick={onBack} style={styles.backBtn} onMouseOver={e=>e.currentTarget.style.backgroundColor='#f9fafb'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#fff'}>
            <ArrowLeft size={20} />
            Back
          </button>
          <div>
            <h1 style={styles.title}>Health Analytics</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Deep dive into your vital signs and historical trends</p>
          </div>
        </div>
        
        <div style={styles.controls}>
          {[7, 30, 90, 180].map(d => (
            <button key={d} onClick={() => setDays(d)} style={styles.periodBtn(days === d) as any}>
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '20px', fontWeight: '600', color: '#6b7280' }}>Analyzing health data...</p>
        </div>
      ) : historyData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', backgroundColor: '#fff', borderRadius: '24px', border: '2px dashed #d1d5db' }}>
          <Activity size={64} color="#d1d5db" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#374151' }}>No Historical Data</h2>
          <p style={{ color: '#6b7280', maxWidth: '400px', margin: '8px auto 24px' }}>Start taking readings with MediBot to see your health progress visualized here.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {/* BMI COMPARISON */}
          <div style={{ ...styles.card, width: '100%', boxSizing: 'border-box' }}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>BMI & Adiposity Analysis</h3>
                <p style={styles.cardSub}>Body mass index progression with WHO clinical zone overlays</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#dcfce7', color: '#166534' }}>WHO Normal: 18.5 - 24.9</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={historyData}>
                <defs>
                  <linearGradient id="anBmiArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis domain={[15, 36]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceArea y1={18.5} y2={24.9} fill="#dcfce7" fillOpacity={0.4} />
                <ReferenceArea y1={25} y2={29.9} fill="#fef3c7" fillOpacity={0.3} />
                <ReferenceArea y1={30} y2={36} fill="#fee2e2" fillOpacity={0.3} />
                <ReferenceLine y={25} label={{ value: 'Overweight (25)', fill: '#d97706', fontSize: 10, position: 'right' }} stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine y={18.5} label={{ value: 'Underweight (18.5)', fill: '#2563eb', fontSize: 10, position: 'right' }} stroke="#3b82f6" strokeDasharray="3 3" />
                <Area name="BMI Trend Area" type="monotone" dataKey="bmiLaser" fill="url(#anBmiArea)" stroke="none" />
                <Line name="BMI (Optical Stature)" type="monotone" dataKey="bmiLaser" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                <Line name="BMI (Acoustic Stature)" type="monotone" dataKey="bmiSonar" stroke="#9333ea" strokeWidth={2} strokeDasharray="4 4" dot={{r: 3}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* BLOOD PRESSURE */}
          <div style={{ ...styles.card, width: '100%', boxSizing: 'border-box' }}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Hemodynamic Blood Pressure</h3>
                <p style={styles.cardSub}>Systolic, Diastolic & arterial pulse pressure span</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#dcfce7', color: '#166534' }}>Normal: &lt; 120/80 mmHg</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={historyData}>
                <defs>
                  <linearGradient id="anBpPulseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis domain={[50, 190]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceArea y1={60} y2={120} fill="#dcfce7" fillOpacity={0.25} />
                <ReferenceArea y1={140} y2={190} fill="#fee2e2" fillOpacity={0.2} />
                <ReferenceLine y={140} label={{ value: 'Stage 2 HTN (140)', fill: '#dc2626', fontSize: 10, position: 'right' }} stroke="#dc2626" strokeDasharray="3 3" />
                <ReferenceLine y={120} label={{ value: 'Elevated (120)', fill: '#d97706', fontSize: 10, position: 'right' }} stroke="#d97706" strokeDasharray="3 3" />
                <ReferenceLine y={90} label={{ value: 'Diastolic Limit (90)', fill: '#2563eb', fontSize: 10, position: 'right' }} stroke="#2563eb" strokeDasharray="3 3" />
                <Area name="Pulse Pressure Span" type="monotone" dataKey="systolic" stroke="none" fill="url(#anBpPulseGrad)" />
                <Line name="Systolic (mmHg)" type="monotone" dataKey="systolic" stroke="#dc2626" strokeWidth={3} dot={{r: 4, fill: '#dc2626'}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                <Line name="Diastolic (mmHg)" type="monotone" dataKey="diastolic" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* SPO2 */}
          <div style={{ ...styles.card, width: '100%', boxSizing: 'border-box' }}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Oxygen Saturation (SpO2)</h3>
                <p style={styles.cardSub}>Dynamic blood oxygen waveform with hypoxia safety boundary</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#dcfce7', color: '#166534' }}>Normal: &gt; 95%</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="anColorSpo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceArea y1={80} y2={95} fill="#fee2e2" fillOpacity={0.3} />
                <ReferenceLine y={95} label={{ value: 'Hypoxia Risk (<95%)', fill: '#dc2626', fontSize: 10, position: 'right' }} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" />
                <Area name="SpO2 Saturation (%)" type="monotone" dataKey="spo2" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#anColorSpo2)" dot={{r: 4, fill: '#0284c7'}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* HEIGHT COMPARISON */}
          <div style={{ ...styles.card, width: '100%', boxSizing: 'border-box' }}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Stature Measurement (Meters)</h3>
                <p style={styles.cardSub}>Dual clinical stadiometer precision tracking</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#f3f4f6', color: '#374151' }}>Unit: Meters</div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line name="Optical Stadiometer (m)" type="monotone" dataKey="heightLaser" stroke="#16a34a" strokeWidth={3} dot={{r: 4, fill: '#16a34a'}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                <Line name="Acoustic Stadiometer (m)" type="monotone" dataKey="heightSonar" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{r: 3}} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* WEIGHT & TEMPERATURE */}
          <div style={{ ...styles.card, width: '100%', boxSizing: 'border-box' }}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Weight & Body Temp</h3>
                <p style={styles.cardSub}>Physical health metrics over time</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ ...styles.thresholdLabel, backgroundColor: '#fef3c7', color: '#92400e' }}>Temp: 36.1 - 37.2°C</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis yAxisId="left" orientation="left" stroke="#6366f1" axisLine={false} tickLine={false} tick={{fill: '#6366f1', fontSize: 11}} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" axisLine={false} tickLine={false} tick={{fill: '#f59e0b', fontSize: 11}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line yAxisId="left" name="Weight (kg)" type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1'}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                <Line yAxisId="right" name="Temp (°C)" type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SUMMARY STATS CARD */}
          <div style={{ ...styles.card, width: '100%', boxSizing: 'border-box', backgroundColor: '#2563eb', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <Activity size={48} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Health Progress Report</h3>
            <p style={{ opacity: 0.9, maxWidth: '400px', marginBottom: '24px' }}>Download your detailed health analysis and historical data.</p>
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#fff', color: '#2563eb', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '16px' }}>
              <Download size={20} />
              Generate Report
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;
