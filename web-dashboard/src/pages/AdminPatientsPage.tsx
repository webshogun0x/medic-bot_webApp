import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, UserCheck, UserX, Eye, Download } from 'lucide-react';
import { adminAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Patient {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  rfidNumber: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  createdAt: number;
}

interface AdminPatientsPageProps {
  onBack: () => void;
}

const AdminPatientsPage: React.FC<AdminPatientsPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRFID, setFilterRFID] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [stats, setStats] = useState({ total: 0, withRFID: 0, withoutRFID: 0 });

  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, []);

  useEffect(() => {
    filterPatientsList();
  }, [patients, searchQuery, filterRFID]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getPatients();
      setPatients(response.data.patients || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats({
        total: response.data.totalPatients,
        withRFID: response.data.patientsWithRFID,
        withoutRFID: response.data.patientsWithoutRFID
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const filterPatientsList = () => {
    let filtered = [...patients];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        (p.rfidNumber && p.rfidNumber.toLowerCase().includes(query))
      );
    }

    // RFID filter
    if (filterRFID === 'assigned') {
      filtered = filtered.filter(p => p.rfidNumber && p.rfidNumber !== 'Not assigned');
    } else if (filterRFID === 'unassigned') {
      filtered = filtered.filter(p => !p.rfidNumber || p.rfidNumber === 'Not assigned');
    }

    setFilteredPatients(filtered);
  };

  const handleViewPatient = (uid: string) => {
    navigate(`/dashboard/admin-patient-detail/${uid}`);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'RFID', 'Date of Birth', 'Gender', 'Phone', 'Registered'];
    const rows = filteredPatients.map(p => [
      `${p.firstName} ${p.lastName}`,
      p.email,
      p.rfidNumber || 'Not assigned',
      p.dateOfBirth || 'N/A',
      p.gender || 'N/A',
      p.phone || 'N/A',
      new Date(p.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' },
    statValue: { fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' },
    statLabel: { fontSize: '14px', color: '#6b7280' },
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' as const },
    searchBox: { flex: 1, minWidth: '250px', position: 'relative' as const },
    searchInput: { width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    searchIcon: { position: 'absolute' as const, left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
    filterBtn: (active: boolean) => ({
      padding: '10px 16px',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: active ? '#2563eb' : '#fff',
      color: active ? '#fff' : '#374151'
    }),
    button: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '12px', textAlign: 'left' as const, borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600', color: '#4b5563' },
    td: { padding: '12px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#111827' },
    badge: (hasRFID: boolean) => ({
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: hasRFID ? '#dcfce7' : '#fee2e2',
      color: hasRFID ? '#16a34a' : '#dc2626'
    }),
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px 8px', fontSize: '14px', fontWeight: '500' },
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
            <Users size={28} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
            Patient Management
          </h1>
        </div>
        <button onClick={handleExportCSV} style={styles.button}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Statistics */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Patients</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.withRFID}</div>
          <div style={styles.statLabel}>With RFID Card</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.withoutRFID}</div>
          <div style={styles.statLabel}>Without RFID Card</div>
        </div>
      </div>

      {/* Patient List */}
      <div style={styles.card}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name, email, or RFID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <button
            onClick={() => setFilterRFID('all')}
            style={styles.filterBtn(filterRFID === 'all')}
          >
            All Patients
          </button>
          <button
            onClick={() => setFilterRFID('assigned')}
            style={styles.filterBtn(filterRFID === 'assigned')}
          >
            <UserCheck size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            With RFID
          </button>
          <button
            onClick={() => setFilterRFID('unassigned')}
            style={styles.filterBtn(filterRFID === 'unassigned')}
          >
            <UserX size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            Without RFID
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading patients...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No patients found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>RFID Status</th>
                  <th style={styles.th}>RFID Number</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Registered</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const hasRFID = !!(patient.rfidNumber && patient.rfidNumber !== 'Not assigned');
                  return (
                    <tr key={patient.uid}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600' }}>
                          {patient.firstName} {patient.lastName}
                        </div>
                      </td>
                      <td style={styles.td}>{patient.email}</td>
                      <td style={styles.td}>
                        <span style={styles.badge(hasRFID)}>
                          {hasRFID ? 'Assigned' : 'Not Assigned'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {hasRFID ? patient.rfidNumber : '-'}
                      </td>
                      <td style={styles.td}>{patient.phone || '-'}</td>
                      <td style={styles.td}>
                        {new Date(patient.createdAt).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleViewPatient(patient.uid)}
                          style={styles.actionBtn}
                        >
                          <Eye size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
          Showing {filteredPatients.length} of {patients.length} patients
        </div>
      </div>
    </div>
  );
};

export default AdminPatientsPage;
