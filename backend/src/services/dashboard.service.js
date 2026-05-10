const { db } = require('../config/firebase');

// Log an activity event
async function logActivity(userId, activityData) {
  try {
    await db.ref(`USERS/${userId}/activity-log/${Date.now()}`).set({
      ...activityData,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Calculate dashboard stats from readings
async function calculateStats(rfidNumber) {
  try {
    const historySnapshot = await db.ref(`READINGS/${rfidNumber}/history`).once('value');
    const historyData = historySnapshot.val() || {};

    // Convert to array and get timestamps
    const readings = Object.entries(historyData).map(([timestamp, data]) => ({
      timestamp: parseInt(timestamp),
      ...data
    }));

    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Total readings
    const totalReadings = readings.length;

    // New this week
    const newThisWeek = readings.filter(r => r.timestamp >= oneWeekAgo).length;

    // Critical alerts (readings with concerning values)
    const criticalAlerts = readings.filter(r => {
      const isCritical = 
        (r.heartRate && (r.heartRate > 100 || r.heartRate < 60)) ||
        (r.spo2 && r.spo2 < 95) ||
        (r.systolic && (r.systolic > 140 || r.systolic < 90)) ||
        (r.temperature && (r.temperature > 38 || r.temperature < 36));
      return isCritical;
    }).length;

    // Health score calculation (0-100)
    let healthScore = 100;
    readings.slice(-30).forEach(reading => {
      if (reading.heartRate && (reading.heartRate > 100 || reading.heartRate < 60)) healthScore -= 5;
      if (reading.spo2 && reading.spo2 < 95) healthScore -= 10;
      if (reading.systolic && (reading.systolic > 140 || reading.systolic < 90)) healthScore -= 8;
      if (reading.temperature && (reading.temperature > 38 || reading.temperature < 36)) healthScore -= 5;
    });
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      totalReadings,
      newThisWeek,
      criticalAlerts,
      healthScore: Math.round(healthScore),
      lastUpdated: now
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return {
      totalReadings: 0,
      newThisWeek: 0,
      criticalAlerts: 0,
      healthScore: 0,
      lastUpdated: Date.now()
    };
  }
}

// Get recent activity log
async function getActivityLog(userId, limit = 10) {
  try {
    const activitySnapshot = await db.ref(`USERS/${userId}/activity-log`).limitToLast(limit).once('value');
    const activityData = activitySnapshot.val() || {};

    const activities = Object.entries(activityData)
      .map(([_, data]) => data)
      .sort((a, b) => b.timestamp - a.timestamp);

    return activities;
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return [];
  }
}

// Calculate trend percentage
function calculateTrend(currentValue, previousValue) {
  if (!previousValue || previousValue === 0) return 0;
  const change = ((currentValue - previousValue) / previousValue) * 100;
  return Math.round(change * 10) / 10; // Round to 1 decimal
}

module.exports = {
  logActivity,
  calculateStats,
  getActivityLog,
  calculateTrend
};
