"use client"

import * as React from "react"
import {
  getDashboard,
  srd,
  kwh as fmtKwh,
  num,
  APPLIANCE_NAMES,
  type DashboardData,
} from "@/lib/api"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
} from "recharts"

const POLL_MS = 5000

// ── small presentational helpers ───────────────────────────────
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

function Cap({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}

function Toggle({
  value,
  onChange,
}: {
  value: "kwh" | "srd"
  onChange: (v: "kwh" | "srd") => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
      {(["kwh", "srd"] as const).map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            value === k
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {k === "kwh" ? "kWh" : "SRD"}
        </button>
      ))}
    </div>
  )
}

// ── the page ────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const [histMode, setHistMode] = React.useState<"kwh" | "srd">("kwh")
  const [hourMode, setHourMode] = React.useState<"kwh" | "srd">("kwh")

  React.useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const d = await getDashboard()
        if (alive) {
          setData(d)
          setErr(null)
        }
      } catch (e: any) {
        if (alive) setErr(e.message || "offline")
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (err && !data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Kan geen verbinding maken met de backend — {err}
      </div>
    )
  }
  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">Laden…</div>
  }

  const s = data.summary
  const p = data.prediction
  const online = data.deviceOnline && data.live

  // grid pill
  const gridLabel =
    data.grid === "up"
      ? "Net normaal"
      : data.grid === "low"
      ? "Lage spanning"
      : data.grid === "out"
      ? "Stroomuitval"
      : "Onbekend"
  const gridColor =
    data.grid === "up"
      ? "var(--ok)"
      : data.grid === "low"
      ? "var(--warn)"
      : data.grid === "out"
      ? "var(--destructive)"
      : "var(--muted-foreground)"

  // tier bar geometry — position of current period kWh across the four tiers
  const TIERS = [
    { lo: 0, hi: 400, rate: 1.971 },
    { lo: 400, hi: 900, rate: 2.85 },
    { lo: 900, hi: 1500, rate: 3.33 },
    { lo: 1500, hi: 2000, rate: 4.68 },
  ]
  const TIER_MAX = 2000
  const tierPct = Math.min(100, (s.kwh_month / TIER_MAX) * 100)

  // budget status uses the PREDICTED bill (not cost so far)
  const predBill = p.available ? p.billSrd : s.cost_month
  const overBudget = data.budget != null && predBill > data.budget

  // chart data
  const histData = data.dailyBreakdown.map((d) => ({
    label: d.day.slice(5), // MM-DD
    value: histMode === "kwh" ? d.kwh : d.cost,
  }))
  // hourly: pad to a full 24h axis so the line fills as the day goes on
  const hourMap = new Map(data.hourlyToday.map((h) => [h.hour, h]))
  const hourData = Array.from({ length: 24 }, (_, hr) => {
    const row = hourMap.get(hr)
    return {
      label: `${hr}:00`,
      value: row ? (hourMode === "kwh" ? row.kwh : row.cost) : null,
    }
  })

  const unit = (m: "kwh" | "srd") => (m === "kwh" ? "kWh" : "SRD")

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* ── header row: live power + grid ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <Cap>Live vermogen</Cap>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tabular-nums text-foreground">
                  {online ? num(data.live!.watts, 0) : "—"}
                </span>
                <span className="text-lg text-muted-foreground">W</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                {online ? num(data.live!.voltage, 1) : "—"} V ·{" "}
                {online ? num(data.live!.current, 3) : "—"} A
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: "var(--secondary)", color: gridColor }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: gridColor }}
                />
                {gridLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                {online ? "apparaat online" : "apparaat offline"}
              </span>
            </div>
          </div>
        </Card>

        {/* detected appliance */}
        <Card>
          <Cap>Gedetecteerd apparaat</Cap>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            {APPLIANCE_NAMES[data.appliance] ?? data.appliance}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            type last op basis van stroomsignatuur
          </div>
        </Card>
      </div>

      {/* ── stat row: today / period / tier ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <Cap>Vandaag</Cap>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {fmtKwh(s.kwh_today, 2)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {srd(s.cost_today)}
          </div>
        </Card>
        <Card>
          <Cap>Deze periode</Cap>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {fmtKwh(s.kwh_month, 1)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {srd(s.cost_month)} tot nu toe
          </div>
        </Card>
        <Card>
          <Cap>Huidig tarief</Cap>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {srd(s.tier_rate)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">per kWh</div>
        </Card>
        <Card>
          <Cap>vs. gisteren</Cap>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {data.vsYesterday.pct > 0 ? "+" : ""}
            {num(data.vsYesterday.pct, 0)}%
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {fmtKwh(data.vsYesterday.today_kwh, 2)} vandaag
          </div>
        </Card>
      </div>

      {/* ── tier progress bar ── */}
      <Card>
        <div className="flex items-center justify-between">
          <Cap>Tariefschijf</Cap>
          <span className="text-xs text-muted-foreground">
            nog {num(s.kwh_to_next, 0)} kWh tot volgende schijf
          </span>
        </div>
        <div className="mt-3">
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
            {/* tier boundary ticks */}
            {TIERS.slice(1).map((t) => (
              <div
                key={t.lo}
                className="absolute top-0 h-full w-px bg-border"
                style={{ left: `${(t.lo / TIER_MAX) * 100}%` }}
              />
            ))}
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${tierPct}%`,
                background: overBudget ? "var(--destructive)" : "var(--primary)",
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>0</span>
            <span>400</span>
            <span>900</span>
            <span>1500</span>
            <span>2000+</span>
          </div>
        </div>
      </Card>

      {/* ── prediction + budget + subsidy ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <Cap>Voorspelling einde periode</Cap>
          {p.available ? (
            <>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {fmtKwh(p.forecastKwh, 0)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                tussen {num(p.laagKwh, 0)} en {num(p.hoogKwh, 0)} kWh
              </div>
              <div className="mt-2 text-lg font-semibold text-[color:var(--primary)]">
                ≈ {srd(p.billSrd)}
              </div>
              <div className="text-xs text-muted-foreground">
                {srd(p.billLaag)} – {srd(p.billHoog)} · {p.basis}
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">
              Nog te weinig data voor een voorspelling.
            </div>
          )}
        </Card>

        <Card>
          <Cap>Budget</Cap>
          {data.budget != null ? (
            <>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {srd(data.budget, 0)}
              </div>
              <div
                className="mt-1 text-sm font-medium"
                style={{
                  color: overBudget ? "var(--destructive)" : "var(--ok)",
                }}
              >
                {overBudget
                  ? `naar schatting ${srd(predBill - data.budget)} over budget`
                  : `blijft naar schatting binnen budget`}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (predBill / data.budget) * 100)}%`,
                    background: overBudget
                      ? "var(--destructive)"
                      : "var(--ok)",
                  }}
                />
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">
              Geen budget ingesteld (zie Instellingen).
            </div>
          )}
        </Card>

        <Card>
          <Cap>Rekening met subsidie</Cap>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">rekening</span>
              <span className="tabular-nums">
                {srd(s.cost_month + data.subsidy)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">subsidie</span>
              <span className="tabular-nums text-[color:var(--ok)]">
                − {srd(data.subsidy)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>te betalen</span>
              <span className="tabular-nums">{srd(s.cost_month)}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            subsidiebedrag is een schatting (nog niet bevestigd)
          </div>
        </Card>
      </div>

      {/* ── graphs: hourly + history, each with kWh/SRD toggle ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* hourly today */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <Cap>Vandaag per uur</Cap>
            <Toggle value={hourMode} onChange={setHourMode} />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourData} margin={{ left: -18, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                interval={3}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <ReTooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => [
                  `${Number(v).toFixed(2)} ${unit(hourMode)}`,
                  hourMode === "kwh" ? "verbruik" : "kosten",
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--chart-2)"
                fill="var(--chart-2)"
                fillOpacity={0.15}
                strokeWidth={2}
                connectNulls={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* history daily */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <Cap>Geschiedenis (deze periode)</Cap>
            <Toggle value={histMode} onChange={setHistMode} />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histData} margin={{ left: -18, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                interval={2}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <ReTooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => [
                  `${Number(v).toFixed(2)} ${unit(histMode)}`,
                  histMode === "kwh" ? "verbruik" : "kosten",
                ]}
              />
              <Bar
                dataKey="value"
                fill={histMode === "kwh" ? "var(--chart-2)" : "var(--chart-1)"}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── alerts ── */}
      {data.anomalies.length > 0 && (
        <Card>
          <Cap>Meldingen</Cap>
          <div className="mt-2 space-y-2">
            {data.anomalies.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span
                  className="mt-1 size-2 shrink-0 rounded-full"
                  style={{ background: "var(--warn)" }}
                />
                <div>
                  <div className="text-foreground">{a.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.timestamp).toLocaleString("nl-NL")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}