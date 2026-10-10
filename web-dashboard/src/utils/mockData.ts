// Mock data for development/fallback purposes
export const mockHealthReading = {
  spo2: 98,
  heartRate: 72,
  systolic: 120,
  diastolic: 80,
  temperature: 36.5,
  weight: 68.4,
  heightLaser: 174.5,
  heightSonar: 174.8,
  bmiLaser: 22.4,
  bmiSonar: 22.5,
  timestamp: Date.now()
};

export const mockChartData = [
  { name: 'Mon', date: 'Mon', value: 22.2, bmiLaser: 22.2, bmiSonar: 22.4 },
  { name: 'Tue', date: 'Tue', value: 22.4, bmiLaser: 22.4, bmiSonar: 22.5 },
  { name: 'Wed', date: 'Wed', value: 22.1, bmiLaser: 22.1, bmiSonar: 22.3 },
  { name: 'Thu', date: 'Thu', value: 22.5, bmiLaser: 22.5, bmiSonar: 22.6 },
  { name: 'Fri', date: 'Fri', value: 22.3, bmiLaser: 22.3, bmiSonar: 22.4 },
  { name: 'Sat', date: 'Sat', value: 22.6, bmiLaser: 22.6, bmiSonar: 22.5 },
  { name: 'Sun', date: 'Sun', value: 22.4, bmiLaser: 22.4, bmiSonar: 22.5 }
];

export const mockPieData = [
  { name: 'Normal', value: 640, color: '#4F46E5' },
  { name: 'Warning', value: 120, color: '#F59E0B' },
  { name: 'Critical', value: 30, color: '#EF4444' }
];

export const mockRecentActivity = [
  { id: 1, name: 'Health Check', type: 'Vital Signs Reading', time: 'Today 8:44', avatar: 'H' },
  { id: 2, name: 'Medication', type: 'Reminder Taken', time: 'Today 8:54', avatar: 'M' },
  { id: 3, name: 'AI Analysis', type: 'Health Report Generated', time: 'Today 7:39', avatar: 'A' },
  { id: 4, name: 'Blood Pressure', type: 'Follow-up Reading', time: 'Today 12:23', avatar: 'B' }
];

export const mockStats = [
  { title: 'Total Readings', value: '6025', change: '+68.95%', trend: 'up' },
  { title: 'New This Week', value: '4152', change: '+4.11%', trend: 'up' },
  { title: 'Critical Alerts', value: '5948', change: '+92.05%', trend: 'up' },
  { title: 'Health Score', value: '5626', change: '+27.47%', trend: 'up' }
];
