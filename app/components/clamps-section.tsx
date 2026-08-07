"use client"

import * as React from "react"
import Link from "next/link"
import { getClamps, num, type Clamp } from "@/lib/api"
import { PlugIcon, HouseIcon, CaretRightIcon } from "@phosphor-icons/react"

// liveWatts comes from the dashboard's single /api/dashboard fetch, so the
// "Hele huis" total and the connected clamp stay perfectly in sync with the
// hero's live reading. We still fetch /api/clamps for names + which clamps
// exist, but take the live value from the shared source (no second reading).
export function ClampsSection({ liveWatts }: { liveWatts: number | null }) {
  const [clamps, setClamps] = React.useState<Clamp[] | null>(null)

  React.useEffect(() => {
    let alive = true
    const load = () => getClamps().then((d) => alive && setClamps(d.clamps)).catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (!clamps) return null

  const anyConnected = clamps.some((c) => c.connected) && liveWatts != null

  return (
    <div className="flex flex-col gap-3">
      {/* whole-house total = the shared live reading (same as the hero) */}
      <div className="rounded-xl border border-border bg-[color:var(--secondary)] p-4"
        style={{ borderTop: "3px solid var(--ok)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-card">
              <HouseIcon weight="fill" className="text-[color:var(--ok)]" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">Hele huis (totaal)</div>
              <div className="text-xs text-muted-foreground">som van alle aangesloten klemmen</div>
            </div>
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {anyConnected ? num(liveWatts!, 0) : "—"}
            <span className="ml-0.5 text-sm font-normal text-muted-foreground">W</span>
          </div>
        </div>
      </div>

      {/* individual clamps */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {clamps.map((c) => {
          // connected clamp shows the shared live value (one clamp = whole house);
          // unconnected clamps show em-dashes.
          const watts = c.connected && liveWatts != null ? liveWatts : null
          return (
            <Link
              key={c.clamp_id}
              href={`/clamp/${c.clamp_id}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg" style={{ background: "var(--secondary)" }}>
                  <PlugIcon className={c.connected ? "text-[color:var(--ok)]" : "text-muted-foreground"} />
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.connected ? "verbonden" : "niet verbonden"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-mono text-lg font-bold tabular-nums tracking-tight text-foreground">
                  {watts != null ? num(watts, 0) : "—"}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">W</span>
                </div>
                <CaretRightIcon className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}