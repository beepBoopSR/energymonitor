# energyLink

**An AI home-energy monitor built for Surinamese households.**
team **beepBoop** · Hackomation 2026

energyLink clamps onto a home's main power line and continuously measures
consumption. For the first time, a household can watch its electricity bill build
in real time — in SRD, against the *actual* tiered EBS tariff — and get grounded,
practical advice in **Dutch and Sranan Tongo**, before the bill ever arrives.

---

## The problem it solves

- **The EBS household tariff is tiered.** The more you use, the more each next kWh
  costs — and the bill only arrives at the end of the cycle, as a surprise.
- **The grid is unstable.** Outages and brownouts are a daily reality.
- **Existing energy monitors don't fit Suriname.** They assume a stable grid, a flat
  tariff, and an English-speaking user, and none of them can tell you your EBS bill.

energyLink makes consumption, cost, and grid quality visible and predictable, in the
user's own language.

---

## What it does

- **Live power & live cost** — watts, volts, amps, and the cost *per hour* at the
  current draw, in SRD, updating in real time.
- **Accurate EBS billing** — tiered energy charge, per-phase basis fee, subsidy bands,
  and a bill prediction — all aligned to the household's EBS billing cycle, not the
  calendar month.
- **Tariff-band awareness** — shows where you sit across the tiers and how far to the
  next (more expensive) band.
- **Grid monitoring** — detects and logs outages and brownouts, with buffering so no
  data is lost when the power flickers.
- **AI advisory** — grounded, bilingual (Dutch + Sranan Tongo) advice based on the
  household's real measured data.
- **Appliance recognition** — a trained classifier identifies the *type* of the
  dominant load (resistive heater / motor / switching charger) from its current
  signature.
- **Per-circuit clamps** — support for naming and monitoring individual circuits.

---

## Architecture

```
  ESP32 + sensors            Node.js backend             Next.js frontend
  ───────────────            ───────────────             ────────────────
  ADS1115 (I²C)              POST /api/readings          polls /api/dashboard
  SCT-013 current   ──WiFi──▶  reconstruct time   ◀──HTTP──  every 5s, renders
  ZMPT101B voltage             store + analyse             live dashboard
                               SQL billing model
                                    │
                                    ▼
                               Supabase (Postgres)
```

- **Device → backend:** the ESP32 measures and POSTs readings; the backend
  reconstructs timestamps (handling offline buffering), stores them, and runs grid /
  anomaly / appliance checks on each reading.
- **Backend → frontend:** the frontend never talks to the device or database directly —
  it polls the backend's HTTP endpoints, which run the SQL billing model and return a
  single JSON payload.
- **Billing lives in the database** as data-driven SQL functions, so a tariff change is
  a data update, not a code change — and the same model serves the dashboard, the
  prediction, and the AI from one source of truth.

---

## Repository structure

```
energymonitor/
├── 3D-models hardware case/     3D model of an enclosure (designed but not used —
│                                 we bought an off-the-shelf case; kept for reference)
├── Back-end/                    Node.js + Express backend
│   ├── beepBoop-Back-End/       the runnable backend project (see below)
│   └── AI_training_appliance_models/   appliance-classifier training pipeline (see below)
├── C++ esp32 Firmwares/         ESP32 firmware — the full monitoring firmware, plus a
│                                 separate firmware used to capture waveforms for
│                                 appliance-fingerprint training
├── Extras/                      Business Model Canvas, poster, circuit diagram
├── SQL queries and functions/   Supabase schema, billing functions, seed data
├── api/                         API-related files
├── app/                         Next.js frontend (see below)
├── landingPage/                 Standalone marketing landing page
├── site/                        site assets
├── CLAUDE.md                    project notes
├── LICENSE
├── README.md                    this file
└── package.json
```

> The trees below list the **key files and their roles** — the important application
> code — rather than every file in the project. Config, generated, and dependency
> files are omitted for readability.

### Backend — `Back-end/beepBoop-Back-End/`

```
├── index.js                    Express app entry; registers routes, enables CORS
├── config/
│   └── supabase.js             configured Supabase client
├── routes/
│   ├── readings.js             POST /api/readings  ·  GET /api/dashboard
│   ├── tips.js                 GET /api/latest-tip  ·  POST /api/generate-tip
│   ├── settings.js             GET/POST /api/settings (phase, cycle, budget)
│   └── clamps.js               GET /api/clamps  ·  POST /api/clamps/rename
├── services/
│   ├── readings.js             reading ingestion + summary assembly
│   ├── reconstruction.js       timestamp reconstruction (offline buffering)
│   ├── gridMonitor.js          outage / brownout detection (with hysteresis)
│   ├── anomalyMonitor.js       power-spike + overuse detection
│   ├── applianceMonitor.js     appliance classifier — live inference
│   ├── energyContext.js        gathers the real context for the AI
│   ├── prompt.js               builds the grounded, bilingual AI prompt
│   ├── tips.js                 AI tip generation + retrieval
│   └── billPrediction.js       statistical bill projection (single source)
└── .env                        Supabase + Gemini keys (NOT committed)
```

