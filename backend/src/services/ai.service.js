const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateHealthRecommendations(userData, healthData) {
  const prompt = `You are a medical AI assistant. Analyze this patient's health data and provide personalized recommendations.

Patient Profile:
- Age: ${userData.age || 'N/A'}
- Gender: ${userData.gender || 'N/A'}
- Medical History: ${userData.medicalHistory || 'None reported'}
- Current Medications: ${userData.medications || 'None'}
- Allergies: ${userData.allergies || 'None'}

Recent Health Data (Last 7 days):
${healthData.map(reading => `
- Date: ${reading.date}
  SpO2: ${reading.spo2}%
  Heart Rate: ${reading.heartRate} bpm
  Blood Pressure: ${reading.systolic}/${reading.diastolic} mmHg
  Temperature: ${reading.temperature}°C
  BMI: ${reading.bmi || 'N/A'}
`).join('\n')}

Provide:
1. Risk Assessment (Low/Moderate/High)
2. Key Health Insights (2-3 points)
3. Specific Recommendations (diet, exercise, lifestyle)
4. When to seek medical attention
5. Next check-up timeline

Format as JSON with keys: riskLevel, insights, recommendations, medicalAdvice, nextCheckup`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  });

  return JSON.parse(completion.choices[0].message.content);
}

module.exports = { generateHealthRecommendations };
