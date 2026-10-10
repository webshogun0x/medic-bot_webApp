import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  Heart, Droplets, TrendingUp, TrendingDown,
  Users, AlertTriangle, Search, Bell, User, Activity, X, CheckCircle,
  Download
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend, ReferenceLine 
} from 'recharts';
import { AuthContext, database, auth } from './context/AuthContext';
import { ref, onValue, get } from 'firebase/database';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { userProfile } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [latestReading, setLatestReading] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationRef]);

  // Pull live data directly from Firebase Realtime Database
  useEffect(() => {
    setLoading(true);
    setError(null);

    const rfid = userProfile?.rfidNumber || userProfile?.rfid || '';

    // 1. LATEST READING: Listen to patient RFID path, fallback to global kiosk latest
    const latestPath = rfid ? `READINGS/${rfid}/latest` : `READINGS/latest`;
    const latestRef = ref(database, latestPath);

    const unsubscribeLatest = onValue(latestRef, (snapshot) => {
      if (snapshot.exists()) {
        setLatestReading(snapshot.val());
        setLoading(false);
      } else if (rfid) {
        // Fallback to global /READINGS/latest if patient RFID has no readings yet
        get(ref(database, 'READINGS/latest')).then((globalSnap) => {
          if (globalSnap.exists()) {
            setLatestReading(globalSnap.val());
          } else {
            setLatestReading(null);
          }
          setLoading(false);
        }).catch(() => {
          setLatestReading(null);
          setLoading(false);
        });
      } else {
        setLatestReading(null);
        setLoading(false);
      }
    }, (err) => {
      console.error('Firebase latest reading listener error:', err);
      setError('Unable to load live readings from Firebase');
      setLoading(false);
    });

    // 2. READINGS HISTORY: Listen to patient RFID history, fallback to global kiosk history
    const historyPath = rfid ? `READINGS/${rfid}/history` : `READINGS/history`;
    const historyRef = ref(database, historyPath);

    const processHistoryObject = (rawHistory: any) => {
      if (!rawHistory || typeof rawHistory !== 'object') {
        setHistoryData([]);
        setChartData([]);
        setStats([
          { title: 'Total Readings', value: '0', change: '0 this week', trend: 'up' },
          { title: 'New This Week', value: '0', change: 'No readings yet', trend: 'up' },
          { title: 'Critical Alerts', value: '0', change: 'None', trend: 'up' },
          { title: 'Health Score', value: '--', change: 'Awaiting readings', trend: 'up' }
        ]);
        setRecentActivity([]);
        return;
      }

      const entries = Object.entries(rawHistory).map(([key, rawItem]: [string, any]) => {
        const item = rawItem || {};
        const rawTs = parseInt(key) || parseInt(item.timestamp) || Date.now();
        const ts = rawTs > 1e11 ? rawTs : rawTs * 1000;
        const d = new Date(ts);

        const bmiLaserVal = item.bmiLaser ?? item.bmi_laser ?? item.bmi ?? 0;
        const bmiSonarVal = item.bmiSonar ?? item.bmi_sonar ?? 0;
        const heightLaserVal = item.heightLaser ?? item.height_laser ?? item.height ?? 0;
        const heightSonarVal = item.heightSonar ?? item.height_sonar ?? 0;

        return {
          timestamp: ts,
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fullDate: d.toLocaleString(),
          spo2: item.spo2 || 0,
          heartRate: item.heartRate || item.heart_rate || 0,
          systolic: item.systolic || 0,
          diastolic: item.diastolic || 0,
          temperature: item.temperature || 0,
          weight: item.weight || 0,
          heightLaser: heightLaserVal,
          heightSonar: heightSonarVal,
          bmiLaser: bmiLaserVal,
          bmiSonar: bmiSonarVal,
          value: bmiLaserVal || bmiSonarVal || 0,
          ahaCategory: item.aha_category || item.ahaCategory || 'Normal'
        };
      }).sort((a, b) => a.timestamp - b.timestamp);

      setHistoryData(entries);
      setChartData(entries.slice(-7));

      // Calculate stats directly from real readings
      const total = entries.length;
      const oneWeekAgo = Date.now() - (7 * 86400000);
      const newThisWeek = entries.filter(e => e.timestamp >= oneWeekAgo).length;
      const criticalCount = entries.filter(e => 
        (e.heartRate > 100 || (e.heartRate > 0 && e.heartRate < 50)) || 
        (e.spo2 > 0 && e.spo2 < 95) || 
        e.systolic > 140
      ).length;

      let score = '--';
      if (total > 0) {
        const healthyRatio = (total - criticalCount) / total;
        score = `${Math.round(healthyRatio * 100)}%`;
      }

      setStats([
        { title: 'Total Readings', value: total.toString(), change: `${newThisWeek} this week`, trend: 'up' },
        { title: 'New This Week', value: newThisWeek.toString(), change: `${total} all-time`, trend: 'up' },
        { title: 'Critical Alerts', value: criticalCount.toString(), change: criticalCount > 0 ? 'Requires attention' : 'All clear', trend: criticalCount > 0 ? 'down' : 'up' },
        { title: 'Health Score', value: score, change: 'Real-time assessment', trend: 'up' }
      ]);

      // Generate activity log from actual readings
      const activities = entries.slice(-5).reverse().map((reading, idx) => ({
        id: idx,
        name: `Health Session #${total - idx}`,
        type: `BP: ${reading.systolic}/${reading.diastolic} | SpO2: ${reading.spo2}% | BMI: ${reading.bmiLaser || reading.bmiSonar || 'N/A'}`,
        time: `${reading.time} (${reading.date})`,
        avatar: 'K'
      }));
      setRecentActivity(activities);
    };

    const unsubscribeHistory = onValue(historyRef, (snapshot) => {
      if (snapshot.exists()) {
        processHistoryObject(snapshot.val());
      } else if (rfid) {
        // Fallback to global /READINGS/history
        get(ref(database, 'READINGS/history')).then((globalSnap) => {
          if (globalSnap.exists()) {
            processHistoryObject(globalSnap.val());
          } else {
            processHistoryObject(null);
          }
        }).catch(() => processHistoryObject(null));
      } else {
        processHistoryObject(null);
      }
    }, (err) => {
      console.error('Firebase history listener error:', err);
      processHistoryObject(null);
    });

    // 3. NOTIFICATIONS: Listen directly to user's notifications in Firebase
    const uid = auth.currentUser?.uid;
    let unsubscribeNotif = () => {};
    if (uid) {
      const notifRef = ref(database, `USERS/${uid}/notifications`);
      unsubscribeNotif = onValue(notifRef, (snapshot) => {
        if (snapshot.exists()) {
          const list = Object.entries(snapshot.val()).map(([notifId, item]: [string, any]) => ({
            id: notifId,
            title: item.title || 'Notification',
            message: item.message || '',
            time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            type: item.severity || 'info'
          }));
          setNotifications(list);
        } else {
          setNotifications([]);
        }
      });
    }

    return () => {
      unsubscribeLatest();
      unsubscribeHistory();
      unsubscribeNotif();
    };
  }, [userProfile]);

  // Calculate real Health Condition from latest reading / history
  const normalCount = historyData.filter(e => e.heartRate >= 60 && e.heartRate <= 100 && e.spo2 >= 95 && e.systolic <= 130).length;
  const criticalCount = historyData.filter(e => (e.heartRate > 100 || (e.heartRate > 0 && e.heartRate < 50)) || (e.spo2 > 0 && e.spo2 < 95) || e.systolic > 140).length;
  const attentionCount = historyData.length - normalCount - criticalCount;

  const pieData = historyData.length === 0 ? [
    { name: 'Awaiting Readings', value: 1, color: '#9ca3af' }
  ] : [
    { name: 'Optimal', value: Math.max(0, normalCount), color: '#22c55e' },
    { name: 'Attention Needed', value: Math.max(0, attentionCount), color: '#f59e0b' },
    { name: 'Critical', value: Math.max(0, criticalCount), color: '#ef4444' }
  ].filter(item => item.value > 0);

  const conditionText = historyData.length === 0 ? 'No Data Yet' : criticalCount > 0 ? 'Attention Needed' : 'Healthy';
  const conditionColor = historyData.length === 0 ? '#6b7280' : criticalCount > 0 ? '#ef4444' : '#16a34a';

  const styles = {
    header: { backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' as const },
    title: { fontSize: '32px', fontWeight: 'bold', color: '#111827' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
    searchBox: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
    searchInput: { paddingLeft: '40px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', width: '320px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    avatar: { width: '40px', height: '40px', backgroundColor: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    tabs: { padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '32px' },
    tabBtn: (active: boolean) => ({
      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
      backgroundColor: active ? '#2563eb' : 'transparent', color: active ? '#fff' : '#4b5563',
      transition: 'background-color 0.2s'
    }),
    content: { flex: 1, overflow: 'auto', padding: '24px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' },
    statCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    chartsSection: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' },
    chartCard: { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    bottomSection: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' },
    notificationPanel: { 
      position: 'absolute' as const, top: '80px', right: '80px', width: '360px', 
      backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      border: '1px solid #e5e7eb', zIndex: 50, maxHeight: '480px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const
    },
    thresholdLabel: { fontSize: '12px', fontWeight: '500', padding: '4px 8px', borderRadius: '6px' }
  };

  const iconMap: any = {
    'Total Readings': Activity,
    'New This Week': Users,
    'Critical Alerts': AlertTriangle,
    'Health Score': Heart
  };
  const colorMap: any = {
    'Total Readings': '#2563eb',
    'New This Week': '#16a34a',
    'Critical Alerts': '#dc2626',
    'Health Score': '#9333ea'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>{payload[0].payload.fullDate || label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color, fontSize: '13px', margin: '4px 0' }}>
              {item.name}: <span style={{ fontWeight: '600' }}>{item.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            Live MediBot Health Telemetry &bull; Realtime Cloud Database Connected
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.searchBox}>
            <Search size={20} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search anything here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <button 
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', position: 'relative' }}
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              <Bell size={24} color={notifications.length > 0 ? "#2563eb" : "#9ca3af"} />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '50%', border: '2px solid #fff' }}></span>
              )}
            </button>
            
            {showNotifications && (
              <div ref={notificationRef} style={styles.notificationPanel}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                  <span style={{ fontWeight: '700', color: '#1f2937' }}>Notifications</span>
                  <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                      <CheckCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p style={{ margin: 0 }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} style={{ padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '14px', color: notif.type === 'critical' ? '#dc2626' : '#1f2937' }}>{notif.title}</span>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{notif.time}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={styles.avatar} onClick={() => onNavigate('profile')} title="My Profile">
            <User size={20} color="#fff" />
          </div>
        </div>
      </header>

      {/* BIOMETRIC REGISTRATION BANNER */}
      {userProfile && !userProfile.biometric_enrolled && (
        <div style={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
              flexShrink: 0
            }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#92400e', fontSize: '15px' }}>
                Action Required: Complete Biometric Registration at Kiosk
              </div>
              <div style={{ color: '#b45309', fontSize: '13px', marginTop: '3px' }}>
                Your web account is active, but your biometric fingerprint and clinic RFID badge are not yet enrolled. Visit any MediBot health kiosk to complete your 1-minute physical enrollment.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            style={{
              backgroundColor: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginLeft: '20px'
            }}
          >
            View Clinic Badge Info &rarr;
          </button>
        </div>
      )}

      <div style={styles.tabs}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'reports', label: 'Health Reports' },
          { id: 'history', label: 'Readings History' },
          { id: 'insights', label: 'AI Insights' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={styles.tabBtn(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {error && (
          <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '14px' }}>
            <div style={{ color: '#991b1b', fontWeight: '600', marginBottom: '4px' }}>Firebase Connection Notice</div>
            <div style={{ color: '#991b1b', fontSize: '13px' }}>{error}</div>
          </div>
        )}
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '16px', fontSize: '15px', fontWeight: '500' }}>Connecting to Firebase Realtime Database...</p>
              </div>
            ) : (
              <>
                {/* METRIC STATS CARDS */}
                <div style={styles.statsGrid}>
                  {stats.map((stat, index) => {
                    const Icon = iconMap[stat.title] || Activity;
                    return (
                      <div key={index} style={styles.statCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>{stat.title}</span>
                          <div style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                            <Icon size={20} color={colorMap[stat.title] || '#2563eb'} />
                          </div>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>{stat.value}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {stat.trend === 'up' ? (
                            <TrendingUp size={16} color="#22c55e" />
                          ) : (
                            <TrendingDown size={16} color="#ef4444" />
                          )}
                          <span style={{ fontSize: '14px', fontWeight: '500', color: stat.trend === 'up' ? '#16a34a' : '#dc2626' }}>
                            {stat.change}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={styles.chartsSection}>
                  {/* BMI TREND CHART */}
                  <div style={styles.chartCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>BMI Trends (Laser vs Sonar)</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>Dual-sensor precision tracking directly from MediBot kiosk</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ ...styles.thresholdLabel, backgroundColor: '#fef3c7', color: '#92400e', fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}>Ideal: 18.5 - 25</div>
                        <button onClick={() => onNavigate('analytics')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#2563eb', cursor: 'pointer', backgroundColor: '#fff' }}>Detailed Analytics</button>
                      </div>
                    </div>

                    {historyData.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                        <Activity size={44} style={{ margin: '0 auto 12px', color: '#9ca3af' }} />
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>No BMI Telemetry Yet</h4>
                        <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '380px', margin: '0 auto' }}>
                          Step onto the MediBot kiosk and complete a measurement to record your dual Laser vs Sonar BMI trend.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData.length > 0 ? chartData : historyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" domain={['auto', 'auto']} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" />
                          <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="3 3" />
                          <Line name="Laser BMI" type="monotone" dataKey="bmiLaser" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line name="Sonar BMI" type="monotone" dataKey="bmiSonar" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* HEALTH STATUS PIE CHART */}
                  <div style={styles.chartCard}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>Health Status</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <div style={{ fontSize: '14px', color: '#4b5563' }}>Current Condition</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: conditionColor }}>{conditionText}</div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION */}
                <div style={styles.bottomSection}>
                  {/* LATEST HEALTH READING CARDS */}
                  <div style={styles.chartCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Latest Health Reading</h3>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>
                          {latestReading?.timestamp 
                            ? `Measured: ${new Date(parseInt(latestReading.timestamp) > 1e11 ? parseInt(latestReading.timestamp) : parseInt(latestReading.timestamp) * 1000).toLocaleString()}` 
                            : 'Live telemetry from MediBot kiosk'}
                        </p>
                      </div>
                      <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                        Firebase Synced
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Droplets size={16} color="#2563eb" />
                          <span style={{ fontSize: '14px', color: '#4b5563' }}>SpO2</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                          {latestReading?.spo2 ? `${latestReading.spo2}%` : '--'}
                        </div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Heart size={16} color="#dc2626" />
                          <span style={{ fontSize: '14px', color: '#4b5563' }}>Heart Rate</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                          {latestReading ? `${latestReading.heartRate || latestReading.heart_rate || '--'} bpm` : '--'}
                        </div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Activity size={16} color="#16a34a" />
                          <span style={{ fontSize: '14px', color: '#4b5563' }}>BP (Sys/Dia)</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                          {latestReading?.systolic ? `${latestReading.systolic}/${latestReading.diastolic}` : '--'}
                        </div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <TrendingUp size={16} color="#2563eb" />
                          <span style={{ fontSize: '14px', color: '#4b5563' }}>BMI (Laser)</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                          {latestReading ? (latestReading.bmiLaser || latestReading.bmi_laser || latestReading.bmi || '--') : '--'}
                        </div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <TrendingUp size={16} color="#9333ea" />
                          <span style={{ fontSize: '14px', color: '#4b5563' }}>BMI (Sonar)</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                          {latestReading ? (latestReading.bmiSonar || latestReading.bmi_sonar || '--') : '--'}
                        </div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <User size={16} color="#059669" />
                          <span style={{ fontSize: '14px', color: '#4b5563' }}>Weight</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                          {latestReading?.weight ? `${latestReading.weight} kg` : '--'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RECENT ACTIVITY */}
                  <div style={styles.chartCard}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>Recent Activity</h3>
                    {recentActivity.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6b7280' }}>
                        <p style={{ fontSize: '13px', margin: 0 }}>No recent kiosk sessions recorded yet</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {recentActivity.map((activity) => (
                          <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', backgroundColor: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{activity.avatar}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{activity.name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{activity.type}</div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{activity.time}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* HEALTH REPORTS TAB */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ ...styles.chartCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Comprehensive Health Report</h2>
                <p style={{ color: '#6b7280' }}>Multi-sensor readings recorded live from MediBot health kiosk</p>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' }}>
                <Download size={20} /> Generate PDF Report
              </button>
            </div>

            {historyData.length === 0 ? (
              <div style={{ ...styles.chartCard, textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                <Activity size={48} style={{ margin: '0 auto 16px', color: '#9ca3af' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Health Data in Firebase</h3>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Visit a MediBot station to record your vitals and generate comprehensive reports.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
                {/* BMI COMPARISON */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>BMI Analysis (Laser vs Sonar)</h3>
                    <div style={{ ...styles.thresholdLabel, backgroundColor: '#fef3c7', color: '#92400e' }}>Ideal: 18.5 - 25</div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} />
                      <YAxis tick={{fontSize: 11}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" />
                      <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="3 3" />
                      <Line name="Laser BMI" type="monotone" dataKey="bmiLaser" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} />
                      <Line name="Sonar BMI" type="monotone" dataKey="bmiSonar" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* BLOOD PRESSURE */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Blood Pressure Trends</h3>
                    <div style={{ ...styles.thresholdLabel, backgroundColor: '#fee2e2', color: '#991b1b' }}>Ideal: 120/80</div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} />
                      <YAxis tick={{fontSize: 11}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="3 3" />
                      <Line name="Systolic" type="monotone" dataKey="systolic" stroke="#dc2626" strokeWidth={2} />
                      <Line name="Diastolic" type="monotone" dataKey="diastolic" stroke="#ef4444" strokeWidth={1} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* SPO2 */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Oxygen Saturation (SpO2)</h3>
                    <div style={{ ...styles.thresholdLabel, backgroundColor: '#dcfce7', color: '#166534' }}>Normal: &gt; 95%</div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} />
                      <YAxis domain={[90, 100]} tick={{fontSize: 11}} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={95} stroke="#ef4444" strokeWidth={2} />
                      <Area name="SpO2 %" type="monotone" dataKey="spo2" stroke="#0891b2" fill="#ecfeff" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* HEIGHT */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Height Sensing Comparison</h3>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Meters (m)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} />
                      <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{fontSize: 11}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line name="Laser (m)" type="monotone" dataKey="heightLaser" stroke="#10b981" strokeWidth={3} />
                      <Line name="Sonar (m)" type="monotone" dataKey="heightSonar" stroke="#6366f1" strokeWidth={2} strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* WEIGHT & TEMP */}
                <div style={styles.chartCard}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>Weight & Temperature Trends</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} />
                      <YAxis yAxisId="left" tick={{fontSize: 11}} />
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize: 11}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line yAxisId="left" name="Weight (kg)" type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={2} />
                      <Line yAxisId="right" name="Temp (°C)" type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* READINGS HISTORY TAB */}
        {activeTab === 'history' && (
          <div style={styles.chartCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>Readings History</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>All health measurements synced directly from Firebase</p>
              </div>
              <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: '500' }}>
                Total Sessions: <strong>{historyData.length}</strong>
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>Date & Time</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>Heart Rate</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>SpO2</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>Blood Pressure</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>BMI (Laser)</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>BMI (Sonar)</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>Height (Laser)</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>Weight</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>Temp</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                        <Activity size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                        <p style={{ margin: 0, fontWeight: '500' }}>No readings recorded yet from MediBot kiosk</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Visit any MediBot kiosk to record your first health session.</p>
                      </td>
                    </tr>
                  ) : (
                    [...historyData].reverse().map((reading, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827' }}>{reading.fullDate}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827' }}>{reading.heartRate ? `${reading.heartRate} bpm` : '--'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827' }}>{reading.spo2 ? `${reading.spo2}%` : '--'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827' }}>{reading.systolic ? `${reading.systolic}/${reading.diastolic}` : '--'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#2563eb' }}>{reading.bmiLaser || '--'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#9333ea' }}>{reading.bmiSonar || '--'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827' }}>{reading.heightLaser ? `${reading.heightLaser} m` : '--'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827' }}>{reading.weight ? `${reading.weight} kg` : '--'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#111827' }}>{reading.temperature ? `${reading.temperature}°C` : '--'}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: reading.ahaCategory === 'Normal' ? '#dcfce7' : '#fee2e2',
                            color: reading.ahaCategory === 'Normal' ? '#16a34a' : '#dc2626'
                          }}>
                            {reading.ahaCategory || 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div style={styles.chartCard}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>AI Health Insights</h2>
            <div style={{ padding: '24px', backgroundColor: '#f0f9ff', borderRadius: '8px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '16px', color: '#0c4a6e', marginBottom: '16px' }}>
                &bull; Click the button below to get personalized AI insights for your health
              </div>
              <button
                onClick={() => onNavigate('ai-recommendations')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Open AI Recommendations &rarr;
              </button>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
              <div style={{ fontSize: '14px', color: '#4b5563' }}>
                <strong>How it works:</strong> Our AI health assistant evaluates your real MediBot kiosk vitals (BP, SpO2, Laser BMI, Sonar BMI, Pulse) to give tailored guidance and alert you to trends.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
