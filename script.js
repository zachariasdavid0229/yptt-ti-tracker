/* ============ YPTT TI Tracker - Script ============ */

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbztur_1UfUFYL1uuWoJjdc5kHRsgb9VDdml8dxejyheBvZ1oOxEV-5RSF7-7XfNUz0/exec';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZONE_COLORS = ['#2d6bb8', '#00b4d8', '#4a90d9', '#0077b6', '#8899aa'];
const CHART_THEME = {
  text: '#e8f0fe',
  ticks: '#8899aa',
  grid: 'rgba(0, 119, 182, 0.2)'
};
const PAGE_SIZE = 10;

/* ==================== Konfigurasi Sheet ==================== */

const SHEET_CONFIG = {
  'site-sul': {
    label: 'Site SUL',
    api: 'site-sul',
    actions: { add: 'add-site-sul', update: 'update-site-sul', del: 'delete-site-sul' },
    columns: null, // dari data (83+ kolom master)
    hasZoneFilter: true
  },
  'site-kal': {
    label: 'Site KAL',
    api: 'site-kal',
    actions: { add: 'add-site-kal', update: 'update-site-kal', del: 'delete-site-kal' },
    columns: null,
    hasZoneFilter: true
  },
  'site-pln': {
    label: 'Site Upgrade PLN',
    api: 'site-pln',
    actions: { add: 'add-site-pln', update: 'update-site-pln', del: 'delete-site-pln' },
    columns: null,
    hasZoneFilter: false
  },
  'pvt-dash-sul': {
    label: 'Pivot SUL',
    api: 'pivot',
    sheetName: 'Pvt Dash Sul',
    actions: { add: 'pivot-add', update: 'pivot-update', del: 'pivot-delete' },
    columns: ['PO Year', 'Kategori', 'Bulan', 'Zona', 'Jumlah'],
    numeric: ['Jumlah'],
    hasZoneFilter: false
  },
  'pivot-kal': {
    label: 'Pivot KAL',
    api: 'pivot',
    sheetName: 'Pivot Kal',
    actions: { add: 'pivot-add', update: 'pivot-update', del: 'pivot-delete' },
    columns: ['PO Year', 'Kategori', 'Bulan', 'Jumlah'],
    numeric: ['Jumlah'],
    hasZoneFilter: false
  },
  'dash-sul': {
    label: 'Dashboard Sulawesi',
    api: 'pivot',
    sheetName: 'Dashboard Sulawesi',
    actions: { add: 'pivot-add', update: 'pivot-update', del: 'pivot-delete' },
    columns: ['PO Year', 'Zona', 'Milestone', 'Bulan', 'Plan', 'Ach', 'Persen', 'Remarks'],
    numeric: ['Plan', 'Ach', 'Persen'],
    wide: ['Remarks'],
    hasZoneFilter: false
  }
};

const PIVOT_KEYS = ['pvt-dash-sul', 'pivot-kal', 'dash-sul'];

/* ==================== Opsi Smart Dropdown ==================== */

const STATIC_OPTIONS = {
  'SM Status': ['Work Not Start', '01-Passed', '03-NY SM', 'Progress'],
  'SM Kitting': ['No Need', 'passed', 'Work Not Start', '01-Passed', 'Progress'],
  'PTW & EHS': ['No Need', 'passed', 'Work Not Start', '01-Passed', 'Progress'],
  'SM Dismantle': ['Passed', 'No Need', 'SM Passed', 'Work Not Start', 'Progress'],
  'SM ATP': ['Work Not Start', '01-Passed', '03-NY SM', 'Progress'],
  'ATP Passed': ['Work Not Start', '01-Passed', '03-NY SM', 'Progress'],
  'FI Ineom': ['Work Not Start', '01-Passed', '03-NY SM', 'Progress'],
  'Asset Ineom': ['Work Not Start', '01-Passed', '03-NY SM', 'Progress'],
  'Blocking Issues': ['waitting TRM', 'Need Komfirm Tim Planning',
    'Only Dismantle Rack', 'Dismantle Only Cabinet'],
  'GAP Analysis': ['Connected', 'Work Not Start', 'Prorgress'],
  'Status Permit': ['Release', 'Done Req ZTE', 'Og Request', 'Done request CAF ZTE'],
  'PIC TI': ['YPTT', 'Quintel', 'CV. Puri Tepule Abadi', 'PT. Djaya Sukses Pratama']
};

const DYNAMIC_COMBO_COLS = ['Site Name Impl', 'Site ID Impl', 'Work Type', 'SOW Details'];

// Dropdown zona untuk Site_SUL: hanya 3 pilihan sesuai kebutuhan
const ZONES_SUL_STATIC = ['MAKASSAR', 'MANADO', 'TERNATE'];

const SEMI_FREE_OPTIONS = { 'HI Info': ['Done', 'NY'], 'MOS Info': ['Done', 'NY'] };

const PERCENT_PREFIXES = ['Done Productivity', 'Ready for Productivity'];

// Opsi khusus tabel pivot
const PIVOT_OPTIONS = {
  'Pvt Dash Sul': {
    'Kategori': ['Assignment', 'HI Done', 'Connected', 'SM ATP',
      'SM Dismantle', 'Inbound Done', 'FI INEOM', 'eATP Done', 'BAUT Done'],
    'Zona': ZONES_SUL_STATIC
  },
  'Pivot Kal': {
    'Kategori': ['MOS', 'HI', 'Connected']
  },
  'Dashboard Sulawesi': {
    'Zona': ['SULAWESI', 'MAKASSAR', 'MANADO', 'TERNATE', 'KENDARI', 'PALU'],
    'Milestone': ['MOS Done', 'SM Kitting', 'HI Done', 'Connected', 'SM ATP',
      'SM Dismantle', 'Inbound Done', 'FI Ineom', 'eATP Done', 'BAUT Done']
  }
};
PIVOT_OPTIONS['Pvt Dash Sul']['Bulan'] = MONTHS;
PIVOT_OPTIONS['Pivot Kal']['Bulan'] = MONTHS;
PIVOT_OPTIONS['Dashboard Sulawesi']['Bulan'] = MONTHS;

const WIDE_FIELDS = ['Daily REMARK', 'Remark', 'GAP Analysis', 'Blocking Issues',
  'Add Cost Description', 'Connected Info', 'MOS Info', 'HI Info',
  'Blocking SM & Ineom', 'Blocking BARA', 'Remark INBOUND', 'Remarks'];

/* ==================== Header Icon & Status Badge ==================== */

const HEADER_ICONS = {
  'No': '🔢', 'WID': '📋', 'Site ID Impl': '🆔', 'Site ID': '🆔',
  'Site Name Impl': '📍', 'Site Name': '📍', 'Band': '📶',
  'ZTE ZONE': '🌍', 'Zona': '🌍', 'Branch': '🌍',
  'SM Status': '📊', 'SM ATP': '🔄', 'ATP Passed': '✅',
  'HI Progress': '⏱️', 'HI Done': '✔️', 'Connected Date': '🔗',
  'FI Ineom': '🧾', 'MOS': '🛰️', 'Kategori': '📊', 'Bulan': '📅',
  'Jumlah': '🔢', 'Plan': '🎯', 'Ach': '✅', 'Persen': '⏱️',
  'Milestone': '🏁', 'PO Year': '🗓️', 'Remarks': '📝', 'Total Site': '#'
};

const BADGE_RULES = [
  [/work not start/i, 'work-not-start'],
  [/ny sm|\bny\b/i, 'ny'],
  [/progress/i, 'progress'],
  [/passed/i, 'passed'],
  [/no need/i, 'no-need'],
  [/\bdone\b/i, 'done']
];

/** Bungkus nilai status ke badge berwarna; return null jika bukan status */
function badgeHTML(v) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  if (!s || s.length > 60) return null;
  for (const r of BADGE_RULES) {
    if (r[0].test(s)) {
      return '<span class="status-badge ' + r[1] + '">' + esc(s) + '</span>';
    }
  }
  return null;
}

/* ==================== State ==================== */

let state = {
  sheets: {},           // { sheetKey: [rows] }
  dashboard: null,
  kpi: null,
  mosChart: null,
  currentTab: 'dashboard',
  activePivot: 'pvt-dash-sul',
  page: {},
  filters: {},
  sort: {}
};

Object.keys(SHEET_CONFIG).forEach(k => {
  state.page[k] = 1;
  state.filters[k] = {};
});

function cfg(key) { return SHEET_CONFIG[key]; }
function rowsOf(key) { return state.sheets[key] || []; }

/**
 * ID elemen DOM untuk sebuah sheet.
 * Di tab Pivot Data, elemen yang tampil memakai akhiran '-active'
 * dan mengikuti pilihan aktif; tab lain memakai '<base>-<sheetKey>'.
 */
function idFor(sheetKey, base) {
  if (base !== 'zoneFilter' && sheetKey === state.activePivot && state.currentTab === 'pivot') {
    return base + '-active';
  }
  return base + '-' + sheetKey;
}

/* ==================== API Helper ==================== */

async function apiCall(action, payload = {}) {
  showLoading(true);
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, payload)),
      redirect: 'follow'
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || json.message || 'Unknown error');
    return json;
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
    throw err;
  } finally {
    showLoading(false);
  }
}

/* ==================== Cache localStorage (TTL 5 menit) ==================== */

const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(name) { return 'yptt_v1_' + name; }

function cacheGet(name) {
  try {
    const raw = localStorage.getItem(cacheKey(name));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return { data: obj.data, stale: (Date.now() - obj.t) > CACHE_TTL };
  } catch (e) { return null; }
}

