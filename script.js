/* ============ YPTT TI Tracker - Script ============ */

// GANTI dengan URL Web App Google Apps Script Anda
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwD1hJdFMrcPtdB3Y-aKJD09z--jPbOwuvxjAI06crYbf16NH5YqzYT818gwOst1cDZ/exec';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
const ZONE_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];

const ALL_COLUMNS = [
  'No', 'WID', 'Program CAPEX', 'SOW Details', 'Work Type', 'Site ID Impl',
  'Site Name Impl', 'Band', 'Daily REMARK', 'ZTE ZONE', 'Lat', 'Long',
  'Partner Actual', 'Monthly Target', 'Monthly Assignment', 'PO Year',
  'Years Assigned', 'WID Recti', 'Remark', 'Dismentle Antenna BOQ',
  'Qty Antenna', 'Mounting Bracker', 'Dismentel Filter', 'Qty Filter',
  'Dismentle RRU', 'Qty RRU', 'Dismentle Board', 'TP', 'Status Permit',
  'Permit Release', 'Permit Ineom', 'DOID', 'PIC Muver', 'PIC TI',
  'TI Engineer', 'Site Productivity Status', 'Addcost Productivity Status',
  'Add Cost Amount', 'Add Cost Description', 'Total PO Amt (IDR) No Tax',
  'MOS', 'MOS Info', 'HI Start', 'HI Done', 'HI Info', 'HI Progress',
  'Installation Start', 'Installation Finished', 'Connected Date',
  'Connected Info', 'GAP Analysis', 'Blocking Issues', 'SM Status',
  'SM Kitting', 'PTW & EHS', 'SM Dismantle', 'SM ATP', 'ATP Passed',
  'FI Ineom', 'Ineom Passed', 'Asset Ineom', 'Ineom Dismentel',
  'Blocking SM & Ineom', 'Status Dismentle', 'Dismantle Date',
  'Status Material', 'DR & LDM Status', 'Date Inbond', 'DRID',
  'PIC Mover', 'Remark INBOUND', 'Date Upload', 'Blocking BARA',
  'eATP Submit Date', 'eATP Approve TSEL Date', 'eATP Status',
  'PO Status', 'PO Number', 'PO Release Date', 'BAUT Approved by Tsel',
  'BAUT Status', 'BAST SAP Status', 'YPMS Status', 'inv status'
];

const WIDE_FIELDS = ['Daily REMARK', 'Remark', 'GAP Analysis', 'Blocking Issues',
  'Add Cost Description', 'Connected Info', 'MOS Info', 'HI Info',
  'Blocking SM & Ineom', 'Blocking BARA', 'Remark INBOUND'];

/* ==================== Smart Dropdown Config ==================== */

// Dropdown statis (pilihan tetap)
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

// Dropdown dinamis: nilai unik diambil dari data sheet aktif (bebas tambah baru)
const DYNAMIC_COMBO_COLS = ['Site Name Impl', 'Site ID Impl', 'Work Type', 'SOW Details'];

// Zona untuk Site_SUL (statis); Site_KAL otomatis dinamis dari data
const ZONES_SUL_STATIC = ['Makassar', 'Manado', 'Ternate', 'Pare Pare', 'Kendari', 'Palu'];

// Opsi untuk kolom semi-bebas (pilih atau ketik sendiri)
const SEMI_FREE_OPTIONS = {
  'HI Info': ['Done', 'NY'],
  'MOS Info': ['Done', 'NY']
};

// Prefix status yang menampilkan input persen tambahan
const PERCENT_PREFIXES = ['Done Productivity', 'Ready for Productivity'];

let state = {
  siteSul: [],
  siteKal: [],
  dashboard: null,
  kpi: null,
  mosChart: null,
  currentTab: 'dashboard',
  page: { 'site-sul': 1, 'site-kal': 1 },
  filters: { 'site-sul': {}, 'site-kal': {} }
};

const PAGE_SIZE = 10;

/* ==================== API Helper ==================== */

