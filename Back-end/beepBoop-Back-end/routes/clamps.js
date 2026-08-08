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

// ── ADD to routes/clamps.js: POST /api/clamps/add ──
// Manually add a new clamp (a slot). No live data — it's "niet verbonden" until a
// physical clamp is actually wired to that clamp_id in the firmware.
router.post('/clamps/add', async (req, res) => {
  const { device_id = 'beepboop_001', name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'name required' });
  }
  try {
    // next clamp_id = max existing + 1 for this device
    const { data: existing } = await supabase
      .from('clamps')
      .select('clamp_id')
      .eq('device_id', device_id)
      .order('clamp_id', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextId = existing ? existing.clamp_id + 1 : 1;

    const { error } = await supabase.from('clamps').insert({
      device_id,
      clamp_id: nextId,
      name: name.trim(),
      connected: false,   // manual clamp starts unconnected — no live data
    });
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, clamp_id: nextId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;