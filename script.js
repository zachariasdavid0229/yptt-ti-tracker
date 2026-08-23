/* ============ YPTT TI Tracker - Script ============ */

// GANTI dengan URL Web App Google Apps Script Anda
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyM0f-1AOEvEu2I9fPYpHnMMVNo2c7R4KWLqHe2hy3198TuDxLpcc96PiuoQoYFgHoE/exec';

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

let state = {
  siteSul: [],
  siteKal: [],
  dashboard: null,
  kpi: null,
  mosChart: null,
  currentTab: 'dashboard'
};

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
      renderMiniTable('dashSulTable', state.dashboard.dashboard_sulawesi);
      renderMiniTable('pivotKalTable', state.dashboard.pivot_kal);
    } else if (tabName === 'site-sul') {
      const res = await apiCall('site-sul');
      state.siteSul = res.data || [];
      populateZoneFilter('zoneFilterSul', state.siteSul);
      renderCrudTable('site-sul');
    } else if (tabName === 'site-kal') {
      const res = await apiCall('site-kal');
      state.siteKal = res.data || [];
      populateZoneFilter('zoneFilterKal', state.siteKal);
      renderCrudTable('site-kal');
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

function renderMosChart() {
  const d26 = state.dashboard && state.dashboard.dashboard_2026;
  if (!d26 || !d26.headers || !d26.headers.length) return;

  const zones = d26.headers.slice(1, -1);
  const monthRows = d26.rows.filter(r =>
    MONTHS.includes(String(r[0]).toUpperCase()));

  if (!monthRows.length) return;

  const datasets = zones.map((z, i) => ({
    label: z,
    data: monthRows.map(r => Number(r[i + 1]) || 0),
    backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length]
  }));

  const ctx = document.getElementById('mosChart').getContext('2d');
  if (state.mosChart) state.mosChart.destroy();
  state.mosChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: monthRows.map(r => r[0]), datasets: datasets },
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
  if (!sheetData || !sheetData.headers || !sheetData.headers.length) {
    el.innerHTML = '<tbody><tr><td class="empty-state">Belum ada data</td></tr></tbody>';
    return;
  }
  const thead = '<thead><tr>' +
    sheetData.headers.map(h => '<th>' + esc(h) + '</th>').join('') +
    '</tr></thead>';
  const tbody = '<tbody>' + sheetData.rows.map(row =>
    '<tr>' + row.map(c =>
      '<td class="' + (isNum(c) ? 'num' : '') + '">' + esc(c) + '</td>').join('') +
    '</tr>').join('') + '</tbody>';
  el.innerHTML = thead + tbody;
}

/* ==================== CRUD Tables ==================== */

/**
 * Sembunyikan kolom yang semua barisnya kosong.
 * Kolom kunci selalu tampil: No, WID, Site ID Impl, Site Name Impl, ZTE ZONE.
 */
