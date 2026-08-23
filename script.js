/* ============ YPTT TI Tracker - Script ============ */

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyMFXVcUZtsUDdchmscpgmBtvgMCN-66kP5iMjBnJwJ1aNeZ1kxGRKi-oMzAYW27PXs/exec';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZONE_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
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

const ZONES_SUL_STATIC = ['Makassar', 'Manado', 'Ternate', 'Pare Pare', 'Kendari', 'Palu'];

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

/* ==================== State ==================== */

let state = {
  sheets: {},           // { sheetKey: [rows] }
  dashboard: null,
  kpi: null,
  mosChart: null,
  currentTab: 'dashboard',
  activePivot: 'pvt-dash-sul',
  page: {},
  filters: {}
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

/* ==================== Loading & Toast ==================== */

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
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
});

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabName));
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
      const results = await Promise.all([apiCall('kpi'), apiCall('dashboard')]);
      state.kpi = results[0].data;
      state.dashboard = results[1].data;
      renderKPI();
      renderMosChart();
      renderMiniTable('dash2026Table', state.dashboard.dashboard_2026);
      renderMiniTable('dashSulTable', state.dashboard.dashboard_sulawesi);
      renderMiniTable('pivotKalTable', state.dashboard.pivot_kal);
    } else if (tabName === 'site-sul' || tabName === 'site-kal') {
      await loadSheet(tabName);
    } else if (tabName === 'pivot') {
      await loadSheet(state.activePivot);
    }
  } catch (e) { /* error sudah ditampilkan via toast */ }
}

async function loadSheet(sheetKey) {
  const c = cfg(sheetKey);
  let res;
  if (c.api === 'pivot') {
    // GET dengan parameter nama sheet
    showLoading(true);
    try {
      const url = API_BASE_URL + '?action=pivot&name=' + encodeURIComponent(c.sheetName);
      const r = await fetch(url, { redirect: 'follow' });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || 'gagal memuat');
      res = j;
    } catch (err) {
      showLoading(false);
      showToast('Gagal: ' + err.message, 'error');
      return;
    }
    showLoading(false);
  } else {
    res = await apiCall(c.api);
  }

  state.sheets[sheetKey] = res.data || [];
  renderCrudTable(sheetKey);
  buildFilterPanel(sheetKey);
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
  const cards = [
    { label: 'Total Site', value: fmt(kpi.total_site), cls: '' },
    { label: 'Total MOS', value: fmt(kpi.total_mos), cls: 'kpi-mos' },
    { label: 'Total HI Done', value: fmt(kpi.total_hi_done), cls: 'kpi-hi' },
    { label: 'Connected', value: fmt(kpi.total_connected), cls: 'kpi-connect' },
    { label: 'SM ATP', value: fmt(kpi.total_sm_atp), cls: 'kpi-atp' },
    { label: 'FI INEOM', value: fmt(kpi.total_fi_ineom), cls: 'kpi-ineom' }
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map(c =>
    '<div class="kpi-card ' + c.cls + '">' +
      '<div class="kpi-label">' + esc(c.label) + '</div>' +
      '<div class="kpi-value">' + esc(c.value) + '</div>' +
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

function renderMosChart() {
  let labels, chartDatasets, title = '';
  const pvt = parsePvtDashBlock(state.dashboard && state.dashboard.pvt_dash_sul);

  if (pvt) {
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

  const ctx = document.getElementById('mosChart').getContext('2d');
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

function renderMiniTable(tableId, sheetData) {
  const el = document.getElementById(tableId);
  if (!sheetData || !sheetData.rows || !sheetData.rows.length) {
    el.innerHTML = '<tbody><tr><td class="empty-state">Belum ada data</td></tr></tbody>';
    return;
  }
  let width = sheetData.headers.length;
  sheetData.rows.forEach(r => { if (r.length > width) width = r.length; });
  const headers = sheetData.headers.slice();
  while (headers.length < width) headers.push('');

  const thead = '<thead><tr>' +
    headers.map(h => '<th>' + esc(h) + '</th>').join('') +
    '</tr></thead>';

  const tbody = '<tbody>' + sheetData.rows.map(row => {
    const cells = row.slice();
    while (cells.length < width) cells.push('');

    // Baris judul seksi: hanya satu sel berisi (layout laporan asli,
    // mis. 'TI SULAWESI', 'MAKASSAR - 2026')
    const filled = cells.filter(c => String(c).trim() !== '');
    if (filled.length === 1 && width > 2) {
      const idx = cells.findIndex(c => String(c).trim() !== '');
      let grow = '';
      for (let i = 0; i < idx; i++) grow += '<td></td>';
      return '<tr class="group-row">' + grow +
        '<td colspan="' + (width - idx) + '">' + esc(cells[idx]) + '</td></tr>';
    }

    return '<tr>' + cells.map(c => {
      let cls = isNum(c) ? 'num' : '';
      const s = String(c).trim();
      const m = s.match(/^(\d+(?:\.\d+)?)\s?%$/);
      if (m) {
        cls += (cls ? ' ' : '') +
          (parseFloat(m[1]) >= 90 ? 'pct-high' :
           parseFloat(m[1]) >= 70 ? 'pct-mid' : 'pct-low');
      }
      return '<td class="' + cls + '">' + esc(c) + '</td>';
    }).join('') + '</tr>';
  }).join('') + '</tbody>';
  el.innerHTML = thead + tbody;
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

function zoneColOf(rows) {
  return resolveCol(rows, ['ZTE ZONE', 'Zona', 'Branch', 'Cluster', 'Region', 'Area']);
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
  const page = state.page[sheetKey];
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cols = visibleColumns(sheetKey, rows);

  const thead = '<thead><tr>' +
    cols.map(c => '<th title="' + esc(c) + '">' + esc(c) + '</th>').join('') +
    '</tr></thead>';

  const tbody = '<tbody>' + pageRows.map(r =>
    '<tr class="clickable" title="Klik untuk detail" onclick="showDetailModal(\'' + sheetKey + '\', ' + r.rowIndex + ')">' +
      cols.map(c =>
        '<td class="' + (isNum(r[c]) ? 'num' : 'wrap') + '" title="' + esc(r[c]) + '">' +
        esc(truncate(r[c])) + '</td>').join('') +
    '</tr>').join('') + '</tbody>';

  tableEl.innerHTML = thead + tbody;
  if (pagEl) renderPagination(pagEl, page, totalPages, sheetKey);
}

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

// Event filter & search — reset ke halaman 1 saat berubah
['site-sul', 'site-kal'].forEach(key => {
  ['zoneFilter-', 'search-'].forEach(prefix => {
    const el = document.getElementById(prefix + key);
    if (el) el.addEventListener('input', () => {
      state.page[key] = 1;
      renderCrudTable(key);
    });
  });
});
const searchActive = document.getElementById('search-active');
if (searchActive) searchActive.addEventListener('input', () => {
  state.page[state.activePivot] = 1;
  renderCrudTable(state.activePivot);
});

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
  closeModal();
  showToast('Data berhasil dihapus');
  loadSheet(sheetKey);
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
      closeModal();
      showToast(ctx.mode === 'add' ? 'Data berhasil ditambahkan' : 'Data berhasil diperbarui');
      loadSheet(ctx.sheetKey);
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
  if (e.key === 'Escape') closeModal();
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

window.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('pivotSelect');
  if (sel) sel.addEventListener('change', e => switchPivot(e.target.value));
  switchTab('dashboard');
});



