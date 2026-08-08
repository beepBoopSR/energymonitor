// energyLink · services/ebsScraper.js  (CommonJS)
// GIS-primary scraper for EBS planned outages ("HS UITSCHAKELING") from the public
// ArcGIS Enterprise portal at gisenterprise.ebs.sr.
//
// Converted to CommonJS to match the backend. Logic is unchanged from the ESM version;
// only the module syntax and the (previously top-level) undici import differ.

const PORTAL = 'https://gisenterprise.ebs.sr/portal';

// Optional undici Agent for insecure TLS. In CommonJS we can't top-level await, so we
// build the dispatcher lazily on first use.
let _dispatcher;
let _dispatcherInit = false;
async function getDispatcher() {
  if (_dispatcherInit) return _dispatcher;
  _dispatcherInit = true;
  if (process.env.EBS_INSECURE_TLS === '1') {
    try {
      const { Agent } = require('undici');
      _dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
      console.warn('[ebsScraper] WARNING: TLS verification DISABLED (EBS_INSECURE_TLS=1). ' +
        'This is a stopgap — resolve the portal cert chain properly before production.');
    } catch { /* undici ships with Node 18+, but degrade gracefully */ }
  }
  return _dispatcher;
}

const UA = 'energyLink-ebs/1.0 (+hackomation; contact: team-beepBoop)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, { retries = 3, timeoutMs = 15000 } = {}) {
  const dispatcher = await getDispatcher();
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        ...(dispatcher ? { dispatcher } : {}),
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) return null;
      await sleep(400 * attempt); // linear backoff; portal is small, be gentle
    }
  }
  return null;
}

// Simple bounded-concurrency map (no dependency).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

// ---- Step 1: list gallery items (paginated) ---------------------------------

async function fetchGalleryItems({ batchSize = 100 } = {}) {
  const items = [];
  let start = 1;
  while (true) {
    const url = `${PORTAL}/sharing/rest/search?q=1%3D1&f=json&num=${batchSize}` +
      `&start=${start}&sortField=modified&sortOrder=desc`;
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.results) || data.results.length === 0) break;
    const total = data.total || 0;
    for (const it of data.results) {
      items.push({
        itemId: it.id,
        title: it.title || '',
        type: it.type || '',
        tags: it.tags || [],
        created: it.created,
        modified: it.modified,
        appUrl: it.type === 'Web Experience'
          ? `${PORTAL}/apps/experiencebuilder/experience/?id=${it.id}`
          : `${PORTAL}/home/item.html?id=${it.id}`,
      });
    }
    start += data.results.length;
    if (start > total || items.length >= total) break;
  }
  return items;
}

// ---- Step 2: identify which items are UPCOMING planned outages ---------------

const TITLE_DATE_RE = /MAP(\d{4})(\d{2})(\d{2})/i;

function titleDate(title) {
  const m = TITLE_DATE_RE.exec(title || '');
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`; // ISO
}

function isPlannedOutageItem(item) {
  const taggedHS = (item.tags || []).some((t) => /HS\s*UITSCHAKELING/i.test(t));
  const looksLikeMap = TITLE_DATE_RE.test(item.title || '');
  return (item.type === 'Web Experience' || item.type === 'Web Map') && (taggedHS || looksLikeMap);
}

// Keep outages dated today or later (minus a small grace window for in-progress ones).
function isUpcoming(isoDate, graceDays = 1) {
  if (!isoDate) return true; // undated planned item (template/edge) — keep, flag later
  const d = new Date(isoDate + 'T00:00:00');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - graceDays);
  cutoff.setHours(0, 0, 0, 0);
  return d >= cutoff;
}

// ---- Step 3: resolve webmap + query layers (with geometry) -------------------

async function resolveWebmapId(item) {
  if (item.type !== 'Web Experience') return item.itemId;
  const data = await fetchJson(`${PORTAL}/sharing/rest/content/items/${item.itemId}/data?f=json`);
  const ds = data?.dataSources || {};
  for (const v of Object.values(ds)) {
    if (v?.type === 'WEB_MAP' && v.itemId) return v.itemId;
  }
  return item.itemId;
}

const pick = (props, keys) => {
  const lower = {};
  for (const [k, val] of Object.entries(props || {})) if (val != null) lower[k.toLowerCase()] = val;
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v != null && String(v).trim() && String(v).trim() !== 'None') return String(v).trim();
  }
  return null;
};

// Query a layer as GeoJSON. If the URL is a MapServer/FeatureServer ROOT, it isn't
// directly queryable — we must expand it into its sublayers (/0, /1, ...) and query
// each. If it's already a specific sublayer (ends in /<number>), query it directly.
async function queryLayerGeojson(layerUrl) {
  const clean = layerUrl.replace(/\/+$/, '');
  const DBG = process.env.EBS_DEBUG === '1';

  // Is this already a specific sublayer (…/MapServer/0)? then query directly.
  if (/\/\d+$/.test(clean)) {
    return await queryOneLayer(clean);
  }

  // Otherwise it's a MapServer/FeatureServer root — list its sublayers first.
  const meta = await fetchJson(`${clean}?f=json`);
  const subLayers = (meta && Array.isArray(meta.layers)) ? meta.layers : [];
  if (DBG) console.log(`[DBG]     MapServer root has ${subLayers.length} sublayer(s): ${subLayers.map(l => l.id).join(',')}`);

  if (subLayers.length === 0) {
    // no sublayer list — last resort, try /0
    return await queryOneLayer(`${clean}/0`);
  }

  let all = [];
  for (const sl of subLayers) {
    const feats = await queryOneLayer(`${clean}/${sl.id}`);
    if (DBG) console.log(`[DBG]       sublayer ${sl.id} ("${sl.name || ''}") -> ${feats.length} features`);
    all = all.concat(feats);
  }
  return all;
}

// Query a single, specific layer endpoint as GeoJSON.
async function queryOneLayer(layerUrl) {
  const q = `${layerUrl}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
  const gj = await fetchJson(q);
  if (gj && Array.isArray(gj.features)) return gj.features;
  return [];
}

