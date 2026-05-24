import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Thermometer, Droplets, TrendingUp, TrendingDown,
  Users, AlertTriangle, Search, Bell, User, Activity, X, CheckCircle, Info,
  Scale, Ruler, Download
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend, ReferenceLine 
} from 'recharts';
import { dashboardAPI, readingsAPI } from './services/api';
import { 
  mockHealthReading, mockChartData, mockPieData, mockRecentActivity, mockStats 
} from './utils/mockData';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
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

  useEffect(() => {
    fetchDashboardData();
    // In a real app, we'd use a WebSocket or Firebase listener here
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationRef]);

  const fetchNotifications = async () => {
    try {
      // Assuming endpoint exists or we fetch from USERS/uid/notifications
      // For now we'll use a mocked list if backend isn't ready
      const dummyNotifications = [
        { id: 1, title: 'Critical Alert', message: 'Systolic BP high: 145 mmHg', time: '5m ago', type: 'critical' },
        { id: 2, title: 'Health Update', message: 'SPO2 levels recovered to 98%', time: '1h ago', type: 'info' },
        { id: 3, title: 'Goal Reached', message: 'Weight target for June achieved!', time: '2h ago', type: 'success' },
      ];
      setNotifications(dummyNotifications);
    } catch (err) {
      console.error('Error fetching notifications');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      fetchNotifications();

      const dashboardResp = await dashboardAPI.getDashboardData();
      if (dashboardResp?.data) {
        const { latest, stats: statsData, activity } = dashboardResp.data;
        
        if (latest) {
          setLatestReading(latest);
        } else {
          setLatestReading(mockHealthReading);
        }

        if (statsData) {
          setStats([
            { title: 'Total Readings', value: statsData.totalReadings.toString(), change: '+12.5%', trend: 'up' },
            { title: 'New This Week', value: statsData.newThisWeek.toString(), change: '+8.2%', trend: 'up' },
            { title: 'Critical Alerts', value: statsData.criticalAlerts.toString(), change: '+5%', trend: 'up' },
            { title: 'Health Score', value: statsData.healthScore.toString(), change: '+3%', trend: 'up' }
          ]);
        } else {
          setStats(mockStats);
        }

        if (activity && activity.length > 0) {
          setRecentActivity(
            activity.slice(0, 4).map((act: any, idx: number) => ({
              id: idx,
              name: act.title || 'Activity',
              type: act.description || 'Event',
              time: new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              avatar: (act.type || 'A')[0].toUpperCase()
            }))
          );
        } else {
          setRecentActivity(mockRecentActivity);
        }
      }

      const chartResp = await dashboardAPI.getChartData();
      if (chartResp?.data && Array.isArray(chartResp.data) && chartResp.data.length > 0) {
        setChartData(chartResp.data);
      } else {
        setChartData(mockChartData);
      }

      // Fetch full history for reports tab
      const historyResp = await readingsAPI.getHistory(30);
      if (historyResp.data && Array.isArray(historyResp.data)) {
        const processed = historyResp.data.map((reading: any) => {
          const date = new Date(parseInt(reading.timestamp));
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Unable to load dashboard data');
      setLatestReading(mockHealthReading);
      setChartData(mockChartData);
      setStats(mockStats);
      setRecentActivity(mockRecentActivity);
    } finally {
      setLoading(false);
    }
  };

  const pieData = mockPieData;

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
        <h1 style={styles.title}>Dashboard</h1>
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
                      <p>All caught up!</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#f9fafb'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#fff'}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ marginTop: '2px' }}>
                            {n.type === 'critical' ? <AlertTriangle size={18} color="#dc2626" /> : <Info size={18} color="#2563eb" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{n.title}</div>
                            <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>{n.message}</div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                  <button style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>View All Notifications</button>
                </div>
              </div>
            )}
          </div>
          <div style={styles.avatar} onClick={() => onNavigate('profile')}>
            <User size={24} color="#fff" />
          </div>
        </div>
      </header>

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
              <div style={{ color: '#991b1b', fontWeight: '600', marginBottom: '4px' }}>Unable to load dashboard data</div>
              <div style={{ color: '#991b1b', fontSize: '13px' }}>{error}</div>
              <button
                onClick={fetchDashboardData}
                style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <p style={{ marginTop: '16px' }}>Loading dashboard data...</p>
                </div>
              ) : stats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px dashed #d1d5db' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>No Health Data Yet</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Visit a MediBot station to record your first health reading</p>
                  <button
                    onClick={fetchDashboardData}
                    style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Refresh Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.statsGrid}>
                {stats.map((stat, index) => {
                  const Icon = iconMap[stat.title];
                  return (
                    <div key={index} style={styles.statCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#4b5563' }}>{stat.title}</span>
                        <div style={{ padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                          <Icon size={20} color={colorMap[stat.title]} />
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
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Since last week</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.chartsSection}>
                <div style={styles.chartCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Health Trends</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => onNavigate('analytics')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#2563eb', cursor: 'pointer' }}>Detailed Analytics</button>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} dot={{ fill: '#4F46E5' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

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
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>Healthy</div>
                  </div>
                </div>
              </div>

              <div style={styles.bottomSection}>
                <div style={styles.chartCard}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>Latest Health Reading</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Droplets size={16} color="#2563eb" />
                        <span style={{ fontSize: '14px', color: '#4b5563' }}>SpO2</span>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{latestReading.spo2}%</div>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Heart size={16} color="#dc2626" />
                        <span style={{ fontSize: '14px', color: '#4b5563' }}>Heart Rate</span>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{latestReading.heartRate} bpm</div>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Activity size={16} color="#16a34a" />
                        <span style={{ fontSize: '14px', color: '#4b5563' }}>BP (Sys/Dia)</span>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{latestReading.systolic}/{latestReading.diastolic}</div>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <TrendingUp size={16} color="#9333ea" />
                        <span style={{ fontSize: '14px', color: '#4b5563' }}>BMI (Laser)</span>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{latestReading.bmiLaser || latestReading.bmi || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div style={styles.chartCard}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>Recent Activity</h3>
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
                  <p style={{ color: '#6b7280' }}>Detailed overview of all medical sensing modules</p>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' }}>
                  <Download size={20} /> Generate PDF Report
                </button>
              </div>

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
            </div>
          )}

          {/* READINGS HISTORY TAB */}
          {activeTab === 'history' && (
            <div style={styles.chartCard}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '24px' }}>Readings History</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '14px', fontWeight: '600' }}>Date & Time</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '14px', fontWeight: '600' }}>Heart Rate</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '14px', fontWeight: '600' }}>SpO2</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '14px', fontWeight: '600' }}>Blood Pressure</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '14px', fontWeight: '600' }}>Temperature</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#4b5563', fontSize: '14px', fontWeight: '600' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: '2024-01-21 14:32', hr: '72', spo2: '98', bp: '120/80', temp: '36.5', status: 'Normal' },
                      { date: '2024-01-21 12:15', hr: '78', spo2: '97', bp: '125/82', temp: '36.6', status: 'Normal' },
                      { date: '2024-01-21 09:45', hr: '75', spo2: '99', bp: '118/78', temp: '36.4', status: 'Normal' },
                      { date: '2024-01-20 18:22', hr: '85', spo2: '96', bp: '130/85', temp: '36.8', status: 'Alert' },
                      { date: '2024-01-20 15:10', hr: '88', spo2: '95', bp: '135/88', temp: '37.0', status: 'Alert' },
                    ].map((reading, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{reading.date}</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{reading.hr} bpm</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{reading.spo2}%</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{reading.bp} mmHg</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{reading.temp}°C</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: reading.status === 'Normal' ? '#dcfce7' : '#fee2e2',
                            color: reading.status === 'Normal' ? '#16a34a' : '#dc2626'
                          }}>
                            {reading.status}
                          </span>
                        </td>
                      </tr>
                    ))}
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
                  💡 Click the button below to get personalized AI insights for your health
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
                  🤖 Open AI Recommendations
                </button>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '14px', color: '#4b5563' }}>
                  <strong>How it works:</strong> Click the button above to chat with our AI health assistant. Ask questions about your health metrics, get personalized recommendations, and receive insights based on your readings.
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default Dashboard;
