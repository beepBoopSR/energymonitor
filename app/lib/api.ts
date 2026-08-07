// lib/api.ts
//
// Single source for talking to the beepBoop backend. Built to switch cleanly
// between mock data (for building the UI without the backend running) and the
// real endpoint. The mock is shaped EXACTLY like a real /api/dashboard response,
// so flipping USE_MOCK to false is the only change needed to go live.

// ── toggle this to false when the backend is running ──
export const USE_MOCK = false;

// backend runs on port 3000 (firmware also posts there); Next.js dev runs on 3001
const API_BASE = "http://localhost:3000";
const DEVICE_ID = "beepboop_001";

// ── Types (match the real response) ──
export type DashboardData = {
  success: boolean;
  summary: {
    kwh_today: number;
    kwh_month: number;
    avg_watts: number;
    cost_today: number;
    cost_month: number;      // already AFTER subsidy (full bill)
    energy_cost_month?: number; // energy-only cost (no basis/subsidy)
    tier_rate: number;
    tier_lower: number;
    tier_upper: number;
    kwh_to_next: number;
  };
  grid: string;              // "unknown" | "up" | "low" | "out" (from backend)
  outages: { timestamp: string; duration_min: number }[];
  budget: number | null;
  vsYesterday: { today_kwh: number; yesterday_kwh: number; pct: number };
  anomalies: { timestamp: string; message: string; value: number }[];
  appliance: string;         // "verwarmingselement" | "fan" | "charger" | "niets" | "onbekend"
  subsidy: number;
  cycle: { code: string; phase: number; read: number; invoice: number } | null;
  live: { watts: number; voltage: number; current: number } | null;
  deviceOnline: boolean;
  prediction:
    | {
        available: true;
        forecastKwh: number;
        laagKwh: number;
        hoogKwh: number;
        billSrd: number;
        billLaag: number;
        billHoog: number;
        periodSoFarKwh: number;
        periodDays: number;
        basis: string;
      }
    | { available: false; message?: string };
  dailyBreakdown: { day: string; kwh: number; cost: number }[];
  hourlyToday: { hour: number; kwh: number; cost: number }[];
};

// ── Mock: identical shape to a real response (from the actual backend) ──
const MOCK: DashboardData = {
  success: true,
  summary: {
    kwh_today: 3.42,
    kwh_month: 214.6,
    avg_watts: 150.8,
    cost_today: 6.74,
    cost_month: 486.2,
    energy_cost_month: 486.2,
    tier_rate: 2.85,
    tier_lower: 400,   // note: with mock 214 kWh you'd be tier 1; these values
    tier_upper: 900,   // are set to show a mid-tier state for building the UI
    kwh_to_next: 185.4,
  },
  grid: "up",
  outages: [
    { timestamp: "2026-07-31T02:28:09.517+00:00", duration_min: 4 },
    { timestamp: "2026-07-30T13:46:25+00:00", duration_min: 1 },
    { timestamp: "2026-07-28T13:31:42+00:00", duration_min: 29 },
  ],
  budget: 500,
  vsYesterday: { today_kwh: 3.42, yesterday_kwh: 2.9, pct: 17.9 },
  anomalies: [
    { timestamp: "2026-08-04T14:30:00+00:00", message: "Plotselinge piek: 2100W (normaal ~180W)", value: 2100 },
  ],
  appliance: "verwarmingselement",
  subsidy: 100,
  cycle: { code: "CL01", phase: 1, read: 2, invoice: 12 },
  live: { watts: 1204, voltage: 122.5, current: 9.82 },
  deviceOnline: true,
  prediction: {
    available: true,
    forecastKwh: 420.5,
    laagKwh: 380.2,
    hoogKwh: 460.8,
    billSrd: 1240.5,
    billLaag: 1090.3,
    billHoog: 1390.7,
    periodSoFarKwh: 214.6,
    periodDays: 31,
    basis: "laatste 7 dagen",
  },
  // per-day across the current period (history graph)
  dailyBreakdown: [
    { day: "2026-07-16", kwh: 12.4, cost: 24.4 },
    { day: "2026-07-17", kwh: 15.1, cost: 29.8 },
    { day: "2026-07-18", kwh: 9.8, cost: 19.3 },
    { day: "2026-07-19", kwh: 18.7, cost: 36.9 },
    { day: "2026-07-20", kwh: 22.3, cost: 44.0 },
    { day: "2026-07-21", kwh: 14.2, cost: 28.0 },
    { day: "2026-07-22", kwh: 11.5, cost: 22.7 },
    { day: "2026-07-23", kwh: 16.8, cost: 33.1 },
    { day: "2026-07-24", kwh: 19.4, cost: 38.3 },
    { day: "2026-07-25", kwh: 13.1, cost: 25.8 },
    { day: "2026-07-26", kwh: 20.9, cost: 41.2 },
    { day: "2026-07-27", kwh: 17.3, cost: 34.1 },
    { day: "2026-07-28", kwh: 10.2, cost: 20.1 },
    { day: "2026-07-29", kwh: 21.6, cost: 61.6 },
  ],
  // per-hour today (hourly graph) — fills as the day progresses
  hourlyToday: [
    { hour: 0, kwh: 0.42, cost: 0.83 },
    { hour: 1, kwh: 0.38, cost: 0.75 },
    { hour: 2, kwh: 0.35, cost: 0.69 },
    { hour: 3, kwh: 0.33, cost: 0.65 },
    { hour: 4, kwh: 0.31, cost: 0.61 },
    { hour: 5, kwh: 0.4, cost: 0.79 },
    { hour: 6, kwh: 0.85, cost: 1.68 },
    { hour: 7, kwh: 1.42, cost: 2.8 },
    { hour: 8, kwh: 1.15, cost: 2.27 },
    { hour: 9, kwh: 0.92, cost: 1.81 },
    { hour: 10, kwh: 0.78, cost: 1.54 },
    { hour: 11, kwh: 0.88, cost: 1.73 },
    { hour: 12, kwh: 1.35, cost: 2.66 },
    { hour: 13, kwh: 1.28, cost: 2.52 },
  ],
};

