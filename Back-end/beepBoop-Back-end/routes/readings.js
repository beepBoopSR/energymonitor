const express = require('express');
const router  = express.Router();
const { ingestReading, getEnergySummary, getLatestReading } = require('../services/readings');
const { getGridStatus } = require('../services/gridMonitor');
const { supabase } = require('../config/supabase.js');
const { classify, getState } = require('../services/applianceMonitor');
const { predictPeriodKwh } = require('../services/billPrediction.js')

//--------Deze 2 worden eingelijk niet meer gebruikt-------

// ESP32 posts here
router.post('/readings', async (req, res) => {
  const r = req.body;
  try {
    const { status, gridStatus } = await ingestReading(r);
    console.log(
      `clamp ${r.clamp_id} | ${r.voltage}V ${r.current}A ${r.watts}W ` +
      `| ${Number(r.kwh).toFixed(8)} kWh | ${status} | grid ${gridStatus}`
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ insert failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dashboard summary — kWh, tiered cost, tier position
router.get('/summary', async (req, res) => {
  const deviceId = req.query.device_id || 'beepboop_001';
  try {
    const summary = await getEnergySummary(deviceId);
    const latest  = await getLatestReading(deviceId);
    res.json({
      success: true,
      summary,
      live: latest ? {
        voltage: latest.voltage,
        current: latest.current,
        watts:   latest.watts,
        timestamp: latest.timestamp
      } : null,
      grid: getGridStatus(deviceId)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//--------Dit is de 2 bovenste in 1, in de html file-----

router.get('/dashboard', async (req, res) => {
  const deviceId = req.query.device_id || 'beepboop_001';
  try {
    const summary = await getEnergySummary(deviceId);
    const { data: sub } = await supabase.rpc('subsidy_amount', { p_kwh: summary.kwh_month });
    const latest  = await getLatestReading(deviceId);
    const prediction = await predictPeriodKwh(deviceId);

    // ── staleness check — top level, not inside any if ──
    let live = null;
    let deviceOnline = false;
    
    if (latest) {
      const ageMs = Date.now() - new Date(latest.timestamp).getTime();
      deviceOnline = ageMs < 30000;   // fresh if within 30s
      live = deviceOnline
        ? { watts: latest.watts, voltage: latest.voltage, current: latest.current }
        : null;
    }

    const { data: outages } = await supabase.from('alerts')
      .select('timestamp, duration_min')
      .eq('device_id', deviceId).eq('type', 'outage_end')
      .order('timestamp', { ascending: false }).limit(5);
    const { data: budgetRow } = await supabase.from('budgets')
      .select('monthly_limit').eq('device_id', deviceId).maybeSingle();
    const { data: vsYest } = await supabase
      .rpc('get_vs_yesterday', { p_device_id: deviceId }).single();
    const { data: anomalies } = await supabase.from('alerts')
      .select('timestamp, message, value')
      .eq('device_id', deviceId).eq('type', 'anomaly')
      .order('timestamp', { ascending: false }).limit(5);

    const { data: dev } = await supabase.from('devices')
      .select('cycle_code, meter_read_day, phase')
      .eq('device_id', deviceId).maybeSingle();

      const { data: dailyBreakdown } = await supabase
    .rpc('get_daily_breakdown', { p_device_id: deviceId });

    const { data: hourlyToday } = await supabase
    .rpc('get_hourly_today', { p_device_id: deviceId });

    let cycle = null;
    if (dev?.cycle_code) {
      const { data: cyc } = await supabase.from('ebs_cycles')
        .select('read_day, invoice_day')
        .eq('cycle_code', dev.cycle_code).maybeSingle();
      cycle = { code: dev.cycle_code, phase: dev.phase,
                read: cyc?.read_day, invoice: cyc?.invoice_day };
    }

    res.json({
      success: true,
      summary,
      grid: getGridStatus(deviceId),
      outages: outages || [],
      budget: budgetRow?.monthly_limit ?? null,
      vsYesterday: vsYest,
      dailyBreakdown: dailyBreakdown || [],
      hourlyToday: hourlyToday || [],
      anomalies: anomalies || [],
      appliance: getState(deviceId, 1),
      subsidy: sub,
      cycle: cycle,
      live: live,
      deviceOnline: deviceOnline,
      prediction: prediction,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router; 