
// Single source for talking to the beepBoop backend. Built to switch cleanly
// between mock data (for building the UI without the backend running) and the
// real endpoint. The mock is shaped EXACTLY like a real /api/dashboard response,
// so flipping USE_MOCK to false is the only change needed to go live.

// ── toggle this to false when the backend is running ──
export const USE_MOCK = true;

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
    cost_month: number;      
    tier_rate: number;
    tier_lower: number;
    tier_upper: number;
    kwh_to_next: number;
  };
  grid: string; 
  outages: { timestamp: string; duration_min: number }[];
  budget: number | null;
  vsYesterday: { today_kwh: number; yesterday_kwh: number; pct: number };
  anomalies: { timestamp: string; message: string; value: number }[];
  appliance: string;         
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

//  Mock: identical shape to a real response (from the actual backend). used for testing
const MOCK: DashboardData = {
  success: true,
  summary: {
    kwh_today: 3.42,
    kwh_month: 214.6,
    avg_watts: 150.8,
    cost_today: 6.74,
    cost_month: 486.2,
    tier_rate: 2.85,
    tier_lower: 400,   // note: with mock 214 kWh you'd be tier 1
    tier_upper: 900,   
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
  // per-hour today (hourly graph) , fills as the day progresses
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

//  Formatting helpers (SRD, kWh)
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