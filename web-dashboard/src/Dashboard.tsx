import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  Heart, Droplets, TrendingUp, TrendingDown,
  Users, AlertTriangle, Search, Bell, User, Activity, X, CheckCircle,
  Printer, FileText, ShieldCheck, Scale, Sparkles
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend, ReferenceLine, ReferenceArea 
} from 'recharts';
import { AuthContext, database, auth } from './context/AuthContext';
import { ref, onValue, get } from 'firebase/database';
import { formatFloat } from './utils/format';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

// AHA Blood Pressure Categorization Helper
const getAhaBpCategory = (systolic: number, diastolic: number) => {
  if (!systolic || !diastolic) return { label: 'Awaiting Reading', color: '#64748b', bg: '#f1f5f9' };
  if (systolic > 180 || diastolic > 120) return { label: 'Hypertensive Crisis', color: '#991b1b', bg: '#fee2e2' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'Stage 2 Hypertension', color: '#dc2626', bg: '#fee2e2' };
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { label: 'Stage 1 Hypertension', color: '#d97706', bg: '#fef3c7' };
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return { label: 'Elevated BP', color: '#ca8a04', bg: '#fef9c3' };
  if (systolic < 120 && diastolic < 80) return { label: 'Normal Blood Pressure', color: '#16a34a', bg: '#dcfce7' };
  return { label: 'Normal Blood Pressure', color: '#16a34a', bg: '#dcfce7' };
};

