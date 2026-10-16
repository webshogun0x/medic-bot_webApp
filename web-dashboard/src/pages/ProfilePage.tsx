import React, { useState, useContext, useEffect } from 'react';
import { 
  ArrowLeft, Save, Edit2, AlertTriangle, 
  CreditCard, Fingerprint, Activity, User,
  Heart, FileText
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { usersAPI } from '../services/api';

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { userProfile, refreshUserProfile } = useContext(AuthContext);
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
    phone: '',
    gender: '',
    dateOfBirth: '',
    medicalId: '',
    allergies: '',
    medicalHistory: '',
    rfidNumber: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || userProfile.first_name || '',
        lastName: userProfile.lastName || userProfile.last_name || '',
        email: userProfile.email || '',
        bloodType: userProfile.bloodType || userProfile.blood_type || '',
        emergencyContact: userProfile.emergencyContact || userProfile.emergency_contact || '',
        phone: userProfile.phone || '',
        gender: userProfile.gender || '',
        dateOfBirth: userProfile.dateOfBirth || userProfile.dob || '',
        medicalId: userProfile.medicalId || userProfile.medical_id || '',
        allergies: userProfile.allergies || '',
        medicalHistory: userProfile.medicalHistory || userProfile.medical_history || '',
        rfidNumber: userProfile.rfidNumber || userProfile.rfid || ''
      });
    }
  }, [userProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      setSuccess(response.data?.message || 'Clinical profile updated successfully!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const hasRFID = Boolean(formData.rfidNumber && formData.rfidNumber !== 'Not assigned');
  const isBiometricEnrolled = Boolean(
    userProfile?.biometric_enrolled ||
    userProfile?.fingerprint_registered ||
    (userProfile?.fingerprint_id !== undefined && userProfile?.fingerprint_id !== null && userProfile?.fingerprint_id > 0)
  );
  const fpSlot = userProfile?.fingerprint_id ?? userProfile?.fingerprint_slot ?? 1;

  const styles = {
    container: { padding: '28px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    headerBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
    title: { fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 },
    card: { backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    sectionTitle: { fontSize: '17px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' },
    formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
    input: { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#0f172a', backgroundColor: '#fff' },
    textarea: { padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', minHeight: '90px', fontFamily: 'inherit', color: '#0f172a' },
    button: (primary: boolean) => ({
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '700',
      backgroundColor: primary ? '#0284c7' : '#f1f5f9',
      color: primary ? '#fff' : '#475569',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    }),
    error: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px', fontWeight: '500' },
    success: { padding: '12px 16px', marginBottom: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '14px', fontWeight: '500' }
  };

  return (
    <div style={styles.container}>
      {/* TOP BAR */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={styles.headerBtn}>
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          <div>
            <h1 style={styles.title}>Clinical Patient Identity & Hardware Hub</h1>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Biometric credentials, hardware device binding, and personal health baseline
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={styles.button(isEditing) as any}
          >
            <Edit2 size={16} />
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* CLINICAL PATIENT ID BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)',
        borderRadius: '16px',
        padding: '28px',
        color: '#fff',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '20px',
            backgroundColor: '#ffffff',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '900',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {formData.firstName ? formData.firstName[0].toUpperCase() : 'M'}
            {formData.lastName ? formData.lastName[0].toUpperCase() : 'B'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>
                {formData.firstName || 'MediBot'} {formData.lastName || 'User'}
              </h2>
              {formData.bloodType && (
                <span style={{ backgroundColor: '#ffffff', color: '#dc2626', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '800' }}>
                  {formData.bloodType}
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              MRN: <strong>#{formData.medicalId || 'MB-' + (userProfile?.uid?.slice(0, 8).toUpperCase() || 'PATIENT')}</strong> &bull; {formData.email}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                Verified Kiosk Patient
              </span>
              <span style={{ backgroundColor: isBiometricEnrolled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                {isBiometricEnrolled ? '✓ Biometrics Active' : '⚠ Biometrics Pending'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TELEMETRY STATUS</div>
          <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '2px' }}>Real-time Firebase RTDB</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>Kiosk Station: Model S3-100</div>
        </div>
      </div>

      {/* HARDWARE & BIOMETRICS DIAGNOSTIC CARD */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          <Activity size={20} color="#0284c7" />
          Hardware & Biometric Credential Diagnostics
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* RFID CARD BADGE */}
          <div style={{
            padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0',
            backgroundColor: hasRFID ? '#f8fafc' : '#fffbeb', display: 'flex', gap: '16px', alignItems: 'flex-start'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              backgroundColor: hasRFID ? '#e0f2fe' : '#fef3c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: hasRFID ? '#0284c7' : '#d97706', flexShrink: 0
            }}>
              <CreditCard size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Clinic RFID Smart Badge</span>
                <span style={{
                  fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                  backgroundColor: hasRFID ? '#dcfce7' : '#fee2e2',
                  color: hasRFID ? '#16a34a' : '#dc2626'
                }}>
                  {hasRFID ? 'Linked & Active' : 'Unassigned'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Card UID: <strong>{hasRFID ? formData.rfidNumber : 'No physical RFID badge linked'}</strong>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: '8px 0 0 0' }}>
                {hasRFID 
                  ? 'Your RFID card taps at the RC522 sensor on the MediBot kiosk to log you in within 200 ms.' 
                  : 'Contact your clinic administrator or kiosk staff to scan and bind an RFID badge to your profile.'}
              </p>
            </div>
          </div>

          {/* AS608 FINGERPRINT BADGE */}
          <div style={{
            padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0',
            backgroundColor: isBiometricEnrolled ? '#f8fafc' : '#fffbeb', display: 'flex', gap: '16px', alignItems: 'flex-start'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              backgroundColor: isBiometricEnrolled ? '#dcfce7' : '#fef3c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isBiometricEnrolled ? '#16a34a' : '#d97706', flexShrink: 0
            }}>
              <Fingerprint size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>AS608 Optical Biometric</span>
                <span style={{
                  fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                  backgroundColor: isBiometricEnrolled ? '#dcfce7' : '#fef3c7',
                  color: isBiometricEnrolled ? '#16a34a' : '#d97706'
                }}>
                  {isBiometricEnrolled ? `Enrolled (Slot #${fpSlot})` : 'Action Required'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Kiosk EEPROM Template: <strong>{isBiometricEnrolled ? `Slot #${fpSlot} Verified` : 'Pending Kiosk Enrollment'}</strong>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: '8px 0 0 0' }}>
                {isBiometricEnrolled 
                  ? 'Your fingerprint template is stored directly in the AS608 optical sensor flash memory for instant touch login.' 
                  : 'Step up to the MediBot health kiosk, tap your RFID badge, and follow voice prompts to enroll your fingerprint.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PERSONAL DEMOGRAPHICS & CLINICAL BASELINE */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          <User size={20} color="#0284c7" />
          Patient Demographic & Clinical Baseline
        </h2>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.7 }}
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
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.7 }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address (Read-only)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              disabled
              style={{ ...styles.input, backgroundColor: '#f8fafc', opacity: 0.7 }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Contact Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="+1 (555) 000-0000"
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.7 }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Blood Type</label>
            {isEditing ? (
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleInputChange}
                style={{ ...styles.input, padding: '10px 14px' }}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
              </select>
            ) : (
              <input
                type="text"
                name="bloodType"
                value={formData.bloodType || 'Not specified'}
                disabled
                style={{ ...styles.input, opacity: 0.7 }}
              />
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Biological Gender</label>
            {isEditing ? (
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                style={{ ...styles.input, padding: '10px 14px' }}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <input
                type="text"
                name="gender"
                value={formData.gender || 'Not specified'}
                disabled
                style={{ ...styles.input, opacity: 0.7 }}
              />
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Date of Birth / Age</label>
            <input
              type={isEditing ? 'date' : 'text'}
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="YYYY-MM-DD"
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.7 }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Emergency Contact Phone</label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="Contact Person & Phone Number"
              style={{ ...styles.input, opacity: isEditing ? 1 : 0.7 }}
            />
          </div>
        </div>
      </div>

      {/* ALLERGIES & CLINICAL HISTORY CARD */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          <FileText size={20} color="#0284c7" />
          Clinical Alerts, Allergies & Medical History
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} color="#d97706" />
              <label style={styles.label}>Allergies & Adverse Drug Reactions</label>
            </div>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, Latex..."
              style={{ ...styles.textarea, opacity: isEditing ? 1 : 0.7 }}
            />
          </div>

          <div style={styles.formGroup}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Heart size={16} color="#dc2626" />
              <label style={styles.label}>Chronic Conditions & Medical History</label>
            </div>
            <textarea
              name="medicalHistory"
              value={formData.medicalHistory}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma, Previous surgeries..."
              style={{ ...styles.textarea, opacity: isEditing ? 1 : 0.7 }}
            />
          </div>
        </div>

        {isEditing && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={styles.button(true) as any}
            >
              <Save size={16} />
              {loading ? 'Saving Changes...' : 'Save Clinical Profile'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={loading}
              style={styles.button(false) as any}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
