#!/usr/bin/env python3
"""Generate a KiCad 7 project (schematic + PCB + netlist) for the energyLink
home energy monitor by team beepBoop, from a single source-of-truth model.

Connectivity in the schematic is carried by net labels placed on short wire
stubs at each pin's connection point, so the same design drives the schematic,
the .net file, and the PCB placement.
"""
import uuid, datetime, os

def U(): return str(uuid.uuid4())

DATE = datetime.date.today().isoformat()
PROJ = "energyLink"
ROOT_UUID = U()

# ---------------------------------------------------------------------------
# SOURCE OF TRUTH: components and their pins.
# Each pin: (number, name, net, side)  side in {"L","R"}
# ---------------------------------------------------------------------------
COMPONENTS = [
    dict(ref="U1", value="ESP32-WROOM-32", fp="RF_Module:ESP32-WROOM-32",
         sym="ESP32_WROOM_32",
         pins=[("1","3V3","+3V3","L"),("2","GND","GND","L"),
               ("3","EN","EN","L"),("4","IO0","IO0","L"),
               ("5","IO21_SDA","SDA","R"),("6","IO22_SCL","SCL","R"),
               ("7","TXD0","TX","R"),("8","RXD0","RX","R")]),
    dict(ref="U2", value="ADS1115", fp="Package_TSSOP:TSSOP-10_3x3mm_P0.5mm",
         sym="ADS1115",
         pins=[("1","VDD","+3V3","L"),("2","GND","GND","L"),
               ("3","SCL","SCL","L"),("4","SDA","SDA","L"),("5","ADDR","GND","L"),
               ("6","A0","CT_A0","R"),("7","A1","VMID","R"),
               ("8","A2","VSENSE","R"),("9","A3","NC","R")]),
    dict(ref="U3", value="HLK-PM01", fp="Converter_ACDC:Converter_ACDC_HLK-PMxx",
         sym="HLK_PM01",
         pins=[("1","L","L_FUSED","L"),("2","N","N_MAINS","L"),
               ("3","+Vo","+5V","R"),("4","-Vo","GND","R")]),
    dict(ref="U4", value="ZMPT101B", fp="Transformer_THT:Transformer_ZMPT101B",
         sym="ZMPT101B",
         pins=[("1","P1","L_FUSED","L"),("2","P2","N_MAINS","L"),
               ("3","VCC","+3V3","R"),("4","OUT","VSENSE","R"),("5","GND","GND","R")]),
    dict(ref="U5", value="AMS1117-3.3", fp="Package_TO_SOT_SMD:SOT-223-3_TabPin2",
         sym="AMS1117_33",
         pins=[("1","VIN","+5V","L"),("2","GND","GND","L"),("3","VOUT","+3V3","R")]),
    dict(ref="J1", value="3.5mm_CT_jack", fp="Connector_Audio:Jack_3.5mm_CUI_SJ1-3533N",
         sym="JACK_CT",
         pins=[("1","TIP","CT_A0","L"),("2","SLEEVE","VMID","L")]),
    dict(ref="J2", value="Prog_1x6", fp="Connector_PinHeader_2.54mm:PinHeader_1x06_P2.54mm_Vertical",
         sym="HDR_PROG",
         pins=[("1","GND","GND","R"),("2","3V3","+3V3","R"),("3","EN","EN","R"),
               ("4","IO0","IO0","R"),("5","TX","TX","R"),("6","RX","RX","R")]),
    dict(ref="J3", value="Mains_1x2", fp="TerminalBlock:TerminalBlock_bornier-2_P5.08mm",
         sym="TERM_MAINS",
         pins=[("1","L","L_IN","L"),("2","N","N_MAINS","L")]),
    dict(ref="F1", value="Fuse_500mA_slow", fp="Fuse:Fuse_1210_3225Metric",
         sym="FUSE", pins=[("1","1","L_IN","L"),("2","2","L_FUSED","R")]),
    dict(ref="RV1", value="MOV_150VAC", fp="Varistor:RV_Disc_D9mm_W3.4mm_P5mm",
         sym="MOV", pins=[("1","1","L_FUSED","L"),("2","2","N_MAINS","R")]),
    dict(ref="R1", value="22R_burden", fp="Resistor_SMD:R_0805_2012Metric",
         sym="R", pins=[("1","1","CT_A0","L"),("2","2","VMID","R")]),
    dict(ref="R2", value="100k", fp="Resistor_SMD:R_0805_2012Metric",
         sym="R", pins=[("1","1","+3V3","L"),("2","2","VMID","R")]),
    dict(ref="R3", value="100k", fp="Resistor_SMD:R_0805_2012Metric",
         sym="R", pins=[("1","1","VMID","L"),("2","2","GND","R")]),
    dict(ref="R4", value="4k7_SDA", fp="Resistor_SMD:R_0805_2012Metric",
         sym="R", pins=[("1","1","SDA","L"),("2","2","+3V3","R")]),
    dict(ref="R5", value="4k7_SCL", fp="Resistor_SMD:R_0805_2012Metric",
         sym="R", pins=[("1","1","SCL","L"),("2","2","+3V3","R")]),
    dict(ref="R6", value="10k_EN", fp="Resistor_SMD:R_0805_2012Metric",
         sym="R", pins=[("1","1","EN","L"),("2","2","+3V3","R")]),
    dict(ref="R7", value="10k_IO0", fp="Resistor_SMD:R_0805_2012Metric",
         sym="R", pins=[("1","1","IO0","L"),("2","2","+3V3","R")]),
    dict(ref="C1", value="470uF_bulk", fp="Capacitor_SMD:CP_Elec_6.3x7.7",
         sym="C", pins=[("1","1","+3V3","L"),("2","2","GND","R")]),
    dict(ref="C2", value="100nF", fp="Capacitor_SMD:C_0805_2012Metric",
         sym="C", pins=[("1","1","+3V3","L"),("2","2","GND","R")]),
    dict(ref="C3", value="100nF", fp="Capacitor_SMD:C_0805_2012Metric",
         sym="C", pins=[("1","1","+3V3","L"),("2","2","GND","R")]),
    dict(ref="C4", value="10uF", fp="Capacitor_SMD:C_0805_2012Metric",
         sym="C", pins=[("1","1","+5V","L"),("2","2","GND","R")]),
    dict(ref="C5", value="10uF", fp="Capacitor_SMD:C_0805_2012Metric",
         sym="C", pins=[("1","1","+3V3","L"),("2","2","GND","R")]),
    dict(ref="C6", value="100nF", fp="Capacitor_SMD:C_0805_2012Metric",
         sym="C", pins=[("1","1","+5V","L"),("2","2","GND","R")]),
    dict(ref="Cb", value="10uF_bias", fp="Capacitor_SMD:C_0805_2012Metric",
         sym="C", pins=[("1","1","VMID","L"),("2","2","GND","R")]),
]