// ── Fetch (real or mock) ──
export async function getDashboard(): Promise<DashboardData> {
  if (USE_MOCK) {
    // small delay to mimic network, so loading states are visible while building
    await new Promise((r) => setTimeout(r, 200));
    return MOCK;
  }
  const res = await fetch(`${API_BASE}/api/dashboard?device_id=${DEVICE_ID}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "geen data");
  return data as DashboardData;
}

// ── Formatting helpers (SRD, kWh) ──
export const srd = (v: number | null | undefined, dp = 2) =>
  v == null || isNaN(v) ? "—" : `SRD ${Number(v).toFixed(dp)}`;
export const kwh = (v: number | null | undefined, dp = 1) =>
  v == null || isNaN(v) ? "—" : `${Number(v).toFixed(dp)} kWh`;
export const num = (v: number | null | undefined, dp = 0) =>
  v == null || isNaN(v) ? "—" : Number(v).toFixed(dp);

export const APPLIANCE_NAMES: Record<string, string> = {
  verwarmingselement: "Verwarmingselement",
  fan: "Ventilator",
  charger: "Oplader",
  niets: "Niets actief",
  onbekend: "Onbekend apparaat",
};

// ── Settings (Instellingen page) ──
export type Settings = {
  phase: number;
  cycle_code: string | null;
  budget: number | null;
};

// EBS cycles CL01–CL19 with their read/invoice days (for the dropdown)
export const EBS_CYCLES: { code: string; read: number; invoice: number }[] = [
  { code: "CL01", read: 2,  invoice: 12 }, { code: "CL02", read: 2,  invoice: 12 },
  { code: "CL03", read: 3,  invoice: 12 }, { code: "CL04", read: 4,  invoice: 12 },
  { code: "CL05", read: 6,  invoice: 12 }, { code: "CL06", read: 6,  invoice: 18 },
  { code: "CL07", read: 8,  invoice: 18 }, { code: "CL08", read: 9,  invoice: 18 },
  { code: "CL09", read: 11, invoice: 18 }, { code: "CL10", read: 11, invoice: 18 },
  { code: "CL11", read: 12, invoice: 22 }, { code: "CL12", read: 13, invoice: 22 },
  { code: "CL13", read: 15, invoice: 22 }, { code: "CL14", read: 15, invoice: 22 },
  { code: "CL15", read: 16, invoice: 28 }, { code: "CL16", read: 18, invoice: 28 },
  { code: "CL17", read: 18, invoice: 28 }, { code: "CL18", read: 20, invoice: 28 },
  { code: "CL19", read: 22, invoice: 28 },
];

const MOCK_SETTINGS: Settings = { phase: 1, cycle_code: "CL01", budget: 500 };

export async function getSettings(): Promise<Settings> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 150));
    return { ...MOCK_SETTINGS };
  }
  const res = await fetch(`${API_BASE}/api/settings?device_id=${DEVICE_ID}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const d = await res.json();
  return { phase: d.phase, cycle_code: d.cycle_code, budget: d.budget };
}

export async function saveSettings(s: Partial<Settings>): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    Object.assign(MOCK_SETTINGS, s);
    return;
  }
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: DEVICE_ID, ...s }),
  });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const d = await res.json();
  if (!d.success) throw new Error(d.error || "opslaan mislukt");
}

