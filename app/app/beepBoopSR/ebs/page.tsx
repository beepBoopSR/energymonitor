import React from "react"

// 1. Dit is de mock data voor de hackathon demo. 
// Elk huis krijgt hiermee unieke, realistische energie monitoring waarden.
const energyMockData: Record<string, { 
  verbruik: string, 
  opwekking: string, 
  kosten: string, 
  status: string,
  batterij: string
}> = {
  "house-1": { 
    verbruik: "3.4 kW", 
    opwekking: "1.8 kW", 
    kosten: "€ 42,50", 
    status: "Optimaal rendement",
    batterij: "82%"
  },
  "house-2": { 
    verbruik: "5.1 kW", 
    opwekking: "0.4 kW", 
    kosten: "€ 89,10", 
    status: "Hoor verbruik waargenomen",
    batterij: "45%"
  },
  "default": { 
    verbruik: "0.0 kW", 
    opwekking: "0.0 kW", 
    kosten: "€ 0,00", 
    status: "Geen verbinding met sensoren",
    batterij: "0%"
  }
}

interface PageProps {
  searchParams: Promise<{ team?: string }>
}

export default async function EbsPage({ searchParams }: PageProps) {
  // 2. We lezen de geselecteerde 'team' query-parameter uit de URL (?team=house-1)
  const resolvedParams = await searchParams
  const currentTeam = resolvedParams.team || "house-1"

  // Maak de weergavenaam netjes (bijv: "house-1" -> "House 1")
  const houseDisplayName = currentTeam
    .replace("-", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())

  // 3. Haal de bijbehorende energiewaarden op uit de mock data
  const data = energyMockData[currentTeam] || energyMockData["default"]

  /* 
  ======================================================================
  BACKEND KOPPELING INSTRUCTIE (Zodra jullie klaar zijn voor de backend):
  
  Verwijder de 'energyMockData' hierboven en zet deze twee regels aan:
  
  const response = await fetch(`http://localhost:5000/api/energy?team=${currentTeam}`, { cache: 'no-store' })
  const data = await response.json()
  ======================================================================
  */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      {/* Dynamische Header die mee verandert met de user selectie */}
      <div className="mb-8 border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-emerald-400">
          E.B.S. N.V. Energy Monitor
        </h1>
        <p className="text-zinc-400 mt-2 text-sm">
          Actueel overzicht voor: <span className="text-zinc-100 font-bold bg-zinc-950 px-2 py-1 rounded border border-zinc-800">{houseDisplayName}</span>
        </p>
      </div>

      {/* Grid Layout voor de sensorwaarden per huis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Kaart 1: Actueel Verbruik */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
          <div className="text-sm font-medium text-zinc-400">Actueel Stroomverbruik</div>
          <div className="text-4xl font-bold mt-2 text-red-400 tracking-tight">
            {data.verbruik}
          </div>
          <p className="text-xs text-zinc-500 mt-2">Live update via ESP-sensor</p>
        </div>

        {/* Kaart 2: Zonne-energie Opwekking */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
          <div className="text-sm font-medium text-zinc-400">Zonnepanelen Opbrengst</div>
          <div className="text-4xl font-bold mt-2 text-emerald-400 tracking-tight">
            {data.opwekking}
          </div>
          <p className="text-xs text-zinc-500 mt-2">Actuele zonne-energie invoer</p>
        </div>

        {/* Kaart 3: Thuisbatterij Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
          <div className="text-sm font-medium text-zinc-400">Thuisbatterij Capaciteit</div>
          <div className="text-4xl font-bold mt-2 text-blue-400 tracking-tight">
            {data.batterij}
          </div>
          <p className="text-xs text-zinc-500 mt-2">Opslagsysteem status</p>
        </div>

        {/* Kaart 4: Geschatte Maandkosten */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md">
          <div className="text-sm font-medium text-zinc-400">Geschatte Kosten (Huidige Maand)</div>
          <div className="text-4xl font-bold mt-2 text-zinc-100 tracking-tight">
            {data.kosten}
          </div>
          <p className="text-xs text-zinc-500 mt-2">Berekend o.b.v. E.B.S. tarieven</p>
        </div>

        {/* Kaart 5: Systeem Status melding */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-md md:col-span-2 lg:col-span-2">
          <div className="text-sm font-medium text-zinc-400">AI Netwerk Analyse</div>
          <div className={`text-xl font-semibold mt-3 ${data.status.includes("Hoor") ? 'text-amber-400' : 'text-emerald-400'}`}>
            • {data.status}
          </div>
          <p className="text-xs text-zinc-500 mt-4">
            Het algoritme analyseert continu patronen om onregelmatigheden in het energienetwerk te detecteren.
          </p>
        </div>

      </div>
    </div>
  )
}
