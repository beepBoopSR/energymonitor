const express = require('express');
const router  = express.Router();
const { generateTip, getLatestTip } = require('../services/tips');

const DEFAULT_DEVICE = 'beepboop_001';

// Button press — costs a Gemini call
router.post('/generate-tip', async (req, res) => {
  const deviceId = req.body.device_id || DEFAULT_DEVICE;
  try {
    const { tip, context } = await generateTip(deviceId);
    console.log('✅ tip:', tip.tip_dutch);
    res.json({ success: true, tip, context });
  } catch (err) {
    console.error('❌ tip failed:', err.message);
    res.status(429).json({ success: false, error: err.message });
  }
});

// App startup — reads what's already stored, no AI call
router.get('/latest-tip', async (req, res) => {
  const deviceId = req.query.device_id || DEFAULT_DEVICE;
  try {
    res.json({ success: true, tip: await getLatestTip(deviceId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lists what the key can actually call — model names change
router.get('/models', async (req, res) => {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const d = await r.json();
    const usable = (d.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
    res.json({ success: true, models: usable });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;