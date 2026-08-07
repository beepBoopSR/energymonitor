// services/prompt.js  (defensive version)
// Builds the grounded prompt for the advisory LLM. Every numeric field is guarded so a
// missing value from energyContext can never crash the tip (no more undefined.toFixed()).
// A missing field simply omits its clause rather than throwing.

// safe number formatter: returns null if the value isn't a finite number
function n(v, digits = 0) {
  return (typeof v === 'number' && isFinite(v)) ? v.toFixed(digits) : null;
}
const has = (v) => typeof v === 'number' && isFinite(v);

function buildPrompt(ctx = {}) {
  const {
    kwhMonth, energyCostMonth, billSrd,
    tierRate, nextTierRate, kwhToNext,
    predictedKwh, predictedBill, predLow, predHigh,
    budget, periodDaysTotal, periodDaysElapsed,
    vsYesterdayPct,
    appliance,
    subsidy,
  } = ctx;

  const daysRemaining = has(periodDaysTotal) && has(periodDaysElapsed)
    ? Math.max(0, periodDaysTotal - periodDaysElapsed)
    : null;

  // ---- budget block ----
  let budgetBlock;
  if (!has(budget)) {
    budgetBlock = 'Geen budget ingesteld.';
  } else if (has(predictedBill)) {
    const over = predictedBill - budget;
    if (over > 0) {
      const overKwh = has(tierRate) && tierRate > 0 ? over / tierRate : null;
      const perDay = overKwh != null && daysRemaining && daysRemaining > 0
        ? overKwh / daysRemaining : overKwh;
      budgetBlock =
        `Budget: SRD ${n(budget)}. Voorspelde rekening: SRD ${n(predictedBill)} ` +
        `(SRD ${n(over)} boven budget).` +
        (overKwh != null
          ? ` Om onder budget te komen ~${n(overKwh)} kWh minder verbruiken` +
            (daysRemaining ? ` over de resterende ${daysRemaining} dagen (~${n(perDay, 1)} kWh/dag minder).` : '.')
          : '');
    } else {
      budgetBlock =
        `Budget: SRD ${n(budget)}. Voorspelde rekening: SRD ${n(predictedBill)} ` +
        `(SRD ${n(Math.abs(over))} onder budget). Op koers.`;
    }
  } else {
    budgetBlock = `Budget: SRD ${n(budget)}.`;
  }

  // ---- tier block ----
  let tierBlock = '';
  if (has(tierRate)) {
    tierBlock = `Huidige tariefschijf: SRD ${n(tierRate, 3)} per kWh.`;
    if (has(kwhMonth)) tierBlock += ` Verbruik deze periode: ${n(kwhMonth, 1)} kWh.`;
    if (has(nextTierRate) && has(kwhToNext)) {
      tierBlock +=
        ` Nog ${n(kwhToNext)} kWh tot de volgende schijf (dan SRD ${n(nextTierRate, 3)} per kWh, duurder). ` +
        `Onder deze grens blijven bespaart op alles daarboven.`;
    }
  }

  // ---- prediction block ----
  let predBlock = '';
  if (has(predictedKwh)) {
    predBlock = `Voorspeld eindverbruik: ${n(predictedKwh)} kWh`;
    if (has(predLow) && has(predHigh)) predBlock += ` (tussen ${n(predLow)} en ${n(predHigh)})`;
    predBlock += '.';
  }

  const trendBlock = has(vsYesterdayPct)
    ? `Trend: vandaag ${vsYesterdayPct > 0 ? '+' : ''}${n(vsYesterdayPct)}% t.o.v. gisteren.`
    : '';

  const applianceBlock = appliance
    ? `Grootste verbruiker nu (op basis van stroomsignatuur, TYPE niet merk): ${appliance}.`
    : '';

  const subsidyBlock = has(subsidy) ? `Subsidie deze periode: SRD ${n(subsidy)}.` : '';

  const facts = [tierBlock, predBlock, budgetBlock, trendBlock, applianceBlock, subsidyBlock]
    .filter(Boolean).join('\n');

  return `Je bent de energie-adviseur van energyLink, voor een huishouden in Suriname.
Je krijgt ECHTE, gemeten cijfers. Gebruik UITSLUITEND deze cijfers. Verzin NOOIT
apparaten, bedragen of verbruik die hier niet staan. Als iets onbekend is, zeg dat.

GEMETEN CONTEXT:
${facts}

SCHRIJF ADVIES DAT:
- Specifiek is en de ECHTE cijfers hierboven noemt (geen vage tips).
- De REDENERING uitlegt: waarom raad je dit aan, wat levert het op (in kWh of SRD).
- Concreet en haalbaar is voor een Surinaams huishouden.
- Rekening houdt met de getrapte EBS-tarieven en het budget als dat is ingesteld.
- Kort maar volledig is: 2-4 zinnen. Kies het belangrijkste.

Geef het advies in TWEE talen:
1. Nederlands
2. Sranan Tongo

Antwoord ALLEEN met geldige JSON, zonder extra tekst of markdown:
{"tip_dutch": "...", "tip_sranan": "..."}`;
}

function noDataPrompt() {
  return `Je bent de energie-adviseur van energyLink. Er is nog te weinig meetdata
voor specifiek advies. Geef een korte, vriendelijke boodschap (2 zinnen) in het
Nederlands en Sranan Tongo dat de meting net begonnen is en dat er binnenkort
persoonlijk advies komt. Verzin geen cijfers.

Antwoord ALLEEN met geldige JSON:
{"tip_dutch": "...", "tip_sranan": "..."}`;
}

module.exports = { buildPrompt, noDataPrompt };