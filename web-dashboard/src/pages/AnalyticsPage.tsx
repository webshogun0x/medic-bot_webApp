import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, Activity, Info } from 'lucide-react';
import { readingsAPI } from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine, ComposedChart, Bar 
} from 'recharts';

interface AnalyticsPageProps {
  onBack: () => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const [days, setDays] = useState(30);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const historyResp = await readingsAPI.getHistory(days);
      if (historyResp.data && Array.isArray(historyResp.data)) {
        const processed = historyResp.data.map((reading: any) => {
          const date = new Date(parseInt(reading.timestamp));
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: date.toLocaleString(),
            spo2: reading.spo2 || 0,
            heartRate: reading.heartRate || 0,
            systolic: reading.systolic || 0,
            diastolic: reading.diastolic || 0,
            temperature: reading.temperature || 0,
            weight: reading.weight || 0,
            heightLaser: reading.heightLaser || 0,
            heightSonar: reading.heightSonar || 0,
            bmiLaser: reading.bmiLaser || 0,
            bmiSonar: reading.bmiSonar || 0,
          };
        });
        setHistoryData(processed);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' },
    card: { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
    cardTitle: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' },
    cardSub: { fontSize: '14px', color: '#6b7280' },
    thresholdLabel: { fontSize: '12px', fontWeight: '500', padding: '4px 8px', borderRadius: '6px' }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>{payload[0].payload.fullDate}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color, fontSize: '14px', margin: '4px 0' }}>
              {item.name}: <span style={{ fontWeight: '600' }}>{item.value}</span>
            </p>
          ))}
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
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>BMI Analysis</h3>
                <p style={styles.cardSub}>Comparison between Laser and Sonar precision</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#fef3c7', color: '#92400e' }}>Ideal: 18.5 - 25</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine y={25} label="Overweight" stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine y={18.5} label="Underweight" stroke="#3b82f6" strokeDasharray="3 3" />
                <Line name="BMI (Laser)" type="monotone" dataKey="bmiLaser" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line name="BMI (Sonar)" type="monotone" dataKey="bmiSonar" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* BLOOD PRESSURE */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Blood Pressure</h3>
                <p style={styles.cardSub}>Systolic and Diastolic pressure trends</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#fee2e2', color: '#991b1b' }}>Ideal: 120/80</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine y={140} label="High Sys" stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={90} label="Low Sys" stroke="#3b82f6" strokeDasharray="3 3" />
                <ReferenceLine y={60} label="Low Dia" stroke="#60a5fa" strokeDasharray="3 3" />
                <Line name="Systolic" type="stepAfter" dataKey="systolic" stroke="#dc2626" strokeWidth={3} />
                <Line name="Diastolic" type="stepAfter" dataKey="diastolic" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SPO2 */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Oxygen Saturation (SpO2)</h3>
                <p style={styles.cardSub}>Percentage of oxygen in blood</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#dcfce7', color: '#166534' }}>Normal: {">"} 95%</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorSpo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={95} label="Alert" stroke="#ef4444" strokeWidth={2} />
                <Area name="SpO2 %" type="monotone" dataKey="spo2" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorSpo2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* HEIGHT COMPARISON */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Height Measurement</h3>
                <p style={styles.cardSub}>Precision comparison of sensing technologies</p>
              </div>
              <div style={{ ...styles.thresholdLabel, backgroundColor: '#f3f4f6', color: '#374151' }}>Unit: Meters</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis domain={['dataMin - 0.1', 'dataMax + 0.1']} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line name="Height (Laser)" type="monotone" dataKey="heightLaser" stroke="#10b981" strokeWidth={3} />
                <Line name="Height (Sonar)" type="monotone" dataKey="heightSonar" stroke="#6366f1" strokeWidth={2} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* WEIGHT & TEMPERATURE */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Weight & Body Temp</h3>
                <p style={styles.cardSub}>Physical health metrics over time</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ ...styles.thresholdLabel, backgroundColor: '#fef3c7', color: '#92400e' }}>Temp: 36-37°C</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis yAxisId="left" orientation="left" stroke="#6366f1" axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line yAxisId="left" name="Weight (kg)" type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={3} />
                <Line yAxisId="right" name="Temp (°C)" type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SUMMARY STATS CARD */}
          <div style={{ ...styles.card, backgroundColor: '#2563eb', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <Activity size={48} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Health Progress Report</h3>
            <p style={{ opacity: 0.9, maxWidth: '300px', marginBottom: '24px' }}>Download your detailed health analysis and historical data.</p>
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
