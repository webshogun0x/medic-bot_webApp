import React, { useState } from 'react';
import { Heart, Mail, Lock, User, Phone, Smartphone, ArrowLeft, ArrowRight } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, database } from '../context/AuthContext';
import { ref, set } from 'firebase/database';
import { authAPI } from '../services/api';

interface SignUpPageProps {
  onSwitchToSignIn: () => void;
}

const SignUpPage = ({ onSwitchToSignIn }: SignUpPageProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [rfidNumber, setRfidNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Create user profile in database
      const userProfileRef = ref(database, `USERS/${userId}/profile`);
      await set(userProfileRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || '',
        rfidNumber: rfidNumber.trim() || '',
        bloodType: '',
        emergencyContact: '',
        allergies: '',
        medicalHistory: '',
        createdAt: new Date().toISOString()
      });

      // Create RFID mapping if provided
      if (rfidNumber.trim()) {
        const rfidRef = ref(database, `RFID_MAPPING/${rfidNumber.trim()}`);
        await set(rfidRef, {
          userId,
          linkedAt: new Date().toISOString()
        });
      }

      // Create medications array
      const medicationsRef = ref(database, `USERS/${userId}/medications`);
      await set(medicationsRef, {});

      // Create recommendations array
      const recommendationsRef = ref(database, `USERS/${userId}/recommendations`);
      await set(recommendationsRef, {});

      // Get custom token from backend for API calls
      try {
        const response = await authAPI.login(email, password);
        if (response.data.token) {
          localStorage.setItem('userToken', response.data.token);
          localStorage.setItem('userId', userId);
        }
      } catch (apiErr) {
        console.warn('Failed to get backend token (non-critical):', apiErr);
        // Continue anyway, user is logged into Firebase
      }

      onSwitchToSignIn();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create account';
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      display: 'flex' as const,
      height: '100vh',
      backgroundColor: '#f9fafb'
    },
    leftPanel: {
      flex: 1,
      backgroundColor: '#2563eb',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px',
      color: '#fff'
    },
    logoSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '40px',
      marginTop: '-100px'
    },
    logoIcon: {
      width: '56px',
      height: '56px',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    logoText: {
      fontSize: '32px',
      fontWeight: 'bold'
    },
    welcomeText: {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '16px',
      textAlign: 'center' as const
    },
    welcomeSubtext: {
      fontSize: '16px',
      opacity: 0.9,
      textAlign: 'center' as const,
      maxWidth: '400px',
      lineHeight: '1.6'
    },
    rightPanel: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      overflowY: 'auto' as const
    },
    form: {
      width: '100%',
      maxWidth: '420px'
    },
    formHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      padding: '8px',
      borderRadius: '8px',
      transition: 'background-color 0.2s'
    },
    formTitle: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '4px'
    },
    formSubtitle: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '24px'
    },
    inputGroup: {
      marginBottom: '16px'
    },
    inputLabel: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    },
    inputWrapper: {
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center'
    },
    inputIcon: {
      position: 'absolute' as const,
      left: '14px',
      color: '#9ca3af',
      pointerEvents: 'none' as const
    },
    input: {
      width: '100%',
      padding: '12px 14px 12px 42px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      transition: 'all 0.2s'
    },
    passwordToggle: {
      position: 'absolute' as const,
      right: '12px',
      cursor: 'pointer',
      color: '#6b7280',
      backgroundColor: 'transparent',
      border: 'none',
      display: 'flex',
      alignItems: 'center'
    },
    nameRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    },
    submitButton: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: '#2563eb',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginTop: '8px'
    },
    agreeText: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '16px',
      lineHeight: '1.5'
    },
    signInLink: {
      textAlign: 'center' as const,
      fontSize: '14px',
      color: '#6b7280',
      marginTop: '20px'
    },
    signInButton: {
      background: 'none',
      border: 'none',
      color: '#2563eb',
      cursor: 'pointer',
      fontWeight: '600',
      padding: '0',
      fontSize: '14px'
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      marginBottom: '20px',
      border: '1px solid #fecaca'
    },
    loadingSpinner: {
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={styles.leftPanel}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <Heart size={32} color="#fff" />
          </div>
          <div style={styles.logoText}>MediBot</div>
        </div>
        
        <div>
          <h2 style={styles.welcomeText}>Join MediBot Today!</h2>
          <p style={styles.welcomeSubtext}>
            Start monitoring your health, receive AI-powered insights, and manage your wellness journey with our comprehensive health dashboard.
          </p>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <form style={styles.form} onSubmit={handleSignUp}>
          <div style={styles.formHeader}>
            <button
              type="button"
              onClick={onSwitchToSignIn}
              style={styles.backButton}
              title="Back to Sign In"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={styles.formTitle}>Create Account</h1>
            </div>
          </div>
          <p style={styles.formSubtitle}>Join our health monitoring community</p>

          {error && (
            <div style={styles.errorMessage}>{error}</div>
          )}

          <div style={styles.nameRow}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>First Name</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#2563eb';
                    (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                    (e.target as HTMLInputElement).style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Last Name</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#2563eb';
                    (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                    (e.target as HTMLInputElement).style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#2563eb';
                  (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Phone (Optional)</label>
            <div style={styles.inputWrapper}>
              <Phone size={18} style={styles.inputIcon} />
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#2563eb';
                  (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>RFID Device Number (Optional)</label>
            <div style={styles.inputWrapper}>
              <Smartphone size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="RFID-XXXXXXXXXX"
                value={rfidNumber}
                onChange={(e) => setRfidNumber(e.target.value)}
                style={styles.input}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#2563eb';
                  (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#2563eb';
                  (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Confirm Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={styles.input}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#2563eb';
                  (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = '#d1d5db';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              backgroundColor: loading ? '#9ca3af' : '#2563eb',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <>
                <div style={styles.loadingSpinner}></div>
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <p style={styles.agreeText}>
            By creating an account, you agree to our Terms of Service and Privacy Policy. We'll keep your health data secure and private.
          </p>

          <p style={styles.signInLink}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              style={styles.signInButton}
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