function cacheSet(name, data) {
  try {
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify({ t: Date.now(), data: data }));
    } catch (quotaErr) {
      // Kuota penuh: bersihkan cache aplikasi lalu coba sekali lagi
      Object.keys(localStorage)
        .filter(k => k.indexOf('yptt_v1_') === 0)
        .forEach(k => localStorage.removeItem(k));
      localStorage.setItem(cacheKey(name), JSON.stringify({ t: Date.now(), data: data }));
    }
  } catch (e) { /* kuota tetap tidak cukup - lewati caching */ }
}

function cacheDel(name) {
  try { localStorage.removeItem(cacheKey(name)); } catch (e) {}
}

function setLoadingText(t) {
  const el = document.getElementById('loadingText');
  if (el) el.textContent = t;
}
function hideLoading() { showLoading(false); }

/* ==================== Loading & Toast ==================== */

function showLoading(show, label) {
  document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
  if (label) setLoadingText(label);
  if (!show) setLoadingText('Memproses data...');
}

let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

/* ==================== Tab Navigation ==================== */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  btn.addEventListener('keydown', e => {
    const tabs = Array.from(document.querySelectorAll('.tab-btn'));
    const idx = tabs.indexOf(btn);
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      tabs[next].focus();
      switchTab(tabs[next].dataset.tab);
    }
  });
});

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(b => {
    const isActive = b.dataset.tab === tabName;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive);
  });
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + tabName));
  loadTabData(tabName);
}

function activeSheetKey() {
  return state.currentTab === 'pivot' ? state.activePivot : state.currentTab;
}

async function loadTabData(tabName) {
  try {
    if (tabName === 'dashboard') {
      await loadDashboard(false);
    } else if (tabName === 'site-sul' || tabName === 'site-kal') {
      await loadSheet(tabName);
    } else if (tabName === 'pivot') {
      await loadSheet(state.activePivot);
    }
  } catch (e) { /* error sudah ditampilkan via toast */ }
}

/** Cegah dua proses load dashboard bersamaan (dedupe) */
function loadDashboard(force) {
  if (force || !state._dashInflight) {
    state._dashInflight = doLoadDashboard(force).finally(() => { state._dashInflight = null; });
  }
  return state._dashInflight;
}

/* ==================== Dashboard: lazy loading + cache ==================== */

const DASH_DEFS = [
  { name: 'dashboard', qs: 'action=dashboard', label: 'Dashboard & KPI' },
  { name: 'sheet-site-sul', qs: 'action=site-sul', label: 'Site SUL' },
  { name: 'sheet-site-kal', qs: 'action=site-kal', label: 'Site KAL' }
];

function applyDashPiece(name, data) {
  if (name === 'dashboard') {
    state.dashboard = data;
    // KPI disertakan dalam response dashboard (R5: batch API)
    if (data && data.kpi) state.kpi = data.kpi;
  }
  else if (name === 'sheet-site-sul') state.sheets['site-sul'] = data || [];
  else if (name === 'sheet-site-kal') state.sheets['site-kal'] = data || [];
}

// Tahap 1: elemen paling atas langsung tampil
function renderDashboardStage1() {
  renderHeaderStats();
  renderKPI();
}
// Tahap 2: grafik (masing-masing aman; satu error tidak mematikan lainnya)
function safeChart(label, fn) {
  try { fn(); }
  catch (e) { console.error('Chart "' + label + '" gagal:', e); }
}
function renderDashboardStage2() {
  safeChart('Assignment', renderMosChart);
  setTimeout(() => {
    safeChart('Trend', renderTrendChart);
    safeChart('Donut', renderDonutChart);
    safeChart('Bar Metrik', renderBarMetricChart);
  }, 0);
}
// Tahap 3: tabel + hitung ulang issue
function renderDashboardStage3() {
  renderMiniTable('dash2026Table', state.dashboard && state.dashboard.dashboard_2026);
  renderMiniTable('dashSulTable', state.dashboard && state.dashboard.dashboard_sulawesi);
  renderMiniTable('pivotKalTable', state.dashboard && state.dashboard.pivot_kal);
  renderLatestTable();
  renderHeaderStats();
}

async function doLoadDashboard(force) {
  const values = {};
  let pending = 0;

  // 1) Render instan dari cache
  DASH_DEFS.forEach(d => {
    const c = force ? null : cacheGet(d.name);
    if (c && c.data !== undefined && !c.stale) values[d.name] = c.data;
    else pending++;
  });
  DASH_DEFS.forEach(d => {
    if (values[d.name] !== undefined) applyDashPiece(d.name, values[d.name]);
  });

  renderDashboardStage1();

  // 2) Semua fresh -> selesai tanpa jaringan
  if (pending === 0) {
    setTimeout(() => {
      renderDashboardStage2();
      renderDashboardStage3();
      hideLoading();
      notifyDataReady();
    }, 0);
    return;
  }

  // 3) Ambil yang missing/stale secara paralel dengan progress
  setLoadingText('Mengambil data 0/' + pending + '...');
  let done = 0;

  await Promise.all(DASH_DEFS
    .filter(d => values[d.name] === undefined)
    .map(async d => {
      try {
        const res = await fetch(API_BASE_URL + '?' + d.qs, { redirect: 'follow' });
        const j = await res.json();
        if (!j.success) throw new Error(j.error || 'gagal memuat');
        cacheSet(d.name, j.data);
        values[d.name] = j.data;
        applyDashPiece(d.name, j.data);
        if (d.name === 'dashboard') {
          renderDashboardStage1(); // KPI + header stats
          renderDashboardStage2(); // charts
        }
      } catch (err) {
        showToast('Gagal memuat ' + d.label + ': ' + err.message, 'error');
      } finally {
        done++;
        setLoadingText('Mengambil data ' + done + '/' + pending + '... (' + d.label + ')');
        splashTick(done / pending * 92, 'Loading ' + d.label + '...');
      }
    }));

  // 4) Render tahap lanjutan setelah semua data siap
  setTimeout(() => {
    renderDashboardStage2();
    renderDashboardStage3();
    hideLoading();
    notifyDataReady();
  }, 0);
}

function notifyDataReady() {
  if (window.__notifyDataReady) {
    const fn = window.__notifyDataReady;
    window.__notifyDataReady = null;
    fn();
  }
}

/* ==================== Full Dashboard ==================== */

function pctOf(part, total) {
  if (!total) return '0%';
  return Math.round(part / total * 100) + '%';
}

/**
 * Cek apakah nilai menandakan "selesai".
 * SYNC: Logika harus identik dengan isDone_() di Code.gs.
 */
function isDoneVal(v) {
  const s = String(v === undefined || v === null ? '' : v).trim().toUpperCase();
  if (s === '' || s === '-' || s === 'N' || s === 'NO' || s === 'FALSE' || s === 'NULL') return false;
  if (s.indexOf('PENDING') !== -1 || s.indexOf('BELUM') !== -1) return false;
  return true;
}

function countIssues() {
  let n = 0;
  ['site-sul', 'site-kal'].forEach(k => {
    rowsOf(k).forEach(r => {
      if (String(r['Blocking Issues'] === undefined || r['Blocking Issues'] === null ? '' : r['Blocking Issues']).trim() !== '') n++;
    });
  });
  return n;
}

function renderHeaderStats() {
  const kpi = state.kpi || {};
  const stats = [
    { icon: '🛰️', value: fmt(kpi.total_mos), label: 'Total MOS' },
    { icon: '✅', value: fmt(kpi.total_hi_done), label: 'HI Done' },
    { icon: '🔗', value: fmt(kpi.total_connected), label: 'Connected' },
    { icon: '⚡', value: fmt(kpi.total_sm_atp), label: 'SM ATP' },
    { icon: '📋', value: fmt(kpi.total_fi_ineom), label: 'FI INEOM' },
    { icon: '⚠️', value: fmt(countIssues()), label: 'Issue / Blocking', danger: true }
  ];
  const el = document.getElementById('headerStats');
  if (!el) return;
  el.innerHTML = stats.map(s =>
    '<div class="stat-item"' + (s.danger ? ' style="border-color:rgba(255,23,68,.25)"' : '') + '>' +
      '<span class="stat-icon">' + s.icon + '</span>' +
      '<div class="stat-info">' +
        '<span class="stat-value"' + (s.danger ? ' style="color:#ff1744"' : '') + '>' + esc(s.value) + '</span>' +
        '<span class="stat-label">' + esc(s.label) + '</span>' +
      '</div>' +
    '</div>').join('');
}

/** Statistik MOS / HI / Connected per zona dari data master */
function computeZoneStats() {
  const stats = {};
  ['site-sul', 'site-kal'].forEach(k => {
    const rows = rowsOf(k);
    const zc = zoneColOf(rows);
    rows.forEach(r => {
      const z = String(zc ? r[zc] : '').trim() || '(KOSONG)';
      if (!stats[z]) stats[z] = { total: 0, mos: 0, hi: 0, conn: 0 };
      const s = stats[z];
      s.total++;
      if (String(r['MOS'] === undefined ? '' : r['MOS']).trim() !== '') s.mos++;
      if (isDoneVal(r['HI Done'])) s.hi++;
      if (isDoneVal(r['Connected Date']) || isDoneVal(r['Connected Info'])) s.conn++;
    });
  });
  return stats;
}

/**
 * Parse blok TI SULAWESI pada sheet Dashboard_2026:
 * baris penanda berisi 'Qty' & 'Percentage', lalu baris metrik dengan
 * pola triplet [Plan | Ach | %] per bulan. Return {months, series}.
 */
