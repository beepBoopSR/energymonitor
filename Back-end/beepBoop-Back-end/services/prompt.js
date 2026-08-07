// services/prompt.js
// Builds the grounded prompt for the advisory LLM. The model INTERPRETS and
// EXPLAINS the numbers we compute — it never invents figures or appliances.
//
// This version gives the model richer REAL context (tier math, budget delta,
// days remaining, per-day target, trend, detected appliance) and asks it to
// explain the reasoning, not just state a one-liner. All facts passed in are
// measured/computed; the model is constrained to use only these.
//
// NOTE: no per-clamp breakdown is included — with a single connected clamp we
// do not have room-level data, and claiming per-room usage would be false.
// When multiple clamps are connected, add their real per-clamp kWh here.

function buildPrompt(ctx) {
  const {
    kwhMonth, energyCostMonth, billSrd,
    tierRate, nextTierRate, kwhToNext,
    predictedKwh, predictedBill, predLow, predHigh,
    budget, periodDaysTotal, periodDaysElapsed,
    vsYesterdayPct,
    appliance,
    subsidy,
  } = ctx;

  const daysRemaining = Math.max(0, (periodDaysTotal || 0) - (periodDaysElapsed || 0));

  let budgetBlock = "Geen budget ingesteld.";
  if (budget != null) {
    const over = predictedBill - budget;
    if (over > 0) {
      const overKwhApprox = tierRate > 0 ? over / tierRate : 0;
      const perDay = daysRemaining > 0 ? overKwhApprox / daysRemaining : overKwhApprox;
      budgetBlock =
        `Budget: SRD ${budget}. Voorspelde rekening: SRD ${predictedBill.toFixed(0)} ` +
        `(SRD ${over.toFixed(0)} boven budget). Om onder budget te komen moet de klant ` +
        `ongeveer ${overKwhApprox.toFixed(0)} kWh minder verbruiken over de resterende ` +
        `${daysRemaining} dagen — dat is ~${perDay.toFixed(1)} kWh per dag minder.`;
    } else {
      budgetBlock =
        `Budget: SRD ${budget}. Voorspelde rekening: SRD ${predictedBill.toFixed(0)} ` +
        `(SRD ${Math.abs(over).toFixed(0)} onder budget). De klant zit op koers.`;
    }
  }

  let tierBlock =
    `Huidige tariefschijf: SRD ${tierRate.toFixed(3)} per kWh. ` +
    `Verbruik deze periode: ${kwhMonth.toFixed(1)} kWh.`;
  if (nextTierRate && kwhToNext != null) {
    tierBlock +=
      ` Nog ${kwhToNext.toFixed(0)} kWh tot de volgende schijf, waar elke extra kWh ` +
      `SRD ${nextTierRate.toFixed(3)} kost (duurder). Onder deze grens blijven bespaart ` +
      `op alles boven die grens.`;
  }

  const trendBlock =
    vsYesterdayPct != null
      ? `Trend: vandaag ${vsYesterdayPct > 0 ? "+" : ""}${vsYesterdayPct.toFixed(0)}% t.o.v. gisteren.`
      : "";

  const applianceBlock = appliance
    ? `Grootste verbruiker nu (op basis van stroomsignatuur, TYPE niet merk): ${appliance}.`
    : "";

  const facts = [
    tierBlock,
    `Voorspeld eindverbruik: ${predictedKwh.toFixed(0)} kWh (tussen ${predLow.toFixed(0)} en ${predHigh.toFixed(0)}).`,
    budgetBlock,
    trendBlock,
    applianceBlock,
    subsidy != null ? `Subsidie deze periode: SRD ${subsidy.toFixed(0)}.` : "",
  ].filter(Boolean).join("\n");

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
- Kort maar volledig is: 2-4 zinnen. Geen opsomming van alles, kies het belangrijkste.

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