// services/billPrediction.js  (or whatever you named it)
// Predicts end-of-BILLING-PERIOD kWh and bill from live Supabase data,
// period-aligned and timezone-correct via the RPCs.

const { supabase } = require('../config/supabase');

async function predictPeriodKwh(deviceId) {
  // 1. period start + phase
  const { data: periodStart } = await supabase
    .rpc('period_start_local', { p_device_id: deviceId });

  const { data: dev } = await supabase.from('devices')
    .select('phase, meter_read_day').eq('device_id', deviceId).maybeSingle();
  const phase = dev?.phase ?? 1;

  // 2. daily breakdown for the current period
  const { data: daily } = await supabase
    .rpc('get_daily_breakdown', { p_device_id: deviceId });
  const dailyBreakdown = (daily || []).map(d => ({ day: d.day, kwh: d.kwh }));

  if (!dailyBreakdown.length) {
    return { available: false, message: 'Nog te weinig data voor een voorspelling.' };
  }

  // 3. days in the current billing period
  const start = new Date(periodStart);
  const nextPeriod = new Date(start); nextPeriod.setMonth(nextPeriod.getMonth() + 1);
  const periodDays = Math.round((nextPeriod - start) / 86400000);

  // 4. elapsed (fractional) days in the period
  const now = new Date();
  const elapsed = Math.max((now - start) / 86400000, 0.04);

  // 5. recent-window average (last 7 completed days), fallback to period average
  const RECENT = 7;
  const todayKey = now.toISOString().slice(0, 10);
  const completed = dailyBreakdown
    .filter(d => d.day < todayKey)
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, RECENT);

  const periodSoFar = dailyBreakdown.reduce((s, d) => s + d.kwh, 0);
  const dailyAvg = completed.length
    ? completed.reduce((s, d) => s + d.kwh, 0) / completed.length
    : periodSoFar / elapsed;
  const basis = completed.length ? `laatste ${completed.length} dagen` : 'periode-gemiddelde';

  const forecastKwh = +(dailyAvg * periodDays).toFixed(2);

  // 6. confidence band, narrowing as the period progresses
  const fracElapsed = Math.min(elapsed / periodDays, 1);
  const margin = 0.25 * (1 - fracElapsed);
  const laagKwh = +(forecastKwh * (1 - margin)).toFixed(2);
  const hoogKwh = +(forecastKwh * (1 + margin)).toFixed(2);

  // 7. kWh -> SRD via the single pricing source of truth
  const bill = async (kwh) => {
    const { data } = await supabase.rpc('monthly_bill', { p_kwh: kwh, p_phase: phase });
    return data;
  };
  const [billSrd, billLaag, billHoog] = await Promise.all([
    bill(forecastKwh), bill(laagKwh), bill(hoogKwh)
  ]);

  return {
    available: true,
    forecastKwh, laagKwh, hoogKwh,
    billSrd, billLaag, billHoog,
    periodSoFarKwh: +periodSoFar.toFixed(2),
    periodDays, basis,
  };
}

module.exports = { predictPeriodKwh };