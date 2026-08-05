"use client"

import * as React from "react"
import {
  getDashboard, srd, kwh as fmtKwh, num, APPLIANCE_NAMES,
  type DashboardData,
} from "@/lib/api"
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid,
} from "recharts"
import { LightningIcon, WalletIcon, TrendUpIcon, WarningIcon } from "@phosphor-icons/react"

const POLL_MS = 5000

function Section({ title, icon, children, right }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}{title}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

function Card({ children, className = "", accent }: {
  children: React.ReactNode; className?: string; accent?: string
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}
      style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      {children}
    </div>
  )
}

function Cap({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</div>
}

function Toggle({ value, onChange }: { value: "kwh" | "srd"; onChange: (v: "kwh" | "srd") => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
      {(["kwh", "srd"] as const).map((k) => (
        <button key={k} onClick={() => onChange(k)}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            value === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
          {k === "kwh" ? "kWh" : "SRD"}
        </button>
      ))}
    </div>
  )
}

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
        if (alive) { setData(d); setErr(null) }
      } catch (e: any) { if (alive) setErr(e.message || "offline") }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (err && !data)
    return <div className="p-6 text-sm text-muted-foreground">Kan geen verbinding maken met de backend — {err}</div>
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Laden…</div>

  const s = data.summary
  const p = data.prediction
  const online = data.deviceOnline && data.live

  const gridLabel =
    data.grid === "up" ? "Net normaal" : data.grid === "low" ? "Lage spanning"
    : data.grid === "out" ? "Stroomuitval" : "Onbekend"
  const gridColor =
    data.grid === "up" ? "var(--ok)" : data.grid === "low" ? "var(--warn)"
    : data.grid === "out" ? "var(--destructive)" : "var(--muted-foreground)"

  const TIER_MAX = 2000
  const tierPct = Math.min(100, (s.kwh_month / TIER_MAX) * 100)
  const predBill = p.available ? p.billSrd : s.cost_month
  const overBudget = data.budget != null && predBill > data.budget

  const histData = data.dailyBreakdown.map((d) => ({
    label: d.day.slice(5), value: histMode === "kwh" ? d.kwh : d.cost,
  }))
  const hourMap = new Map(data.hourlyToday.map((h) => [h.hour, h]))
  const hourData = Array.from({ length: 24 }, (_, hr) => {
    const row = hourMap.get(hr)
    return { label: `${hr}:00`, value: row ? (hourMode === "kwh" ? row.kwh : row.cost) : null }
  })
  const unit = (m: "kwh" | "srd") => (m === "kwh" ? "kWh" : "SRD")

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border-2 p-6 shadow-sm"
        style={{ background: "var(--secondary)", borderColor: "var(--chart-5)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live vermogen</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-6xl font-bold tabular-nums text-foreground">{online ? num(data.live!.watts, 0) : "—"}</span>
              <span className="text-2xl text-muted-foreground">W</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground tabular-nums">
              {online ? num(data.live!.voltage, 1) : "—"} V · {online ? num(data.live!.current, 3) : "—"} A
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium" style={{ color: gridColor }}>
              <span className="size-2 rounded-full" style={{ background: gridColor }} />{gridLabel}
            </span>
            <span className="text-xs text-muted-foreground">{online ? "apparaat online" : "apparaat offline"}</span>
            <span className="mt-1 rounded-lg bg-card px-2.5 py-1 text-xs text-foreground">
              {APPLIANCE_NAMES[data.appliance] ?? data.appliance}
            </span>
          </div>
        </div>
      </div>

      {/* VERBRUIK */}
      <Section title="Verbruik" icon={<LightningIcon weight="fill" className="text-[color:var(--ok)]" />}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card accent="var(--ok)">
            <Cap>Vandaag</Cap>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtKwh(s.kwh_today, 2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{srd(s.cost_today)}</div>
          </Card>
          <Card accent="var(--ok)">
            <Cap>Deze periode</Cap>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtKwh(s.kwh_month, 1)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{srd(s.cost_month)} tot nu toe</div>
          </Card>
          <Card accent="var(--warn)">
            <Cap>Huidig tarief</Cap>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{srd(s.tier_rate)}</div>
            <div className="mt-1 text-xs text-muted-foreground">per kWh</div>
          </Card>
          <Card accent={data.vsYesterday.pct > 0 ? "var(--destructive)" : "var(--ok)"}>
            <Cap>vs. gisteren</Cap>
            <div className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: data.vsYesterday.pct > 0 ? "var(--destructive)" : "var(--ok)" }}>
              {data.vsYesterday.pct > 0 ? "+" : ""}{num(data.vsYesterday.pct, 0)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{fmtKwh(data.vsYesterday.today_kwh, 2)} vandaag</div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <Cap>Tariefschijf</Cap>
            <span className="text-xs font-medium" style={{ color: "var(--warn)" }}>
              nog {num(s.kwh_to_next, 0)} kWh tot volgende schijf
            </span>
          </div>
          <div className="mt-3">
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
              {[400, 900, 1500].map((b) => (
                <div key={b} className="absolute top-0 h-full w-px bg-border" style={{ left: `${(b / TIER_MAX) * 100}%` }} />
              ))}
              <div className="h-full rounded-full transition-all" style={{ width: `${tierPct}%`, background: "var(--primary)" }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>0</span><span>400</span><span>900</span><span>1500</span><span>2000+</span>
            </div>
          </div>
        </Card>
      </Section>

      {/* KOSTEN */}
      <Section title="Kosten & rekening" icon={<WalletIcon weight="fill" className="text-[color:var(--primary)]" />}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card accent="var(--primary)" className="bg-[color:var(--secondary)]">
            <Cap>Voorspelde rekening</Cap>
            {p.available ? (
              <>
                <div className="mt-1 text-3xl font-bold text-[color:var(--primary)]">{srd(p.billSrd)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{srd(p.billLaag)} – {srd(p.billHoog)} · {p.basis}</div>
                <div className="mt-2 text-sm text-foreground">
                  {fmtKwh(p.forecastKwh, 0)} <span className="text-muted-foreground">({num(p.laagKwh, 0)}–{num(p.hoogKwh, 0)})</span>
                </div>
              </>
            ) : <div className="mt-2 text-sm text-muted-foreground">Nog te weinig data voor een voorspelling.</div>}
          </Card>

          <Card>
            <Cap>Budget</Cap>
            {data.budget != null ? (
              <>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-foreground">{srd(predBill, 0)}</span>
                  <span className="text-xs text-muted-foreground">van {srd(data.budget, 0)}</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (predBill / data.budget) * 100)}%`,
                      background: overBudget ? "var(--destructive)" : "var(--ok)" }} />
                </div>
                <div className="mt-2 text-sm font-medium" style={{ color: overBudget ? "var(--destructive)" : "var(--ok)" }}>
                  {overBudget ? `${srd(predBill - data.budget)} over budget` : `${srd(data.budget - predBill)} onder budget`}
                </div>
              </>
            ) : <div className="mt-2 text-sm text-muted-foreground">Geen budget ingesteld (zie Instellingen).</div>}
          </Card>

          <Card>
            <Cap>Rekening met subsidie</Cap>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">rekening</span>
                <span className="tabular-nums">{srd(s.cost_month + data.subsidy)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">subsidie</span>
                <span className="tabular-nums font-medium text-[color:var(--ok)]">− {srd(data.subsidy)}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span>te betalen</span><span className="tabular-nums">{srd(s.cost_month)}</span></div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">subsidiebedrag is een schatting</div>
          </Card>
        </div>
      </Section>

      {/* GRAFIEKEN */}
      <Section title="Grafieken" icon={<TrendUpIcon weight="fill" className="text-[color:var(--chart-2)]" />}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <Cap>Vandaag per uur</Cap><Toggle value={hourMode} onChange={setHourMode} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourData} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <ReTooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${Number(v).toFixed(2)} ${unit(hourMode)}`, hourMode === "kwh" ? "verbruik" : "kosten"]} />
                <Area type="monotone" dataKey="value" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.18} strokeWidth={2} connectNulls={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <Cap>Geschiedenis (deze periode)</Cap><Toggle value={histMode} onChange={setHistMode} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histData} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <ReTooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`${Number(v).toFixed(2)} ${unit(histMode)}`, histMode === "kwh" ? "verbruik" : "kosten"]} />
                <Bar dataKey="value" fill={histMode === "kwh" ? "var(--chart-2)" : "var(--chart-1)"} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </Section>

      {/* MELDINGEN */}
      {data.anomalies.length > 0 && (
        <Section title="Meldingen" icon={<WarningIcon weight="fill" className="text-[color:var(--warn)]" />}>
          <div className="space-y-2">
            {data.anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
                style={{ borderLeft: "3px solid var(--warn)" }}>
                <div>
                  <div className="text-foreground">{a.message}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString("nl-NL")}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}