# unique symbol geometry
def sym_geom(sym):
    comp = next(c for c in COMPONENTS if c["sym"] == sym)
    left = [p for p in comp["pins"] if p[3] == "L"]
    right = [p for p in comp["pins"] if p[3] == "R"]
    rows = max(len(left), len(right), 1)
    H = rows * 2.54 + 5.08
    W = 25.4 if sym in ("ESP32_WROOM_32","ADS1115","ZMPT101B","HLK_PM01") else 15.24
    return left, right, W, H

def pin_local(sym, number):
    """Return (lx, ly, angle, side) of a pin's connection point in symbol-local coords."""
    left, right, W, H = sym_geom(sym)
    comp = next(c for c in COMPONENTS if c["sym"] == sym)
    pins = comp["pins"]
    L = 2.54
    def col(side_pins, side):
        n = len(side_pins)
        top = (n - 1) * 2.54 / 2.0
        out = {}
        for i, p in enumerate(side_pins):
            y = top - i * 2.54
            if side == "L":
                out[p[0]] = (-W/2 - L, y, 0)
            else:
                out[p[0]] = (W/2 + L, y, 180)
        return out
    m = {}
    m.update(col(left, "L")); m.update(col(right, "R"))
    lx, ly, a = m[number]
    return lx, ly, a

