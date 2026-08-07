-- ============================================================
-- energyLink · database schema — 01_tables.sql
-- team beepBoop · Hackomation 2026
--
-- Run order: this file first (tables), then 02_functions.sql,
-- then 03_seed_data.sql. Tables must exist before the functions
-- and seed data that reference them.
--
-- All timestamps are timestamptz. Date bucketing throughout the
-- functions is done explicitly in America/Paramaribo (UTC-3).
-- ============================================================

-- ── devices: one row per physical energyLink unit ──
create table devices (
  device_id       text primary key,          -- e.g. 'beepboop_001'
  phase           int  not null default 1,   -- EBS connection: 1, 2 or 3 phase
  cycle_code      text,                        -- EBS billing cycle CL01–CL19
  meter_read_day  int  not null default 1,    -- day of month the meter is read
  created_at      timestamptz not null default now()
);

-- ── readings: every measurement sent by a device (~every 3s per clamp) ──
create table readings (
  id            bigint generated always as identity primary key,
  device_id     text        not null,
  clamp_id      int         not null default 1,
  timestamp     timestamptz not null,        -- reconstructed device time
  voltage       float,                         -- V (RMS)
  current       float,                         -- A (RMS)
  watts         float,                         -- apparent power V*I
  kwh           float,                         -- energy over this reading's interval
  interval_sec  int,                           -- measured seconds this reading covers
  seq           bigint,                        -- device sequence number
  ms_since_boot bigint,                        -- device uptime (timestamp reconstruction)
  time_status   text,                          -- 'synced' | 'reconstructed'
  crest         float,                         -- waveform crest factor  ┐
  form          float,                         -- waveform form factor   │ appliance
  shape         float,                         -- waveform shape metric  │ features
  peak          float,                         -- peak current           ┘
  created_at    timestamptz not null default now()
);

create index idx_readings_device_time
  on readings (device_id, timestamp desc);

create index idx_readings_device_clamp_time
  on readings (device_id, clamp_id, timestamp desc);

-- ── budgets: optional monthly spending limit per device ──
create table budgets (
  device_id     text primary key references devices (device_id),
  monthly_limit float not null,               -- SRD
  created_at    timestamptz not null default now()
);

-- ── alerts: grid events + anomalies raised by the backend ──
create table alerts (
  id           bigint generated always as identity primary key,
  device_id    text        not null,
  type         text        not null,           -- 'outage_end' | 'low_voltage' | 'anomaly'
  timestamp    timestamptz not null default now(),
  duration_min int,                             -- for outages
  message      text,                            -- for anomalies
  value        float,                           -- e.g. spike watts
  created_at   timestamptz not null default now()
);

create index idx_alerts_device_type_time
  on alerts (device_id, type, timestamp desc);

-- ── ai_tips: generated advisory messages (Dutch + Sranan) ──
create table ai_tips (
  id             bigint generated always as identity primary key,
  device_id      text not null,
  tip_dutch      text,
  tip_sranan     text,
  tip_type       text,                          -- 'saving' | 'budget' | 'anomaly'
  predicted_bill float,                          -- SRD, snapshot at generation
  for_month      text,                           -- optional period tag
  created_at     timestamptz not null default now()
);

create index idx_ai_tips_device_time
  on ai_tips (device_id, created_at desc);

-- ============================================================
-- TARIFF TABLES — the EBS pricing model lives in data, not code,
-- so a rate change is an UPDATE rather than a code change.
-- ============================================================

-- ── tariff_blocks: tiered (marginal) energy price per kWh ──
create table tariff_blocks (
  lower_kwh float not null,                     -- band start (inclusive)
  upper_kwh float not null,                     -- band end (exclusive; use a large value for the top band)
  rate_srd  float not null                      -- SRD per kWh in this band
);

-- ── tariff_basis: fixed monthly connection charge per phase ──
create table tariff_basis (
  phase      int   primary key,                 -- 1, 2 or 3
  basis_srd  float not null                      -- SRD per month
);

-- ── tariff_subsidy: subject subsidy by total monthly consumption ──
create table tariff_subsidy (
  lower_kwh      float not null,                 -- band start (inclusive)
  upper_kwh      float not null,                 -- band end (exclusive)
  amount_srd     float not null,                 -- SRD subsidy for this band
  is_placeholder boolean not null default false  -- true while values are unconfirmed
);

-- ── ebs_cycles: the 19 EBS billing cycles (read day + invoice day) ──
create table ebs_cycles (
  cycle_code  text primary key,                 -- CL01 … CL19
  read_day    int not null,                     -- meteropnamedag
  invoice_day int not null                       -- factuurdatum
);