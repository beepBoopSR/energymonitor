"use client"

import * as React from "react"
import { getSettings, saveSettings, EBS_CYCLES, type Settings } from "@/lib/api"
import { GearIcon, CheckCircleIcon } from "@phosphor-icons/react"

function Section({ title, desc, children }: {
  title: string; desc?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {desc && <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

export default function InstellingenPage() {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    getSettings().then(setSettings).catch((e) => setErr(e.message))
  }, [])

  const update = (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s))
    setSaved(false)
  }

  const onSave = async () => {
    if (!settings) return
    setSaving(true)
    setErr(null)
    try {
      await saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setErr(e.message || "opslaan mislukt")
    } finally {
      setSaving(false)
    }
  }

  if (err && !settings)
    return <div className="p-6 text-sm text-muted-foreground">Kan instellingen niet laden — {err}</div>
  if (!settings) return <div className="p-6 text-sm text-muted-foreground">Laden…</div>

  const selectedCycle = EBS_CYCLES.find((c) => c.code === settings.cycle_code)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <GearIcon weight="fill" className="text-[color:var(--primary)]" />
        <h1 className="text-xl font-bold text-foreground">Instellingen</h1>
      </div>

      {/* PHASE */}
      <Section title="Aansluitfase" desc="Uw EBS-aansluiting: 1, 2 of 3 fasen. Bepaalt het basistarief.">
        <div className="flex gap-2">
          {[1, 2, 3].map((ph) => (
            <button
              key={ph}
              onClick={() => update({ phase: ph })}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                settings.phase === ph
                  ? "border-[color:var(--primary)] bg-[color:var(--secondary)] text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {ph} fase{ph > 1 ? "n" : ""}
            </button>
          ))}
        </div>
      </Section>

      {/* CYCLE */}
      <Section
        title="EBS-cyclus"
        desc="Uw cyclus bepaalt uw meteropname- en factuurdag. Te vinden op uw stroomrekening of via nvebs.com."
      >
        <select
          value={settings.cycle_code ?? ""}
          onChange={(e) => update({ cycle_code: e.target.value })}
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-[color:var(--primary)]"
        >
          <option value="" disabled>Kies uw cyclus…</option>
          {EBS_CYCLES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — meteropname {c.read}e, facturering {c.invoice}e
            </option>
          ))}
        </select>
        {selectedCycle && (
          <div className="mt-3 rounded-lg bg-[color:var(--secondary)] px-3 py-2 text-xs text-secondary-foreground">
            Uw verbruiksperiode loopt van de {selectedCycle.read}e van de maand tot de{" "}
            {selectedCycle.read}e van de volgende maand. De rekening komt op de{" "}
            {selectedCycle.invoice}e.
          </div>
        )}
      </Section>

      {/* BUDGET */}
      <Section title="Maandbudget" desc="Stel een budget in SRD in. U krijgt een melding als de voorspelde rekening erboven uitkomt.">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">SRD</span>
          <input
            type="number"
            min={0}
            step={50}
            value={settings.budget ?? ""}
            onChange={(e) =>
              update({ budget: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="bijv. 500"
            className="h-10 w-40 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-[color:var(--primary)]"
          />
        </div>
      </Section>

      {/* SAVE */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-[color:var(--ok)]">
            <CheckCircleIcon weight="fill" /> Opgeslagen
          </span>
        )}
        {err && <span className="text-sm text-[color:var(--destructive)]">{err}</span>}
      </div>
    </div>
  )
}