async function apiCall(action, payload = {}) {
  showLoading(true);
  try {
    const res = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
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
    } else if (tabName === 'site-sul') {
      const res = await apiCall('site-sul');
      state.siteSul = res.data || [];
      populateZoneFilter('zoneFilterSul', state.siteSul);
      renderCrudTable('site-sul');
      buildFilterPanel('site-sul');
    } else if (tabName === 'site-kal') {
      const res = await apiCall('site-kal');
      state.siteKal = res.data || [];
      populateZoneFilter('zoneFilterKal', state.siteKal);
      renderCrudTable('site-kal');
      buildFilterPanel('site-kal');
    }
  } catch (e) { /* error sudah ditampilkan via toast */ }
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
 * baris header 'Assignment | MAKASSAR | MANADO | TERNATE | Grand Total'
 * diikuti baris bulan (Jan..Aug) lalu 'Grand Total'.
 * Posisi kolom dideteksi otomatis (file asli mulai dari kolom B).
 * Return { zones: [...], months: [{label, vals}] } atau null.
 */
function parsePvtDashBlock(sd) {
  if (!sd || !sd.rows || !sd.rows.length) return null;
  const rows = sd.rows;

  // Cari sel bertuliskan 'Assignment' di baris mana pun / kolom mana pun
  let hIdx = -1, col0 = 0;
  for (let i = 0; i < rows.length && hIdx < 0; i++) {
    const limit = Math.min(rows[i].length, 12);
    for (let c = 0; c < limit; c++) {
      if (String(rows[i][c]).trim().toLowerCase() === 'assignment') {
        hIdx = i;
        col0 = c;
        break;
      }
    }
  }
  if (hIdx < 0 || hIdx + 1 >= rows.length) return null;

  const header = rows[hIdx].map(v => String(v).trim());
  const zones = [];
  const zIdx = [];
  for (let c = col0 + 1; c < header.length; c++) {
    const h = header[c];
    if (!h) continue;
    if (/^grand ?total$/i.test(h)) break;
    zones.push(h);
    zIdx.push(c);
  }

  const STOP_LABELS = ['sm atp', 'fi ineom', 'hi done', 'connected', 'milestone'];
  const months = [];
  for (let i = hIdx + 1; i < rows.length; i++) {
    const label = String(rows[i][col0] === undefined ? '' : rows[i][col0]).trim();
    if (!label) continue;
    if (/^grand ?total$/i.test(label)) break;
    if (STOP_LABELS.includes(label.toLowerCase())) break;
    const vals = zIdx.map(c => Number(rows[i][c]) || 0);
    months.push({ label: label, vals: vals });
  }

  if (!months.length || !zones.length) return null;
  return { zones: zones, months: months };
}

function renderMosChart() {
  // Sumber utama: blok pivot 'Assignment x Zona' di sheet Pvt Dash Sul (layout asli)
  let labels, chartDatasets;
  const pvt = parsePvtDashBlock(state.dashboard && state.dashboard.pvt_dash_sul);

  if (pvt) {
    labels = pvt.months.map(m => m.label);
    chartDatasets = pvt.zones.map((z, i) => ({
      label: z,
      data: pvt.months.map(m => m.vals[i]),
      backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length]
    }));
  } else {
    // Fallback: layout lama [MONTH | zona... | TOTAL] dari Dashboard_2026
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
      plugins: {
        legend: { position: 'top' },
        title: { display: !!pvt, text: pvt ? 'Assignment per Bulan per Zona (Pvt Dash Sul)' : '' }
      }
    }
  });
}

function renderMiniTable(tableId, sheetData) {
  const el = document.getElementById(tableId);
  if (!sheetData || !sheetData.rows || !sheetData.rows.length) {
    el.innerHTML = '<tbody><tr><td class="empty-state">Belum ada data</td></tr></tbody>';
    return;
  }
  // Samakan panjang header dengan baris terpanjang (layout sheet asli
  // sering tidak punya header di baris 1, mis. Dashboard_2026)
  let width = sheetData.headers.length;
  sheetData.rows.forEach(r => { if (r.length > width) width = r.length; });
  const headers = sheetData.headers.slice();
  while (headers.length < width) headers.push('');
  const colIdx = Array.from({ length: width }, (_, i) => i);

  const thead = '<thead><tr>' +
    headers.map(h => '<th>' + esc(h) + '</th>').join('') +
    '</tr></thead>';
  const tbody = '<tbody>' + sheetData.rows.map(row => {
    const cells = row.slice();
    while (cells.length < width) cells.push('');
    return '<tr>' + cells.map(c =>
      '<td class="' + (isNum(c) ? 'num' : '') + '">' + esc(c) + '</td>').join('') + '</tr>';
  }).join('') + '</tbody>';
  el.innerHTML = thead + tbody;
}

/* ==================== CRUD Tables ==================== */

/**
 * Sembunyikan kolom yang semua barisnya kosong.
 * Kolom kunci selalu tampil: No, WID, Site ID Impl, Site Name Impl, ZTE ZONE.
 */
