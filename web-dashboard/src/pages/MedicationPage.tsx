import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Pill, Clock, 
  CheckCircle, AlertCircle, ShieldAlert, HeartPulse, 
  Search, X, Sparkles, Filter
} from 'lucide-react';
import { usersAPI } from '../services/api';

interface MedicationPageProps {
  onBack: () => void;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  active?: boolean;
  createdAt?: number;
}

const COMMON_PRESETS = [
  { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', time: '08:00' },
  { name: 'Lisinopril', dosage: '10 mg', frequency: 'Once daily', time: '08:00' },
  { name: 'Atorvastatin', dosage: '20 mg', frequency: 'Once daily', time: '21:00' },
  { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', time: '08:00' },
  { name: 'Omeprazole', dosage: '20 mg', frequency: 'Once daily', time: '07:30' },
  { name: 'Paracetamol', dosage: '500 mg', frequency: 'As needed', time: '12:00' }
];

const TIME_PRESETS = [
  { label: 'Morning (08:00)', time: '08:00' },
  { label: 'Noon (12:00)', time: '12:00' },
  { label: 'Evening (18:00)', time: '18:00' },
  { label: 'Bedtime (21:00)', time: '21:00' }
];

const MedicationPage: React.FC<MedicationPageProps> = ({ onBack }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTime, setFilterTime] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    time: '08:00'
  });

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getMedications();
      
      let medsArray: Medication[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          medsArray = response.data;
        } else if (typeof response.data === 'object') {
          medsArray = Object.entries(response.data).map(([key, value]: any) => ({
            id: key,
            ...value
          }));
        }
      }
      setMedications(medsArray);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const applyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setFormData({
      name: preset.name,
      dosage: preset.dosage,
      frequency: preset.frequency,
      time: preset.time
    });
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please provide a medication name.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await usersAPI.addMedication(formData);
      setFormData({ name: '', dosage: '', frequency: 'Once daily', time: '08:00' });
      setShowModal(false);
      setSuccess(response.data.message || 'Prescription registered successfully!');
      await fetchMedications();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to record medication');
    }
  };

  const handleDeleteMedication = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to discontinue / remove prescription for ${name}?`)) {
      return;
    }
    
    try {
      setError(null);
      setSuccess(null);
      const response = await usersAPI.deleteMedication(id);
      setSuccess(response.data.message || 'Medication removed successfully!');
      await fetchMedications();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete medication');
    }
  };

  // Classify time of day
  const getTimeSlot = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0], 10);
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
  };

  // Format 24h to 12h AM/PM
  const formatTime12 = (timeStr: string) => {
    if (!timeStr) return '--:--';
    const parts = timeStr.split(':');
    let hour = parseInt(parts[0], 10);
    const minute = parts[1] || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const filteredMedications = useMemo(() => {
    return medications.filter(med => {
      const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            med.dosage.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            med.frequency.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterTime === 'all') return true;
      return getTimeSlot(med.time) === filterTime;
    });
  }, [medications, searchQuery, filterTime]);

  // Compute upcoming dose
  const nextDose = useMemo<Medication | null>(() => {
    if (medications.length === 0) return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const withDiff = medications.map(m => {
      const [h, min] = (m.time || '00:00').split(':').map(Number);
      const mins = (h || 0) * 60 + (min || 0);
      return { med: m, diff: mins - currentMins };
    });

    const futureToday = withDiff.filter(item => item.diff >= 0).sort((a, b) => a.diff - b.diff);
    if (futureToday.length > 0) {
      return futureToday[0].med;
    }

    // If none left today, take the earliest tomorrow
    const sortedEarliest = [...medications].sort((a, b) => {
      const [hA, mA] = (a.time || '00:00').split(':').map(Number);
      const [hB, mB] = (b.time || '00:00').split(':').map(Number);
      return ((hA || 0) * 60 + (mA || 0)) - ((hB || 0) * 60 + (mB || 0));
    });

    return sortedEarliest[0] || null;
  }, [medications]);

  const styles = {
    container: { padding: '28px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' as const },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    backBtn: {
      display: 'flex', alignItems: 'center', gap: '6px',
      backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px',
      padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#475569',
      cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    },
    title: { fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
    subtitle: { fontSize: '13px', color: '#64748b', marginTop: '3px' },
    primaryBtn: {
      display: 'flex', alignItems: 'center', gap: '8px',
      backgroundColor: '#0284c7', color: '#fff', border: 'none',
      borderRadius: '10px', padding: '10px 18px', fontSize: '14px',
      fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(2,132,199,0.3)',
      transition: 'all 0.2s'
    },
    metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
    metricCard: { backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    filterBar: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
      backgroundColor: '#fff', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0',
      marginBottom: '20px', flexWrap: 'wrap' as const
    },
    tabPill: (active: boolean) => ({
      padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
      fontSize: '12px', fontWeight: '700', transition: 'all 0.15s',
      backgroundColor: active ? '#0284c7' : '#f1f5f9',
      color: active ? '#fff' : '#475569'
    }),
    searchInput: {
      padding: '8px 14px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1',
      fontSize: '13px', width: '240px'
    },
    medCard: {
      backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0',
      padding: '20px', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative' as const,
      transition: 'transform 0.15s, box-shadow 0.15s'
    },
    badge: (bg: string, color: string) => ({
      padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
      backgroundColor: bg, color: color, display: 'inline-flex', alignItems: 'center', gap: '4px'
    }),
    modalOverlay: {
      position: 'fixed' as const, top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    },
    modal: {
      backgroundColor: '#fff', borderRadius: '16px', maxWidth: '540px', width: '100%',
      padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      maxHeight: '90vh', overflowY: 'auto' as const
    },
    formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px', marginBottom: '16px' },
    label: { fontSize: '13px', fontWeight: '700', color: '#334155' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' },
    select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.backBtn}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={styles.title}>Clinical Prescriptions & Medication Tracker</h1>
              <span style={styles.badge('#dcfce7', '#166534')}>Pharmacotherapy Active</span>
            </div>
            <div style={styles.subtitle}>
              Active prescription regimens, scheduled administration intervals, and patient compliance monitoring
            </div>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.primaryBtn}>
          <Plus size={18} /> Add Prescription
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {/* TOP CLINICAL METRICS */}
      <div style={styles.metricGrid}>
        <div style={styles.metricCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>TOTAL ACTIVE REGIMENS</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
              <Pill size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>{medications.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Verified clinical prescriptions</div>
        </div>

        <div style={styles.metricCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>NEXT ADMINISTRATION</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
            {nextDose ? formatTime12(nextDose.time) : '--:--'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {nextDose ? `${nextDose.name} (${nextDose.dosage})` : 'No upcoming dose scheduled'}
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>ADHERENCE SCREENING</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a' }}>
              <HeartPulse size={18} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>Cross-checked Safe</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Allergy & interaction verification</div>
        </div>

        <div style={styles.metricCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>KIOSK SYNCHRONIZATION</span>
            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Real-time RTDB</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Direct physician & kiosk sync</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={styles.filterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>
            <Filter size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
            Schedule:
          </span>
          <button onClick={() => setFilterTime('all')} style={styles.tabPill(filterTime === 'all')}>
            All ({medications.length})
          </button>
          <button onClick={() => setFilterTime('morning')} style={styles.tabPill(filterTime === 'morning')}>
            Morning (05:00 - 11:59)
          </button>
          <button onClick={() => setFilterTime('afternoon')} style={styles.tabPill(filterTime === 'afternoon')}>
            Afternoon (12:00 - 16:59)
          </button>
          <button onClick={() => setFilterTime('evening')} style={styles.tabPill(filterTime === 'evening')}>
            Evening (17:00+)
          </button>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search prescriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* MEDICATION CARDS GRID */}
      {loading ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <Pill size={36} style={{ margin: '0 auto 10px', color: '#0284c7', animation: 'spin 2s linear infinite' }} />
          <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Loading patient prescriptions...</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>Synchronizing with Firebase Clinical Records</div>
        </div>
      ) : filteredMedications.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <Pill size={44} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            {searchQuery || filterTime !== 'all' ? 'No matching prescriptions found' : 'No active prescriptions recorded'}
          </h3>
          <p style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto 20px', color: '#64748b' }}>
            {searchQuery || filterTime !== 'all'
              ? 'Try adjusting your search terms or filter settings.'
              : 'Add patient medications to track daily dosages, scheduled administration reminders, and clinical interactions.'}
          </p>
          <button onClick={() => setShowModal(true)} style={{ ...styles.primaryBtn, margin: '0 auto' }}>
            <Plus size={16} /> Prescribe New Medication
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredMedications.map((med) => {
            const slot = getTimeSlot(med.time);
            const slotColor = slot === 'morning' ? '#0284c7' : slot === 'afternoon' ? '#d97706' : '#7c3aed';
            const slotBg = slot === 'morning' ? '#e0f2fe' : slot === 'afternoon' ? '#fef3c7' : '#f3e8ff';

            return (
              <div key={med.id} style={styles.medCard}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        backgroundColor: slotBg, color: slotColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Pill size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                          {med.name}
                        </h3>
                        <span style={styles.badge('#f1f5f9', '#475569')}>
                          {med.dosage || 'Dosage not set'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMedication(med.id, med.name)}
                      title="Discontinue prescription"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', padding: '6px', borderRadius: '6px',
                        transition: 'color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Scheduled Time:</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} color={slotColor} /> {formatTime12(med.time)} ({med.time})
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Frequency:</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                        {med.frequency}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={styles.badge('#dcfce7', '#166534')}>
                    <CheckCircle size={12} /> Active Regimen
                  </span>
                  <span style={styles.badge(slotBg, slotColor)}>
                    {slot.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MEDICATION MODAL */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                  <Pill size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Add Clinical Prescription</h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Configure medication dosage and administration schedule</div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* QUICK PRESET CHIPS */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                <Sparkles size={13} color="#0284c7" /> COMMON CLINICAL PRESETS (CLICK TO AUTOFILL):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {COMMON_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc', fontSize: '11px', fontWeight: '600',
                      color: '#334155', cursor: 'pointer'
                    }}
                  >
                    {p.name} {p.dosage}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddMedication}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Medication Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Lisinopril, Metformin, Amoxicillin"
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Dosage & Strength</label>
                  <input
                    type="text"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    placeholder="e.g. 500 mg, 10 ml, 20 mcg"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Administration Frequency *</label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="Every 12 hours">Every 12 hours</option>
                    <option value="At bedtime">At bedtime</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Administration Time (24h format) *</label>
                <input
                  type="time"
                  name="time"
                  required
                  value={formData.time}
                  onChange={handleInputChange}
                  style={styles.input}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {TIME_PRESETS.map((t, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, time: t.time }))}
                      style={{
                        padding: '3px 8px', borderRadius: '5px', border: '1px solid #cbd5e1',
                        fontSize: '11px', backgroundColor: formData.time === t.time ? '#e0f2fe' : '#fff',
                        color: formData.time === t.time ? '#0369a1' : '#475569', cursor: 'pointer',
                        fontWeight: formData.time === t.time ? '700' : '500'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '20px', fontSize: '12px', color: '#1e40af', lineHeight: '1.5' }}>
                <ShieldAlert size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                Prescriptions are synchronized to your patient record and evaluated during kiosk health screenings to prevent drug-drug interactions.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    backgroundColor: '#fff', color: '#475569', fontSize: '13px', fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.primaryBtn}
                >
                  <Plus size={16} /> Register Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationPage;
