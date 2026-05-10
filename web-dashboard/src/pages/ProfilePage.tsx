import React, { useState, useContext, useEffect } from 'react';
import { ArrowLeft, Save, Edit2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { usersAPI } from '../services/api';

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { userProfile, user, refreshUserProfile } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bloodType: '',
    emergencyContact: '',
    allergies: '',
    medicalHistory: '',
    rfidNumber: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        bloodType: userProfile.bloodType || '',
        emergencyContact: userProfile.emergencyContact || '',
        allergies: userProfile.allergies || '',
        medicalHistory: userProfile.medicalHistory || '',
        rfidNumber: userProfile.rfidNumber || ''
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const response = await usersAPI.updateProfile(formData);
      await refreshUserProfile();
      setIsEditing(false);
      setSuccess(response.data.message || 'Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update profile');
    } finally {
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
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' },
    formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
    label: { fontSize: '14px', fontWeight: '500', color: '#374151' },
    input: { padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' },
    textarea: { padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', minHeight: '100px', fontFamily: 'inherit' },
    buttonGroup: { display: 'flex', gap: '12px', marginTop: '16px' },
    button: (primary: boolean) => ({
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: primary ? '#2563eb' : '#e5e7eb',
      color: primary ? '#fff' : '#111827',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }),
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' },
    success: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '14px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.headerBtn}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={styles.title}>Profile</h1>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={styles.sectionTitle}>Personal Information</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={styles.button(isEditing) as any}
          >
            <Edit2 size={16} />
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.6 }}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.6 }}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              disabled
              style={{ ...styles.input, opacity: 0.6 }}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Blood Type</label>
            <input
              type="text"
              name="bloodType"
              value={formData.bloodType}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.6 }}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>RFID Card Number</label>
            <input
              type="text"
              name="rfidNumber"
              value={formData.rfidNumber}
              disabled
              style={{ ...styles.input, opacity: 0.6 }}
              placeholder="Not linked"
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Emergency Contact</label>
          <input
            type="text"
            name="emergencyContact"
            value={formData.emergencyContact}
            onChange={handleInputChange}
            disabled={!isEditing}
            style={{ ...styles.input, opacity: isEditing ? 1 : 0.6 }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Allergies</label>
          <textarea
            name="allergies"
            value={formData.allergies}
            onChange={handleInputChange}
            disabled={!isEditing}
            style={{ ...styles.textarea, opacity: isEditing ? 1 : 0.6 }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Medical History</label>
          <textarea
            name="medicalHistory"
            value={formData.medicalHistory}
            onChange={handleInputChange}
            disabled={!isEditing}
            style={{ ...styles.textarea, opacity: isEditing ? 1 : 0.6 }}
          />
        </div>

        {isEditing && (
          <div style={styles.buttonGroup}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={styles.button(true) as any}
            >
              <Save size={16} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
