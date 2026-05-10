import React, { useState } from 'react';
import { Heart, Mail, Lock, ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../context/AuthContext';
import { authAPI } from '../services/api';

interface SignInPageProps {
  onNavigate: (page: string) => void;
  onSwitchToSignUp: () => void;
}

const SignInPage = ({ onNavigate, onSwitchToSignUp }: SignInPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign in with Firebase first
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Get custom token from backend for API calls
      try {
        const response = await authAPI.login(email, password);
        if (response.data.token) {
          localStorage.setItem('userToken', response.data.token);
          localStorage.setItem('userId', userId);
          
          // Store admin status
          if (response.data.isAdmin) {
            localStorage.setItem('isAdmin', 'true');
          } else {
            localStorage.removeItem('isAdmin');
          }
        }
      } catch (apiErr) {
        console.warn('Failed to get backend token (non-critical):', apiErr);
        // Continue anyway, user is logged into Firebase
      }

      onNavigate('dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in';
      if (err.code === 'auth/user-not-found') {
        setError('Email not found. Please sign up first.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
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
      padding: '40px'
    },
    form: {
      width: '100%',
      maxWidth: '420px'
    },
    formTitle: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '12px'
    },
    formSubtitle: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '32px'
    },
    inputGroup: {
      marginBottom: '20px'
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
    rememberMeContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '24px'
    },
    checkbox: {
      width: '16px',
      height: '16px',
      cursor: 'pointer'
    },
    rememberText: {
      fontSize: '14px',
      color: '#374151'
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
      gap: '8px'
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      margin: '24px 0',
      color: '#9ca3af'
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      backgroundColor: '#d1d5db'
    },
    dividerText: {
      fontSize: '12px'
    },
    signUpLink: {
      textAlign: 'center' as const,
      fontSize: '14px',
      color: '#6b7280',
      marginTop: '24px'
    },
    signUpButton: {
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
          <h2 style={styles.welcomeText}>Welcome Back!</h2>
          <p style={styles.welcomeSubtext}>
            Monitor your health with real-time vital signs tracking, AI-powered insights, and personalized recommendations.
          </p>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <form style={styles.form} onSubmit={handleSignIn}>
          <h1 style={styles.formTitle}>Sign In</h1>
          <p style={styles.formSubtitle}>Access your health dashboard and manage your wellness</p>

          {error && (
            <div style={styles.errorMessage}>{error}</div>
          )}

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

          <div style={styles.rememberMeContainer}>
            <input
              type="checkbox"
              id="remember"
              style={styles.checkbox}
            />
            <label htmlFor="remember" style={styles.rememberText}>
              Remember me
            </label>
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
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div style={styles.divider}>
            <div style={styles.dividerLine}></div>
            <span style={styles.dividerText}>New here?</span>
            <div style={styles.dividerLine}></div>
          </div>

          <p style={styles.signUpLink}>
            Create a new account{' '}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              style={styles.signUpButton}
            >
              Sign Up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;