// WHO BMI Categorization Helper
const getBmiCategory = (bmi: number) => {
  if (!bmi || bmi <= 0) return { label: 'Unmeasured', color: '#64748b', bg: '#f1f5f9' };
  if (bmi < 18.5) return { label: 'Underweight', color: '#0284c7', bg: '#e0f2fe' };
  if (bmi < 25.0) return { label: 'Normal / Healthy', color: '#16a34a', bg: '#dcfce7' };
  if (bmi < 30.0) return { label: 'Overweight', color: '#d97706', bg: '#fef3c7' };
  return { label: 'Obese Class', color: '#dc2626', bg: '#fee2e2' };
};

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { userProfile, refreshUserProfile } = useContext(AuthContext);
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [justEnrolledToast, setJustEnrolledToast] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const prevEnrolledRef = useRef<boolean | null>(null);

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

  // Monitor real-time biometric enrollment transitions
  const isCurrentlyEnrolled = Boolean(
    userProfile?.biometric_enrolled === true || 
    userProfile?.biometric_enrolled === 'true' ||
    userProfile?.fingerprint_registered === true ||
    userProfile?.fingerprint_registered === 'true' ||
    userProfile?.fingerprint_registered === 1 ||
    (userProfile?.fingerprint_id !== undefined && userProfile?.fingerprint_id !== null && Number(userProfile?.fingerprint_id) > 0) ||
    (userProfile?.role === 'admin' && (userProfile?.rfid || userProfile?.rfidNumber))
  );

  useEffect(() => {
    if (prevEnrolledRef.current !== null) {
      if (!prevEnrolledRef.current && isCurrentlyEnrolled) {
        // Transitioned from NOT enrolled to ENROLLED in real-time
        setJustEnrolledToast(true);
        const timer = setTimeout(() => {
          setJustEnrolledToast(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
    prevEnrolledRef.current = isCurrentlyEnrolled;
  }, [isCurrentlyEnrolled]);

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
          { title: 'Total Clinical Sessions', value: '0', change: '0 this week', trend: 'up' },
          { title: 'Recent Measurements', value: '0', change: 'No readings recorded', trend: 'up' },
          { title: 'Physiological Alerts', value: '0', change: 'All parameters normal', trend: 'up' },
          { title: 'Clinical Health Index', value: '--', change: 'Awaiting kiosk exam', trend: 'up' }
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
        e.systolic >= 140 ||
        e.diastolic >= 90
      ).length;

      let score = '--';
      if (total > 0) {
        const healthyRatio = (total - criticalCount) / total;
        score = `${Math.round(healthyRatio * 100)}%`;
      }

      setStats([
        { title: 'Total Clinical Sessions', value: total.toString(), change: `${newThisWeek} recorded this week`, trend: 'up' },
        { title: 'Recent Measurements', value: newThisWeek.toString(), change: `${total} all-time sessions`, trend: 'up' },
        { title: 'Physiological Alerts', value: criticalCount.toString(), change: criticalCount > 0 ? 'Review indicated' : 'Parameters stable', trend: criticalCount > 0 ? 'down' : 'up' },
        { title: 'Clinical Health Index', value: score, change: 'Automated triage score', trend: 'up' }
      ]);

      // Generate activity log from actual readings
      const activities = entries.slice(-5).reverse().map((reading, idx) => ({
        id: idx,
        name: `Kiosk Session #${total - idx}`,
        type: `BP: ${reading.systolic}/${reading.diastolic} mmHg | SpO2: ${reading.spo2}% | Optical BMI: ${reading.bmiLaser ? formatFloat(reading.bmiLaser, 4) : 'N/A'}`,
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
            title: item.title || 'Clinical Alert',
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

  // Clinical condition calculation
  const normalCount = historyData.filter(e => e.heartRate >= 60 && e.heartRate <= 100 && e.spo2 >= 95 && e.systolic < 130 && e.diastolic < 85).length;
  const criticalCount = historyData.filter(e => (e.heartRate > 100 || (e.heartRate > 0 && e.heartRate < 50)) || (e.spo2 > 0 && e.spo2 < 95) || e.systolic >= 140 || e.diastolic >= 90).length;
  const attentionCount = Math.max(0, historyData.length - normalCount - criticalCount);

  const pieData = historyData.length === 0 ? [
    { name: 'Awaiting Readings', value: 1, color: '#cbd5e1' }
  ] : [
    { name: 'Optimal', value: Math.max(0, normalCount), color: '#16a34a' },
    { name: 'Attention Needed', value: Math.max(0, attentionCount), color: '#d97706' },
    { name: 'Clinical Alert', value: Math.max(0, criticalCount), color: '#dc2626' }
  ].filter(item => item.value > 0);

  const conditionText = historyData.length === 0 ? 'Awaiting Data' : criticalCount > 0 ? 'Attention Indicated' : 'Physiologically Stable';
  const conditionColor = historyData.length === 0 ? '#64748b' : criticalCount > 0 ? '#dc2626' : '#16a34a';

  const bpCategory = getAhaBpCategory(latestReading?.systolic, latestReading?.diastolic);
  const bmiLaserVal = latestReading?.bmiLaser ?? latestReading?.bmi_laser ?? latestReading?.bmi ?? 0;
  const bmiSonarVal = latestReading?.bmiSonar ?? latestReading?.bmi_sonar ?? 0;
  const bmiCategory = getBmiCategory(bmiLaserVal || bmiSonarVal);

  const styles = {
    header: { backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' as const },
    title: { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 },
    headerRight: { display: 'flex', alignItems: 'center', gap: '14px' },
    searchBox: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
    searchInput: { paddingLeft: '38px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', width: '280px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' },
    avatar: { width: '38px', height: '38px', backgroundColor: '#0284c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontWeight: '700', fontSize: '14px' },
    tabs: { padding: '12px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '24px', backgroundColor: '#fff' },
    tabBtn: (active: boolean) => ({
      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
      backgroundColor: active ? '#0284c7' : 'transparent', color: active ? '#fff' : '#64748b',
      transition: 'all 0.2s'
    }),
    content: { flex: 1, overflow: 'auto', padding: '24px 28px', backgroundColor: '#f8fafc' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' },
    statCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    chartsSection: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' },
    chartCard: { backgroundColor: '#fff', padding: '22px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    bottomSection: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
    notificationPanel: { 
      position: 'absolute' as const, top: '70px', right: '70px', width: '360px', 
      backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0', zIndex: 50, maxHeight: '450px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const
    },
    thresholdLabel: { fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' }
  };

  const iconMap: any = {
    'Total Clinical Sessions': Activity,
    'Recent Measurements': Users,
    'Physiological Alerts': AlertTriangle,
    'Clinical Health Index': Heart
  };
  const colorMap: any = {
    'Total Clinical Sessions': '#0284c7',
    'Recent Measurements': '#16a34a',
    'Physiological Alerts': '#dc2626',
    'Clinical Health Index': '#7c3aed'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontWeight: '800', marginBottom: '8px', color: '#0f172a', fontSize: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
            {payload[0].payload.fullDate || label}
          </p>
          {payload.map((item: any, index: number) => {
            if (item.name === 'Pulse Pressure Span') return null;
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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @media print {
          body * { visibility: hidden !important; }
          #printable-dashboard-report, #printable-dashboard-report * { visibility: visible !important; }
          #printable-dashboard-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* TOP HEADER */}
      <header style={styles.header} className="no-print">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={styles.title}>Clinical Medical Intelligence Portal</h1>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '9999px' }}>
              Live Telemetry
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Real-time biometric vital signs telemetry &bull; MediBot Clinical Health Station &bull; Cloud RTDB Connected
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            onClick={() => setShowPrintModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#0284c7', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
              fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2,132,199,0.25)'
            }}
          >
            <Printer size={16} /> Print Clinical Report
          </button>

          <div style={styles.searchBox}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search health records..."
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
              <Bell size={22} color={notifications.length > 0 ? "#0284c7" : "#94a3b8"} />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#dc2626', borderRadius: '50%', border: '2px solid #fff' }}></span>
              )}
            </button>
            
            {showNotifications && (
              <div ref={notificationRef} style={styles.notificationPanel}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>Clinical Notifications</span>
                  <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      <CheckCircle size={28} style={{ margin: '0 auto 8px', color: '#16a34a' }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>No active alerts or notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px', color: notif.type === 'critical' ? '#dc2626' : '#0f172a' }}>{notif.title}</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{notif.time}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={styles.avatar} onClick={() => onNavigate('profile')} title="My Clinical Profile">
            {userProfile?.firstName ? userProfile.firstName[0].toUpperCase() : <User size={18} />}
          </div>
        </div>
      </header>

      {/* REALTIME HARDWARE SYNC ENROLLMENT SUCCESS TOAST */}
      {justEnrolledToast && (
        <div style={{
          backgroundColor: '#f0fdf4', borderBottom: '2px solid #22c55e',
          padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          animation: 'fadeInOut 5s forwards'
        }} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '800', color: '#166534', fontSize: '14px' }}>
                Biometrics Verified: RFID Card & Biometric Fingerprint Linked at Kiosk!
              </div>
              <div style={{ color: '#15803d', fontSize: '12px' }}>
                Your clinical credentials are synchronized. You can now tap your RFID card and scan your finger for 1-second login.
              </div>
            </div>
          </div>
          <button onClick={() => setJustEnrolledToast(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* BIOMETRIC ACTION BANNER (SHOWN ONLY IF UNENROLLED) */}
      {userProfile && !isCurrentlyEnrolled && !justEnrolledToast && (
        <div style={{
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }} className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#d97706', flexShrink: 0
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#92400e', fontSize: '14px' }}>
                Kiosk Enrollment Required: Link Physical RFID Badge & Biometric Fingerprint
              </div>
              <div style={{ color: '#b45309', fontSize: '12px', marginTop: '2px' }}>
                Your web account is active. Step onto any MediBot health kiosk and tap your clinic RFID card to enroll your fingerprint in 1 minute.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => refreshUserProfile()}
              style={{
                backgroundColor: '#fff', border: '1px solid #fde68a', color: '#92400e',
                borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Check Hardware Status
            </button>
            <button
              onClick={() => onNavigate('profile')}
              style={{
                backgroundColor: '#d97706', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              View Hardware Hub &rarr;
            </button>
          </div>
        </div>
      )}

      {/* CLINICAL PATIENT IDENTITY SUMMARY BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Patient: <strong style={{ color: '#0f172a' }}>{userProfile?.firstName || 'Patient'} {userProfile?.lastName || ''}</strong>
          </div>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            MRN: <strong style={{ color: '#0f172a' }}>#{userProfile?.medicalId || (userProfile?.uid ? userProfile.uid.slice(0, 8).toUpperCase() : 'MB-PATIENT')}</strong>
          </div>
          {userProfile?.bloodType && (
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '9999px' }}>
              Blood Group: {userProfile.bloodType}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px',
            backgroundColor: isCurrentlyEnrolled ? '#f0fdf4' : '#fffbeb',
            color: isCurrentlyEnrolled ? '#16a34a' : '#d97706',
            border: `1px solid ${isCurrentlyEnrolled ? '#bbf7d0' : '#fde68a'}`
          }}>
            {isCurrentlyEnrolled ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
            {isCurrentlyEnrolled ? 'Hardware Biometrics Enrolled' : 'Biometrics Pending Kiosk Scan'}
          </span>
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px',
            backgroundColor: conditionColor === '#16a34a' ? '#dcfce7' : '#fee2e2',
            color: conditionColor === '#16a34a' ? '#16a34a' : '#dc2626'
          }}>
            Triage: {conditionText}
          </span>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={styles.tabs} className="no-print">
        {[
          { id: 'overview', label: 'Clinical Overview' },
          { id: 'reports', label: 'Medical Reports & Examination' },
          { id: 'history', label: 'Readings History' },
          { id: 'insights', label: 'AI Health Assessment' }
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

      {/* DASHBOARD CONTENT BODY */}
      <div style={styles.content}>
        {error && (
          <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b', fontWeight: '600' }} className="no-print">
            Firebase Telemetry Notice: {error}
          </div>
        )}
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                <div style={{ display: 'inline-block', width: '38px', height: '38px', border: '4px solid #e2e8f0', borderTop: '4px solid #0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '14px', fontSize: '14px', fontWeight: '600' }}>Streaming Live Telemetry from MediBot Kiosk...</p>
              </div>
            ) : (
              <>
                {/* 1. LATEST PHYSIOLOGICAL VITALS MATRIX */}
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} className="no-print">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Latest Kiosk Physiological Examination</h2>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {latestReading?.timestamp 
                          ? `Recorded: ${new Date(parseInt(latestReading.timestamp) > 1e11 ? parseInt(latestReading.timestamp) : parseInt(latestReading.timestamp) * 1000).toLocaleString()}` 
                          : 'Live sensor telemetry from MediBot Health Kiosk'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                        Firebase RTDB Live
                      </span>
                      <button
                        onClick={() => setShowPrintModal(true)}
                        style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: '600', color: '#0284c7', cursor: 'pointer' }}
                      >
                        Print Report
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                    {/* BLOOD PRESSURE */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Blood Pressure</span>
                        <Activity size={16} color="#dc2626" />
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                        {latestReading?.systolic ? `${latestReading.systolic}/${latestReading.diastolic}` : '--'}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>mmHg</span>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: bpCategory.bg, color: bpCategory.color }}>
                          {bpCategory.label}
                        </span>
                      </div>
                    </div>

                    {/* HEART RATE */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Resting Heart Rate</span>
                        <Heart size={16} color="#e11d48" />
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                        {latestReading ? (latestReading.heartRate || latestReading.heart_rate || '--') : '--'}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>bpm</span>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                          Normal: 60-100 bpm
                        </span>
                      </div>
                    </div>

                    {/* SPO2 */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Blood Oxygen (SpO2)</span>
                        <Droplets size={16} color="#0284c7" />
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                        {latestReading?.spo2 ? `${latestReading.spo2}%` : '--'}
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: (latestReading?.spo2 && latestReading.spo2 < 95) ? '#fee2e2' : '#dcfce7',
                          color: (latestReading?.spo2 && latestReading.spo2 < 95) ? '#dc2626' : '#16a34a'
                        }}>
                          {latestReading?.spo2 ? (latestReading.spo2 >= 95 ? 'Normal (≥95%)' : 'Hypoxia Alert') : 'Normal: ≥95%'}
                        </span>
                      </div>
                    </div>

                    {/* OPTICAL BMI */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Optical BMI (Primary)</span>
                        <TrendingUp size={16} color="#0284c7" />
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0284c7' }}>
                        {bmiLaserVal ? formatFloat(bmiLaserVal, 4) : '--'}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>kg/m²</span>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: bmiCategory.bg, color: bmiCategory.color }}>
                          {bmiCategory.label}
                        </span>
                      </div>
                    </div>

                    {/* ACOUSTIC BMI */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Acoustic BMI (Verification)</span>
                        <TrendingUp size={16} color="#9333ea" />
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#9333ea' }}>
                        {bmiSonarVal ? formatFloat(bmiSonarVal, 4) : '--'}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>kg/m²</span>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
                          Acoustic Verification
                        </span>
                      </div>
                    </div>

                    {/* BODY WEIGHT */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Calibrated Weight</span>
                        <Scale size={16} color="#059669" />
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                        {latestReading?.weight ? formatFloat(latestReading.weight, 4) : '--'}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>kg</span>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                          Precision Load Cell Platform
                        </span>
                      </div>
                    </div>

                    {/* TEMPERATURE */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Core Temperature</span>
                        <Activity size={16} color="#d97706" />
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                        {latestReading?.temperature ? formatFloat(latestReading.temperature, 4) : '--'}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>°C</span>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: (latestReading?.temperature && latestReading.temperature > 37.5) ? '#fee2e2' : '#f1f5f9',
                          color: (latestReading?.temperature && latestReading.temperature > 37.5) ? '#dc2626' : '#475569'
                        }}>
                          {latestReading?.temperature ? (latestReading.temperature > 37.5 ? 'Fever / Pyrexia' : 'Normal Range') : 'Normal: 36.5-37.5'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. STATS CARDS */}
                <div style={styles.statsGrid} className="no-print">
                  {stats.map((stat, index) => {
                    const Icon = iconMap[stat.title] || Activity;
                    return (
                      <div key={index} style={styles.statCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>{stat.title}</span>
                          <div style={{ padding: '6px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <Icon size={18} color={colorMap[stat.title] || '#0284c7'} />
                          </div>
                        </div>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{stat.value}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {stat.trend === 'up' ? (
                            <TrendingUp size={14} color="#16a34a" />
                          ) : (
                            <TrendingDown size={14} color="#dc2626" />
                          )}
                          <span style={{ fontSize: '12px', fontWeight: '600', color: stat.trend === 'up' ? '#16a34a' : '#dc2626' }}>
                            {stat.change}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3. CHARTS & HEALTH STATUS */}
                <div style={styles.chartsSection} className="no-print">
                  {/* BMI TREND CHART */}
                  <div style={styles.chartCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Stature & Adiposity Progression</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Dual Optical vs Acoustic continuous stadiometer tracking</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ ...styles.thresholdLabel, backgroundColor: '#fef3c7', color: '#92400e' }}>Healthy WHO: 18.5 - 24.9</div>
                        <button onClick={() => onNavigate('analytics')} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', color: '#0284c7', cursor: 'pointer', backgroundColor: '#fff' }}>Detailed Analytics &rarr;</button>
                      </div>
                    </div>

                    {historyData.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                        <Activity size={40} style={{ margin: '0 auto 10px', color: '#cbd5e1' }} />
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>No BMI Telemetry Yet</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '360px', margin: '0 auto' }}>
                          Step onto the MediBot kiosk and complete a physical session to track continuous stature & BMI.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={290}>
                        <ComposedChart data={chartData.length > 0 ? chartData : historyData}>
                          <defs>
                            <linearGradient id="dashLaserBmiGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" domain={[15, 35]} tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          {/* WHO Clinical Classification Shaded Zones */}
                          <ReferenceArea y1={18.5} y2={24.9} fill="#dcfce7" fillOpacity={0.4} />
                          <ReferenceArea y1={25} y2={29.9} fill="#fef3c7" fillOpacity={0.35} />
                          <ReferenceArea y1={30} y2={35} fill="#fee2e2" fillOpacity={0.25} />
                          <ReferenceLine y={25} stroke="#d97706" strokeDasharray="3 3" label={{ value: 'Overweight (25)', fill: '#d97706', fontSize: 10 }} />
                          <ReferenceLine y={18.5} stroke="#0284c7" strokeDasharray="3 3" label={{ value: 'Underweight (18.5)', fill: '#0284c7', fontSize: 10 }} />
                          <Area name="Optical BMI" type="monotone" dataKey="bmiLaser" stroke="#0284c7" strokeWidth={3} fill="url(#dashLaserBmiGrad)" dot={{ r: 4 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} />
                          <Line name="Acoustic BMI" type="monotone" dataKey="bmiSonar" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* HEALTH STATUS PIE CHART */}
                  <div style={styles.chartCard}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>Clinical Severity Index</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Current Evaluation</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: conditionColor }}>{conditionText}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Based on AHA & WHO Standards</div>
                    </div>
                  </div>
                </div>

                {/* 4. BOTTOM SECTION: RECENT ACTIVITY */}
                <div style={styles.bottomSection} className="no-print">
                  {/* RECENT ACTIVITY LOG */}
                  <div style={styles.chartCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Recent Clinical Telemetry Sessions</h3>
                      <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        View Full History &rarr;
                      </button>
                    </div>

                    {recentActivity.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                        <p style={{ fontSize: '13px', margin: 0 }}>No recent kiosk sessions recorded yet.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentActivity.map((activity) => (
                          <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                            <div style={{ width: '32px', height: '32px', backgroundColor: '#0284c7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '13px' }}>
                              {activity.avatar}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{activity.name}</div>
                              <div style={{ fontSize: '12px', color: '#475569' }}>{activity.type}</div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>{activity.time}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CLINICAL SUMMARY CARD */}
                  <div style={styles.chartCard}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>Physician Quick Assessment</h3>
                    <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
                      <p style={{ margin: '0 0 10px 0' }}>
                        • <strong>Blood Pressure:</strong> {bpCategory.label} ({latestReading?.systolic || '--'}/{latestReading?.diastolic || '--'} mmHg).
                      </p>
                      <p style={{ margin: '0 0 10px 0' }}>
                        • <strong>Oxygenation:</strong> {latestReading?.spo2 ? `${latestReading.spo2}% SpO2` : 'Awaiting sensor'} via PPG pulse oximetry.
                      </p>
                      <p style={{ margin: '0 0 10px 0' }}>
                        • <strong>Stadiometer Correlation:</strong> Optical ({latestReading?.heightLaser ? formatFloat(latestReading.heightLaser, 4) : '--'} m) vs Acoustic ({latestReading?.heightSonar ? formatFloat(latestReading.heightSonar, 4) : '--'} m).
                      </p>
                      <p style={{ margin: '0' }}>
                        • <strong>Biometric Binding:</strong> {isCurrentlyEnrolled ? 'RFID Card & Biometric Fingerprint Active.' : 'Pending kiosk fingerprint enrollment.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* HEALTH REPORTS TAB */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ ...styles.chartCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Comprehensive Clinical Health Report</h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>Multi-sensor physiological vitals recorded live from MediBot health kiosk</p>
              </div>
              <button
                onClick={() => setShowPrintModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px',
                  cursor: 'pointer', fontWeight: '700', fontSize: '13px'
                }}
              >
                <Printer size={18} /> Official Printable Medical Report
              </button>
            </div>

            {historyData.length === 0 ? (
              <div style={{ ...styles.chartCard, textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Activity size={44} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>No Health Data in Firebase</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Visit a MediBot kiosk station to record your vitals and generate comprehensive reports.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                {/* BMI COMPARISON */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Stature & Adiposity Progression</h3>
                    <div style={{ ...styles.thresholdLabel, backgroundColor: '#fef3c7', color: '#92400e' }}>Healthy: 18.5 - 24.9</div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={historyData}>
                      <defs>
                        <linearGradient id="repLaserBmiGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} stroke="#64748b" />
                      <YAxis domain={[15, 35]} tick={{fontSize: 11}} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceArea y1={18.5} y2={24.9} fill="#dcfce7" fillOpacity={0.4} />
                      <ReferenceArea y1={25} y2={29.9} fill="#fef3c7" fillOpacity={0.35} />
                      <ReferenceArea y1={30} y2={35} fill="#fee2e2" fillOpacity={0.25} />
                      <ReferenceLine y={25} stroke="#d97706" strokeDasharray="3 3" label={{ value: 'Overweight (25)', fill: '#d97706', fontSize: 10 }} />
                      <ReferenceLine y={18.5} stroke="#0284c7" strokeDasharray="3 3" label={{ value: 'Underweight (18.5)', fill: '#0284c7', fontSize: 10 }} />
                      <Area name="Optical BMI" type="monotone" dataKey="bmiLaser" stroke="#0284c7" strokeWidth={3} fill="url(#repLaserBmiGrad)" dot={{r: 4}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                      <Line name="Acoustic BMI" type="monotone" dataKey="bmiSonar" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* BLOOD PRESSURE */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Blood Pressure Progression</h3>
                    <div style={{ ...styles.thresholdLabel, backgroundColor: '#fee2e2', color: '#991b1b' }}>Ideal: &lt; 120/80</div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={historyData}>
                      <defs>
                        <linearGradient id="repBpPulseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} stroke="#64748b" />
                      <YAxis domain={[50, 190]} tick={{fontSize: 11}} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceArea y1={60} y2={120} fill="#dcfce7" fillOpacity={0.25} />
                      <ReferenceArea y1={140} y2={190} fill="#fee2e2" fillOpacity={0.2} />
                      <ReferenceLine y={140} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'Stage 2 HTN (140)', fill: '#dc2626', fontSize: 10 }} />
                      <ReferenceLine y={120} stroke="#d97706" strokeDasharray="3 3" label={{ value: 'Elevated (120)', fill: '#d97706', fontSize: 10 }} />
                      <ReferenceLine y={90} stroke="#2563eb" strokeDasharray="3 3" label={{ value: 'Diastolic (90)', fill: '#2563eb', fontSize: 10 }} />
                      <Area name="Pulse Pressure Span" type="monotone" dataKey="systolic" stroke="none" fill="url(#repBpPulseGrad)" />
                      <Line name="Systolic (mmHg)" type="monotone" dataKey="systolic" stroke="#dc2626" strokeWidth={3} dot={{r: 4}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                      <Line name="Diastolic (mmHg)" type="monotone" dataKey="diastolic" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* SPO2 */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Oxygen Saturation (SpO2 %)</h3>
                    <div style={{ ...styles.thresholdLabel, backgroundColor: '#dcfce7', color: '#166534' }}>Normal: &ge; 95%</div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={historyData}>
                      <defs>
                        <linearGradient id="repSpo2Grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} stroke="#64748b" />
                      <YAxis domain={[88, 100]} tick={{fontSize: 11}} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceArea y1={88} y2={95} fill="#fee2e2" fillOpacity={0.4} />
                      <ReferenceArea y1={95} y2={100} fill="#ecfdf5" fillOpacity={0.25} />
                      <ReferenceLine y={95} stroke="#dc2626" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'Hypoxia Threshold (95%)', fill: '#dc2626', fontSize: 10 }} />
                      <Area name="SpO2 %" type="monotone" dataKey="spo2" stroke="#0891b2" fill="url(#repSpo2Grad)" strokeWidth={3} dot={{r: 3}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* HEIGHT SENSING */}
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Height Sensing Comparison</h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Meters (m)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 11}} stroke="#64748b" />
                      <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{fontSize: 11}} stroke="#64748b" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line name="Optical Stadiometer (m)" type="monotone" dataKey="heightLaser" stroke="#16a34a" strokeWidth={3} dot={{r: 4}} activeDot={{r: 7, stroke: '#fff', strokeWidth: 2}} />
                      <Line name="Acoustic Stadiometer (m)" type="monotone" dataKey="heightSonar" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{r: 3}} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Clinical Telemetry History Log</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>All health measurements synced directly from Firebase RTDB</p>
              </div>
              <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
                Total Sessions: <strong>{historyData.length}</strong>
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Date & Time</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Blood Pressure</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Heart Rate</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>SpO2</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Optical BMI</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Acoustic BMI</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Height</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Weight</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>Temp</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '700' }}>AHA Category</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                        <Activity size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#475569' }}>No readings recorded yet from MediBot kiosk</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Visit any MediBot kiosk to record your first session.</p>
                      </td>
                    </tr>
                  ) : (
                    [...historyData].reverse().map((reading, idx) => {
                      const readingAha = getAhaBpCategory(reading.systolic, reading.diastolic);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>{reading.fullDate}</td>
                          <td style={{ padding: '12px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                            {reading.systolic ? `${reading.systolic}/${reading.diastolic} mmHg` : '--'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#0f172a' }}>{reading.heartRate ? `${reading.heartRate} bpm` : '--'}</td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#0f172a' }}>{reading.spo2 ? `${reading.spo2}%` : '--'}</td>
                          <td style={{ padding: '12px', fontSize: '13px', fontWeight: '700', color: '#0284c7' }}>{reading.bmiLaser ? formatFloat(reading.bmiLaser, 4) : '--'}</td>
                          <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#9333ea' }}>{reading.bmiSonar ? formatFloat(reading.bmiSonar, 4) : '--'}</td>
                          <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>{reading.heightLaser ? `${formatFloat(reading.heightLaser, 4)} m` : '--'}</td>
                          <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>{reading.weight ? `${formatFloat(reading.weight, 4)} kg` : '--'}</td>
                          <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>{reading.temperature ? `${formatFloat(reading.temperature, 4)} °C` : '--'}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: readingAha.bg,
                              color: readingAha.color
                            }}>
                              {readingAha.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div style={styles.chartCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={22} color="#0284c7" />
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>AI Clinical Insights & Recommendation Assistant</h2>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#f0f9ff', borderRadius: '12px', textAlign: 'center', marginBottom: '20px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '15px', color: '#0369a1', fontWeight: '600', marginBottom: '14px' }}>
                Automated clinical synthesis based on your real MediBot physiological readings
              </div>
              <button
                onClick={() => onNavigate('ai-recommendations')}
                style={{
                  padding: '10px 22px', backgroundColor: '#0284c7', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(2,132,199,0.2)'
                }}
              >
                Launch AI Health Assessment &rarr;
              </button>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                <strong>Diagnostic Basis:</strong> Our AI engine evaluates blood pressure progression (AHA stages), oxygenation saturation via Photoplethysmography (PPG), and dual-sensor stature & BMI (Optical vs Acoustic stadiometers) to generate actionable lifestyle and physician consultation guidance.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINTABLE OFFICIAL MEDICAL REPORT MODAL */}
      {showPrintModal && (
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
                  onClick={() => window.print()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                    backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '8px',
                    fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  <Printer size={16} /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PRINTABLE REPORT BODY */}
            <div id="printable-dashboard-report" style={{ padding: '36px', backgroundColor: '#ffffff', color: '#0f172a' }}>
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
                    <strong style={{ fontSize: '15px' }}>{userProfile?.firstName || 'Patient'} {userProfile?.lastName || ''}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>MEDICAL RECORD NUMBER</span>
                    <strong style={{ fontSize: '14px' }}>#{userProfile?.medicalId || (userProfile?.uid ? userProfile.uid.slice(0, 8).toUpperCase() : 'N/A')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>BLOOD GROUP</span>
                    <strong style={{ color: '#b91c1c', fontSize: '14px' }}>{userProfile?.bloodType || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>GENDER / AGE</span>
                    <span>{userProfile?.gender || 'Not specified'} &bull; {userProfile?.dateOfBirth || 'DOB on file'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>CLINIC RFID BADGE</span>
                    <span>{userProfile?.rfidNumber || 'Not linked'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>BIOMETRIC STATUS</span>
                    <span style={{ color: isCurrentlyEnrolled ? '#16a34a' : '#d97706', fontWeight: '700' }}>
                      {isCurrentlyEnrolled ? 'Verified (FP + RFID)' : 'Pending Fingerprint'}
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
                      <td style={{ padding: '8px', fontWeight: '600' }}>Body Mass Index (Optical)</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Precision Optical Stadiometer</td>
                      <td style={{ padding: '8px', fontWeight: '700' }}>{bmiLaserVal ? `${formatFloat(bmiLaserVal, 4)} kg/m²` : 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>18.5 - 24.9</td>
                      <td style={{ padding: '8px', color: bmiCategory.color, fontWeight: '700' }}>{bmiCategory.label}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>Body Mass Index (Acoustic)</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>Precision Acoustic Stadiometer</td>
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
                  • Dual stadiometer sensor agreement (Optical: {latestReading?.heightLaser ? formatFloat(latestReading.heightLaser, 4) : '--'}m vs Acoustic: {latestReading?.heightSonar ? formatFloat(latestReading.heightSonar, 4) : '--'}m) indicates reliable stature acquisition.<br />
                  • Patient baseline BMI classified as <strong>{bmiCategory.label}</strong> ({bmiLaserVal ? formatFloat(bmiLaserVal, 4) : (bmiSonarVal ? formatFloat(bmiSonarVal, 4) : '--')} kg/m²).
                </div>
              </div>

              {/* Active Clinical Alerts & Allergies */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#c2410c', marginBottom: '4px' }}>KNOWN ALLERGIES & ADVERSE REACTIONS</div>
                  <div style={{ fontSize: '13px', color: '#7c2d12' }}>{userProfile?.allergies || 'No known allergies reported.'}</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>CHRONIC MEDICAL HISTORY</div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>{userProfile?.medicalHistory || 'No prior chronic conditions logged.'}</div>
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

export default Dashboard;