function parseDash2026Trend(sd) {
  try {
    if (!sd || !sd.rows || !sd.rows.length) return null;
    const rows = sd.rows;

    let mi = -1, qtyCol = -1, planCol = -1;
    for (let i = 0; i < rows.length && mi < 0; i++) {
      for (let c = 0; c < rows[i].length; c++) {
        if (String(rows[i][c]).trim().toUpperCase() === 'QTY') {
          // pastikan ada 'Plan' setelahnya di baris yang sama
          for (let c2 = c + 1; c2 < Math.min(c + 4, rows[i].length); c2++) {
            if (String(rows[i][c2]).trim().toUpperCase() === 'PLAN') {
              mi = i; qtyCol = c; planCol = c2; break;
            }
          }
        }
        if (mi >= 0) break;
      }
    }
    if (mi < 0 || planCol < 0) return null;

    // Label bulan dari baris bertuliskan 'Total Jan' dst (baris di atas marker)
    let months = [];
    for (let i = mi - 1; i >= 0 && !months.length; i--) {
      for (let c = planCol; c < rows[i].length; c += 3) {
        const m = String(rows[i][c]).match(/total\s+(\w+)/i);
        if (m) months.push(m[1].substring(0, 3).toUpperCase());
      }
    }

    const METRICS = ['MOS', 'HI DONE', 'CONNECTED', 'SM ATP', 'FI INEOM'];
    const series = [];
    for (let i = mi + 1; i < rows.length; i++) {
      const r = rows[i];
      let label = '';
      for (let c = 0; c < Math.min(3, r.length); c++) {
        const v = String(r[c]).trim();
        if (v) { label = v; break; }
      }
      if (!label) continue; // baris kosong
      const lu = label.toUpperCase();
      if (lu.includes('KALIMANT') || lu.includes('SULAWESI')) break; // seksi berikut
      if (!METRICS.some(m => lu === m || lu.startsWith(m))) {
        // bukan baris metrik yang dikenal -> kemungkinan seksi selesai
        if (series.length) break;
        continue;
      }
      const ach = [];
      for (let c = planCol + 1; c < r.length; c += 3) {
        ach.push(Number(r[c]) || 0);
      }
      series.push({ label: label, data: ach });
    }

    if (!series.length) return null;
    if (!months.length || months.length < series[0].data.length) {
      months = series[0].data.map((_, i) => 'B' + (i + 1));
    }
    return { months: months.slice(0, series[0].data.length), series: series };
  } catch (e) { return null; }
}

const TREND_COLORS = ['#00b4d8', '#00c853', '#ffab00', '#b197fc', '#ff6b81'];

/**
 * Scan seluruh sheet mencari blok pivot bertumpuk dengan pola:
 * [Judul Kategori | MAKASSAR | MANADO | TERNATE | Grand Total]
 * diikuti baris bulan (Jan..) lalu Grand Total.
 * Setiap blok menghasilkan satu seri: total antar-zona per bulan.
 * Blok duplikat (kategori + zona sama) hanya dihitung sekali.
 */
function parseStackedBlocksTrend(sd) {
  try {
    if (!sd || !sd.rows || !sd.rows.length) return null;
    const CATS = ['ASSIGNMENT', 'SM ATP', 'FI INEOM', 'HI DONE', 'CONNECTED', 'MOS'];
    const ZONE_HINTS = ['MAKASSAR', 'MANADO', 'TERNATE', 'KENDARI', 'PALU'];
    const MUP = MONTHS.map(x => x.toUpperCase());
    const up = v => String(v === undefined || v === null ? '' : v).trim().toUpperCase();
    const rows = sd.rows;

    const blocks = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      for (let c = 0; c < Math.min(r.length, 14); c++) {
        const cell = up(r[c]);
        if (!CATS.includes(cell)) continue;

        // Verifikasi pola: sel sesudahnya memuat nama zona
        let hint = false;
        for (let k = c + 1; k < Math.min(c + 5, r.length); k++) {
          if (ZONE_HINTS.includes(up(r[k]))) { hint = true; break; }
        }
        if (!hint) continue;

        // Kumpulkan kolom zona sampai Grand Total
        const zIdx = [];
        let gtCol = -1;
        for (let zc = c + 1; zc < r.length; zc++) {
          const zv = up(r[zc]);
          if (!zv) continue;
          if (zv === 'GRAND TOTAL') { gtCol = zc; break; }
          zIdx.push(zc);
        }
        if (!zIdx.length) { if (gtCol >= 0) c = gtCol; continue; }

        // Baris bulan sampai Grand Total / judul kategori lain di kolom ini
        const months = [];
        for (let rr = i + 1; rr < rows.length; rr++) {
          const lr = rows[rr];
          if (c >= lr.length) continue;
          const label = up(lr[c]);
          if (!label) continue;
          if (label === 'GRAND TOTAL') break;
          if (CATS.includes(label)) break;
          const vals = zIdx.map(z => Number(lr[z]) || 0);
          const ex = months.find(m => m.label === label);
          if (ex) {
            ex.vals = ex.vals.map((v, ix) => Math.max(v, vals[ix]));
          } else {
            months.push({ label: label, vals: vals });
          }
        }

        if (months.length) blocks.push({ cat: cell, months: months });
        if (gtCol >= 0) c = gtCol; // lanjutkan scan setelah blok ini
      }
    }

    if (!blocks.length) return null;

    // Gabungkan per kategori; blok duplikat identik hanya dihitung sekali
    const merged = {};
    const seenSig = {};
    blocks.forEach(b => {
      const sig = b.cat + '::' +
        b.months.map(m => m.label).join(',').toUpperCase() + '::' +
        b.months.map(m => m.vals.reduce((x, y) => x + y, 0)).join(',');
      if (seenSig[sig]) return;
      seenSig[sig] = true;
      if (!merged[b.cat]) merged[b.cat] = {};
      b.months.forEach(m => {
        const key = m.label.toUpperCase();
        // Hanya label bulan sah (JAN..DES); label status diabaikan
        if (MUP.indexOf(key.substring(0, 3)) === -1 || key.length > 3) return;
        merged[b.cat][key] = (merged[b.cat][key] || 0) +
          m.vals.reduce((x, y) => x + y, 0);
      });
    });

    // Susun bulan urut Jan..Des
    const mIdx = v => { const i = MUP.indexOf(v.substring(0, 3)); return i < 0 ? 99 : i; };
    const allMonths = [];
    Object.values(merged).forEach(m => Object.keys(m).forEach(k => {
      if (mIdx(k) === 99) return;
      if (allMonths.indexOf(k) === -1) allMonths.push(k);
    }));
    allMonths.sort((a, b) => mIdx(a) - mIdx(b));
    if (!allMonths.length) return null;

    const series = Object.keys(merged)
      .filter(cat => cat !== 'MOS')
      .map((cat, i) => ({
        cat: cat,
        data: allMonths.map(m => merged[cat][m] || 0),
        colorIdx: i
      }))
      .filter(s => s.data.some(v => v > 0)) // buang seri yang nol semua
      .slice(0, 5)
      .map((s, i) => ({
        label: s.cat,
        data: s.data,
        borderColor: TREND_COLORS[s.colorIdx % TREND_COLORS.length],
        backgroundColor: 'transparent',
        tension: .35,
        pointRadius: 3,
        pointBackgroundColor: TREND_COLORS[s.colorIdx % TREND_COLORS.length]
      }));

    if (series.length < 2) return null;
    return { months: allMonths, series: series };
  } catch (e) { return null; }
}

function renderTrendChart() {
  const card = document.getElementById('trendCard');
  const sdD26 = state.dashboard && state.dashboard.dashboard_2026;
  const sdPvt = state.dashboard && state.dashboard.pvt_dash_sul;

  // Prioritas: layout Qty/Plan/Ach asli -> blok pivot bertumpuk (d26 -> pvt)
  let t = parseDash2026Trend(sdD26) ||
          parseStackedBlocksTrend(sdD26) ||
          parseStackedBlocksTrend(sdPvt);

  if (!t) { if (card) card.style.display = 'none'; return; }
  if (card) card.style.display = '';

  const ctx = getCtx('trendChart');
  if (!ctx) return;
  if (state.trendChart) state.trendChart.destroy();
  state.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: t.months,
      datasets: t.series
    },
    options: chartLineOptions()
  });
}

function renderDonutChart() {
  const stats = computeZoneStats();
  const entries = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  const labels = entries.map(e => e[0]);
  const totals = entries.map(e => e[1].total);

  const ctx = getCtx('donutChart');
  if (!ctx) return;
  if (state.donutChart) state.donutChart.destroy();
  state.donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: totals,
        backgroundColor: ZONE_COLORS.concat(['#5a7a9a', '#8899aa', '#e8f0fe']),
        borderColor: '#0a1628',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {} }
      }
    }
  });

  const grand = totals.reduce((a, b) => a + b, 0);
  const legEl = document.getElementById('donutLegend');
  if (legEl) {
    legEl.innerHTML = entries.map((e, i) =>
      '<span class="dl-item"><span class="dl-dot" style="background:' +
      ZONE_COLORS.concat(['#5a7a9a', '#8899aa', '#e8f0fe'])[i % 8] + '"></span>' +
      esc(e[0]) + ': <b>' + e[1].total + '</b> (' + pctOf(e[1].total, grand) + ')</span>').join('');
  }
}

function renderBarMetricChart() {
  const stats = computeZoneStats();
  const entries = Object.entries(stats).sort((a, b) => b[1].mos - a[1].mos);
  const labels = entries.map(e => e[0]);

  const ctx = getCtx('barMetricChart');
  if (!ctx) return;
  if (state.barMetricChart) state.barMetricChart.destroy();
  state.barMetricChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'MOS', data: entries.map(e => e[1].mos), backgroundColor: '#2d6bb8' },
        { label: 'HI Done', data: entries.map(e => e[1].hi), backgroundColor: '#00c853' },
        { label: 'Connected', data: entries.map(e => e[1].conn), backgroundColor: '#2979ff' }
      ]
    },
    options: chartLineOptions(false)
  });
}

