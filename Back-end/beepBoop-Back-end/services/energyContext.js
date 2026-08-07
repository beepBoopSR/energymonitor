// services/energyContext.js
const { supabase } = require('../config/supabase');
const { predictPeriodKwh } = require('./billPrediction');

async function gatherEnergyContext(deviceId) {
  const { data: summary } = await supabase
    .rpc('get_energy_summary', { p_device_id: deviceId }).single();

  const prediction = await predictPeriodKwh(deviceId);

  const { data: budgetRow } = await supabase.from('budgets')
    .select('monthly_limit').eq('device_id', deviceId).maybeSingle();

  const { data: subRow } = await supabase.from('tariff_subsidy')
    .select('is_placeholder').limit(1).maybeSingle();

  return {
    // hasData drives the no-data fallback — true only with real usage AND a prediction
    hasData: prediction.available && (summary?.kwh_month ?? 0) > 0,

    kwhToday:      round(summary?.kwh_today, 2) ?? 0,
    costToday:     round(summary?.cost_today, 2) ?? 0,
    kwhMonth:      round(summary?.kwh_month, 2) ?? 0,
    avgWatts:      round(summary?.avg_watts, 0) ?? 0,
    tierRate:      round(summary?.tier_rate, 3),
    kwhToNextTier: round(summary?.kwh_to_next, 1) ?? 0,

    // prediction — English names to match prompt.js
    predictedBill:     prediction.available ? round(prediction.billSrd, 2)  : null,
    predictedBillLow:  prediction.available ? round(prediction.billLaag, 2) : null,
    predictedBillHigh: prediction.available ? round(prediction.billHoog, 2) : null,

    budget:               budgetRow?.monthly_limit ?? null,
    hasPlaceholderTariff: subRow?.is_placeholder ?? true,
  };
}

function round(v, dp) {
  if (v == null) return null;
  return Number(Number(v).toFixed(dp));
}

module.exports = { gatherEnergyContext };