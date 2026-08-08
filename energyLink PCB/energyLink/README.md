# energyLink — KiCad project (team beepBoop)

Home energy monitor for Suriname's grid (120–127 V, 60 Hz). Clamps the main
live conductor, measures consumption, buffers to ESP32 flash when WiFi is down,
and infers mains outages from its own power-loss timestamps.

## Files
| File | What it is |
|------|-----------|
| `energyLink.kicad_sch` | Schematic — all components with net-label connectivity |
| `energyLink.kicad_pcb` | PCB — 55×40 mm outline, isolation slot, zoned placement |
| `energyLink.net`       | Netlist — importable into Pcbnew if needed |
| `energyLink.kicad_pro` | Project file — open this in KiCad first |

Open `energyLink.kicad_pro` in KiCad 7 or 8.

## Please read — these files were generated programmatically
They are structurally valid and parse cleanly, but they were built without the
KiCad GUI, so treat them as a strong starting point, not a finished board:

1. Symbols are simple labelled rectangles with correct pins and nets. On first
   open, run **Inspect → Electrical Rules Check (ERC)**. Connectivity is carried
   by net labels on each pin, which is valid but will raise a few "no power flag"
   ERC notes — add PWR_FLAG on +3V3 / +5V / GND to clear them.
2. Footprints are named to standard KiCad libraries (`Converter_ACDC`,
   `RF_Module`, etc.). If a name doesn't resolve on your install, reassign via
   **Tools → Footprint Assignment**. The `.kicad_pcb` uses simplified 2-pad
   placeholders so you can see the zoned layout; swap in the real footprints
   before routing.
3. The PCB shows **placement and the isolation strategy**, not routed copper.
   Route it in Pcbnew — keep every mains trace inside the left zone.

## Design summary
- **Isolated SELV logic.** The only mains-referenced parts are J3, F1, RV1, the
  HLK-PM01 primary, and the ZMPT101B primary. CT, ZMPT, and HLK all isolate, so
  the ESP32/ADS1115 ground never touches mains — which is what makes the
  external 3.5 mm CT jack safe to handle.
- **Current:** SCT-013-000 → 3.5 mm jack → 22 Ω burden across ADS1115 A0–A1,
  biased to ~1.65 V via the VMID divider (R2/R3/Cb).
- **Voltage:** ZMPT101B isolated output → ADS1115 A2 (VSENSE).
- **Power:** HLK-PM01 (mains→5 V) → AMS1117-3.3 → 3V3. C1 470 µF bulk at the
  ESP32 prevents WiFi brownout resets.
- **Safety:** fuse + MOV on the line input; ≥6–8 mm creepage and a milled slot
  between mains and SELV zones (CAT III near a panel). A real product needs
  proper safety testing/certification and, in most places, electrician install.

## Productization notes (not in these files)
- Consider replacing the ADS1115 with an **ADE7953** metering IC for true active
  power / power factor (the ADS1115 multiplexes, so V and I aren't sampled
  simultaneously). Keep it inside the isolated domain, fed from the ZMPT output.
- **ESP32-C3-MINI-1** is smaller/cheaper and plenty for this workload.
