import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Download, Filter } from 'lucide-react';
import { adminAPI } from '../services/api';

interface AdminActivityLogsPageProps {
  onBack: () => void;
}

interface ActivityLog {
  id: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
  action: string;
  details: any;
  timestamp: number;
}

const AdminActivityLogsPage: React.FC<AdminActivityLogsPageProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogsList();
  }, [logs, filterAction]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getActivityLogs(100);
      setLogs(response.data.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogsList = () => {
    if (filterAction === 'all') {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(log => log.action === filterAction));
    }
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      'RFID_ASSIGNED': 'RFID Assigned',
      'ADMIN_ADDED': 'Admin Added',
      'ADMIN_REMOVED': 'Admin Removed',
      'PATIENT_VIEWED': 'Patient Viewed',
      'DATA_EXPORTED': 'Data Exported'
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: { [key: string]: string } = {
      'RFID_ASSIGNED': '#2563eb',
      'ADMIN_ADDED': '#16a34a',
      'ADMIN_REMOVED': '#dc2626',
      'PATIENT_VIEWED': '#6b7280',
      'DATA_EXPORTED': '#f59e0b'
    };
    return colors[action] || '#6b7280';
  };

  const formatDetails = (action: string, details: any) => {
    switch (action) {
      case 'RFID_ASSIGNED':
        return `Assigned RFID ${details.rfidNumber} to ${details.patientName}${details.oldRfid !== 'None' ? ` (replaced ${details.oldRfid})` : ''}`;
      case 'ADMIN_ADDED':
        return `Added ${details.newAdminName} (${details.newAdminEmail}) as admin`;
      case 'ADMIN_REMOVED':
        return `Removed admin privileges from ${details.removedAdminName} (${details.removedAdminEmail})`;
      default:
        return JSON.stringify(details);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Admin', 'Action', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      `${log.adminName} (${log.adminEmail})`,
      getActionLabel(log.action),
      formatDetails(log.action, log.details)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    button: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' },
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' },
    filterBtn: (active: boolean) => ({
      padding: '8px 16px',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: active ? '#2563eb' : '#fff',
      color: active ? '#fff' : '#374151'
    }),
    logItem: { padding: '16px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '16px' },
    logIcon: (color: string) => ({
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      backgroundColor: `${color}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }),
    logContent: { flex: 1 },
    logHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' },
    logAction: { fontSize: '16px', fontWeight: '600', color: '#111827' },
    logTime: { fontSize: '13px', color: '#6b7280' },
    logAdmin: { fontSize: '14px', color: '#6b7280', marginBottom: '4px' },
    logDetails: { fontSize: '14px', color: '#111827', backgroundColor: '#f9fafb', padding: '8px 12px', borderRadius: '6px' },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>
            <Activity size={28} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
            Admin Activity Logs
          </h1>
        </div>
        <button onClick={handleExportCSV} style={styles.button}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <Filter size={18} color="#6b7280" />
          <button
            onClick={() => setFilterAction('all')}
            style={styles.filterBtn(filterAction === 'all')}
          >
            All Actions
          </button>
          {uniqueActions.map(action => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              style={styles.filterBtn(filterAction === action)}
            >
              {getActionLabel(action)}
            </button>
          ))}
        </div>

        {/* Logs List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading activity logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No activity logs found
          </div>
        ) : (
          <div>
            {filteredLogs.map((log) => {
              const actionColor = getActionColor(log.action);
              return (
                <div key={log.id} style={styles.logItem}>
                  <div style={styles.logIcon(actionColor)}>
                    <Activity size={20} color={actionColor} />
                  </div>
                  <div style={styles.logContent}>
                    <div style={styles.logHeader}>
                      <div>
                        <div style={styles.logAction}>{getActionLabel(log.action)}</div>
                        <div style={styles.logAdmin}>
                          by {log.adminName} ({log.adminEmail})
                        </div>
                      </div>
                      <div style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div style={styles.logDetails}>
                      {formatDetails(log.action, log.details)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </div>
    </div>
  );
};

export default AdminActivityLogsPage;
