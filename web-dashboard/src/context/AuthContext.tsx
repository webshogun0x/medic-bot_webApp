import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getDatabase, ref, get, onValue, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'medic-bot-health-monitor',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '',
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || 'https://medic-bot-health-monitor-default-rtdb.firebaseio.com'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

interface AuthContextType {
  user: User | null;
  userProfile: any;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
  refreshUserProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = () => {};
    let unsubscribeHardwareRfid = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      // Clean up previous listeners
      unsubscribeProfile();
      unsubscribeHardwareRfid();
      unsubscribeProfile = () => {};
      unsubscribeHardwareRfid = () => {};

      setUser(currentUser);
      if (currentUser) {
        try {
          const profileRef = ref(database, `USERS/${currentUser.uid}/profile`);
          unsubscribeProfile = onValue(profileRef, (snapshot) => {
            if (snapshot.exists()) {
              const profileData = snapshot.val();
              const rfid = profileData.rfidNumber || profileData.rfid;

              // Check if already biometrically enrolled
              const hasBiometrics = Boolean(
                profileData.biometric_enrolled ||
                profileData.fingerprint_registered ||
                (profileData.fingerprint_id !== undefined && profileData.fingerprint_id !== null && profileData.fingerprint_id > 0)
              );

              // Update initial merged profile state
              setUserProfile({
                ...profileData,
                biometric_enrolled: hasBiometrics,
                fingerprint_registered: hasBiometrics
              });

              // Also attach real-time listener to the hardware RFID node if an RFID is assigned
              if (rfid) {
                unsubscribeHardwareRfid();
                const rfidRef = ref(database, `USERS/${rfid}`);
                unsubscribeHardwareRfid = onValue(rfidRef, (rfidSnap) => {
                  if (rfidSnap.exists()) {
                    const rfidHw = rfidSnap.val();
                    const hwBiometrics = Boolean(
                      rfidHw.fingerprint_registered ||
                      rfidHw.biometric_enrolled ||
                      (rfidHw.fingerprint_id !== undefined && rfidHw.fingerprint_id !== null && rfidHw.fingerprint_id > 0)
                    );

                    if (hwBiometrics) {
                      // Kiosk has recorded biometrics for this RFID badge
                      setUserProfile((prev: any) => ({
                        ...prev,
                        ...rfidHw,
                        ...prev, // Keep primary profile fields like name/email
                        biometric_enrolled: true,
                        fingerprint_registered: true,
                        fingerprint_id: rfidHw.fingerprint_id ?? prev?.fingerprint_id ?? 1
                      }));

                      // Synchronize back to USERS/{uid}/profile if it was still marked false
                      if (!profileData.biometric_enrolled || !profileData.fingerprint_registered) {
                        update(profileRef, {
                          biometric_enrolled: true,
                          fingerprint_registered: true,
                          fingerprint_id: rfidHw.fingerprint_id ?? 1
                        }).catch(() => {});
                      }
                    }
                  }
                }, (err) => {
                  console.warn('RFID hardware node listener error:', err);
                });
              }
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          }, (error) => {
            console.error('Error listening to user profile:', error);
            setLoading(false);
          });
        } catch (error) {
          console.error('Error setting up user profile listener:', error);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
      unsubscribeHardwareRfid();
    };
  }, []);

  const refreshUserProfile = async () => {
    if (user) {
      try {
        const profileRef = ref(database, `USERS/${user.uid}/profile`);
        const snapshot = await get(profileRef);
        if (snapshot.exists()) {
          const profileData = snapshot.val();
          const rfid = profileData.rfidNumber || profileData.rfid;
          let hwBiometrics = false;
          let hwData: any = {};
          if (rfid) {
            const hwSnap = await get(ref(database, `USERS/${rfid}`));
            if (hwSnap.exists()) {
              hwData = hwSnap.val();
              hwBiometrics = Boolean(hwData.fingerprint_registered || hwData.biometric_enrolled || hwData.fingerprint_id > 0);
            }
          }
          const hasBiometrics = Boolean(profileData.biometric_enrolled || profileData.fingerprint_registered || hwBiometrics);
          setUserProfile({
            ...profileData,
            ...hwData,
            ...profileData,
            biometric_enrolled: hasBiometrics,
            fingerprint_registered: hasBiometrics,
            fingerprint_id: hwData.fingerprint_id ?? profileData.fingerprint_id
          });
        }
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