### Appliance-classifier training — `Back-end/AI_training_appliance_models/`

```
├── 1_extract_features.py       waveform captures -> electrical features (CSV)
├── 2_train_model.py            train + cross-validate decision tree -> JSON
├── 3_inference_reference.js    reference of the JS inference (live in services/)
├── appliance_tree.json         the exported trained model
├── captures/                   example current-waveform captures
├── README.md                   pipeline documentation
└── NILM_future_work.md         why multi-appliance disaggregation was shelved
```

### Frontend — `app/app/`

```
├── app/
│   ├── page.tsx                redirects to /dashboard
│   ├── layout.tsx              sidebar shell (SidebarProvider)
│   ├── globals.css             energyLink light theme
│   ├── dashboard/page.tsx      main dashboard (live power, cost, tiers, AI, graphs)
│   ├── clamp/[id]/page.tsx     per-clamp detail (mini-dashboard + rename)
│   ├── uitval/page.tsx         outages (history)
│   ├── instellingen/page.tsx   settings (phase, EBS cycle, budget)
│   └── over/page.tsx           about / project story
├── components/
│   ├── app-sidebar.tsx         collapsible energyLink sidebar
│   ├── nav-main.tsx            nav items + active highlight
│   ├── nav-user.tsx            device identity footer
│   ├── clamps-section.tsx      dashboard Circuits section
│   └── ui/                     shadcn/ui components
├── lib/
│   └── api.ts                  API client, typed responses, mock data, USE_MOCK flag
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Running it

Both the backend and the frontend must be running. The device (or synthetic data)
feeds the backend; the frontend polls the backend.

### Backend (port 3000)

```bash
cd Back-end
cd beepBoop-Back-End
node index.js
```

The backend serves on **port 3000** and exposes the API the frontend reads.

### Frontend (port 3001)

```bash
cd app
cd app
npm install          # first time only
npm run dev -- -p 3001
```

The frontend runs on **port 3001** (kept separate from the backend's 3000) and is
available at `http://localhost:3001`. Opening it redirects to the dashboard.

> The frontend fetches from the backend at `http://localhost:3000`. CORS is enabled on
> the backend so the cross-port requests are allowed. If the dashboard shows
> "kan geen verbinding maken," the backend isn't running or isn't reachable.

---

## Configuration

- **Backend:** environment variables for the Supabase connection and the AI (Gemini)
  API key live in the backend's environment (see the backend's own config). **Do not
  commit real keys.**
- **Frontend:** the API base URL and device id are set in the frontend's `lib/api.ts`.
  A `USE_MOCK` flag there switches between mock data and the live backend.
- **Database:** the SQL to create the schema, functions, and seed data is in
  `SQL queries and functions/` — run the table definitions first, then the functions,
  then the seed data.

---

## Firmware

The `C++ esp32 Firmwares/` folder contains two firmwares:

1. **Monitoring firmware** — the production firmware: samples voltage and current via
   the ADS1115, computes RMS/power/energy and waveform features, and POSTs readings to
   the backend over WiFi, with offline buffering and timestamp reconstruction.
2. **Fingerprint-capture firmware** — a separate build used during development to
   capture raw current waveforms of known appliances, for training the appliance
   classifier.

---

## Hardware

A sensing front-end around an ESP32:

- **ESP32 DevKit** — microcontroller with WiFi
- **ADS1115** — 16-bit I²C ADC (address 0x48; SDA→D21, SCL→D22)
- **SCT-013-000** — non-invasive current clamp, on the ADS1115 *differential* input
  A0–A1 with a 220 Ω burden resistor
- **ZMPT101B** — isolated AC voltage sensor, single-ended on A2

The circuit diagram is in `Extras/`. An enclosure 3D model is in
`3D-models hardware case/` (we used an off-the-shelf case in the end, but kept the
model).

---

## The AI, honestly scoped

energyLink uses AI in three distinct ways, and is deliberately precise about which is
which:

1. **Appliance recognition — trained machine learning.** A decision-tree classifier,
   trained on captured current waveforms, identifies the *type* of load from its
   electrical signature. (Training pipeline documented separately.)
2. **Advisory — a language model, grounded.** An LLM interprets the household's real
   computed data into personalized, bilingual advice, constrained so it never invents
   appliances or amounts.
3. **Anomaly detection — algorithmic.** Threshold-based spike and unusual-usage
   detection (not a trained model, and not described as one).

The **bill prediction is a transparent statistical projection, not AI** — we don't
dress it up as one. Multi-appliance disaggregation (NILM) was prototyped and shelved
for hardware reasons, documented as future work.

---

## Team

Built by team **beepBoop**, students at the Anton de Kom University of Suriname (ADeKUS),
for **Hackomation 2026**.

---

## License

See `LICENSE`.