"use client"

import { InfoIcon } from "@phosphor-icons/react"

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

export default function OverPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      {/* brand lockup */}
      <div className="flex flex-col">
        <span className="font-mono text-sm text-muted-foreground">
          beep<span className="text-[color:var(--ok)]">Boop</span>
        </span>
        <span className="text-3xl font-extrabold tracking-tight text-[color:var(--primary)]">
          energyLink
        </span>
        <span className="mt-1 text-sm text-muted-foreground">
          AI-energiemonitor voor Surinaamse huishoudens
        </span>
      </div>

      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <Block title="Wat is energyLink?">
          energyLink is een slimme energiemonitor die om de hoofdstroomdraad van een
          woning klemt en continu het verbruik meet. Voor het eerst kan een gezin de
          elektriciteitsrekening zien opbouwen — in SRD, vóórdat de rekening komt — en
          advies krijgen in het Nederlands én Sranan Tongo.
        </Block>

        <Block title="Het probleem">
          De EBS-huishoudrekening is getrapt: hoe meer je verbruikt, hoe duurder elke
          volgende kWh. De rekening komt achteraf als een verrassing. Daarbovenop is het
          net instabiel — uitval en spanningsdips zijn dagelijkse realiteit. energyLink
          maakt verbruik, kosten en netkwaliteit zichtbaar.
        </Block>

        <Block title="Hoe het werkt">
          Een stroomsensor meet het verbruik en stuurt dit via WiFi naar de cloud. Daar
          wordt het omgezet naar het echte EBS-tarief, afgestemd op uw factuurperiode.
          Een AI-laag interpreteert de voorspelling en geeft praktisch, eerlijk advies —
          zonder verzonnen apparaten of bedragen. Bij netwerk- of stroomuitval blijft het
          apparaat lokaal meten en stuurt de data later na.
        </Block>

        <Block title="Het team">
          energyLink is gebouwd door team beepBoop, studenten aan de Anton de Kom
          Universiteit van Suriname, voor Hackomation 2026.
        </Block>
      </div>
    </div>
  )
}