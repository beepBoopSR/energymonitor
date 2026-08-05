<<<<<<< HEAD
// app/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
=======
"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function berekenEbsSchijfStatus(totaalKwh: number) {
  let schijf = 1;
  let maxKwhInSchijf = 400;
  let huidigeKwhInSchijf = totaalKwh;
  let tarief = 1.97;

  if (totaalKwh <= 400) {
    schijf = 1;
    maxKwhInSchijf = 400;
    huidigeKwhInSchijf = totaalKwh;
    tarief = 1.97; // Schijf 1 tarief
  } else if (totaalKwh <= 900) {
    schijf = 2;
    maxKwhInSchijf = 500; // 400 tot 900 is 500 kWh ruimte
    huidigeKwhInSchijf = totaalKwh - 400;
    tarief = 2.85; // Schijf 2 tarief
  } else if (totaalKwh <= 1500) {
    schijf = 3;
    maxKwhInSchijf = 600; // 900 tot 1500 is 600 kWh ruimte
    huidigeKwhInSchijf = totaalKwh - 900;
    tarief = 3.30; // Schijf 3 tarief
  } else {
    schijf = 4;
    maxKwhInSchijf = 2000; // Onbeperkt / fictieve grens voor de balk
    huidigeKwhInSchijf = totaalKwh - 1500;
    tarief = 4.68; // Schijf 4 tarief
  }

  const percentage = (huidigeKwhInSchijf / maxKwhInSchijf) * 100;
  const resterend = maxKwhInSchijf - huidigeKwhInSchijf;

  return { schijf, percentage, resterend, tarief };
}


interface HouseSensorData {
  buurt: string;
  netwerkStatus: "Online" | "Storing" | "Gepland Onderhoud";
  ebsMelding: string;
  tariefKlasse: string;
  groep1: { volt: number; ampere: number; watt: number };
  groep2: { volt: number; ampere: number; watt: number };
}

