const express = require('express');
const router  = express.Router();
const { supabase } = require('../config/supabase');

// GET current settings (so the page can show existing values)
router.get('/settings', async (req, res) => {
  const deviceId = req.query.device_id || 'beepboop_001';
  try {
    const { data: dev } = await supabase.from('devices')
      .select('phase, cycle_code, meter_read_day')
      .eq('device_id', deviceId).maybeSingle();
    const { data: budgetRow } = await supabase.from('budgets')
      .select('monthly_limit').eq('device_id', deviceId).maybeSingle();
    res.json({
      success: true,
      phase: dev?.phase ?? 1,
      cycle_code: dev?.cycle_code ?? null,
      budget: budgetRow?.monthly_limit ?? null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST update settings
router.post('/settings', async (req, res) => {
  const deviceId = req.body.device_id || 'beepboop_001';
  const { phase, cycle_code, budget } = req.body;
  try {
    // phase + cycle → devices. Look up read_day from ebs_cycles for the chosen cycle.
    if (phase != null || cycle_code != null) {
      const update = {};
      if (phase != null) update.phase = phase;
      if (cycle_code != null) {
        update.cycle_code = cycle_code;
        const { data: cyc } = await supabase.from('ebs_cycles')
          .select('read_day').eq('cycle_code', cycle_code).maybeSingle();
        if (cyc) update.meter_read_day = cyc.read_day;
      }
      await supabase.from('devices').update(update).eq('device_id', deviceId);
    }
    // budget → budgets (upsert)
    if (budget != null) {
      await supabase.from('budgets')
        .upsert({ device_id: deviceId, monthly_limit: budget },
                { onConflict: 'device_id' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router