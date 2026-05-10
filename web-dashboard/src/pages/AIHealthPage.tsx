import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import { readingsAPI } from '../services/api';

interface AIHealthPageProps {
  onBack: () => void;
}

const AIHealthPage: React.FC<AIHealthPageProps> = ({ onBack }) => {
  const [recommendations, setRecommendations] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch latest recommendations
      const aiResp = await readingsAPI.getAnalytics(7);
      if (aiResp.data) {
        setRecommendations(aiResp.data);
      }

      // Try to get AI history
      const historyResp = await readingsAPI.getHistory(30);
      if (historyResp.data && Array.isArray(historyResp.data)) {
        setHistory(historyResp.data);
      }
    } catch (err: any) {
      setError('Failed to load AI recommendations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    refreshBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '8px' },
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
    riskLevel: (level: string) => ({
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px',
      backgroundColor: level === 'High' ? '#fef2f2' : level === 'Moderate' ? '#fef3c7' : '#f0fdf4',
      border: `1px solid ${level === 'High' ? '#fecaca' : level === 'Moderate' ? '#fcd34d' : '#bbf7d0'}`,
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    }),
    riskIcon: (level: string) => ({
      color: level === 'High' ? '#dc2626' : level === 'Moderate' ? '#d97706' : '#16a34a',
      flexShrink: 0
    }),
    riskText: (level: string) => ({
      color: level === 'High' ? '#991b1b' : level === 'Moderate' ? '#92400e' : '#166534',
      fontWeight: '600'
    }),
    insightsList: { paddingLeft: '24px', marginBottom: '16px' },
    insightItem: { marginBottom: '12px', color: '#111827', fontSize: '14px', lineHeight: '1.6' },
    recommendationBox: { padding: '16px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '12px' },
    recommendationTitle: { fontWeight: '600', color: '#1e40af', marginBottom: '8px' },
    recommendationText: { color: '#1e3a8a', fontSize: '14px', lineHeight: '1.6' },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>AI Health Insights</h1>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          style={styles.refreshBtn}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Generating AI recommendations...
        </div>
      ) : recommendations ? (
        <>
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Health Status</h2>
            {recommendations.analytics && (
              <div>
                <div style={styles.riskLevel('Moderate')}>
                  <AlertCircle size={24} style={styles.riskIcon('Moderate') as any} />
                  <div style={styles.riskText('Moderate') as any}>
                    Your health status is being monitored. Continue regular check-ups.
                  </div>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginTop: '16px', marginBottom: '12px' }}>
                  Vital Signs Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {Object.entries(recommendations.analytics).map(([key, data]: any) => (
                    <div key={key} style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'capitalize' }}>
                        {key}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                        {data.avg}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Range: {data.min} - {data.max}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>AI Recommendations</h2>
            <div style={styles.recommendationBox}>
              <div style={styles.recommendationTitle}>🏃 Physical Activity</div>
              <div style={styles.recommendationText}>
                Maintain regular moderate exercise for 30 minutes, 5 days a week. Consider low-impact activities like walking, swimming, or cycling.
              </div>
            </div>

            <div style={styles.recommendationBox}>
              <div style={styles.recommendationTitle}>🥗 Nutrition</div>
              <div style={styles.recommendationText}>
                Follow a balanced diet rich in fruits, vegetables, and lean proteins. Limit salt and processed foods. Stay hydrated with adequate water intake.
              </div>
            </div>

            <div style={styles.recommendationBox}>
              <div style={styles.recommendationTitle}>😴 Sleep & Recovery</div>
              <div style={styles.recommendationText}>
                Aim for 7-9 hours of quality sleep per night. Maintain a consistent sleep schedule and avoid screens 1 hour before bed.
              </div>
            </div>

            <div style={styles.recommendationBox}>
              <div style={styles.recommendationTitle}>🧘 Stress Management</div>
              <div style={styles.recommendationText}>
                Practice relaxation techniques like meditation or deep breathing. Engage in activities you enjoy to reduce stress and improve mental health.
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Recent Health Trends</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {history.slice(0, 5).map((reading, idx) => (
                  <div key={idx} style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                      Reading {idx + 1}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.8' }}>
                      <div>❤️ HR: {reading.heartRate || 'N/A'} bpm</div>
                      <div>O₂: {reading.spo2 || 'N/A'}%</div>
                      <div>BP: {reading.systolic || 'N/A'}/{reading.diastolic || 'N/A'}</div>
                      <div>🌡️ Temp: {reading.temperature || 'N/A'}°C</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={styles.card}>
          <p style={{ color: '#6b7280' }}>No recommendations available yet. Please ensure you have recent health readings.</p>
        </div>
      )}
    </div>
  );
};

export default AIHealthPage;