export default function BeepBoopSRPage() {
  const searchParams = useSearchParams();
  const teamParam = searchParams.get('team') || "house-1";
  const houseTitle = teamParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const [data, setData] = useState<HouseSensorData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // HIER ZET JE DE NIEUWE STATE NEER:
  const [srdBudget, setSrdBudget] = useState<number>(1500);
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // De rest van je bestaande useEffect code...


  
  useEffect(() => {
    const fetchHouseData = async () => {
      try {
        setLoading(true);
        const mockDatabase: Record<string, HouseSensorData> = {
          "house-1": {
            buurt: "Zorg en Hoop",
            netwerkStatus: "Online",
            ebsMelding: "Geen actuele storingen bekend voor deze buurt.",
            tariefKlasse: "Fase 1 (Sociaal tarief)",
            groep1: { volt: 220.4, ampere: 4.5, watt: 991.8 },
            groep2: { volt: 219.8, ampere: 3.2, watt: 703.3 }
          },
          "house-2": {
            buurt: "Geyersvlijt",
            netwerkStatus: "Storing",
            ebsMelding: "EBS Melding: Onderhoud aan de transformator tot 14:00u.",
            tariefKlasse: "Fase 3 (Normaal tarief)",
            groep1: { volt: 110.2, ampere: 8.1, watt: 892.6 },
            groep2: { volt: 111.0, ampere: 0.0, watt: 0.0 }
          },
          "default": {
            buurt: "Onbekende Buurt",
            netwerkStatus: "Online",
            ebsMelding: "Geen data beschikbaar.",
            tariefKlasse: "Standaard",
            groep1: { volt: 0, ampere: 0, watt: 0 },
            groep2: { volt: 0, ampere: 0, watt: 0 }
          }
        };

        const activeKey = mockDatabase[teamParam] ? teamParam : "default";
        setData(mockDatabase[activeKey]);
      } catch (error) {
        console.error("Fout bij ophalen van huis data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHouseData();
    const interval = setInterval(fetchHouseData, 3000);
    return () => clearInterval(interval);
  }, [teamParam]);

  const totaalVolt = data ? Math.max(data.groep1.volt, data.groep2.volt) : 0;
  const totaalAmpere = data ? (data.groep1.ampere + data.groep2.ampere) : 0;
  const totaalWattage = data ? (data.groep1.watt + data.groep2.watt) : 0;
  const geschatteKostenPerUur = (totaalWattage / 1000) * 1.50;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/30">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{houseTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 max-w-none">
        {loading ? (
          <div className="text-yellow-500 animate-pulse font-bold text-center py-20">
            Live data inladen uit database & ESP sensoren...
          </div>
        ) : (
          <>
            {/* BLOK 1: Stroomlevering */}
            <section className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Stroomlevering</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Locatie: <span className="text-foreground font-medium">{data?.buurt}</span></p>
                </div>
                <div className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full ${
                  data?.netwerkStatus === "Online" ? "text-green-500 bg-green-500/10" : "text-destructive bg-destructive/10"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${data?.netwerkStatus === "Online" ? "bg-green-500 animate-pulse" : "bg-destructive"}`} />
                  Netwerk: {data?.netwerkStatus}
                </div>
              </div>
              <div className="text-sm border-t border-sidebar-border/20 pt-2 text-muted-foreground">
                <p className={data?.netwerkStatus !== "Online" ? "text-amber-500 font-medium" : ""}>
                  {data?.ebsMelding}
                </p>
              </div>
            </section>

{/* BLOK 2: Budget & Totaal Verbruik */}
{(() => {
  // 1. Live datums genereren van de computer van de jury
  const nu = new Date();
  const huidigeMaandNaam = nu.toLocaleDateString('nl-NL', { month: 'long' });
  const geformatteerdeMaand = huidigeMaandNaam.charAt(0).toUpperCase() + huidigeMaandNaam.slice(1);
  const huidigeDatumVoluit = nu.toISOString().split('T')[0];

  // 2. Jouw live hardware metingen uit de ESP/State
  const actueelKwhMaand = totaalWattage * 0.045; 
  const actueelKwhDag = totaalWattage * 0.0025;
  const schijfStatus = typeof berekenEbsSchijfStatus === 'function' 
    ? berekenEbsSchijfStatus(actueelKwhMaand) 
    : { schijf: 1, percentage: (actueelKwhMaand / 400) * 100, resterend: 400 - actueelKwhMaand, tarief: 1.97 };
  
  // Dynamische schijfgrenzen voor de tekst boven de balk
  const schijfGrenzen: Record<number, string> = {
    1: "<= 400 kWh",
    2: "<= 900 kWh",
    3: "<= 1500 kWh",
    4: "> 1500 kWh"
  };

  // 3. Officiële EBS Kostenberekening (Vastrecht + Variabele kosten)
  const vastrecht = data?.tariefKlasse?.includes("3") ? 349.13 : 211.78;
  const srdMaand = vastrecht + (actueelKwhMaand * schijfStatus.tarief);
  const srdDag = actueelKwhDag * schijfStatus.tarief;
  const srdPercentage = (srdMaand / srdBudget) * 100;

  // Surinaamse norm/gemiddelden voor vergelijking
  const gemiddeldDagverbruikSrd = 45.00;
  const gemiddeldDagverbruikKwh = 15.00;

  return (
    <section id="budget" className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-6 flex flex-col gap-6">
      
      {/* ================= BOVENSTE HELFT: GELD (SRD) ================= */}
      <div className="space-y-4">
        {/* SRD Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              Budget verbruik <span className="text-foreground font-bold">SRD {srdMaand.toFixed(2)}</span> van SRD {srdBudget.toFixed(2)}
            </span>
            <span className="text-foreground font-bold">{srdPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full bg-sidebar-border/20 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${srdPercentage > 90 ? 'bg-destructive' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(srdPercentage, 100)}%` }}
            />
          </div>
        </div>

        <Separator className="bg-sidebar-border/20" />

        {/* 3 Geld Kolommen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Maandkosten */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground block">Verbruikt {geformatteerdeMaand}</span>
            <p className="text-2xl font-bold text-foreground">SRD {srdMaand.toFixed(2)}</p>
          </div>

          {/* Dagkosten + Gemiddelde */}
          <div className="space-y-1 md:border-l md:border-sidebar-border/20 md:pl-6">
            <span className="text-xs font-medium text-muted-foreground block">Verbruikt Vandaag ({huidigeDatumVoluit})</span>
            <p className="text-2xl font-bold text-foreground">SRD {srdDag.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground/70">
              Gemiddeld: <span className="font-medium text-foreground">SRD {gemiddeldDagverbruikSrd.toFixed(2)} / dag</span>
            </p>
          </div>

          {/* Aanpasbaar Budget */}
          <div className="space-y-1 md:border-l md:border-sidebar-border/20 md:pl-6">
            <span className="text-xs font-medium text-muted-foreground block">Ingestelde budget</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-muted-foreground">SRD</span>
              <input 
                type="number" 
                value={srdBudget} 
                onChange={(e) => {
                  const waarde = parseFloat(e.target.value);
                  setSrdBudget(waarde > 0 ? waarde : 1);
                }}
                className="w-24 text-2xl font-bold text-foreground bg-transparent border-b border-b-sidebar-border/40 focus:border-b-foreground focus:outline-none p-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* DIKKE SCHEIDINGSLIJN TUSSEN DE TWEE HELFTEN */}
      <Separator className="bg-sidebar-border/40 my-2 h-[2px]" />

      {/* ================= ONDERSTE HELFT: EBS (kWh) ================= */}
      <div className="space-y-6">
        {/* EBS Schijven Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              EBS status <span className="text-amber-500 font-bold">Schijf {schijfStatus.schijf}</span> ({schijfGrenzen[schijfStatus.schijf] || "<= 400 kWh"})
            </span>
            <span className="text-amber-500 font-bold">
              {schijfStatus.schijf < 4 ? `Nog ${schijfStatus.resterend.toFixed(0)} kWh te gaan` : 'Hoogste schijf bereikt'}
            </span>
          </div>
          <div className="h-2 w-full bg-sidebar-border/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-500 rounded-full" 
              style={{ width: `${Math.min(schijfStatus.percentage, 100)}%` }}
            />
          </div>
        </div>

        <Separator className="bg-sidebar-border/20" />

        {/* 2 Energie/kWh Kolommen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Maandverbruik kWh */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground block">Verbruik {geformatteerdeMaand}</span>
            <p className="text-2xl font-bold text-foreground">{actueelKwhMaand.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kWh</span></p>
          </div>

          {/* Dagverbruik kWh */}
          <div className="space-y-1 md:border-l md:border-sidebar-border/20 md:pl-6">
            <span className="text-xs font-medium text-muted-foreground block">Verbruik Vandaag</span>
            <p className="text-2xl font-bold text-foreground">{actueelKwhDag.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">kWh</span></p>
            <p className="text-[11px] text-muted-foreground/70">
              Normverbruik: <span className="font-medium text-foreground">{gemiddeldDagverbruikKwh.toFixed(2)} kWh / dag</span>
            </p>
          </div>
        </div>

        {/* Schermtijd-stijl: 1 Week kWh Totale Dagverbruik Grafiek */}
        <div className="space-y-2 pt-2 border-t border-sidebar-border/10">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
            Totaal verbruik per dag (Schermtijd-weergave)
          </span>
          
          {(() => {
            // Recharts imports check: Zorg dat je BarChart, Bar, Cell ook bovenin hebt staan indien nodig,
            // maar we kunnen ze ook direct uit recharts trekken als je ze hebt geïmporteerd.
            // Dynamische totale dagsommen gebaseerd op je live ESP data (schermtijd-stijl mock)
            const basisVerbruik = actueelKwhDag > 0 ? actueelKwhDag : 14.5;
            
            const weekData = [
              { dag: "Ma", kwh: parseFloat((basisVerbruik * 0.85).toFixed(1)) },
              { dag: "Di", kwh: parseFloat((basisVerbruik * 1.20).toFixed(1)) },
              { dag: "Wo", kwh: parseFloat((basisVerbruik * 0.95).toFixed(1)) },
              { dag: "Do", kwh: parseFloat((basisVerbruik * 1.05).toFixed(1)) },
              { dag: "Vr", kwh: parseFloat((basisVerbruik * 1.40).toFixed(1)) }, // Hoogste dag (bijv. weekend start)
              { dag: "Za", kwh: parseFloat((basisVerbruik * 1.15).toFixed(1)) },
              { dag: "Zo", kwh: parseFloat((basisVerbruik * 0.75).toFixed(1)) },
            ];

            // Bepaal de hoogste waarde voor de dynamische y-as schaling
            const maxKwh = Math.max(...weekData.map(d => d.kwh));
            const yAsMax = Math.ceil(maxKwh / 5) * 5 + 5; 

            return (
              <div className="h-[180px] w-full mt-3 pr-4">
                <div className="h-[200px] w-full mt-3 pr-4 bg-zinc-900/50 p-2 rounded-lg border border-sidebar-border/20">
  <ResponsiveContainer width="100%" height="100%">
    {/* 1. Verander BarChart naar LineChart */}
    <LineChart data={weekData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
      {/* 2. Voeg een Cartesiaans Grid toe voor de geblokte achtergrond */}
      <CartesianGrid stroke="#3f3f46" strokeDasharray="0" />
      
      {/* 3. Assen instellen met strakke zwarte/grijze lijnen */}
      <XAxis 
        dataKey="dag" 
        stroke="#a1a1aa" 
        fontSize={11} 
        tickLine={true} 
        axisLine={true} 
      />
      <YAxis 
        stroke="#a1a1aa" 
        fontSize={11} 
        tickLine={true} 
        axisLine={true} 
        domain={[0, yAsMax]} 
        tickCount={6} 
        tickFormatter={(value: any) => `${value} kWh`} 
      />
      
      <Tooltip 
        cursor={{ stroke: '#ef4444', strokeWidth: 1 }} 
        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "6px", fontSize: "12px" }} 
        formatter={(value: any) => [`${value} kWh`, "Verbruik"]} 
      />

      {/* 4. De Lijn zelf: Felrood met zwarte ronde markeringen (stippen) */}
      <Line
        type="linear"
        dataKey="kwh"
        stroke="#ef4444"      /* Rode lijnkleur */
        strokeWidth={3}       /* Dikte van de lijn */
        dot={{ 
          fill: '#000000',    /* Zwarte stip invulling */
          stroke: '#ef4444',  /* Rode rand om de stip */
          strokeWidth: 2, 
          r: 5                /* Grootte van de stip */
        }}
        activeDot={{ 
          fill: '#ef4444', 
          r: 7 
        }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

              </div>
            );
          })()}
        </div>
         </div>
    </section>
   
  );
})()}
                {/* BLOK 3: Groep 1 */}
                <section className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-6 flex-1">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">Groep 1</h2>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <div>Volt: <span className="font-bold text-foreground block text-base">{data?.groep1.volt} V</span></div>
                    <div>Ampere: <span className="font-bold text-foreground block text-base">{data?.groep1.ampere} A</span></div>
                    <div>Wattage: <span className="font-bold text-emerald-500 block text-base">{data?.groep1.watt} W</span></div>
                  </div>
                </section>

                {/* BLOK 4: Groep 2 */}
                <section className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-6 flex-1">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">Groep 2</h2>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <div>Volt: <span className="font-bold text-foreground block text-base">{data?.groep2.volt} V</span></div>
                    <div>Ampere: <span className="font-bold text-foreground block text-base">{data?.groep2.ampere} A</span></div>
                    <div>Wattage: <span className="font-bold text-emerald-500 block text-base">{data?.groep2.watt} W</span></div>
                  </div>
                </section>
                
              {/* BLOK 5: AI Chatbox */}
              <section className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-6 flex flex-col min-h-[350px]">
                <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">AI Chatbox</h2>
                <div className="flex-1 rounded-lg border border-sidebar-border/20 bg-background/50 p-4 mb-4 text-sm text-muted-foreground overflow-y-auto">
                  <p className="italic text-xs text-center text-muted-foreground/60 mb-2">
                    Vraag advies over het verbruik van {houseTitle} ({data?.buurt})...
                  </p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Vraag de AI..." 
                    className="flex-1 rounded-lg border border-sidebar-border/50 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none"
                  />
                  <button className="bg-foreground text-background px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                    Verzenden
                  </button>
                </div>
              </section>

          
          </>
        )}
      </div>
    </>
)};
>>>>>>> 110b56a3422770ab1b69968a2e6a32d399e2cc18