/** Opsi umum chart tema gelap */
function chartLineOptions(stackedY = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: stackedY === true,
        grid: { color: CHART_THEME.grid },
        ticks: { color: CHART_THEME.ticks }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: CHART_THEME.ticks },
        grid: { color: CHART_THEME.grid }
      }
    },
    plugins: {
      legend: { position: 'top', labels: { color: CHART_THEME.text, font: { size: 11 } } }
    }
  };
}

/** Tabel 5 data terbaru (gabungan SUL+KAL, baris terakhir di sheet) */
function renderLatestTable() {
  const el = document.getElementById('latestTable');
  if (!el) return;

  const combine = [];
  ['site-sul', 'site-kal'].forEach(k => {
    rowsOf(k).forEach(r => combine.push({ key: k, row: r }));
  });
  combine.sort((a, b) => b.row.rowIndex - a.row.rowIndex);
  const top = combine.slice(0, 5);

  if (!top.length) {
    el.innerHTML = '<tbody><tr><td class="empty-state">Belum ada data</td></tr></tbody>';
    return;
  }

  const thead = '<thead><tr>' +
    ['WID', 'Site Name', 'Zona', 'MOS', 'HI Done', 'Connected', 'SM Status', 'Aksi']
      .map(h => '<th>' + h + '</th>').join('') +
    '</tr></thead>';

  const tbody = '<tbody>' + top.map(item => {
    const r = item.row;
    const nameCol = resolveCol([r], ['Site Name Impl', 'Site Name']);
    const zCol = zoneColOf([r]);
    const badge = badgeHTML(r['SM Status']);
    return '<tr class="clickable" onclick="showDetailModal(\'' + item.key + '\', ' + r.rowIndex + ')">' +
      '<td>' + esc(truncate(r['WID'], 28)) + '</td>' +
      '<td class="wrap">' + esc(truncate(nameCol ? r[nameCol] : '', 30)) + '</td>' +
      '<td>' + esc(zCol ? truncate(r[zCol], 16) : '-') + '</td>' +
      '<td>' + esc(fmt(r['MOS'])) + '</td>' +
      '<td>' + esc(fmt(isDoneVal(r['HI Done']) ? '✔' : '-')) + '</td>' +
      '<td>' + esc(fmt(isDoneVal(r['Connected Date']) ? '✔' : '-')) + '</td>' +
      '<td>' + (badge || esc(fmt(r['SM Status']))) + '</td>' +
      '<td><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();showDetailModal(\'' +
        item.key + '\', ' + r.rowIndex + ')">👁 Detail</button></td>' +
    '</tr>';
  }).join('') + '</tbody>';

  el.innerHTML = thead + tbody;
  applyFreeze(el, 8);
}

/** Tombol refresh header dengan animasi putar */
async function refreshData() {
  const btn = document.querySelector('.header-refresh');
  if (btn) btn.classList.add('spinning');
  showToast('Menyegarkan data...');
  await loadTabData('dashboard').catch(() => {});
  setTimeout(() => { if (btn) btn.classList.remove('spinning'); }, 600);
}

// Auto-refresh dashboard tiap 5 menit saat tab dashboard terbuka
setInterval(() => {
  if (state.currentTab === 'dashboard') loadTabData('dashboard').catch(() => {});
}, 300000);

async function loadSheet(sheetKey, force = false) {
  const c = cfg(sheetKey);
  const ck = 'sheet:' + sheetKey;

  // Render instan dari cache bila ada
  const cached = force ? null : cacheGet(ck);
  if (cached && cached.data !== undefined) {
    state.sheets[sheetKey] = cached.data;
    renderCrudTable(sheetKey);
    buildFilterPanel(sheetKey);
    if (c.hasZoneFilter) populateZoneFilter(idFor(sheetKey, 'zoneFilter'), sheetKey, cached.data);
    if (!cached.stale) return; // masih fresh - tanpa jaringan
  }

  showLoading(true);
  try {
    let j;
    if (c.api === 'pivot') {
      const res = await fetch(API_BASE_URL + '?action=pivot&name=' +
        encodeURIComponent(c.sheetName), { redirect: 'follow' });
      j = await res.json();
    } else {
      const res = await fetch(API_BASE_URL + '?action=' + c.api, { redirect: 'follow' });
      j = await res.json();
    }
    if (!j.success) throw new Error(j.error || 'gagal memuat');
    cacheSet(ck, j.data);
    state.sheets[sheetKey] = j.data || [];
    renderCrudTable(sheetKey);
    buildFilterPanel(sheetKey);
    if (c.hasZoneFilter) populateZoneFilter(idFor(sheetKey, 'zoneFilter'), sheetKey, state.sheets[sheetKey]);
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

function switchPivot(key) {
  state.activePivot = key;
  document.getElementById('pivotTitle').textContent = cfg(key).label;
  document.getElementById('addPivotBtn').setAttribute('onclick', "showAddModal('" + key + "')");
  // Tutup panel filter saat ganti tabel
  const panel = document.getElementById('filterPanel-active');
  if (panel) panel.classList.add('hidden');
  if (rowsOf(key).length) {
    renderCrudTable(key);
    buildFilterPanel(key);
  } else {
    loadSheet(key);
  }
}

/* ==================== Dashboard ==================== */

function renderKPI() {
  const kpi = state.kpi || {};
  const total = Number(kpi.total_site) || 0;
  const cards = [
    { icon: '📡', label: 'Total Site', value: fmt(kpi.total_site), cls: '' },
    { icon: '🛰️', label: 'Total MOS', value: fmt(kpi.total_mos), pct: pctOf(kpi.total_mos, total), cls: 'kpi-mos' },
    { icon: '✅', label: 'Total HI Done', value: fmt(kpi.total_hi_done), pct: pctOf(kpi.total_hi_done, total), cls: 'kpi-hi' },
    { icon: '🔗', label: 'Connected', value: fmt(kpi.total_connected), pct: pctOf(kpi.total_connected, total), cls: 'kpi-connect' },
    { icon: '⚡', label: 'SM ATP', value: fmt(kpi.total_sm_atp), pct: pctOf(kpi.total_sm_atp, total), cls: 'kpi-atp' },
    { icon: '🧾', label: 'FI INEOM', value: fmt(kpi.total_fi_ineom), pct: pctOf(kpi.total_fi_ineom, total), cls: 'kpi-ineom' }
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map(c =>
    '<div class="kpi-card ' + c.cls + '">' +
      '<div class="kpi-icon">' + c.icon + '</div>' +
      '<div class="kpi-label">' + esc(c.label) + '</div>' +
      '<div class="kpi-value">' + esc(c.value) + '</div>' +
      (c.pct ? '<div class="kpi-pct">' + esc(c.pct) + ' dari total site</div>' : '') +
    '</div>').join('');
}

function fmt(v) {
  return (v === undefined || v === null || v === '') ? '-' : String(v);
}

/**
 * Parse blok pivot pertama di sheet 'Pvt Dash Sul':
 * baris header 'Assignment | zona... | Grand Total' diikuti baris bulan.
 * Posisi kolom dideteksi otomatis (file asli mulai dari kolom B).
 */
function parsePvtDashBlock(sd) {
  if (!sd || !sd.rows || !sd.rows.length) return null;
  const rows = sd.rows;

  let hIdx = -1, col0 = 0;
  for (let i = 0; i < rows.length && hIdx < 0; i++) {
    const limit = Math.min(rows[i].length, 12);
    for (let c = 0; c < limit; c++) {
      if (String(rows[i][c]).trim().toLowerCase() === 'assignment') {
        hIdx = i; col0 = c; break;
      }
    }
  }
  if (hIdx < 0 || hIdx + 1 >= rows.length) return null;

  const header = rows[hIdx].map(v => String(v).trim());
  const zones = []; const zIdx = [];
  for (let c = col0 + 1; c < header.length; c++) {
    const h = header[c];
    if (!h) continue;
    if (/^grand ?total$/i.test(h)) break;
    zones.push(h); zIdx.push(c);
  }

  const STOP_LABELS = ['sm atp', 'fi ineom', 'hi done', 'connected', 'milestone'];
  const months = [];
  for (let i = hIdx + 1; i < rows.length; i++) {
    const label = String(rows[i][col0] === undefined ? '' : rows[i][col0]).trim();
    if (!label) continue;
    if (/^grand ?total$/i.test(label)) break;
    if (STOP_LABELS.includes(label.toLowerCase())) break;
    months.push({ label: label, vals: zIdx.map(c => Number(rows[i][c]) || 0) });
  }

  if (!months.length || !zones.length) return null;
  return { zones: zones, months: months };
}

/**
 * Deteksi format BARU (tabel input reguler): header berisi
 * Kategori | Bulan | Zona | Jumlah. Agregasi per bulan x zona
 * untuk kategori 'Assignment'. Return null jika bukan format ini.
 */
function tryLongFormatPvt(sd) {
  try {
    if (!sd || !sd.headers || !sd.rows.length) return null;
    const H = sd.headers.map(h => String(h).trim());
    if (!(H.includes('Kategori') && H.includes('Bulan') &&
          (H.includes('Zona') || H.includes('Jumlah')))) return null;

    const iKat = H.indexOf('Kategori'), iBul = H.indexOf('Bulan');
    const iZon = H.indexOf('Zona'), iJml = H.indexOf('Jumlah');

    // Abaikan baris sisa tempelan pivot lama
    const JUNK = ['po year', 'count of wid', 'column labels', 'row labels',
      'grand total', 'values'];
    const clean = sd.rows.filter(r => {
      const k = String(r[iKat] === undefined ? '' : r[iKat]).trim().toLowerCase();
      return k !== '' && !JUNK.includes(k);
    });
    if (!clean.length) return null;

    // Validasi ketat: baris sah harus Bulan valid (JAN..DES) + Jumlah angka.
    // Mencegah sisa tempelan lama terbaca sebagai tabel input baru.
    const valid = clean.filter(r => {
      const m = String(r[iBul] === undefined ? '' : r[iBul]).trim().toUpperCase();
      const jmlRaw = String(iJml >= 0 ? (r[iJml] === undefined ? '' : r[iJml]) : '').trim();
      return MONTHS.includes(m) && jmlRaw !== '' && !isNaN(Number(jmlRaw));
    });
    if (valid.length < 3) return null;

    // Pilih kategori 'Assignment' bila ada, jika tidak pakai kategori terbanyak
    const counts = {};
    valid.forEach(r => {
      const k = String(r[iKat]).trim();
      counts[k] = (counts[k] || 0) + 1;
    });
    let kat = counts['Assignment'] ? 'Assignment' :
      Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];

    const zones = [], months = [];
    valid.forEach(r => {
      const z = String(iZon >= 0 ? (r[iZon] === undefined ? '' : r[iZon]) : '-').trim() || '-';
      const m = String(r[iBul]).trim();
      if (z && zones.indexOf(z) === -1) zones.push(z);
      if (m && months.indexOf(m) === -1) months.push(m);
    });
    if (!zones.length || !months.length) return null;

    // Urutkan bulan sesuai urutan MONTHS
    const mIdx = v => { const i = MONTHS.indexOf(v.toUpperCase()); return i < 0 ? 99 : i; };
    months.sort((a, b) => mIdx(a) - mIdx(b));

    const agg = {};
    valid.forEach(r => {
      if (String(r[iKat]).trim() !== kat) return;
      const z = String(iZon >= 0 ? (r[iZon] === undefined ? '' : r[iZon]) : '-').trim() || '-';
      const m = String(r[iBul]).trim();
      agg[z] = agg[z] || {};
      agg[z][m] = (agg[z][m] || 0) + (Number(iJml >= 0 ? r[iJml] : 0) || 0);
    });

    return {
      labels: months,
      datasets: zones.map((z, i) => ({
        label: z,
        data: months.map(m => (agg[z] && agg[z][m]) || 0),
        backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length]
      }))
    };
  } catch (e) { return null; }
}

function getCtx(id) {
  const el = document.getElementById(id);
  if (!el || !el.getContext) return null;
  return el.getContext('2d');
}

function renderMosChart() {
  // Prioritas 1: tabel input reguler format panjang (Pvt Dash Sul baru)
  // Prioritas 2: blok pivot lama 'Assignment x Zona'
  // Prioritas 3: fallback layout [MONTH | zona | TOTAL]
  let labels, chartDatasets;

  const longFmt = tryLongFormatPvt(state.dashboard && state.dashboard.pvt_dash_sul);
  const pvt = longFmt ? null : parsePvtDashBlock(state.dashboard && state.dashboard.pvt_dash_sul);

  if (longFmt) {
    labels = longFmt.labels;
    chartDatasets = longFmt.datasets;
  } else if (pvt) {
    labels = pvt.months.map(m => m.label);
    chartDatasets = pvt.zones.map((z, i) => ({
      label: z,
      data: pvt.months.map(m => m.vals[i]),
      backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length]
    }));
  } else {
    const d26 = state.dashboard && state.dashboard.dashboard_2026;
    if (!d26 || !d26.headers || !d26.headers.length) return;
    const zones = d26.headers.slice(1, -1);
    const monthRows = d26.rows.filter(r =>
      MONTHS.includes(String(r[0]).toUpperCase()));
    if (!monthRows.length) return;
    labels = monthRows.map(r => r[0]);
    chartDatasets = zones.map((z, i) => ({
      label: z,
      data: monthRows.map(r => Number(r[i + 1]) || 0),
      backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length]
    }));
  }

  const ctx = getCtx('mosChart');
  if (!ctx) return;
  if (state.mosChart) state.mosChart.destroy();
  state.mosChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: { legend: { position: 'top' } }
    }
  });
}

