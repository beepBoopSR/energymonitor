// routes/clamps.js  — register in index.js: app.use('/api', require('./routes/clamps'))
const router = require('express').Router();
const { supabase } = require('../config/supabase');

// GET /api/clamps — list clamps for a device, each with its latest reading,
// plus the computed whole-house total (sum of connected clamps' watts).
router.get('/clamps', async (req, res) => {
  const deviceId = req.query.device_id || 'beepboop_001';
  try {
    const { data: clamps } = await supabase.from('clamps')
      .select('clamp_id, name, connected')
      .eq('device_id', deviceId)
      .order('clamp_id');

    let totalWatts = 0;
    let anyConnected = false;
    const out = [];

    for (const c of clamps || []) {
      let live = null;
      if (c.connected) {
        const { data: latest } = await supabase.from('readings')
          .select('watts, voltage, current, timestamp')
          .eq('device_id', deviceId).eq('clamp_id', c.clamp_id)
          .order('timestamp', { ascending: false }).limit(1).maybeSingle();
        if (latest) {
          const ageMs = Date.now() - new Date(latest.timestamp).getTime();
          if (ageMs < 30000) {
            live = { watts: latest.watts, voltage: latest.voltage, current: latest.current };
            totalWatts += latest.watts;
            anyConnected = true;
          }
        }
      }
      out.push({ ...c, live });
    }

    res.json({
      success: true,
      clamps: out,
      // computed whole-house total = sum of connected clamps
      total: anyConnected ? { watts: totalWatts } : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clamps/rename — { device_id, clamp_id, name }
router.post('/clamps/rename', async (req, res) => {
  const { device_id = 'beepboop_001', clamp_id, name } = req.body;
  try {
    await supabase.from('clamps')
      .update({ name })
      .eq('device_id', device_id).eq('clamp_id', clamp_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;