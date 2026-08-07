"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  getClamps, getDashboard, srd, kwh as fmtKwh, num,
  type Clamp, type DashboardData,
} from "@/lib/api"
import { ArrowLeftIcon, PlugIcon, PencilSimpleIcon, CheckIcon } from "@phosphor-icons/react"


function Stat({ cap, big, sub, accent }: {
  cap: string; big: React.ReactNode; sub?: string; accent?: string
}) {
  return (
    <div
      className="rounded-xl border border-border/70 bg-card p-4"
      style={{
        boxShadow: "0 1px 2px rgba(28,26,22,0.05), 0 4px 12px -6px rgba(28,26,22,0.10)",
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
      }}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{cap}</div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">{big}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

export default function ClampDetailPage() {
  const params = useParams()
  const clampId = Number(params.id)

  const [clamp, setClamp] = React.useState<Clamp | null>(null)
  const [summary, setSummary] = React.useState<DashboardData | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [nameInput, setNameInput] = React.useState("")

  // ref mirrors `editing` so the polling interval always reads the CURRENT value,
  // not the value captured when the effect first ran (which stays false forever
  // and would overwrite the name mid-type).
  const editingRef = React.useRef(false)
  React.useEffect(() => { editingRef.current = editing }, [editing])

  React.useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await getClamps()
        const c = res.clamps.find((x) => x.clamp_id === clampId) || null
        if (!alive) return
        setClamp((prev) => {
          // don't overwrite the name while the user is editing it
          if (editingRef.current && prev) return { ...c!, name: prev.name }
          return c
        })
        if (c && !editingRef.current) setNameInput(c.name)
        // only pull the rich summary for a connected clamp
        if (c?.connected) {
          const d = await getDashboard()
          if (alive) setSummary(d)
        } else {
          setSummary(null)
        }
      } catch { /* ignore */ }
    }
    load()
    const id = setInterval(load, 5000)
    return () => { alive = false; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampId])

  const saveName = async () => {
    if (!clamp || !nameInput.trim()) return
    const { renameClamp } = await import("@/lib/api")
    await renameClamp(clamp.clamp_id, nameInput.trim())
    setClamp({ ...clamp, name: nameInput.trim() })
    setEditing(false)
  }

  if (!clamp)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        <Link href="/dashboard" className="text-[color:var(--primary)]">← Dashboard</Link>
        <div className="mt-4">Klem niet gevonden.</div>
      </div>
    )

  const online = clamp.connected && clamp.live
  const s = summary?.summary
  const tierRate = s?.tier_rate ?? 0
  const costPerHour = online && clamp.live ? (clamp.live.watts / 1000) * tierRate : 0

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon /> Dashboard
      </Link>

      {/* header + rename */}
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl" style={{ background: "var(--secondary)" }}>
          <PlugIcon className={clamp.connected ? "text-[color:var(--ok)]" : "text-muted-foreground"} />
        </span>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-lg font-bold text-foreground outline-none focus:border-[color:var(--primary)]"
              autoFocus
            />
            <button onClick={saveName} className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--primary)] text-white">
              <CheckIcon />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{clamp.name}</h1>
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" title="Naam wijzigen">
              <PencilSimpleIcon />
            </button>
          </div>
        )}
      </div>

      {online ? (
        <>
          {/* live row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat cap="Vermogen" accent="var(--ok)" big={<>{num(clamp.live!.watts, 0)}<span className="text-base font-normal text-muted-foreground"> W</span></>} />
            <Stat cap="Kosten nu" accent="var(--primary)"
              big={<span className="text-[color:var(--primary)]">{costPerHour.toFixed(2)}</span>}
              sub={`SRD/uur · ${srd(tierRate)}/kWh`} />
            <Stat cap="Spanning · Stroom"
              big={<span className="text-lg">{num(clamp.live!.voltage, 1)}V · {num(clamp.live!.current, 3)}A</span>} />
          </div>

          {/* today + cycle */}
          <div className="grid grid-cols-2 gap-4">
            <Stat cap="Vandaag"
              big={s ? fmtKwh(s.kwh_today, 2) : "—"}
              sub={s ? `${srd(s.cost_today)} aan verbruik` : undefined} />
            <Stat cap="Deze cyclus"
              big={s ? fmtKwh(s.kwh_month, 1) : "—"}
              sub={s ? `${srd((s as any).energy_cost_month ?? s.cost_month)} aan verbruik` : undefined} />
          </div>

          <div className="rounded-lg bg-[color:var(--secondary)] px-3 py-2 text-xs text-secondary-foreground">
            Dit circuit is momenteel de enige aangesloten klem, dus het verbruik hier komt overeen met het totale huisverbruik.
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <PlugIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">Geen klem verbonden</div>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Sluit een stroomklem aan op dit circuit om het verbruik van dit deel van het huis te zien.
            energyLink ondersteunt meerdere klemmen per apparaat.
          </p>
        </div>
      )}
    </div>
  )
}