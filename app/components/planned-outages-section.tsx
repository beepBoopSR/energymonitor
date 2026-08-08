"use client"

import * as React from "react"
import { getPlannedOutages, type PlannedOutage } from "@/lib/api"
import { MapPinIcon, CalendarBlankIcon, WarningCircleIcon } from "@phosphor-icons/react"

function fmtDate(iso: string) {
  if (!iso) return "Datum onbekend"
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
}

const CONF = {
  high:   { label: "hoog",       color: "var(--destructive)" },
  medium: { label: "gemiddeld",  color: "var(--warn)" },
  low:    { label: "laag",       color: "var(--muted-foreground)" },
} as const

export function PlannedOutagesSection() {
  const [outages, setOutages] = React.useState<PlannedOutage[] | null>(null)
  const [relevantOnly, setRelevantOnly] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    setOutages(null)
    getPlannedOutages(relevantOnly)
      .then(setOutages)
      .catch((e) => setErr(e.message))
  }, [relevantOnly])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPinIcon weight="fill" className="text-[color:var(--ok)]" />
          Geplande onderbrekingen
        </div>
        {/* relevant / all toggle */}
        <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
          <button
            onClick={() => setRelevantOnly(true)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              relevantOnly ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mijn gebied
          </button>
          <button
            onClick={() => setRelevantOnly(false)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              !relevantOnly ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Alles
          </button>
        </div>
      </div>

      {/* honest scope note */}
      <p className="rounded-lg bg-[color:var(--secondary)] px-3 py-2 text-xs text-secondary-foreground">
        Alleen geplande onderhoudsonderbrekingen die EBS vooraf aankondigt. Onvoorziene
        storingen en afschakeling bij vermogenstekort staan hier niet in.
      </p>

      {err ? (
        <div className="text-sm text-muted-foreground">Kan gegevens niet laden — {err}</div>
      ) : !outages ? (
        <div className="text-sm text-muted-foreground">Laden…</div>
      ) : outages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          {relevantOnly
            ? "Geen geplande onderbrekingen bekend voor uw gebied."
            : "Geen geplande onderbrekingen bekend."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {outages.map((o) => {
            const conf = o.match ? CONF[o.match.confidence] : null
            return (
              <div
                key={o.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
                style={{ borderLeft: `3px solid ${conf?.color ?? "var(--border)"}` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CalendarBlankIcon weight="fill" className="text-muted-foreground" />
                      {fmtDate(o.date)}
                    </div>
                    <div className="mt-1 text-sm text-foreground">
                      {o.ressorts.length ? o.ressorts.join(", ") : o.districts.join(", ")}
                      {o.districts.length && o.ressorts.length ? (
                        <span className="text-muted-foreground"> · {o.districts.join(", ")}</span>
                      ) : null}
                    </div>
                    {o.feeders.length > 0 && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Feeder: {o.feeders.join(", ")}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {o.timeKnown ? `${o.startTime}–${o.endTime}` : "tijd nog niet bekend"}
                    </div>
                  </div>

                  {conf && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: "var(--secondary)", color: conf.color }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: conf.color }} />
                      Relevantie: {conf.label}
                    </span>
                  )}
                </div>

                {o.match?.reasons?.length ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {o.match.reasons.join(" · ")}
                  </div>
                ) : null}

                {o.geometryStatus === "pending" && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--warn)]">
                    <WarningCircleIcon /> Exacte gebied wordt nog geladen…
                  </div>
                )}

                {o.gisLink && (
                  <a
                    href={o.gisLink} target="_blank" rel="noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-[color:var(--primary)] hover:underline"
                  >
                    Kaart bekijken op EBS →
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}