# ---------------------------------------------------------------------------
# lib_symbols block
# ---------------------------------------------------------------------------
def lib_symbol_def(sym):
    left, right, W, H = sym_geom(sym)
    comp = next(c for c in COMPONENTS if c["sym"] == sym)
    s = []
    s.append(f'    (symbol "{PROJ}:{sym}" (in_bom yes) (on_board yes)')
    s.append(f'      (property "Reference" "U" (at 0 {H/2+2.54:.2f} 0)')
    s.append('        (effects (font (size 1.27 1.27))))')
    s.append(f'      (property "Value" "{comp["value"]}" (at 0 {-H/2-2.54:.2f} 0)')
    s.append('        (effects (font (size 1.27 1.27))))')
    s.append(f'      (property "Footprint" "{comp["fp"]}" (at 0 0 0)')
    s.append('        (effects (font (size 1.27 1.27)) hide))')
    # body
    s.append(f'      (symbol "{sym}_0_1"')
    s.append(f'        (rectangle (start {-W/2:.2f} {-H/2:.2f}) (end {W/2:.2f} {H/2:.2f})')
    s.append('          (stroke (width 0.254) (type default)) (fill (type background))))')
    # pins
    s.append(f'      (symbol "{sym}_1_1"')
    for num, name, net, side in comp["pins"]:
        lx, ly, a = pin_local(sym, num)
        etype = "power_in" if name in ("VDD","VCC","3V3","+Vo") else "passive"
        s.append(f'        (pin {etype} line (at {lx:.2f} {ly:.2f} {a}) (length 2.54)')
        s.append(f'          (name "{name}" (effects (font (size 1.0 1.0))))')
        s.append(f'          (number "{num}" (effects (font (size 1.0 1.0)))))')
    s.append('      )')
    s.append('    )')
    return "\n".join(s)

# ---------------------------------------------------------------------------
# placement grid for instances (mains left, SELV right)
# ---------------------------------------------------------------------------
MAINS = {"U3","U4","J3","F1","RV1"}
def place():
    pos = {}
    mx, my = 50.0, 50.0
    sx, sy = 150.0, 40.0
    mc = sc = 0
    for c in COMPONENTS:
        if c["ref"] in MAINS:
            col, row = mc % 1, mc // 1
            pos[c["ref"]] = (mx + col*60, my + row*40)
            mc += 1
        else:
            col, row = sc % 4, sc // 4
            pos[c["ref"]] = (sx + col*55, sy + row*40)
            sc += 1
    return pos
POS = place()

# ---------------------------------------------------------------------------
# schematic file
# ---------------------------------------------------------------------------
def build_sch():
    out = []
    out.append('(kicad_sch (version 20230121) (generator "energylink_gen")')
    out.append(f'  (uuid "{ROOT_UUID}")')
    out.append('  (paper "A3")')
    out.append('  (title_block')
    out.append(f'    (title "energyLink - home energy monitor")')
    out.append(f'    (date "{DATE}") (rev "A") (company "team beepBoop")')
    out.append('    (comment 1 "Suriname grid 120-127V 60Hz")')
    out.append('    (comment 2 "Isolated SELV logic; mains via HLK-PM01 + ZMPT101B")')
    out.append('  )')
    out.append('  (lib_symbols')
    for sym in sorted({c["sym"] for c in COMPONENTS}):
        out.append(lib_symbol_def(sym))
    out.append('  )')
    # instances + labels
    for c in COMPONENTS:
        x, y = POS[c["ref"]]
        iu = U()
        out.append(f'  (symbol (lib_id "{PROJ}:{c["sym"]}") (at {x:.2f} {y:.2f} 0) (unit 1)')
        out.append('    (in_bom yes) (on_board yes) (dnp no)')
        out.append(f'    (uuid "{iu}")')
        out.append(f'    (property "Reference" "{c["ref"]}" (at {x:.2f} {y-2:.2f} 0)')
        out.append('      (effects (font (size 1.27 1.27))))')
        out.append(f'    (property "Value" "{c["value"]}" (at {x:.2f} {y+2:.2f} 0)')
        out.append('      (effects (font (size 1.27 1.27))))')
        out.append(f'    (property "Footprint" "{c["fp"]}" (at {x:.2f} {y:.2f} 0)')
        out.append('      (effects (font (size 1.27 1.27)) hide))')
        for num, name, net, side in c["pins"]:
            out.append(f'    (pin "{num}" (uuid "{U()}"))')
        out.append('    (instances (project "%s"' % PROJ)
        out.append(f'      (path "/{ROOT_UUID}" (reference "{c["ref"]}") (unit 1))))')
        out.append('  )')
        # stubs + labels
        for num, name, net, side in c["pins"]:
            if net == "NC":
                continue
            lx, ly, a = pin_local(c["sym"], num)
            cx, cy = x + lx, y - ly           # abs connection point
            dx = -2.54 if side == "L" else 2.54
            ex, ey = cx + dx, cy
            out.append(f'  (wire (pts (xy {cx:.2f} {cy:.2f}) (xy {ex:.2f} {ey:.2f}))')
            out.append('    (stroke (width 0) (type default)) (uuid "%s"))' % U())
            just = "right" if side == "L" else "left"
            out.append(f'  (label "{net}" (at {ex:.2f} {ey:.2f} 0)')
            out.append(f'    (effects (font (size 1.27 1.27)) (justify {just} bottom)) (uuid "{U()}"))')
    out.append('  (sheet_instances (path "/" (page "1")))')
    out.append(')')
    return "\n".join(out)

