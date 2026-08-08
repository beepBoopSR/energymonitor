"use client"

import * as React from "react"
import Link from "next/link"
import { getClamps, addClamp, num, type Clamp } from "@/lib/api"
import { PlugIcon, HouseIcon, CaretRightIcon, PlusIcon, CheckIcon, XIcon } from "@phosphor-icons/react"

export function ClampsSection({ liveWatts }: { liveWatts: number | null }) {
  const [clamps, setClamps] = React.useState<Clamp[] | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const addingRef = React.useRef(false)
  React.useEffect(() => { addingRef.current = adding }, [adding])

  const reload = React.useCallback(
    () => getClamps().then((d) => setClamps(d.clamps)).catch(() => {}),
    []
  )

  React.useEffect(() => {
    let alive = true
    const load = () => getClamps().then((d) => alive && !addingRef.current && setClamps(d.clamps)).catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const onAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await addClamp(newName.trim())
      setNewName("")
      setAdding(false)
      await reload()
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

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

        {/* add-a-clamp tile */}
        {adding ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-[color:var(--primary)] bg-card p-4">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onAdd(); if (e.key === "Escape") { setAdding(false); setNewName("") } }}
              placeholder="Naam, bijv. Airco"
              className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-[color:var(--primary)]"
            />
            <button onClick={onAdd} disabled={saving}
              className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary)] text-white disabled:opacity-50">
              <CheckIcon />
            </button>
            <button onClick={() => { setAdding(false); setNewName("") }}
              className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground">
              <XIcon />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-[color:var(--primary)] hover:text-foreground"
          >
            <PlusIcon /> Klem toevoegen
          </button>
        )}
      </div>
    </div>
  )
}