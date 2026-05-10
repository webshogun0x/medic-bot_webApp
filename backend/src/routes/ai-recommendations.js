const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth.middleware');
const { generateHealthRecommendations, generateChatResponse } = require('../services/ai.service');
const { logActivity } = require('../services/dashboard.service');
const router = express.Router();

// Chat with AI assistant
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const userData = profile.val();
    const rfid = userData?.rfidNumber;

    // Get recent health data for context
    let healthContext = 'No health data available yet.';
    if (rfid) {
      try {
        const latestReading = await db.ref(`READINGS/${rfid}/latest`).once('value');
        const latest = latestReading.val();
        
        if (latest) {
          healthContext = `Latest readings - Heart Rate: ${latest.heartRate} bpm, SpO2: ${latest.spo2}%, BP: ${latest.systolic}/${latest.diastolic} mmHg, Temperature: ${latest.temperature}°C`;
        }
      } catch (readError) {
        console.error('Error fetching latest reading:', readError);
        // Continue without health context
      }
    }

    // Generate AI response using Groq
    const aiResponse = await generateChatResponse(message, userData, healthContext);

    // Save chat message
    try {
      const timestamp = Date.now();
      await db.ref(`USERS/${req.user.uid}/chat-history/${timestamp}`).set({
        userMessage: message,
        aiResponse: aiResponse,
        timestamp: timestamp
      });

      // Auto-log activity
      await logActivity(req.user.uid, {
        type: 'ai_chat',
        description: `AI Health Assistant chat: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        value: { message, responseLength: aiResponse.length }
      }).catch(err => console.log('Activity log error (non-critical):', err.message));
    } catch (saveError) {
      console.error('Error saving chat history:', saveError);
      // Continue even if save fails
    }

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat message' });
  }
});

// Get AI recommendations
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const profile = await db.ref(`USERS/${req.user.uid}/profile`).once('value');
    const userData = profile.val();
    const rfid = userData?.rfidNumber;
    
    if (!rfid) {
      return res.status(404).json({ 
        error: 'RFID card not linked',
        message: 'Please link your RFID card in your profile settings to access AI recommendations.'
      });
    }

    try {
      // Get health history from READINGS/{rfid}/history
      const historySnapshot = await db.ref(`READINGS/${rfid}/history`).once('value');
      const historyData = historySnapshot.val() || {};

      // Convert to array and sort by timestamp
      const healthData = Object.entries(historyData)
        .map(([timestamp, data]) => ({
          date: new Date(parseInt(timestamp)).toLocaleDateString(),
          timestamp: parseInt(timestamp),
          ...data
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 7); // Get last 7 readings

      if (healthData.length === 0) {
        return res.status(400).json({ 
          error: 'No health readings found',
          message: 'Please visit a MediBot station to record your first health reading before generating recommendations.'
        });
      }

      const recommendations = await generateHealthRecommendations(userData, healthData);
      const timestamp = Date.now();

      await db.ref(`USERS/${req.user.uid}/recommendations/${timestamp}`).set({
        ...recommendations,
        generatedAt: timestamp
      });

      // Auto-log activity
      await logActivity(req.user.uid, {
        type: 'recommendation_generated',
        description: 'AI Health Recommendations generated',
        value: { recommendationId: timestamp, category: recommendations.category }
      }).catch(err => console.log('Activity log error (non-critical):', err.message));

      res.json(recommendations);
    } catch (error) {
      console.error('Error fetching health data:', error);
      return res.status(500).json({ 
        error: 'Unable to retrieve your health data',
        message: 'Please try again in a moment. If the problem persists, contact support.'
      });
    }
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      message: 'Our AI service is temporarily unavailable. Please try again later.'
    });
  }
});

// Get recommendation history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.ref(`USERS/${req.user.uid}/recommendations`)
      .orderByKey()
      .limitToLast(10)
      .once('value');

    const recommendations = [];
    snapshot.forEach(child => {
      recommendations.push({ id: child.key, ...child.val() });
    });

    res.json(recommendations.reverse());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
