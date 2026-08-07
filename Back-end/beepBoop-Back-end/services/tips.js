require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase } = require('../config/supabase.js');
const { gatherEnergyContext } = require('./energyContext.js');
const { buildPrompt } = require('./prompt');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Guards the free quota against a judge holding down the button
const MIN_SECONDS_BETWEEN_CALLS = 20;
const lastCall = new Map();

async function generateTip(deviceId) {
  const since = Date.now() - (lastCall.get(deviceId) ?? 0);
  if (since < MIN_SECONDS_BETWEEN_CALLS * 1000) {
    const wait = Math.ceil((MIN_SECONDS_BETWEEN_CALLS * 1000 - since) / 1000);
    throw new Error(`Even wachten — nog ${wait}s tot de volgende tip.`);
  }
  lastCall.set(deviceId, Date.now());

  let t = Date.now();
  const context = await gatherEnergyContext(deviceId);
  console.log(`  context: ${Date.now() - t}ms`);

  t = Date.now();
  const model  = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(buildPrompt(context));
  console.log(`  gemini:  ${Date.now() - t}ms`);

  const tips = parseTips(result.response.text());

  const { data, error } = await supabase
    .from('ai_tips')
    .insert({
      device_id:      deviceId,
      tip_dutch:      tips.dutch,
      tip_sranan:     tips.sranan,
      tip_type:       context.budget ? 'budget' : 'saving',
      predicted_bill: context.predictedBill ?? null,
      for_month:      null
    })
    .select()
    .single();

  if (error) throw new Error(`insert failed: ${error.message}`);
  return { tip: data, context };
}

function parseTips(raw) {
  const text = raw.trim().replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(text);
    return { dutch: parsed.dutch ?? '', sranan: parsed.sranan ?? '' };
  } catch {
    // Model ignored the format — keep the text rather than lose it
    return { dutch: text, sranan: '' };
  }
}

async function getLatestTip(deviceId) {
  const { data } = await supabase
    .from('ai_tips')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function explainLatestAnomaly(deviceId) {
  const { data: alert } = await supabase.from('alerts')
    .select('*').eq('device_id', deviceId).eq('type', 'anomaly')
    .order('timestamp', { ascending: false }).limit(1).maybeSingle();

  if (!alert) return null;

  const prompt = `Je bent een energie-adviseur voor een huishouden in Suriname.

Er is een afwijking in het stroomverbruik gedetecteerd:
"${alert.message}"

STRIKTE REGELS:
- Noem GEEN specifiek apparaat (geen airco, koelkast enz.) — we weten niet welke.
- Verzin geen bedragen buiten wat hierboven staat.
- Leg kort uit wat dit kan betekenen en geef één praktische tip
  (bijv. controleer of een apparaat onnodig aan staat).

Antwoord in exact dit JSON-formaat:
{"dutch": "max 2 zinnen", "sranan": "dezelfde in Sranan Tongo"}`;

  const model  = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  const tips   = parseTips(result.response.text());

  await supabase.from('ai_tips').insert({
    device_id: deviceId, tip_dutch: tips.dutch, tip_sranan: tips.sranan,
    tip_type: 'anomaly', for_month: null
  });
  return tips;
}

module.exports = { generateTip, getLatestTip, explainLatestAnomaly };