/**
 * Deteksi blok konten berdampingan secara horizontal pada sheet asli.
 * Kolom-kolom yang terpisah oleh celah kosong dianggap blok berbeda,
 * lalu ditumpuk vertikal agar tidak melebar.
 */
function splitColumnBlocks(sd) {
  const rows = sd.rows || [];
  if (!rows.length) return [];
  let width = Math.max(sd.headers.length, 1);
  rows.forEach(r => { if (r.length > width) width = r.length; });

  // Tandai kolom yang terpakai
  const used = new Array(width).fill(false);
  rows.forEach(r => {
    for (let c = 0; c < width && c < r.length; c++) {
      if (String(r[c] === undefined || r[c] === null ? '' : r[c]).trim() !== '') used[c] = true;
    }
  });

  // Kelompokkan kolom terpakai yang berurutan menjadi rentang blok
  const ranges = [];
  let c = 0;
  while (c < width) {
    if (used[c]) {
      const start = c;
      while (c < width && used[c]) c++;
      ranges.push([start, c - start]);
    } else c++;
  }

  return ranges.map(([off, len]) => ({
    offset: off,
    size: len,
    rows: rows.map(r => {
      const out = [];
      for (let i = 0; i < len; i++) out.push(r[off + i] === undefined ? '' : r[off + i]);
      return out;
    })
  }));
}

/** Pecah blok yang lebih lebar dari maxCols; kolom label (pertama) diulang */
function explodeWideBlocks(blocks, maxCols = 7) {
  const out = [];
  blocks.forEach(b => {
    if (b.size <= maxCols || b.size < 4) { out.push(b); return; }
    for (let s = 1; s < b.size; s += maxCols - 1) {
      const seg = [0];
      for (let c = s; c < Math.min(s + (maxCols - 1), b.size); c++) seg.push(c);
      out.push({
        offset: b.offset + s,
        size: seg.length,
        rows: b.rows.map(r => seg.map(i => r[i]))
      });
    }
  });
  return out;
}

function miniRowHTML(cells, width) {
  // Baris judul seksi: hanya satu sel terisi
  const filled = cells.filter(c => String(c).trim() !== '');
  if (filled.length === 1 && width > 2) {
    const idx = cells.findIndex(c => String(c).trim() !== '');
    let pad = '';
    for (let i = 0; i < idx; i++) pad += '<td></td>';
    return '<tr class="group-row">' + pad +
      '<td colspan="' + (width - idx) + '">' + esc(cells[idx]) + '</td></tr>';
  }
  return '<tr>' + cells.map(c => {
    let cls = isNum(c) ? 'num' : '';
    const m = String(c).trim().match(/^(\d+(?:\.\d+)?)\s?%$/);
    if (m) {
      cls += (cls ? ' ' : '') +
        (parseFloat(m[1]) >= 90 ? 'pct-high' :
         parseFloat(m[1]) >= 70 ? 'pct-mid' : 'pct-low');
    }
    return '<td class="' + cls + '">' + esc(c) + '</td>';
  }).join('') + '</tr>';
}

/** Buang baris & kolom yang seluruhnya kosong dari sebuah blok */
function pruneEmpty(b) {
  const rows = b.rows.filter(r => r.some(c => String(c === undefined || c === null ? '' : c).trim() !== ''));
  if (!rows.length) return { offset: b.offset, size: b.size, rows: [] };

  const keep = [];
  rows[0].forEach((_, i) => {
    if (rows.some(r => String(r[i] === undefined || r[i] === null ? '' : r[i]).trim() !== '')) keep.push(i);
  });
  return { offset: b.offset, size: keep.length, rows: rows.map(r => keep.map(i => r[i])) };
}

function renderMiniTable(divId, sheetData) {
  const el = document.getElementById(divId);
  if (!el) return;
  if (!sheetData || !sheetData.rows || !sheetData.rows.length) {
    el.innerHTML = '<div class="empty-state">Belum ada data</div>';
    return;
  }

  let blocks = explodeWideBlocks(splitColumnBlocks(sheetData))
    .map(pruneEmpty)
    .filter(b => b.rows.length && b.size > 0);

  let html = '';
  blocks.forEach(b => {
    // Baris header = baris pertama yang memiliki >= 2 sel terisi
    let h = -1;
    b.rows.forEach((r, i) => {
      if (h < 0) {
        const f = r.filter(c => String(c).trim() !== '').length;
        if (f >= 2) h = i;
      }
    });
    if (h < 0) h = 0;

    const headers = b.rows[h].slice();
    const body = b.rows.filter((r, i) => i !== h);
    const wideClass = b.size >= 9 ? ' wide' : '';

    html += '<div class="mini-block' + wideClass + '"><table class="data-table compact mini"><thead><tr>' +
      headers.map(c => {
        const ic = HEADER_ICONS[String(c).trim()];
        return '<th>' + (ic ? '<span class="header-icon">' + ic + '</span>' : '') +
          esc(c) + '</th>';
      }).join('') +
      '</tr></thead><tbody>' +
      body.map(r => miniRowHTML(r.slice(), b.size)).join('') +
      '</tbody></table></div>';
  });

  el.innerHTML = html;

  // Terapkan freeze panes pada tiap blok
  el.querySelectorAll('table.mini').forEach(t => {
    const n = t.querySelector('thead tr').children.length;
    if (n >= 3) applyFreeze(t, n);
  });
}

/* ==================== Smart Dropdown Helpers ==================== */