function visibleColumns(rows) {
  if (!rows.length) return [];
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
  const isSul = sheetKey === 'site-sul';
  const rows = isSul ? state.siteSul : state.siteKal;
  const zoneEl = document.getElementById(isSul ? 'zoneFilterSul' : 'zoneFilterKal');
  const searchEl = document.getElementById(isSul ? 'searchSul' : 'searchKal');
  const zone = (zoneEl ? zoneEl.value : '').trim().toUpperCase();
  const q = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const filters = state.filters[sheetKey] || {};
  const nameCol = resolveCol(rows, ['Site Name Impl', 'Site Name']);
  const idCol = resolveCol(rows, ['Site ID Impl', 'Site ID']);
  const zCol = zoneColOf(rows);

  return rows.filter(r => {
    if (zCol && zone && String(r[zCol] === undefined || r[zCol] === null ? '' : r[zCol]).trim().toUpperCase() !== zone) return false;
    if (q) {
      const hay = [r[nameCol], r[idCol], r['WID']]
        .map(v => String(v === undefined || v === null ? '' : v).toLowerCase())
        .join(' ');
      if (!hay.includes(q)) return false;
    }
    // Filter per kolom
    for (const col in filters) {
      const f = String(filters[col]).trim().toLowerCase();
      if (!f) continue;
      const cell = String(r[col] === undefined || r[col] === null ? '' : r[col]).trim().toLowerCase();
      if (!cell.includes(f)) return false; // bertingkat: semua filter harus lolos
    }
    return true;
  });
}

function renderCrudTable(sheetKey) {
  const tableEl = document.getElementById('table-' + sheetKey);
  const pagEl = document.getElementById('pagination-' + sheetKey);
  const countEl = document.getElementById(sheetKey === 'site-sul' ? 'countSul' : 'countKal');
  const rows = getFilteredRows(sheetKey);

  countEl.textContent = rows.length + ' data';
  tableEl.innerHTML = '';
  pagEl.innerHTML = '';

  if (!rows.length) {
    tableEl.innerHTML = '<tbody><tr><td class="empty-state">Tidak ada data yang cocok</td></tr></tbody>';
    return;
  }

  // Clamp halaman (mis. setelah filter berubah / data terhapus)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (state.page[sheetKey] > totalPages) state.page[sheetKey] = totalPages;
  const page = state.page[sheetKey];
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cols = visibleColumns(rows);

  const thead = '<thead><tr>' +
    cols.map(c => '<th title="' + esc(c) + '">' + esc(c) + '</th>').join('') +
    '</tr></thead>';

  const tbody = '<tbody>' + pageRows.map((r, i) =>
    '<tr class="clickable" title="Klik untuk detail" onclick="showDetailModal(\'' + sheetKey + '\', ' + r.rowIndex + ')">' +
      cols.map(c =>
        '<td class="' + (isNum(r[c]) ? 'num' : 'wrap') + '" title="' + esc(r[c]) + '">' +
        esc(truncate(r[c])) + '</td>').join('') +
    '</tr>').join('') + '</tbody>';

  tableEl.innerHTML = thead + tbody;
  renderPagination(pagEl, page, totalPages, sheetKey);
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

// Event filter & search — reset ke halaman 1 saat filter berubah
['zoneFilterSul', 'searchSul'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => {
    state.page['site-sul'] = 1;
    renderCrudTable('site-sul');
  }));
['zoneFilterKal', 'searchKal'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => {
    state.page['site-kal'] = 1;
    renderCrudTable('site-kal');
  }));

/* ==================== Panel Filter Kolom ==================== */

function toggleFilterPanel(sheetKey) {
  const panel = document.getElementById('filterPanel-' + sheetKey);
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) buildFilterPanel(sheetKey);
}

