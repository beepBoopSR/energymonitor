"use client";

import {
  useSearchParams,
} from "next/navigation";
import { useState, useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const houseContent: Record<string, { introduction: string; features: string[] }> = {
  "House 1": {
    introduction  : "Welcome to the beepBoopSR project workspace. This project aims to monitor and aggregate energy metrics with automated triggers, visualization tools, and clean logs.",
    features: [
      "Real-time Energy Analytics",
      "Automated Smart Triggers",
      "Multi-House Management"
    ]
  },
  "House 2": {
    introduction  : "Welcome to the beepBoopSR project workspace. This project aims to monitor and aggregate energy metrics with automated triggers, visualization tools, and clean logs.",
    features: [
      "Real-time Energy Analytics",
      "Automated Smart Triggers",
      "Multi-House Management"
    ]
  },
  "default": {
    introduction  : "Welcome to the beepBoopSR project workspace. This project aims to monitor and aggregate energy metrics with automated triggers, visualization tools, and clean logs.",
    features: [
      "Real-time Energy Analytics",
      "Automated Smart Triggers",
      "Multi-House Management"
    ]
  }
};

export default function BeepBoopSRPage() {

  const searchParams = useSearchParams();
  const teamParam = searchParams.get('team');
  const houseName = teamParam
    ? teamParam.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : "House 1";

  const activeKey = teamParam && houseContent[teamParam] ? teamParam : "default";
  const currentData = houseContent[activeKey];

  //DIT STUK MOET NOG AAN DE BACKEND KOPPELEN, ZODAT HIJ DE DATA VAN HET GESELECTEERDE HUIS OPLAADT
  const [sensorData, setSensorData] = useState<{ temperature: number; humidity: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const simulateDatabaseFetch = () => {
      const mockDatabase: Record<string, { temperature: number; humidity: number }> = {
        "house-1": { temperature: 23.4, humidity: 42 },
        "house-2": { temperature: 19.8, humidity: 55 },
        "default": { temperature: 21.0, humidity: 48 }
      };

      const activeKey = teamParam && mockDatabase[teamParam] ? teamParam : "default";
      
      setSensorData(mockDatabase[activeKey]);
      setLoading(false);
    };

    const timer = setTimeout(simulateDatabaseFetch, 1000);
    return () => clearTimeout(timer);
  }, [teamParam]);

// Einde van het stuk dat aan de backend gekoppeld moet worden
  
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-sidebar-border/30">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>beepBoopSR</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 max-w-none">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{houseName}</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Detailed information about the {houseName} project.
          </p>
        </div>
        
        <Separator className="bg-sidebar-border/30" />

        <div className="space-y-8">
          <section id="introduction" className="space-y-2 target:animate-highlight rounded-xl p-4 transition-all">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Introduction</h2>
            <div className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-4 md:p-6">
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                Welcome to the beepBoopSR project workspace. This project aims to monitor and aggregate energy metrics with automated triggers, visualization tools, and clean logs.
              </p>
            </div>
          </section>

          <section id="features" className="space-y-2 target:animate-highlight rounded-xl p-4 transition-all">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Features</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
              <div className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-4">
                <h3 className="font-semibold text-foreground text-sm md:text-base">Real-time Energy Analytics</h3>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {loading ? (
                      <p className="text-yellow-500 animate-pulse font-bold">Laden uit database...</p>
                    ) : (
                      <>
                        {}
                        <p>Temperatuur: <span className="font-bold text-foreground">{sensorData?.temperature} °C</span></p>
                        <p>Luchtvochtigheid: <span className="font-bold text-foreground">{sensorData?.humidity} %</span></p>
                        <p>Status: <span className="text-green-500 font-bold">Gekoppeld (Mock)</span></p>
                      </>
                    )}
                  </div>
              </div>
              <div className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-4">
                <h3 className="font-semibold text-foreground text-sm md:text-base">Automated Smart Triggers</h3>
                <p className="text-muted-foreground text-xs md:text-sm mt-1">
                  Configure alerts and automatic shutoffs when power usage crosses custom limits.
                </p>
              </div>
              <div className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-4">
                <h3 className="font-semibold text-foreground text-sm md:text-base">Multi-House Management</h3>
                <p className="text-muted-foreground text-xs md:text-sm mt-1">
                  Toggle seamlessly between different properties and locations using the network switcher.
                </p>
              </div>
              <div className="rounded-xl border border-sidebar-border/30 bg-muted/20 p-4">
                <h3 className="font-semibold text-foreground text-sm md:text-base">Historical Logs</h3>
                <p className="text-muted-foreground text-xs md:text-sm mt-1">
                  Export energy reports and consumption histories in standard file formats.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