async function scanMap(item) {
  const DBG = process.env.EBS_DEBUG === '1';
  const webmapId = await resolveWebmapId(item);
  if (DBG) console.log(`\n[DBG] --- ${item.title} ---`);
  if (DBG) console.log(`[DBG] item type=${item.type} itemId=${item.itemId} -> webmapId=${webmapId}`);
  const result = {
    ebsItemId: item.itemId,
    mapTitle: item.title,
    outageDate: titleDate(item.title),
    gisAppLink: item.appUrl,
    districts: new Set(),
    ressorts: new Set(),
    feeders: new Set(),
    substations: new Set(),
    lineStrings: [],       // array of [ [lon,lat], ... ]
    totalSegments: 0,
    totalLengthKm: 0,
    layers: [],
    geometryStatus: 'none',
    source: 'gis',
  };

  const webmap = await fetchJson(`${PORTAL}/sharing/rest/content/items/${webmapId}/data?f=json`);
  if (!webmap) {
    if (DBG) console.log(`[DBG] webmap data fetch returned NULL (item ${webmapId})`);
    result.geometryStatus = 'pending'; return finalize(result);
  }

  const opLayers = webmap.operationalLayers || [];
  if (DBG) console.log(`[DBG] operationalLayers found: ${opLayers.length}`);
  if (DBG) opLayers.forEach((l, i) => console.log(`[DBG]   layer[${i}] title="${l.title || ''}" url=${l.url || '(none)'} type=${l.layerType || l.itemId || '?'}`));
  if (opLayers.length === 0) { result.geometryStatus = 'pending'; return finalize(result); }

  let anyFeatures = false;
  for (const layer of opLayers) {
    if (!layer.url) { if (DBG) console.log(`[DBG]   (layer "${layer.title}" has no url, skipped)`); continue; }
    const feats = await queryLayerGeojson(layer.url);
    if (DBG) console.log(`[DBG]   query "${layer.title}" -> ${feats.length} features`);
    if (DBG && feats.length) console.log(`[DBG]     sample props: ${JSON.stringify(Object.keys(feats[0].properties || {}))}`);
    result.layers.push({ title: layer.title || '', count: feats.length });
    if (feats.length) anyFeatures = true;
    result.totalSegments += feats.length;
    for (const f of feats) {
      const p = f.properties || {};
      const d = pick(p, ['districts', 'district', 'distr']);
      const r = pick(p, ['ressorts', 'ressort', 'ressortid']);
      const fe = pick(p, ['feeder', 'feeders', 'feedername']);
      const s = pick(p, ['substation', 'substat', 'station']);
      if (d) result.districts.add(d);
      if (r) result.ressorts.add(r);
      if (fe) result.feeders.add(fe);
      if (s) result.substations.add(s);
      const len = Number(p.SHAPE__Length || p.Shape_STLe || p.shape_stle || 0);
      if (!Number.isNaN(len)) result.totalLengthKm += len / 1000;
      collectLineStrings(f.geometry, result.lineStrings);
    }
  }

  // Fix #3: resolved-but-empty ≠ no outage. Mark pending so next run retries.
  result.geometryStatus = anyFeatures ? 'resolved' : 'pending';
  if (DBG) console.log(`[DBG] result: status=${result.geometryStatus} districts=${[...result.districts]} ressorts=${[...result.ressorts]}`);
  return finalize(result);
}

function collectLineStrings(geom, into) {
  if (!geom) return;
  if (geom.type === 'LineString') into.push(geom.coordinates);
  else if (geom.type === 'MultiLineString') for (const ls of geom.coordinates) into.push(ls);
}

function finalize(r) {
  return {
    ebsItemId: r.ebsItemId,
    mapTitle: r.mapTitle,
    outageDate: r.outageDate,
    gisAppLink: r.gisAppLink,
    districts: [...r.districts].sort(),
    ressorts: [...r.ressorts].sort(),
    feeders: [...r.feeders].sort(),
    substations: [...r.substations].sort(),
    totalLineSegments: r.totalSegments,
    totalLengthKm: Math.round(r.totalLengthKm * 100) / 100,
    geometry: r.lineStrings.length
      ? { type: 'MultiLineString', coordinates: r.lineStrings }
      : null,
    layers: r.layers,
    geometryStatus: r.geometryStatus,
    source: r.source,
    // start_time / end_time / reason / affected_area_text intentionally absent here:
    // GIS carries none of them. They are merged in later from FB/website if available.
  };
}

// ---- Public API --------------------------------------------------------------

/**
 * Scrape upcoming planned outages from EBS GIS.
 * @returns {Promise<Array>} normalized outage records ready to upsert.
 */
async function scrapeUpcomingOutages({ concurrency = 4, graceDays = 1 } = {}) {
  const items = await fetchGalleryItems();
  const planned = items
    .filter(isPlannedOutageItem)
    .filter((it) => isUpcoming(titleDate(it.title), graceDays));

  const scanned = await mapLimit(planned, concurrency, scanMap);
  // Sort soonest-first; undated last.
  scanned.sort((a, b) => (a.outageDate || '9999').localeCompare(b.outageDate || '9999'));
  return scanned;
}

module.exports = {
  scrapeUpcomingOutages,
  _internals: { titleDate, isPlannedOutageItem, isUpcoming, finalize },
};