function visibleColumns(rows) {
  if (!rows.length) return [];
  const alwaysShow = ['No', 'WID', 'Site ID Impl', 'Site Name Impl', 'ZTE ZONE'];
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

  return rows.filter(r => {
    if (zone && String(r['ZTE ZONE'] === undefined || r['ZTE ZONE'] === null ? '' : r['ZTE ZONE']).trim().toUpperCase() !== zone) return false;
    if (q) {
      const hay = [r['Site Name Impl'], r['Site ID Impl'], r['WID']]
        .map(v => String(v === undefined || v === null ? '' : v).toLowerCase())
        .join(' ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderCrudTable(sheetKey) {
  const tableEl = document.getElementById('table-' + sheetKey);
  const countEl = document.getElementById(sheetKey === 'site-sul' ? 'countSul' : 'countKal');
  const rows = getFilteredRows(sheetKey);

  countEl.textContent = rows.length + ' data';
  tableEl.innerHTML = '';

  if (!rows.length) {
    tableEl.innerHTML = '<tbody><tr><td class="empty-state">Tidak ada data yang cocok</td></tr></tbody>';
    return;
  }

  const cols = visibleColumns(rows);

  const thead = '<thead><tr><th>#</th>' +
    cols.map(c => '<th title="' + esc(c) + '">' + esc(c) + '</th>').join('') +
    '<th>Aksi</th></tr></thead>';

  const tbody = '<tbody>' + rows.map((r, i) =>
    '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      cols.map(c =>
        '<td class="' + (isNum(r[c]) ? 'num' : 'wrap') + '" title="' + esc(r[c]) + '">' +
        esc(truncate(r[c])) + '</td>').join('') +
      '<td><div class="row-actions">' +
        '<button class="btn btn-primary btn-sm" onclick="showEditModal(\'' + sheetKey + '\', ' + r.rowIndex + ')">Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="confirmDelete(\'' + sheetKey + '\', ' + r.rowIndex + ')">Hapus</button>' +
      '</div></td>' +
    '</tr>').join('') + '</tbody>';

  tableEl.innerHTML = thead + tbody;
}

// Event filter & search
['zoneFilterSul', 'searchSul'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => renderCrudTable('site-sul')));
['zoneFilterKal', 'searchKal'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => renderCrudTable('site-kal')));

function populateZoneFilter(selectId, rows) {
  const sel = document.getElementById(selectId);
  const current = sel.value;
  const zones = [];
  rows.forEach(r => {
    const z = String(r['ZTE ZONE'] === undefined || r['ZTE ZONE'] === null ? '' : r['ZTE ZONE']).trim();
    if (z && zones.indexOf(z) === -1) zones.push(z);
  });
  zones.sort();
  sel.innerHTML = '<option value="">-- Semua Zone --</option>' +
    zones.map(z => '<option value="' + esc(z) + '">' + esc(z) + '</option>').join('');
  if (zones.includes(current)) sel.value = current;
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
  const refRows = formContext.sheetKey === 'site-sul' ? state.siteSul : state.siteKal;
  const cols = refRows.length ? visibleColumns(refRows) : ALL_COLUMNS;

  const html = '<div class="form-grid">' + cols.map(col => {
    const val = data[col] === undefined || data[col] === null ? '' : data[col];
    const isWide = WIDE_FIELDS.includes(col);
    const isDate = /Date/i.test(col) && !/Info|Upload|Inbond/i.test(col);
    let field;

    if (col === 'ZTE ZONE') {
      field = '<select name="' + esc(col) + '">' +
        ['', 'MAKASSAR', 'MANADO', 'TERNATE'].map(z =>
          '<option value="' + z + '"' + (val === z ? ' selected' : '') + '>' +
          (z || '-- pilih --') + '</option>').join('') +
        '</select>';
    } else if (isWide) {
      field = '<textarea name="' + esc(col) + '">' + esc(val) + '</textarea>';
    } else if (isDate) {
      field = '<input type="date" name="' + esc(col) + '" value="' + esc(toISODate(val)) + '">';
    } else {
      field = '<input type="text" name="' + esc(col) + '" value="' + esc(val) + '">';
    }

    return '<div class="form-group ' + (isWide ? 'wide' : '') + '">' +
      '<label>' + esc(col) + '</label>' + field + '</div>';
  }).join('') + '</div>';

  document.getElementById('dataForm').innerHTML = html;
}

function saveForm() {
  const form = document.getElementById('dataForm');
  const data = {};
  new FormData(form).forEach((value, key) => { data[key] = value; });

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

/* ==================== Sync Manual ==================== */

document.getElementById('btnSync').addEventListener('click', async () => {
  try {
    await apiCall('sync');
    showToast('Sinkronisasi berhasil');
  } catch (e) { /* sudah di-toast */ }
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

function truncate(v) {
  const s = String(v === undefined || v === null ? '' : v);
  return s.length > 60 ? s.slice(0, 60) + '...' : s;
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

