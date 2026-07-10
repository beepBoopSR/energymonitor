export default function AboutBeepBoopPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Over beepBoopSR
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Alles over het concept, het algoritme en de visie achter dit project.
        </p>
      </div>

      <hr className="border-sidebar-border/30" />

      {/* Hier kun je je eigen verhaal typen */}
      <article className="prose prose-neutral dark:prose-invert space-y-4 text-sm md:text-base leading-relaxed text-muted-foreground">
        <p>
          Hier kun je de volledige uitleg plaatsen over wat <strong>beepBoopSR</strong> precies doet. 
          Vertel bijvoorbeeld over hoe het AI-model patronen herkent in de ESP-sensoren of hoe het 
          gebruikers helpt energie te besparen.
        </p>
        
        <h2 className="text-xl font-semibold text-foreground mt-6">Hoe het werkt</h2>
        <p>
          Voeg hier extra paragrafen toe voor de jury van de hackathon om jullie technische 
          architectuur en backend-koppelingen uit te leggen.
        </p>
      </article>
    </div>
  );
}