# ---------------------------------------------------------------------------
# netlist (.net) - KiCad S-expr format, importable into Pcbnew
# ---------------------------------------------------------------------------
def build_net():
    nets = {}
    for c in COMPONENTS:
        for num, name, net, side in c["pins"]:
            if net == "NC":
                continue
            nets.setdefault(net, []).append((c["ref"], num))
    out = []
    out.append('(export (version "E")')
    out.append('  (design (source "energyLink.kicad_sch") (date "%s") (tool "energylink_gen"))' % DATE)
    out.append('  (components')
    for c in COMPONENTS:
        out.append(f'    (comp (ref "{c["ref"]}") (value "{c["value"]}")')
        out.append(f'      (footprint "{c["fp"]}"))')
    out.append('  )')
    out.append('  (nets')
    for i, (net, nodes) in enumerate(sorted(nets.items()), start=1):
        out.append(f'    (net (code "{i}") (name "{net}")')
        for ref, pin in nodes:
            out.append(f'      (node (ref "{ref}") (pin "{pin}"))')
        out.append('    )')
    out.append('  )')
    out.append(')')
    return "\n".join(out)

# ---------------------------------------------------------------------------
# PCB file - board outline, isolation slot, zone labels, placed footprints
# ---------------------------------------------------------------------------
LAYERS = """  (layers
    (0 "F.Cu" signal) (31 "B.Cu" signal)
    (32 "B.Adhes" user "B.Adhesive") (33 "F.Adhes" user "F.Adhesive")
    (34 "B.Paste" user) (35 "F.Paste" user)
    (36 "B.SilkS" user "B.Silkscreen") (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user) (39 "F.Mask" user)
    (40 "Dwgs.User" user "User.Drawings") (41 "Cmts.User" user "User.Comments")
    (42 "Eco1.User" user) (43 "Eco2.User" user)
    (44 "Edge.Cuts" user) (45 "Margin" user)
    (46 "B.CrtYd" user "B.Courtyard") (47 "F.CrtYd" user "F.Courtyard")
    (48 "B.Fab" user) (49 "F.Fab" user)
  )"""

BW, BH = 55.0, 40.0   # board mm
SLOTX = 18.0          # isolation slot x

def fp_size(ref):
    return {"U1":(18,25.5),"U3":(34,20),"U4":(20,20),"U2":(10,14),
            "J3":(12,10),"J1":(12,7)}.get(ref, (6,4))