// ── Outages (Uitval page) — reuses the dashboard's outages, plus a fuller history ──
export type OutageEvent = { timestamp: string; duration_min: number };

// For the Uitval page we can reuse getDashboard().outages, but a dedicated
// fetch lets us pull a longer history later. For now it maps to the same data.
export async function getOutages(): Promise<OutageEvent[]> {
  const d = await getDashboard();
  return d.outages || [];
}

// ── AI tips (from the separate tips endpoints) ──
export type AiTip = {
  tip_dutch: string;
  tip_sranan: string;
  created_at?: string;
};

const MOCK_TIP: AiTip = {
  tip_dutch:
    "Je zit nog 185 kWh onder de volgende, duurdere tariefschijf. Blijf eronder om te besparen. Je voorspelde rekening (SRD 1240) ligt boven je budget — probeer je dagelijkse verbruik iets te verlagen.",
  tip_sranan:
    "Yu de ete 185 kWh ondro a moro diri taria. Tan ondro en fu spar moni. A rekenin di wi e fruwakti (SRD 1240) de moro hei leki yu bajet — pruberi fu saka yu dagelijks gebroiki pikinso.",
  created_at: new Date().toISOString(),
};

export async function getLatestTip(): Promise<AiTip | null> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 150));
    return { ...MOCK_TIP };
  }
  const res = await fetch(`${API_BASE}/api/latest-tip?device_id=${DEVICE_ID}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const d = await res.json();
  // backend may return the row directly or wrapped; handle both
  const row = d.tip ?? d;
  if (!row || !row.tip_dutch) return null;
  return { tip_dutch: row.tip_dutch, tip_sranan: row.tip_sranan, created_at: row.created_at };
}

export async function generateTip(): Promise<AiTip> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 900)); // mimic Gemini latency
    return { ...MOCK_TIP, created_at: new Date().toISOString() };
  }
  const res = await fetch(`${API_BASE}/api/generate-tip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: DEVICE_ID }),
  });
  const d = await res.json();
  if (!res.ok || d.success === false) {
    throw new Error(d.error || `backend ${res.status}`);
  }
  const row = d.tip ?? d;
  return { tip_dutch: row.tip_dutch, tip_sranan: row.tip_sranan, created_at: row.created_at };
}

// ── Clamps (per-circuit sub-metering) ──
export type Clamp = {
  clamp_id: number;
  name: string;
  connected: boolean;
  live: { watts: number; voltage: number; current: number } | null;
};

export type ClampsResult = {
  clamps: Clamp[];
  total: { watts: number } | null;  // computed whole-house total (sum of connected clamps)
};

const MOCK_CLAMPS: Clamp[] = [
  { clamp_id: 1, name: "Keuken",     connected: true,  live: { watts: 1204, voltage: 122.5, current: 9.82 } },
  { clamp_id: 2, name: "Slaapkamer", connected: false, live: null },
];

export async function getClamps(): Promise<ClampsResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 150));
    const clamps = MOCK_CLAMPS.map((c) => ({ ...c }));
    const totalWatts = clamps.filter((c) => c.live).reduce((s, c) => s + (c.live!.watts), 0);
    const anyConnected = clamps.some((c) => c.live);
    return { clamps, total: anyConnected ? { watts: totalWatts } : null };
  }
  const res = await fetch(`${API_BASE}/api/clamps?device_id=${DEVICE_ID}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const d = await res.json();
  return { clamps: d.clamps || [], total: d.total ?? null };
}

export async function renameClamp(clampId: number, name: string): Promise<void> {
  if (USE_MOCK) {
    const c = MOCK_CLAMPS.find((x) => x.clamp_id === clampId);
    if (c) c.name = name;
    await new Promise((r) => setTimeout(r, 200));
    return;
  }
  const res = await fetch(`${API_BASE}/api/clamps/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: DEVICE_ID, clamp_id: clampId, name }),
  });
  if (!res.ok) throw new Error(`backend ${res.status}`);
}