/** Bangun kontrol filter untuk tiap kolom terlihat pada tabel */
function buildFilterPanel(sheetKey) {
  const panel = document.getElementById('filterPanel-' + sheetKey);

  const rows = sheetKey === 'site-sul' ? state.siteSul : state.siteKal;
  if (!rows.length) { panel.innerHTML = '<span class="page-info">Belum ada data</span>'; return; }

  const cols = visibleColumns(rows);
  const activeFilters = state.filters[sheetKey] || {};

  let html = '<div class="filter-header">' +
    '<strong>Filter Kolom</strong>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetColumnFilters(\'' + sheetKey + '\')">Reset Filter</button>' +
    '</div><div class="filter-grid">';

  cols.forEach(col => {
    const val = activeFilters[col] || '';
    const options = comboOptionsFor(sheetKey, col, rows);
    const fid = 'flt-' + sheetKey + '-' + datalistId(col);
    let control;

    if (options && options.length <= 25) {
      // Dropdown filter (kolom pilihan terbatas / kategorikal)
      const union = Array.from(new Set(options.concat(distinctValues(rows, col)))).sort();
      control = '<select onchange="setColumnFilter(\'' + sheetKey + '\', this.dataset.col, this.value)" data-col="' + esc(col) + '">' +
        '<option value="">Semua</option>' +
        union.map(o => '<option value="' + esc(o) + '"' +
          (o.toLowerCase() === val.toLowerCase() ? ' selected' : '') + '>' + esc(truncate(o, 30)) + '</option>').join('') +
        '</select>';
    } else {
      // Input teks dengan debounce
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

function populateZoneFilter(selectId, rows) {
  const sel = document.getElementById(selectId);
  const current = sel.value;
  const zCol = zoneColOf(rows);
  if (!zCol) return;
  const zones = [];
  rows.forEach(r => {
    const z = String(r[zCol] === undefined || r[zCol] === null ? '' : r[zCol]).trim();
    if (z && zones.indexOf(z) === -1) zones.push(z);
  });
  zones.sort();
  sel.innerHTML = '<option value="">-- Semua Zone --</option>' +
    zones.map(z => '<option value="' + esc(z) + '">' + esc(z) + '</option>').join('');
  if (zones.includes(current)) sel.value = current;
}

/* ==================== Pop-up Detail ==================== */

let detailContext = null; // { sheetKey, rowIndex }

function showDetailModal(sheetKey, rowIndex) {
  const source = sheetKey === 'site-sul' ? state.siteSul : state.siteKal;
  let row = null;
  for (const r of source) {
    if (r.rowIndex === rowIndex) { row = r; break; }
  }
  if (!row) { showToast('Baris tidak ditemukan', 'error'); return; }

  detailContext = { sheetKey: sheetKey, rowIndex: rowIndex };
  const nameCol = resolveCol(source, ['Site Name Impl', 'Site Name']);
  const idCol = resolveCol(source, ['Site ID Impl', 'Site ID']);
  document.getElementById('modalTitle').textContent =
    'Detail: ' + (row[nameCol] || row[idCol] || row['WID'] || 'Data');

  // Tampilkan semua kolom yang memiliki isi
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
  const ctx = detailContext;
  if (!confirm('Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.')) return;
  await apiCall('delete-' + ctx.sheetKey, { rowIndex: ctx.rowIndex });
  closeModal();
  showToast('Data berhasil dihapus');
  loadTabData(ctx.sheetKey);
}

/* ==================== Smart Dropdown Helpers ==================== */

/**
 * Cari nama kolom aktual dari daftar kandidat.
 * Menangani struktur kolom berbeda antara Site_SUL dan Site_KAL,
 * mis. 'Site Name Impl' vs 'Site Name' atau 'ZTE ZONE' vs 'Branch'.
 */
function resolveCol(rows, candidates) {
  if (!rows.length) return candidates[0];
  const keys = Object.keys(rows[0]);
  for (let i = 0; i < candidates.length; i++) {
    if (keys.includes(candidates[i])) return candidates[i];
  }
  return null;
}

function zoneColOf(rows) {
  return resolveCol(rows, ['ZTE ZONE', 'Branch', 'Cluster', 'Region', 'Area']);
}

/** Kumpulkan nilai unik terurut dari sebuah kolom */
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

/**
 * Tentukan daftar opsi combo untuk sebuah kolom pada sheet tertentu.
 * Return null jika kolom tersebut free text biasa.
 */
function comboOptionsFor(sheetKey, col, rows) {
  const zCol = zoneColOf(rows);
  if (col === zCol) {
    return sheetKey === 'site-sul'
      ? ZONES_SUL_STATIC.slice()
      : distinctValues(rows, col);
  }
  if (STATIC_OPTIONS[col]) {
    // Gabungkan opsi statis dengan nilai yang sudah ada di data
    // agar nilai lama tetap tampil di dropdown
    const inData = distinctValues(rows, col);
    return Array.from(new Set(STATIC_OPTIONS[col].concat(inData)));
  }
  if (DYNAMIC_COMBO_COLS.includes(col)) {
    return distinctValues(rows, col);
  }
  if (SEMI_FREE_OPTIONS[col]) {
    const inData = distinctValues(rows, col);
    return Array.from(new Set(SEMI_FREE_OPTIONS[col].concat(inData)));
  }
  return null;
}

/**
 * Bangun HTML satu field form cerdas.
 * - Ada opsi      -> <input> + <datalist> (typeahead + bebas tambah nilai baru)
 * - HI Progress   -> number input persen
 * - Lainnya       -> text input biasa
 */
function smartFieldHTML(sheetKey, col, val, rows) {
  const name = esc(col);
  const value = esc(val);

  if (col === 'HI Progress') {
    const num = String(val).replace(/[^0-9.]/g, '');
    return '<input type="number" min="0" max="100" step="any" ' +
      'name="' + name + '" value="' + esc(num) + '" placeholder="0-100">';
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

/* ==================== Modal Form (Tambah/Edit) ==================== */

let formContext = null; // { mode:'add'|'edit', sheetKey, rowIndex }

function showAddModal(sheetKey) {
  formContext = { mode: 'add', sheetKey: sheetKey };
  document.getElementById('modalTitle').textContent =
    sheetKey === 'site-sul' ? 'Tambah Data Site SUL' : 'Tambah Data Site KAL';
  buildForm({});
  openModal();
}

function showEditModal(sheetKey, rowIndex) {
  const source = sheetKey === 'site-sul' ? state.siteSul : state.siteKal;
  let row = null;
  for (const r of source) {
    if (r.rowIndex === rowIndex) { row = r; break; }
  }
  if (!row) { showToast('Baris tidak ditemukan', 'error'); return; }

  formContext = { mode: 'edit', sheetKey: sheetKey, rowIndex: rowIndex };
  document.getElementById('modalTitle').textContent = 'Edit Data';
  buildForm(row);
  openModal();
}

function buildForm(data) {
  // Gunakan kolom terlihat jika data sudah dimuat,
  // jika tidak gunakan daftar lengkap ALL_COLUMNS.
  const sheetKey = formContext.sheetKey;
  const refRows = sheetKey === 'site-sul' ? state.siteSul : state.siteKal;
  const cols = refRows.length ? visibleColumns(refRows) : ALL_COLUMNS;

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

  // Input persen tambahan untuk Site Productivity Status
  html += '<div class="form-group" id="prodPercentGroup" style="display:none">' +
    '<label>Persentase (%)</label>' +
    '<input type="number" min="0" max="100" step="any" name="__prod_percent">' +
    '</div>';

  html += '</div>';

  const formEl = document.getElementById('dataForm');
  formEl.innerHTML = html;

  // Toggle input persen sesuai nilai Site Productivity Status
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

  // Gabungkan persen ke Site Productivity Status
  if (data['__prod_percent'] !== undefined) {
    const p = String(data['__prod_percent']).trim();
    delete data['__prod_percent'];
    if (p && data['Site Productivity Status']) {
      const base = data['Site Productivity Status']
        .replace(/\s*\d+(\.\d+)?\s*%\s*$/, '').trim();
      data['Site Productivity Status'] = base + ' ' + p + '%';
    }
  }

  // HI Progress: pastikan berformat persen
  const hp = String(data['HI Progress'] || '').trim();
  if (hp && !isNaN(hp)) data['HI Progress'] = hp + '%';

  const ctx = formContext;
  const prefix = ctx.sheetKey === 'site-sul' ? 'site-sul' : 'site-kal';
  const action = ctx.mode === 'add' ? 'add-' + prefix : 'update-' + prefix;
  const payload = ctx.mode === 'add'
    ? { data: data }
    : { rowIndex: ctx.rowIndex, data: data };

  const btn = document.getElementById('btnSave');
  btn.disabled = true;
  apiCall(action, payload)
    .then(() => {
      closeModal();
      showToast(ctx.mode === 'add' ? 'Data berhasil ditambahkan' : 'Data berhasil diperbarui');
      loadTabData(ctx.sheetKey);
    })
    .catch(() => {})
    .finally(() => { btn.disabled = false; });
}

async function confirmDelete(sheetKey, rowIndex) {
  if (!confirm('Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.')) return;
  await apiCall('delete-' + sheetKey, { rowIndex: rowIndex });
  showToast('Data berhasil dihapus');
  loadTabData(sheetKey);
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

/** Normalisasi berbagai format tanggal menjadi yyyy-MM-dd untuk input[type=date] */
function toISODate(v) {
  if (!v) return '';
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
  }
  m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (m) {
    return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }
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
  switchTab('dashboard');
});

