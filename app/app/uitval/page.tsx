"use client"

import * as React from "react"
import { getOutages, type OutageEvent } from "@/lib/api"
import { LightningIcon, ClockIcon } from "@phosphor-icons/react"
import { PlannedOutagesSection } from "@/components/planned-outages-section"

function fmtDuration(min: number) {
  if (min < 1) return "< 1 min"
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} u ${m} min` : `${h} uur`
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString("nl-NL", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function UitvalPage() {
  const [outages, setOutages] = React.useState<OutageEvent[] | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    getOutages().then(setOutages).catch((e) => setErr(e.message))
  }, [])

  const total = outages?.length ?? 0
  const totalMin = outages?.reduce((s, o) => s + o.duration_min, 0) ?? 0
  const longest = outages?.reduce((m, o) => Math.max(m, o.duration_min), 0) ?? 0

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <LightningIcon weight="fill" className="text-[color:var(--primary)]" />
        <h1 className="text-xl font-bold text-foreground">Stroomuitval</h1>
      </div>

      {/* summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm" style={{ borderTop: "3px solid var(--destructive)" }}>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Onderbrekingen</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{total}</div>
          <div className="mt-1 text-xs text-muted-foreground">geregistreerd</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm" style={{ borderTop: "3px solid var(--warn)" }}>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Totale duur</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtDuration(totalMin)}</div>
          <div className="mt-1 text-xs text-muted-foreground">zonder stroom</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm" style={{ borderTop: "3px solid var(--warn)" }}>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Langste</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{fmtDuration(longest)}</div>
          <div className="mt-1 text-xs text-muted-foreground">enkele onderbreking</div>
        </div>
      </div>

      {/* history list */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClockIcon weight="fill" className="text-[color:var(--muted-foreground)]" />
          Geschiedenis
        </div>
        {err ? (
          <div className="text-sm text-muted-foreground">Kan uitval niet laden — {err}</div>
        ) : !outages ? (
          <div className="text-sm text-muted-foreground">Laden…</div>
        ) : outages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Nog geen stroomuitval geregistreerd. Zodra het net uitvalt, verschijnt het hier.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {outages.map((o, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                style={{ borderLeft: "3px solid var(--destructive)" }}>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--secondary)]">
                    <LightningIcon weight="fill" className="text-[color:var(--destructive)]" />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-foreground">Stroomonderbreking</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(o.timestamp)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-foreground">{fmtDuration(o.duration_min)}</div>
                  <div className="text-xs text-muted-foreground">duur</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EBS planned outages — real data from the scraper */}
      <PlannedOutagesSection />
    </div>
  )
}