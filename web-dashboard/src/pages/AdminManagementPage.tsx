import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Trash2, Shield } from 'lucide-react';
import { adminAPI } from '../services/api';

interface AdminManagementPageProps {
  onBack: () => void;
}

interface Admin {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: number;
}

const AdminManagementPage: React.FC<AdminManagementPageProps> = ({ onBack }) => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getAdmins();
      setAdmins(response.data.admins || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!emailInput.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const response = await adminAPI.makeAdmin('', emailInput);
      setSuccess(response.data.message || 'Admin added successfully');
      setEmailInput('');
      setShowAddModal(false);
      await fetchAdmins();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAdmin = async (uid: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove admin privileges from ${name}?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await adminAPI.removeAdmin(uid);
      setSuccess(response.data.message || 'Admin removed successfully');
      await fetchAdmins();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove admin');
    }
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    button: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' },
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' },
    success: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '14px' },
    adminItem: { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    adminInfo: { flex: 1 },
    adminName: { fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' },
    adminEmail: { fontSize: '14px', color: '#6b7280' },
    deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '8px' },
    modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%' },
    modalTitle: { fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
    input: { width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
    modalButtons: { display: 'flex', gap: '12px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>
            <Shield size={28} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
            Admin Management
          </h1>
        </div>
        <button onClick={() => setShowAddModal(true)} style={styles.button}>
          <UserPlus size={16} />
          Add Admin
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.card}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
          Current Admins ({admins.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading admins...
          </div>
        ) : admins.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No admins found</p>
        ) : (
          admins.map((admin) => (
            <div key={admin.uid} style={styles.adminItem}>
              <div style={styles.adminInfo}>
                <div style={styles.adminName}>
                  {admin.firstName} {admin.lastName}
                </div>
                <div style={styles.adminEmail}>{admin.email}</div>
              </div>
              <button
                style={styles.deleteBtn}
                onClick={() => handleRemoveAdmin(admin.uid, `${admin.firstName} ${admin.lastName}`)}
                title="Remove admin privileges"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div style={styles.modal} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Add New Admin</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Enter the email address of the user you want to make an admin. The user must already have an account.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="user@example.com"
              style={styles.input}
            />
            <div style={styles.modalButtons}>
              <button
                onClick={handleAddAdmin}
                disabled={actionLoading}
                style={{ ...styles.button, flex: 1, opacity: actionLoading ? 0.6 : 1 }}
              >
                {actionLoading ? 'Adding...' : 'Add Admin'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEmailInput('');
                  setError(null);
                }}
                style={{ ...styles.button, backgroundColor: '#6b7280', flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementPage;