def build_pcb():
    o = []
    o.append('(kicad_pcb (version 20221018) (generator "energylink_gen")')
    o.append('  (general (thickness 1.6))')
    o.append('  (paper "A4")')
    o.append(LAYERS)
    o.append('  (setup (pad_to_mask_clearance 0))')
    o.append('  (net 0 "")')
    # board outline (Edge.Cuts)
    corners = [(0,0),(BW,0),(BW,BH),(0,BH),(0,0)]
    for (x1,y1),(x2,y2) in zip(corners, corners[1:]):
        o.append(f'  (gr_line (start {x1} {y1}) (end {x2} {y2})')
        o.append('    (stroke (width 0.15) (type solid)) (layer "Edge.Cuts") (uuid "%s"))' % U())
    # isolation slot (closed loop on Edge.Cuts = internal cutout)
    slot = [(SLOTX-0.6,6),(SLOTX+0.6,6),(SLOTX+0.6,BH-6),(SLOTX-0.6,BH-6),(SLOTX-0.6,6)]
    for (x1,y1),(x2,y2) in zip(slot, slot[1:]):
        o.append(f'  (gr_line (start {x1} {y1}) (end {x2} {y2})')
        o.append('    (stroke (width 0.15) (type solid)) (layer "Edge.Cuts") (uuid "%s"))' % U())
    # zone/text annotations
    texts = [("MAINS - HIGH VOLTAGE", 9, 3, "F.SilkS"),
             ("LOGIC (SELV)", 37, 3, "F.SilkS"),
             ("energyLink  by team beepBoop", 27.5, 38, "F.SilkS"),
             (">= 6-8mm creepage / milled slot", SLOTX, 37, "Cmts.User")]
    for t, x, y, lyr in texts:
        o.append(f'  (gr_text "{t}" (at {x} {y}) (layer "{lyr}")')
        o.append('    (effects (font (size 1.2 1.2) (thickness 0.2))) (uuid "%s"))' % U())
    # footprints placed by zone
    mains_grid = [(6,12),(6,26),(30,12)]      # for U3,U4,J3 area (mains)
    m_i = 0
    sx, sy = 24.0, 10.0
    s_i = 0
    for c in COMPONENTS:
        w, h = fp_size(c["ref"])
        if c["ref"] in MAINS:
            base = [(9,14),(9,30),(9,5),(3,14),(3,22)]
            px, py = base[m_i % len(base)]; m_i += 1
        else:
            col = s_i % 4; row = s_i // 4
            px, py = sx + col*7.5, sy + row*7.0; s_i += 1
            if c["ref"] == "U1": px, py = 44, 12
        o.append(f'  (footprint "{c["fp"]}" (layer "F.Cu")')
        o.append(f'    (at {px} {py}) (uuid "{U()}")')
        o.append(f'    (property "Reference" "{c["ref"]}" (at 0 {-h/2-1:.1f} 0) (layer "F.SilkS")')
        o.append('      (effects (font (size 0.8 0.8) (thickness 0.12))))')
        o.append(f'    (property "Value" "{c["value"]}" (at 0 {h/2+1:.1f} 0) (layer "F.Fab")')
        o.append('      (effects (font (size 0.7 0.7) (thickness 0.1))))')
        # courtyard
        cw = [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2),(-w/2,-h/2)]
        for (x1,y1),(x2,y2) in zip(cw, cw[1:]):
            o.append(f'    (fp_line (start {x1:.2f} {y1:.2f}) (end {x2:.2f} {y2:.2f})')
            o.append('      (stroke (width 0.05) (type solid)) (layer "F.CrtYd"))')
        # two pads so copper exists
        for pi,(padx) in enumerate([-w/2+1.2, w/2-1.2]):
            o.append(f'    (pad "{pi+1}" smd rect (at {padx:.2f} 0) (size 1.2 1.2)')
            o.append('      (layers "F.Cu" "F.Paste" "F.Mask"))')
        o.append('  )')
    o.append(')')
    return "\n".join(o)

# ---------------------------------------------------------------------------
def build_pro():
    return ('{\n  "board": {},\n  "meta": {"filename": "energyLink.kicad_pro", "version": 1},\n'
            '  "schematic": {},\n  "sheets": [], "text_variables": {}\n}\n')

os.makedirs("/home/claude/energyLink", exist_ok=True)
def w(name, txt):
    p = f"/home/claude/energyLink/{name}"
    open(p, "w").write(txt)
    return p

files = {
    "energyLink.kicad_sch": build_sch(),
    "energyLink.kicad_pcb": build_pcb(),
    "energyLink.net": build_net(),
    "energyLink.kicad_pro": build_pro(),
}
for n, t in files.items():
    w(n, t)
print("written:", *files.keys())
