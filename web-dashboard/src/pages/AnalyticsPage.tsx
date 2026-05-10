import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { readingsAPI } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AnalyticsPageProps {
  onBack: () => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const [days, setDays] = useState(30);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
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

      const analyticsResp = await readingsAPI.getAnalytics(days);
      if (analyticsResp.data) {
        setAnalyticsData(analyticsResp.data);
      }

      const historyResp = await readingsAPI.getHistory(days);
      if (historyResp.data && Array.isArray(historyResp.data)) {
        const processed = historyResp.data.map((reading: any, idx: number) => {
          const date = new Date(parseInt(reading.timestamp));
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            spo2: reading.spo2 || 0,
            heartRate: reading.heartRate || 0,
            systolic: reading.systolic || 0,
            diastolic: reading.diastolic || 0,
            temperature: reading.temperature || 0
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
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    controls: { display: 'flex', gap: '12px', marginBottom: '24px' },
    button: (active: boolean) => ({
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: active ? '#2563eb' : '#e5e7eb',
      color: active ? '#fff' : '#111827'
    }),
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
    statBox: { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' },
    statLabel: { fontSize: '12px', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' as const },
    statValue: { fontSize: '24px', fontWeight: 'bold', color: '#111827' },
    chartCard: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' },
    chartTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '24px' },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.headerBtn}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={styles.title}>Analytics</h1>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.controls}>
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={styles.button(days === d) as any}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px' }}>Loading analytics...</p>
        </div>
      ) : analyticsData && analyticsData.totalReadings === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px dashed #d1d5db' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Analytics Data</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Record more health readings to see analytics and trends</p>
          <button
            onClick={fetchAnalytics}
            style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            Refresh Analytics
          </button>
        </div>
      ) : (
        <>
          {analyticsData && (
            <div style={styles.statsGrid}>
              {Object.entries(analyticsData.analytics || {}).map(([key, value]: any) => (
                <div key={key} style={styles.statBox}>
                  <div style={styles.statLabel}>{key}</div>
                  <div style={styles.statValue}>{value.avg}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                    Min: {value.min} | Max: {value.max}
                  </div>
                </div>
              ))}
            </div>
          )}

          {historyData.length > 0 && (
            <>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Vital Signs Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="spo2" stroke="#2563eb" strokeWidth={2} />
                    <Line type="monotone" dataKey="heartRate" stroke="#dc2626" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Blood Pressure Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="systolic" fill="#9333ea" />
                    <Bar dataKey="diastolic" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
