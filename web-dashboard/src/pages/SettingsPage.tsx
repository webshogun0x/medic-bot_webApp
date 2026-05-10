import React, { useState, useContext } from 'react';
import { ArrowLeft, Bell, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { usersAPI } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [settings, setSettings] = useState<{ [key: string]: boolean }>({
    notifications: true,
    emailAlerts: true,
    dataSharing: false,
    reminders: true
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSettingChange = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePasswordChange = async () => {
    setError(null);
    setSuccess(null);

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await usersAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await usersAPI.deleteAccount();
      await logout();
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete account');
      setLoading(false);
    }
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#2563eb' },
    title: { fontSize: '28px', fontWeight: 'bold', color: '#111827' },
    card: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px' },
    sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
    settingItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb' },
    settingLabel: { flex: 1 },
    settingTitle: { fontSize: '16px', fontWeight: '500', color: '#111827', marginBottom: '4px' },
    settingDesc: { fontSize: '14px', color: '#6b7280' },
    toggle: { width: '50px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer', position: 'relative' as const, backgroundColor: '#e5e7eb' },
    toggleActive: { backgroundColor: '#2563eb' },
    toggleButton: { position: 'absolute' as const, top: '2px', left: '2px', width: '24px', height: '24px', borderRadius: '12px', backgroundColor: '#fff', border: 'none', cursor: 'pointer', transition: 'left 0.3s' },
    toggleButtonActive: { left: '24px' },
    button: { padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500', backgroundColor: '#dc2626', color: '#fff' },
    modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%' },
    modalTitle: { fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' },
    inputWrapper: { position: 'relative' as const },
    input: { width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    eyeButton: { position: 'absolute' as const, right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
    modalButtons: { display: 'flex', gap: '12px', marginTop: '24px' },
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' },
    success: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '14px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.headerBtn}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={styles.title}>Settings</h1>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          <Bell size={20} style={{ marginRight: '8px', display: 'inline' }} />
          Notifications
        </h2>
        <div style={styles.settingItem}>
          <div style={styles.settingLabel}>
            <div style={styles.settingTitle}>Push Notifications</div>
            <div style={styles.settingDesc}>Receive alerts for important health events</div>
          </div>
          <button
            onClick={() => handleSettingChange('notifications')}
            style={{
              ...styles.toggle,
              ...(settings.notifications ? styles.toggleActive : {})
            } as any}
          >
            <div
              style={{
                ...styles.toggleButton,
                ...(settings.notifications ? styles.toggleButtonActive : {})
              } as any}
            />
          </button>
        </div>

        <div style={styles.settingItem}>
          <div style={styles.settingLabel}>
            <div style={styles.settingTitle}>Email Alerts</div>
            <div style={styles.settingDesc}>Get email notifications for critical readings</div>
          </div>
          <button
            onClick={() => handleSettingChange('emailAlerts')}
            style={{
              ...styles.toggle,
              ...(settings.emailAlerts ? styles.toggleActive : {})
            } as any}
          >
            <div
              style={{
                ...styles.toggleButton,
                ...(settings.emailAlerts ? styles.toggleButtonActive : {})
              } as any}
            />
          </button>
        </div>

        <div style={styles.settingItem}>
          <div style={styles.settingLabel}>
            <div style={styles.settingTitle}>Medication Reminders</div>
            <div style={styles.settingDesc}>Get reminders when it's time to take your medications</div>
          </div>
          <button
            onClick={() => handleSettingChange('reminders')}
            style={{
              ...styles.toggle,
              ...(settings.reminders ? styles.toggleActive : {})
            } as any}
          >
            <div
              style={{
                ...styles.toggleButton,
                ...(settings.reminders ? styles.toggleButtonActive : {})
              } as any}
            />
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          <Shield size={20} style={{ marginRight: '8px', display: 'inline' }} />
          Privacy & Security
        </h2>
        <div style={styles.settingItem}>
          <div style={styles.settingLabel}>
            <div style={styles.settingTitle}>Data Sharing</div>
            <div style={styles.settingDesc}>Allow sharing health data with healthcare providers</div>
          </div>
          <button
            onClick={() => handleSettingChange('dataSharing')}
            style={{
              ...styles.toggle,
              ...(settings.dataSharing ? styles.toggleActive : {})
            } as any}
          >
            <div
              style={{
                ...styles.toggleButton,
                ...(settings.dataSharing ? styles.toggleButtonActive : {})
              } as any}
            />
          </button>
        </div>

        <div style={{ padding: '16px 0' }}>
          <button 
            onClick={() => setShowPasswordModal(true)}
            style={{ ...styles.button, backgroundColor: '#2563eb' as any, width: '100%' }}
          >
            <Lock size={16} style={{ marginRight: '8px', display: 'inline' }} />
            Change Password
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>About</h2>
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: '#6b7280' }}>App Version: </span>
            <span style={{ fontWeight: '600', color: '#111827' }}>1.0.0</span>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: '#6b7280' }}>Last Updated: </span>
            <span style={{ fontWeight: '600', color: '#111827' }}>January 21, 2026</span>
          </div>
          <button 
            onClick={() => setShowDeleteModal(true)}
            style={{ ...styles.button, width: '100%' }}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={styles.modal} onClick={() => setShowPasswordModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Change Password</h2>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Current Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  style={styles.eyeButton}
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  style={styles.eyeButton}
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  style={styles.eyeButton}
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={styles.modalButtons}>
              <button
                onClick={handlePasswordChange}
                disabled={loading}
                style={{ ...styles.button, backgroundColor: '#2563eb', flex: 1, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
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

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div style={styles.modal} onClick={() => setShowDeleteModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Delete Account</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Are you sure you want to delete your account? This action cannot be undone. All your health data, medications, and settings will be permanently deleted.
            </p>
            <div style={styles.modalButtons}>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                style={{ ...styles.button, flex: 1, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
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

export default SettingsPage;