function resolveCol(rows, candidates) {
  if (!rows.length) return candidates[0];
  const keys = Object.keys(rows[0]);
  for (let i = 0; i < candidates.length; i++) {
    if (keys.includes(candidates[i])) return candidates[i];
  }
  return null;
}

/**
 * Deteksi kolom wilayah/zona secara adaptif.
 * SYNC: Kandidat harus identik dengan zoneColName_() di Code.gs backend.
 */
function zoneColOf(rows) {
  return resolveCol(rows, ['ZTE ZONE', 'Zona', 'Branch', 'Cluster', 'Region', 'Area']) || 'ZTE ZONE';
}

function distinctValues(rows, col) {
  const set = new Set();
  rows.forEach(r => {
    const v = String(r[col] === undefined || r[col] === null ? '' : r[col]).trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort();
}

function datalistId(col) {
  return 'dl-' + col.replace(/[^a-zA-Z0-9]/g, '-');
}

function comboOptionsFor(sheetKey, col, rows) {
  // Opsi khusus sheet pivot
  const c = cfg(sheetKey);
  if (c && c.sheetName && PIVOT_OPTIONS[c.sheetName] && PIVOT_OPTIONS[c.sheetName][col]) {
    const base = PIVOT_OPTIONS[c.sheetName][col];
    return Array.from(new Set(base.concat(distinctValues(rows, col))));
  }
  if (col === 'Bulan') return MONTHS.slice();

  if (col === zoneColOf(rows)) {
    if (sheetKey === 'site-sul') return ZONES_SUL_STATIC.slice();
    return distinctValues(rows, col);
  }
  if (STATIC_OPTIONS[col]) {
    return Array.from(new Set(STATIC_OPTIONS[col].concat(distinctValues(rows, col))));
  }
  if (DYNAMIC_COMBO_COLS.includes(col)) return distinctValues(rows, col);
  if (SEMI_FREE_OPTIONS[col]) {
    return Array.from(new Set(SEMI_FREE_OPTIONS[col].concat(distinctValues(rows, col))));
  }
  return null;
}

function smartFieldHTML(sheetKey, col, val, rows) {
  const name = esc(col);
  const value = esc(val);
  const c = cfg(sheetKey);

  if (c && c.numeric && c.numeric.includes(col)) {
    return '<input type="number" step="any" name="' + name + '" value="' + value + '">';
  }

  if (col === 'HI Progress') {
    const num = String(val).replace(/[^0-9.]/g, '');
    return '<input type="number" min="0" max="100" step="any" name="' + name +
      '" value="' + esc(num) + '" placeholder="0-100">';
  }

  // ZTE ZONE pada Site_SUL: dropdown tetap (3 pilihan wajib)
  if (col === zoneColOf(rows) && sheetKey === 'site-sul') {
    let opts = ZONES_SUL_STATIC.slice();
    const sv = String(val || '').trim();
    if (sv && !opts.includes(sv)) opts.unshift(sv); // pertahankan nilai lama bila berbeda
    return '<select name="' + name + '">' +
      '<option value="">-- pilih --</option>' +
      opts.map(o => '<option value="' + esc(o) + '"' +
        (o.toLowerCase() === sv.toLowerCase() ? ' selected' : '') + '>' + esc(o) + '</option>').join('') +
      '</select>';
  }

  const options = comboOptionsFor(sheetKey, col, rows);
  if (options && options.length) {
    const id = datalistId(col);
    return '<input type="text" name="' + name + '" value="' + value +
      '" list="' + id + '" autocomplete="off">' +
      '<datalist id="' + id + '">' +
      options.map(o => '<option value="' + esc(o) + '">').join('') +
      '</datalist>';
  }

  return '<input type="text" name="' + name + '" value="' + value + '">';
}

/* ==================== CRUD Tables (generik semua sheet) ==================== */

function visibleColumns(sheetKey, rows) {
  if (!rows.length) {
    const c = cfg(sheetKey);
    return c && c.columns ? c.columns : [];
  }
  const alwaysShow = ['No', 'WID',
    resolveCol(rows, ['Site ID Impl', 'Site ID']),
    resolveCol(rows, ['Site Name Impl', 'Site Name']),
    zoneColOf(rows)
  ].filter(Boolean);
  return Object.keys(rows[0])
    .filter(col => col !== 'rowIndex')
    .filter(col =>
      alwaysShow.includes(col) ||
      rows.some(r => String(r[col] === undefined || r[col] === null ? '' : r[col]).trim() !== ''));
}

function getFilteredRows(sheetKey) {
  const rows = rowsOf(sheetKey);
  const c = cfg(sheetKey);

  let zone = '';
  let q = '';
  if (c.hasZoneFilter) {
    const zoneEl = document.getElementById(idFor(sheetKey, 'zoneFilter'));
    zone = (zoneEl ? zoneEl.value : '').trim().toUpperCase();
  }
  const searchEl = document.getElementById(idFor(sheetKey, 'search'));
  q = (searchEl ? searchEl.value : '').trim().toLowerCase();

  const filters = state.filters[sheetKey] || {};
  const zCol = zoneColOf(rows);
  const nameCol = resolveCol(rows, ['Site Name Impl', 'Site Name']);

  return rows.filter(r => {
    if (zCol && zone &&
        String(r[zCol] === undefined || r[zCol] === null ? '' : r[zCol]).trim().toUpperCase() !== zone) {
      return false;
    }
    if (q) {
      let hay = '';
      Object.keys(r).forEach(k => {
        if (k !== 'rowIndex') hay += ' ' + String(r[k] === undefined || r[k] === null ? '' : r[k]).toLowerCase();
      });
      if (!hay.includes(q)) return false;
    }
    for (const col in filters) {
      const f = String(filters[col]).trim().toLowerCase();
      if (!f) continue;
      const cell = String(r[col] === undefined || r[col] === null ? '' : r[col]).trim().toLowerCase();
      if (!cell.includes(f)) return false;
    }
    return true;
  });
}

function renderCrudTable(sheetKey) {
  const tableEl = document.getElementById(idFor(sheetKey, 'table'));
  const pagEl = document.getElementById(idFor(sheetKey, 'pagination'));
  const countEl = document.getElementById(idFor(sheetKey, 'count'));
  if (!tableEl) return;

  const rows = getFilteredRows(sheetKey);
  if (countEl) countEl.textContent = rows.length + ' data';
  tableEl.innerHTML = '';
  tableEl.className = 'data-table dense';
  if (pagEl) pagEl.innerHTML = '';

  if (!rows.length) {
    tableEl.innerHTML = '<tbody><tr><td class="empty-state">Tidak ada data yang cocok</td></tr></tbody>';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (state.page[sheetKey] > totalPages) state.page[sheetKey] = totalPages;

  // Sortir aktif (klik header)
  const sortCfg = state.sort[sheetKey];
  if (sortCfg) {
    const col = sortCfg.col;
    rows.sort((a, b) => {
      const x = a[col], y = b[col];
      const ex = x === undefined || x === null || String(x).trim() === '';
      const ey = y === undefined || y === null || String(y).trim() === '';
      if (ex && !ey) return 1;
      if (ey && !ex) return -1;
      if (ex && ey) return 0;
      const nx = parseFloat(x), ny = parseFloat(y);
      const c = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : String(x).localeCompare(String(y));
      return c * sortCfg.dir;
    });
  }

  const page = state.page[sheetKey];
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cols = visibleColumns(sheetKey, rows);

  const thead = '<thead><tr>' +
    cols.map(c => {
      const icon = HEADER_ICONS[c];
      let ind = '', cls = 'sortable';
      if (sortCfg && sortCfg.col === c) {
        ind = sortCfg.dir === 1 ? '▲' : '▼';
        cls += ' active';
      }
      return '<th class="' + cls + '" title="Klik untuk sortir" ' +
        'onclick="sortBy(\'' + sheetKey + '\', \'' + esc(c).replace(/'/g, "\\'") + '\')">' +
        (icon ? '<span class="header-icon">' + icon + '</span>' : '') +
        esc(c) +
        '<span class="sort-indicator' + (ind ? ' active' : '') + '">' + ind + '</span></th>';
    }).join('') +
    '</tr></thead>';

  const tbody = '<tbody>' + pageRows.map(r =>
    '<tr class="clickable" title="Klik untuk detail" onclick="showDetailModal(\'' + sheetKey + '\', ' + r.rowIndex + ')">' +
      cols.map(c => {
        const badge = badgeHTML(r[c]);
        if (badge) return '<td>' + badge + '</td>';
        return '<td class="' + (isNum(r[c]) ? 'num' : 'wrap') + '" title="' + esc(r[c]) + '">' +
          esc(truncate(r[c])) + '</td>';
      }).join('') +
    '</tr>').join('') + '</tbody>';

  tableEl.innerHTML = thead + tbody;
  if (pagEl) renderPagination(pagEl, page, totalPages, sheetKey);
  applyFreeze(tableEl, cols.length);
}

/**
 * Freeze panes ala Excel: header tetap (sticky top) dan dua kolom
 * pertama tetap terlihat saat scroll ke kanan.
 * Posisi 'left' dihitung dari lebar aktual kolom sebelumnya.
 */
function applyFreeze(tableEl, totalCols) {
  const ths = tableEl.querySelectorAll('thead th');
  if (!ths.length) return;

  // Bersihkan freeze lama (mis. setelah re-render)
  tableEl.querySelectorAll('.frozen-col').forEach(c => {
    c.classList.remove('frozen-col');
    c.style.left = '';
    c.style.zIndex = '';
  });
  if (totalCols < 3) return; // tidak perlu freeze untuk tabel sempit

  const w0 = ths[0].offsetWidth;
  const left2 = w0 + (ths[1] ? ths[1].offsetWidth : 0);

  [[0, 0], [1, w0]].forEach(([idx, left]) => {
    const th = ths[idx];
    if (!th) return;
    th.classList.add('frozen-col');
    th.style.left = left + 'px';
    th.style.zIndex = idx === 0 ? 30 : 29;
  });

  tableEl.querySelectorAll('tbody tr').forEach(tr => {
    const tds = tr.children;
    [[0, 0], [1, w0]].forEach(([idx, left]) => {
      const td = tds[idx];
      if (!td) return;
      td.classList.add('frozen-col');
      td.style.left = left + 'px';
      td.style.zIndex = idx === 0 ? 10 : 9;
    });
  });
}

// Hitung ulang posisi freeze saat ukuran jendela berubah
let _resizeT = null;


/* COLLAPSIBLE SECTIONS */
function toggleCollapsible(sectionId, header) {
  var section = document.getElementById(sectionId);
  var content = section.querySelector('.collapsible-content');
  var icon = header.querySelector('.toggle-icon');
  var isCollapsed = section.classList.contains('collapsed');

  if (isCollapsed) {
    section.classList.remove('collapsed');
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '\u25BC';
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    requestAnimationFrame(function() {
      section.classList.add('collapsed');
      content.style.maxHeight = '0';
      icon.textContent = '\u25B6';
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var sections = document.querySelectorAll('.collapsible-section');
  sections.forEach(function(section) {
    var content = section.querySelector('.collapsible-content');
    var icon = section.querySelector('.collapsible-header .toggle-icon');
    if (section.classList.contains('collapsed')) {
      content.style.maxHeight = '0';
      if (icon) icon.textContent = '\u25B6';
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
      if (icon) icon.textContent = '\u25BC';
    }
  });
});window.addEventListener('resize', () => {
  clearTimeout(_resizeT);
  _resizeT = setTimeout(() => {
    const key = activeSheetKey();
    const el = document.getElementById(idFor(key, 'table'));
    if (el && rowsOf(key).length) renderCrudTable(key);
  }, 250);
});

function renderPagination(container, page, totalPages, sheetKey) {
  let html = '';
  html += '<button' + (page <= 1 ? ' disabled' : '') +
    ' onclick="changePage(\'' + sheetKey + '\', ' + (page - 1) + ')">&laquo; Prev</button>';

  const maxBtns = 7;
  let start = Math.max(1, page - Math.floor(maxBtns / 2));
  let end = Math.min(totalPages, start + maxBtns - 1);
  start = Math.max(1, end - maxBtns + 1);

  if (start > 1) {
    html += '<button onclick="changePage(\'' + sheetKey + '\', 1)">1</button>';
    if (start > 2) html += '<span class="page-info">...</span>';
  }
  for (let p = start; p <= end; p++) {
    html += '<button class="' + (p === page ? 'active' : '') +
      '" onclick="changePage(\'' + sheetKey + '\', ' + p + ')">' + p + '</button>';
  }
  if (end < totalPages) {
    if (end < totalPages - 1) html += '<span class="page-info">...</span>';
    html += '<button onclick="changePage(\'' + sheetKey + '\', ' + totalPages + ')">' + totalPages + '</button>';
  }
  html += '<button' + (page >= totalPages ? ' disabled' : '') +
    ' onclick="changePage(\'' + sheetKey + '\', ' + (page + 1) + ')">Next &raquo;</button>';
  html += '<span class="page-info">Hal. ' + page + ' / ' + totalPages + '</span>';
  container.innerHTML = html;
}

function changePage(sheetKey, page) {
  state.page[sheetKey] = page;
  renderCrudTable(sheetKey);
}

function sortBy(sheetKey, col) {
  const cur = state.sort[sheetKey];
  if (!cur || cur.col !== col) state.sort[sheetKey] = { col: col, dir: 1 };
  else if (cur.dir === 1) state.sort[sheetKey] = { col: col, dir: -1 };
  else delete state.sort[sheetKey];
  renderCrudTable(sheetKey);
}

// Event filter & search — reset ke halaman 1 saat berubah
['site-sul', 'site-kal'].forEach(key => {
  ['zoneFilter-', 'search-'].forEach(prefix => {
    const el = document.getElementById(prefix + key);
    if (!el) return;
    if (prefix === 'search-') {
      let t = null;
      el.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { state.page[key] = 1; renderCrudTable(key); }, 300);
      });
    } else {
      el.addEventListener('input', () => {
        state.page[key] = 1;
        renderCrudTable(key);
      });
    }
  });
});
const searchActive = document.getElementById('search-active');
if (searchActive) {
  let t = null;
  searchActive.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { state.page[state.activePivot] = 1; renderCrudTable(state.activePivot); }, 300);
  });
}

