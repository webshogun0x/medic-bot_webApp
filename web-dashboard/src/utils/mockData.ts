// Mock data for development/fallback purposes
export const mockHealthReading = {
  spo2: 98,
  heartRate: 72,
  systolic: 120,
  diastolic: 80,
  temperature: 36.5,
  timestamp: Date.now()
};

export const mockChartData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 500 },
  { name: 'Jun', value: 700 },
  { name: 'Jul', value: 900 }
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
