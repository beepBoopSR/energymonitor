-- ============================================================
-- energyLink · seed data — 03_seed_data.sql
-- team beepBoop · Hackomation 2026
--
-- Run AFTER 01_tables.sql and 02_functions.sql. Populates the
-- EBS tariff model and the billing cycles. These are DATA, so a
-- rate change here is an UPDATE — no code change needed.
--
-- Rates: EBS household tariff (Dec 2024). Verify against the
-- current EBS schedule before production use.
-- ============================================================

-- ── tiered energy price per kWh (marginal blocks) ──
-- Top band uses a large upper bound to represent "and above".
delete from tariff_blocks;
insert into tariff_blocks (lower_kwh, upper_kwh, rate_srd) values
  (0,    400,        1.971),
  (400,  900,        2.850),
  (900,  1500,       3.330),
  (1500, 1000000000, 4.680);

-- ── fixed monthly connection charge per phase ──
delete from tariff_basis;
insert into tariff_basis (phase, basis_srd) values
  (1, 211.78),
  (2, 293.97),
  (3, 349.13);

-- ── subject subsidy by total monthly consumption ──
-- Band edges use exclusive upper bounds so "t/m 150" includes 150:
--   0–150  -> 85,  151–300 -> 150,  301–450 -> 225,
--   451–500 -> 300, 501–900 -> 400,  >900 -> 0 (no row).
delete from tariff_subsidy;
insert into tariff_subsidy (lower_kwh, upper_kwh, amount_srd, is_placeholder) values
  (0,   151, 85,  false),
  (151, 301, 150, false),
  (301, 451, 225, false),
  (451, 501, 300, false),
  (501, 901, 400, false);

-- ── EBS billing cycles: meter-read day + invoice day ──
delete from ebs_cycles;
insert into ebs_cycles (cycle_code, read_day, invoice_day) values
  ('CL01', 2,  12), ('CL02', 2,  12), ('CL03', 3,  12), ('CL04', 4,  12),
  ('CL05', 6,  12), ('CL06', 6,  18), ('CL07', 8,  18), ('CL08', 9,  18),
  ('CL09', 11, 18), ('CL10', 11, 18), ('CL11', 12, 22), ('CL12', 13, 22),
  ('CL13', 15, 22), ('CL14', 15, 22), ('CL15', 16, 28), ('CL16', 18, 28),
  ('CL17', 18, 28), ('CL18', 20, 28), ('CL19', 22, 28);

-- ── example device (adjust to your unit) ──
insert into devices (device_id, phase, cycle_code, meter_read_day)
values ('beepboop_001', 1, 'CL01', 2)
on conflict (device_id) do nothing;