/* ==================== Filter Zona (toolbar) ==================== */

/**
 * Isi dropdown "Filter Zona" di toolbar.
 * Site_SUL: hanya MAKASSAR / MANADO / TERNATE (tetap).
 * Sheet lain: dinamis dari data.
 */
function populateZoneFilter(selectId, sheetKey, rows) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value;
  const zCol = zoneColOf(rows);
  if (!zCol) return;

  let zones;
  if (sheetKey === 'site-sul') {
    zones = ZONES_SUL_STATIC.slice();
    // pastikan nilai lama di luar 3 zona tetap bisa difilter
    rows.forEach(r => {
      const z = String(r[zCol] === undefined || r[zCol] === null ? '' : r[zCol]).trim();
      if (z && zones.indexOf(z) === -1) zones.push(z);
    });
  } else {
    zones = distinctValues(rows, zCol);
  }

  sel.innerHTML = '<option value="">-- Semua Zone --</option>' +
    zones.map(z => '<option value="' + esc(z) + '">' + esc(z) + '</option>').join('');
  if (zones.includes(current)) sel.value = current;
}

function toggleFilterPanel(sheetKey) {
  const panel = document.getElementById(idFor(sheetKey, 'filterPanel'));
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) buildFilterPanel(sheetKey);
}

function buildFilterPanel(sheetKey) {
  const panel = document.getElementById(idFor(sheetKey, 'filterPanel'));
  if (!panel) return;

  const rows = rowsOf(sheetKey);
  if (!rows.length) { panel.innerHTML = '<span class="page-info">Belum ada data</span>'; return; }

  const cols = visibleColumns(sheetKey, rows);
  const activeFilters = state.filters[sheetKey] || {};

  let html = '<div class="filter-header">' +
    '<strong>Filter Kolom</strong>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetColumnFilters(\'' + sheetKey + '\')">Reset Filter</button>' +
    '</div><div class="filter-grid">';

  cols.forEach(col => {
    const val = activeFilters[col] || '';
    const options = comboOptionsFor(sheetKey, col, rows);
    let control;

    if (options && options.length <= 25) {
      const union = Array.from(new Set(options.concat(distinctValues(rows, col)))).sort();
      control = '<select onchange="setColumnFilter(\'' + sheetKey + '\', this.dataset.col, this.value)" data-col="' + esc(col) + '">' +
        '<option value="">Semua</option>' +
        union.map(o => '<option value="' + esc(o) + '"' +
          (o.toLowerCase() === val.toLowerCase() ? ' selected' : '') + '>' + esc(truncate(o, 30)) + '</option>').join('') +
        '</select>';
    } else {
      control = '<input type="text" value="' + esc(val) + '" placeholder="Ketik untuk filter..." autocomplete="off"' +
        ' oninput="debouncedColumnFilter(\'' + sheetKey + '\', \'' + esc(col).replace(/'/g, "\\'") + '\', this.value)">';
    }

    html += '<div class="filter-item"><label>' + esc(col) + '</label>' + control + '</div>';
  });

  html += '</div>';
  panel.innerHTML = html;
}

function setColumnFilter(sheetKey, col, value) {
  state.filters[sheetKey][col] = value;
  state.page[sheetKey] = 1;
  renderCrudTable(sheetKey);
}

function debouncedColumnFilter(sheetKey, col, value) {
  clearTimeout(setColumnFilter._t);
  setColumnFilter._t = setTimeout(() => setColumnFilter(sheetKey, col, value), 300);
}

function resetColumnFilters(sheetKey) {
  state.filters[sheetKey] = {};
  state.page[sheetKey] = 1;
  buildFilterPanel(sheetKey);
  renderCrudTable(sheetKey);
}

/* ==================== Pop-up Detail ==================== */

let detailContext = null;

function showDetailModal(sheetKey, rowIndex) {
  const source = rowsOf(sheetKey);
  let row = null;
  for (const r of source) {
    if (r.rowIndex === rowIndex) { row = r; break; }
  }
  if (!row) { showToast('Baris tidak ditemukan', 'error'); return; }

  detailContext = { sheetKey: sheetKey, rowIndex: rowIndex };
  const nameCol = resolveCol(source, ['Site Name Impl', 'Site Name']);
  document.getElementById('modalTitle').textContent =
    'Detail: ' + (row[nameCol] || row['WID'] || cfg(sheetKey).label);

  const entries = Object.keys(row)
    .filter(col => col !== 'rowIndex')
    .filter(col => String(row[col] === undefined || row[col] === null ? '' : row[col]).trim() !== '');

  const html =
    '<div class="detail-list">' +
    (entries.length
      ? entries.map(col =>
          '<div class="detail-item">' +
            '<div class="detail-label">' + esc(col) + '</div>' +
            '<div class="detail-value">' + esc(row[col]) + '</div>' +
          '</div>').join('')
      : '<div class="empty-state">Tidak ada data</div>') +
    '</div>' +
    '<div class="detail-actions">' +
      '<button type="button" class="btn btn-danger" onclick="deleteFromDetail()">Hapus</button>' +
      '<button type="button" class="btn btn-primary" onclick="editFromDetail()">Edit Data</button>' +
    '</div>';

  document.getElementById('dataForm').innerHTML = html;
  openModal();
}

function editFromDetail() {
  if (!detailContext) return;
  const ctx = detailContext;
  closeModal();
  setTimeout(() => showEditModal(ctx.sheetKey, ctx.rowIndex), 100);
}

async function deleteFromDetail() {
  if (!detailContext) return;
  await deleteRow(detailContext.sheetKey, detailContext.rowIndex);
}

async function deleteRow(sheetKey, rowIndex) {
  if (!confirm('Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.')) return;
  const c = cfg(sheetKey);
  await apiCall(c.actions.del, c.api === 'pivot'
    ? { sheet: c.sheetName, rowIndex: rowIndex }
    : { rowIndex: rowIndex });
  cacheDel('sheet:' + sheetKey); // invalidasi cache sheet terkait
  closeModal();
  showToast('Data berhasil dihapus');
  loadSheet(sheetKey, true);
}

/* ==================== Modal Form (Tambah/Edit) ==================== */

let formContext = null;

function showAddModal(sheetKey) {
  formContext = { mode: 'add', sheetKey: sheetKey };
  document.getElementById('modalTitle').textContent = 'Tambah Data - ' + cfg(sheetKey).label;
  buildForm({});
  openModal();
}

function showEditModal(sheetKey, rowIndex) {
  const source = rowsOf(sheetKey);
  let row = null;
  for (const r of source) {
    if (r.rowIndex === rowIndex) { row = r; break; }
  }
  if (!row) { showToast('Baris tidak ditemukan', 'error'); return; }

  formContext = { mode: 'edit', sheetKey: sheetKey, rowIndex: rowIndex };
  document.getElementById('modalTitle').textContent = 'Edit Data - ' + cfg(sheetKey).label;
  buildForm(row);
  openModal();
}

function buildForm(data) {
  const sheetKey = formContext.sheetKey;
  const refRows = rowsOf(sheetKey);
  const cols = visibleColumns(sheetKey, refRows);

  let html = '<div class="form-grid">' + cols.map(col => {
    const val = data[col] === undefined || data[col] === null ? '' : data[col];
    const isWide = WIDE_FIELDS.includes(col);
    const isDate = /Date/i.test(col) && !/Info|Upload|Inbond/i.test(col);
    let field;

    if (isDate) {
      field = '<input type="date" name="' + esc(col) + '" value="' + esc(toISODate(val)) + '">';
    } else {
      field = smartFieldHTML(sheetKey, col, val, refRows);
    }

    return '<div class="form-group ' + (isWide ? 'wide' : '') + '">' +
      '<label>' + esc(col) + '</label>' + field + '</div>';
  }).join('');

  html += '<div class="form-group" id="prodPercentGroup" style="display:none">' +
    '<label>Persentase (%)</label>' +
    '<input type="number" min="0" max="100" step="any" name="__prod_percent">' +
    '</div>';

  html += '</div>';

  const formEl = document.getElementById('dataForm');
  formEl.innerHTML = html;

  const prodInput = formEl.querySelector('[name="Site Productivity Status"]');
  const percentGroup = formEl.querySelector('#prodPercentGroup');
  if (prodInput && percentGroup) {
    const toggle = () => {
      const v = prodInput.value;
      percentGroup.style.display =
        PERCENT_PREFIXES.some(p => v.indexOf(p) === 0) ? '' : 'none';
    };
    prodInput.addEventListener('input', toggle);
    toggle();
  }
}

function saveForm() {
  const form = document.getElementById('dataForm');
  const data = {};
  new FormData(form).forEach((value, key) => { data[key] = value; });

  if (data['__prod_percent'] !== undefined) {
    const p = String(data['__prod_percent']).trim();
    delete data['__prod_percent'];
    if (p && data['Site Productivity Status']) {
      const base = data['Site Productivity Status']
        .replace(/\s*\d+(\.\d+)?\s*%\s*$/, '').trim();
      data['Site Productivity Status'] = base + ' ' + p + '%';
    }
  }

  const hp = String(data['HI Progress'] || '').trim();
  if (hp && !isNaN(hp)) data['HI Progress'] = hp + '%';

  // Buang field kosong agar tidak menimpa data lama saat edit
  Object.keys(data).forEach(k => {
    if (data[k] === '' ) delete data[k];
  });

  const ctx = formContext;
  const c = cfg(ctx.sheetKey);
  const action = ctx.mode === 'add' ? c.actions.add : c.actions.update;
  const payload = ctx.mode === 'add'
    ? (c.api === 'pivot' ? { sheet: c.sheetName, data: data } : { data: data })
    : (c.api === 'pivot'
        ? { sheet: c.sheetName, rowIndex: ctx.rowIndex, data: data }
        : { rowIndex: ctx.rowIndex, data: data });

  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  apiCall(action, payload)
    .then(() => {
      cacheDel('sheet:' + ctx.sheetKey); // invalidasi cache sheet terkait
      closeModal();
      showToast(ctx.mode === 'add' ? 'Data berhasil ditambahkan' : 'Data berhasil diperbarui');
      loadSheet(ctx.sheetKey, true);
    })
    .catch(() => {})
    .finally(() => { btn.disabled = false; });
}

function openModal() { document.getElementById('modalOverlay').classList.remove('hidden'); }
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target.id === 'modalOverlay') closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); return; }
  // Focus trap: keep Tab inside modal when open
  if (e.key === 'Tab' && !document.getElementById('modalOverlay').classList.contains('hidden')) {
    const modal = document.querySelector('.modal');
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

/* ==================== Utils ==================== */

function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(v, max = 60) {
  const s = String(v === undefined || v === null ? '' : v);
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function isNum(v) {
  if (v === '' || v === null || v === undefined) return false;
  return !isNaN(Number(v));
}

function toISODate(v) {
  if (!v) return '';
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
  m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  return '';
}

/* ==================== Init ==================== */

/* ---------- Splash Screen (Alien Blue) ---------- */
const SPLASH_MIN_MS = 2600;   // durasi minimal agar animasi terasa
const SPLASH_MAX_MS = 12000;  // pengaman: tutup paksa setelah 12 detik
let splashActive = false;
let splashDone = false;

function createParticles() {
  const container = document.getElementById('particlesContainer');
  if (!container) return;
  for (let i = 0; i < 130; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 2.5 + 1;
    p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;' +
      'left:' + (Math.random() * 100).toFixed(1) + '%;' +
      'top:' + (Math.random() * 100).toFixed(1) + '%;' +
      '--duration:' + (Math.random() * 3 + 2).toFixed(1) + 's;' +
      'animation-delay:' + (Math.random() * 3).toFixed(1) + 's;';
    container.appendChild(p);
  }
}

let lastSplashPct = 0;
function splashProgress(pct, statusText) {
  if (!splashActive) return;
  const p = Math.max(Math.min(pct, 100), lastSplashPct); // monoton naik
  lastSplashPct = p;
  const fill = document.getElementById('loaderFill');
  const perc = document.getElementById('loaderPercent');
  const stat = document.getElementById('loaderStatus');
  if (fill) fill.style.width = Math.round(p) + '%';
  if (perc) perc.textContent = Math.round(p) + '%';
  if (stat && statusText) stat.textContent = statusText;
}

function closeSplash(onDone) {
  if (splashDone) return;
  splashDone = true;
  splashActive = false;
  try { sessionStorage.setItem('yptt_splash_seen', '1'); } catch (e) {}
  const sp = document.getElementById('splashScreen');
  if (!sp) { onDone(); return; }
  sp.classList.add('fade-out');
  setTimeout(() => {
    sp.style.display = 'none';
    onDone();
  }, 1000);
}

function startSplash(onDone) {
  // Tampilkan sekali per sesi browser saja
  let seen = false;
  try { seen = sessionStorage.getItem('yptt_splash_seen') === '1'; } catch (e) {}
  if (seen) {
    const sp = document.getElementById('splashScreen');
    if (sp) sp.style.display = 'none';
    onDone();
    return;
  }

  splashActive = true;
  createParticles();

  const statuses = [
    'Initializing System...',
    'Connecting to Database...',
    'Loading Site Data...',
    'Synchronizing Pivot Tables...',
    'Preparing Dashboard...',
    'Almost Ready...',
    'YPTT TI Tracker Online!'
  ];
  let si = 0;
  const statusTimer = setInterval(() => {
    splashProgress(Math.min(92, (si + 1) * 14), statuses[Math.min(si, statuses.length - 1)]);
    si++;
    if (si >= 6) clearInterval(statusTimer);
  }, 380);

  const minTimer = setTimeout(() => finish(), SPLASH_MIN_MS);
  const maxTimer = setTimeout(() => finish(true), SPLASH_MAX_MS);

  function finish(forceStatus) {
    clearTimeout(minTimer);
    clearTimeout(maxTimer);
    clearInterval(statusTimer);
    splashProgress(100, forceStatus ? 'Almost Ready...' : statuses[statuses.length - 1]);
    setTimeout(() => closeSplash(onDone), 450);
  }

  // Dipanggil loadDashboard saat data awal selesai dimuat
  window.__notifyDataReady = () => {
    setTimeout(() => finish(false), 300);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('pivotSelect');
  if (sel) sel.addEventListener('change', e => switchPivot(e.target.value));

  // Mulai ambil data SELAMA splash berjalan (paralel, bukan setelahnya)
  loadTabData('dashboard').catch(() => {});
  startSplash(() => {
    // switchTab akan memakai hasil inflight/cache -> instan
    switchTab('dashboard');
  });
});



