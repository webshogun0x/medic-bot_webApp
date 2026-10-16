/**
 * Clinical Float Formatter
 * Formats any floating number across the frontend to 4 decimal places.
 */
export const formatFloat = (val: any, decimals = 4): string => {
  if (val === null || val === undefined || val === '') return '--';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '--';
  return num.toFixed(decimals);
};

/**
 * Clinical Medical Record Number (MRN) Generator
 * Generates clean, unique clinical ID: e.g. MB-A8K4F2
 */
export const generateMedicalId = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'MB-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
