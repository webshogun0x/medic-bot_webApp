import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { adminAPI } from '../services/api';

interface BulkRFIDPageProps {
  onBack: () => void;
}

interface Assignment {
  email: string;
  rfidNumber: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  uid?: string;
}

const BulkRFIDPage: React.FC<BulkRFIDPageProps> = ({ onBack }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [csvText, setCsvText] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed: Assignment[] = [];

    // Skip header if exists
    const startIndex = lines[0].toLowerCase().includes('email') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const [email, rfidNumber] = lines[i].split(',').map(s => s.trim());
      if (email && rfidNumber) {
        parsed.push({
          email,
          rfidNumber,
          status: 'pending'
        });
      }
    }

    setAssignments(parsed);
  };

  const handleManualAdd = () => {
    setAssignments([...assignments, { email: '', rfidNumber: '', status: 'pending' }]);
  };

  const handleUpdateAssignment = (index: number, field: 'email' | 'rfidNumber', value: string) => {
    const updated = [...assignments];
    updated[index][field] = value;
    setAssignments(updated);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleProcessAssignments = async () => {
    setProcessing(true);
    setProgress(0);

    const updated = [...assignments];

    for (let i = 0; i < updated.length; i++) {
      const assignment = updated[i];

      try {
        // First, search for user by email
        const searchResponse = await adminAPI.searchPatients(assignment.email);
        const patients = searchResponse.data.patients;

        if (patients.length === 0) {
          updated[i].status = 'error';
          updated[i].message = 'Patient not found';
        } else {
          const patient = patients[0];
          updated[i].uid = patient.uid;

          // Assign RFID
          const response = await adminAPI.assignRFID(patient.uid, assignment.rfidNumber);
          updated[i].status = 'success';
          updated[i].message = response.data.message || 'RFID assigned successfully';
        }
      } catch (err: any) {
        updated[i].status = 'error';
        updated[i].message = err.response?.data?.error || 'Failed to assign RFID';
      }

      setAssignments([...updated]);
      setProgress(((i + 1) / updated.length) * 100);
    }

    setProcessing(false);
  };

  const downloadTemplate = () => {
    const template = 'email,rfidNumber\npatient1@example.com,ABC12345\npatient2@example.com,DEF67890';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rfid_assignment_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadResults = () => {
    const headers = 'email,rfidNumber,status,message\n';
    const rows = assignments.map(a => 
      `${a.email},${a.rfidNumber},${a.status},${a.message || ''}`
    ).join('\n');
    
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rfid_assignment_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: assignments.length,
    success: assignments.filter(a => a.status === 'success').length,
    error: assignments.filter(a => a.status === 'error').length,
    pending: assignments.filter(a => a.status === 'pending').length
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' },
    uploadArea: { border: '2px dashed #d1d5db', borderRadius: '8px', padding: '40px', textAlign: 'center' as const, cursor: 'pointer', transition: 'all 0.2s' },
    button: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#2563eb', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' as const },
    statValue: { fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' },
    statLabel: { fontSize: '13px', color: '#6b7280' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '12px', textAlign: 'left' as const, borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600', color: '#4b5563' },
    td: { padding: '12px', borderBottom: '1px solid #f3f4f6', fontSize: '14px' },
    input: { width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' },
    statusIcon: (status: string) => {
      const colors = {
        success: '#16a34a',
        error: '#dc2626',
        pending: '#6b7280'
      };
      return { color: colors[status as keyof typeof colors] || colors.pending };
    },
    progressBar: { width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' },
    progressFill: { height: '100%', backgroundColor: '#2563eb', transition: 'width 0.3s' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>Bulk RFID Assignment</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={downloadTemplate} style={{ ...styles.button, backgroundColor: '#6b7280' }}>
            <Download size={16} />
            Download Template
          </button>
          {assignments.length > 0 && (
            <button onClick={downloadResults} style={{ ...styles.button, backgroundColor: '#16a34a' }}>
              <Download size={16} />
              Export Results
            </button>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div style={styles.card}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Upload CSV File
        </h2>
        <div
          style={styles.uploadArea}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <Upload size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', color: '#111827', marginBottom: '8px' }}>
            Click to upload or drag and drop
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            CSV file with email and RFID number columns
          </p>
          <input
            id="fileInput"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button onClick={handleManualAdd} style={{ ...styles.button, backgroundColor: '#6b7280' }}>
            Add Manual Entry
          </button>
        </div>
      </div>

      {/* Statistics */}
      {assignments.length > 0 && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#111827' }}>{stats.total}</div>
            <div style={styles.statLabel}>Total</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#16a34a' }}>{stats.success}</div>
            <div style={styles.statLabel}>Success</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#dc2626' }}>{stats.error}</div>
            <div style={styles.statLabel}>Failed</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#6b7280' }}>{stats.pending}</div>
            <div style={styles.statLabel}>Pending</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {processing && (
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      )}

      {/* Assignments Table */}
      {assignments.length > 0 && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Assignments ({assignments.length})
            </h2>
            <button
              onClick={handleProcessAssignments}
              disabled={processing || stats.pending === 0}
              style={{
                ...styles.button,
                opacity: processing || stats.pending === 0 ? 0.6 : 1,
                cursor: processing || stats.pending === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {processing ? 'Processing...' : 'Process All'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>RFID Number</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Message</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment, index) => (
                  <tr key={index}>
                    <td style={styles.td}>
                      <input
                        type="email"
                        value={assignment.email}
                        onChange={(e) => handleUpdateAssignment(index, 'email', e.target.value)}
                        disabled={assignment.status !== 'pending'}
                        style={styles.input}
                        placeholder="patient@example.com"
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="text"
                        value={assignment.rfidNumber}
                        onChange={(e) => handleUpdateAssignment(index, 'rfidNumber', e.target.value)}
                        disabled={assignment.status !== 'pending'}
                        style={styles.input}
                        placeholder="ABC12345"
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {assignment.status === 'success' && <CheckCircle size={18} style={styles.statusIcon('success')} />}
                        {assignment.status === 'error' && <XCircle size={18} style={styles.statusIcon('error')} />}
                        {assignment.status === 'pending' && <AlertCircle size={18} style={styles.statusIcon('pending')} />}
                        <span style={{ textTransform: 'capitalize' }}>{assignment.status}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {assignment.message || '-'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {assignment.status === 'pending' && (
                        <button
                          onClick={() => handleRemoveAssignment(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={styles.card}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
          Instructions
        </h3>
        <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Download the CSV template to see the required format</li>
          <li>Fill in the email addresses and RFID numbers</li>
          <li>Upload the CSV file or add entries manually</li>
          <li>Review the assignments and click "Process All" to assign RFIDs</li>
          <li>Export the results to see which assignments succeeded or failed</li>
          <li>RFID numbers must be 8-16 alphanumeric characters</li>
          <li>Patients must already have accounts in the system</li>
        </ul>
      </div>
    </div>
  );
};

export default BulkRFIDPage;
