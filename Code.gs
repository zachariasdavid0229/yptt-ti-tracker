/**
 * YPTT TI Tracker - Backend API (Google Apps Script)
 * Spreadsheet Key: 1Iegz1iOI97vs_Qnt3RIcGM6Euy5VGsKl_H5bLLAIuYw
 *
 * DEPLOY:
 * 1. Buka script.google.com -> New Project -> paste file ini
 * 2. Deploy -> New deployment -> Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 3. Copy URL Web App ke API_BASE_URL di script.js frontend
 *
 * CATATAN: Google Apps Script Web App hanya menerima GET & POST.
 * Operasi UPDATE/DELETE dikirim via POST dengan body JSON:
 *   { "action": "update-site-sul", "rowIndex": 5, "data": {...} }
 */

var SPREADSHEET_KEY = '1Iegz1iOI97vs_Qnt3RIcGM6Euy5VGsKl_H5bLLAIuYw';

var SHEETS = {
  SITE_SUL: 'Site_SUL',
  SITE_KAL: 'Site_KAL',
  DASH_2026: 'Dashboard_2026',
  DASH_SUL: 'Dashboard Sulawesi',
  PVT_SUL: 'Pvt Dash Sul',
  PIVOT_KAL: 'Pivot Kal'
};

var COLUMNS = [
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

/* ============================================================
 * HTTP HANDLERS
 * ============================================================ */

function doGet(e) {
  return handleRequest_('GET', e);
}

function doPost(e) {
  return handleRequest_('POST', e);
}

// GAS tidak mendukung PUT/DELETE asli, tapi tetap disediakan
// untuk kompatibilitas jika dipanggil dari Apps Script client.
function doPut(e) {
  return handleRequest_('PUT', e);
}

function doDelete(e) {
  return handleRequest_('DELETE', e);
}

function handleRequest_(method, e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || '';
    var body = parseBody_(e);

    // POST body bisa override action (untuk method override)
    if (body && body.action) action = body.action;
    if (!action && params.path) action = params.path;

    var result;

    switch (action) {
      // ---------- HEALTH ----------
      case 'health':
        result = ok_({ status: 'UP', timestamp: new Date().toISOString() }, 'Service berjalan normal');
        break;

      // ---------- READ (GET) ----------
      case 'site-sul':
      case 'api/site-sul':
        result = ok_(getSiteSUL(), 'Data Site SUL berhasil diambil');
        break;
      case 'site-kal':
      case 'api/site-kal':
        result = ok_(getSiteKAL(), 'Data Site KAL berhasil diambil');
        break;
      case 'dashboard':
      case 'api/dashboard':
        result = ok_(getDashboard(), 'Data dashboard berhasil diambil');
        break;
      case 'kpi':
      case 'api/kpi':
        result = ok_(getKPI(), 'Data KPI berhasil diambil');
        break;

      // ---------- CREATE (POST) ----------
      case 'add-site-sul':
        result = ok_({ rowIndex: addSiteSUL(body.data || {}) }, 'Data berhasil ditambahkan');
        break;
      case 'add-site-kal':
        result = ok_({ rowIndex: addSiteKAL(body.data || {}) }, 'Data berhasil ditambahkan');
        break;

      // ---------- UPDATE (via POST override / PUT) ----------
      case 'update-site-sul':
        updateSiteSUL(body.rowIndex, body.data || {});
        result = ok_({}, 'Data berhasil diperbarui');
        break;
      case 'update-site-kal':
        updateSiteKAL(body.rowIndex, body.data || {});
        result = ok_({}, 'Data berhasil diperbarui');
        break;

      // ---------- DELETE (via POST override / DELETE) ----------
      case 'delete-site-sul':
        deleteSiteSUL(body.rowIndex);
        result = ok_({}, 'Data berhasil dihapus');
        break;
      case 'delete-site-kal':
        deleteSiteKAL(body.rowIndex);
        result = ok_({}, 'Data berhasil dihapus');
        break;

      // ---------- SINKRONISASI MANUAL ----------
      case 'sync':
        result = syncAllData();
        break;

      default:
        result = err_('Endpoint tidak dikenal: ' + action);
    }

    return jsonOutput_(result);
  } catch (err) {
    return jsonOutput_(err_(err.message));
  }
}

function parseBody_(e) {
  try {
    if (e && e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (ignored) {}
  return {};
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data, message) {
  return { success: true, data: data, count: Array.isArray(data) ? data.length : undefined, message: message || '' };
}

function err_(error) {
  return { success: false, error: String(error), message: 'Terjadi kesalahan' };
}

/* ============================================================
 * LOW-LEVEL HELPERS
 * ============================================================ */

function getSS_() {
  return SpreadsheetApp.openById(SPREADSHEET_KEY);
}

function getSheet_(name, createIfMissing) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(name);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(name);
    var headers = name === SHEETS.SITE_SUL || name === SHEETS.SITE_KAL ? COLUMNS : null;
    if (headers) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + name);
  return sheet;
}

/**
 * Baca seluruh sheet menjadi array of objects.
 * rowIndex = nomor baris fisik di spreadsheet (2 = baris data pertama).
 */
function readSheetObjects_(sheetName) {
  var sheet = getSheet_(sheetName);
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length < 2) return [];

  // Normalisasi header (trim spasi)
  var headers = values[0].map(function (h) { return String(h).trim(); });

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    // Skip baris yang benar-benar kosong
    var hasValue = row.some(function (c) { return c !== '' && c !== null; });
    if (!hasValue) continue;

    var obj = { rowIndex: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;
      obj[headers[j]] = cleanCell_(row[j]);
    }
    rows.push(obj);
  }
  return rows;
}

/** Bersihkan nilai sel: Date -> ISO date string, kosong -> '' */
function cleanCell_(val) {
  if (val === null || val === undefined) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return val;
}

/** Konversi string tanggal umum menjadi Date atau null */
function parseDate_(val) {
  if (!val) return null;
  if (Object.prototype.toString.call(val) === '[object Date]') return val;
  var s = String(val).trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/); // dd/mm/yyyy
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toStr_(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function num_(val) {
  var n = parseFloat(String(val == null ? '' : val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Tulis array of arrays mulai A1, hapus isi lama */
function writeMatrix_(sheetName, matrix) {
  var sheet = getSheet_(sheetName, true);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  if (lastRow > 1 || lastCol > 1) {
    sheet.getRange(2, 1, lastRow, lastCol).clearContent();
  }
  sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).clearContent();

  if (!matrix || !matrix.length) return;
  var maxLen = 0;
  matrix.forEach(function (r) { maxLen = Math.max(maxLen, r.length); });
  var normalized = matrix.map(function (r) {
    while (r.length < maxLen) r.push('');
    return r;
  });
  sheet.getRange(1, 1, normalized.length, maxLen).setValues(normalized);
  sheet.getRange(1, 1, 1, matrix[0].length).setFontWeight('bold');
}

/* ============================================================
 * CRUD - Site_SUL
 * ============================================================ */

function getSiteSUL() {
  return readSheetObjects_(SHEETS.SITE_SUL);
}

function addSiteSUL(data) {
  var sheet = getSheet_(SHEETS.SITE_SUL);
  ensureHeaders_(sheet);
  var row = buildRowForSheet_(sheet, data, null);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateSiteSUL(rowIndex, data) {
  writeRowAt_(SHEETS.SITE_SUL, rowIndex, data);
  return true;
}

function deleteSiteSUL(rowIndex) {
  deleteRowAt_(SHEETS.SITE_SUL, rowIndex);
  return true;
}

/* ============================================================
 * CRUD - Site_KAL
 * ============================================================ */

function getSiteKAL() {
  return readSheetObjects_(SHEETS.SITE_KAL);
}

function addSiteKAL(data) {
  var sheet = getSheet_(SHEETS.SITE_KAL);
  ensureHeaders_(sheet);
  var row = buildRowForSheet_(sheet, data, null);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateSiteKAL(rowIndex, data) {
  writeRowAt_(SHEETS.SITE_KAL, rowIndex, data);
  return true;
}

function deleteSiteKAL(rowIndex) {
  deleteRowAt_(SHEETS.SITE_KAL, rowIndex);
  return true;
}

function ensureHeaders_(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  var empty = firstRow.every(function (c) { return c === ''; });
  if (empty) {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
  }
}

/** Baca header aktual dari baris 1 sheet (mendukung kolom tambahan apa pun) */
function getHeaders_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return headers.map(function (h) { return String(h).trim(); });
}

/**
 * Susun array nilai satu baris sesuai header aktual sheet.
 * Kolom yang tidak dikirim dalam `data` dipertahankan nilainya
 * dari `existing` (untuk update) atau dikosongkan (untuk tambah).
 */
function buildRowForSheet_(sheet, data, existingValues) {
  var headers = getHeaders_(sheet);
  return headers.map(function (col, i) {
    if (Object.prototype.hasOwnProperty.call(data, col)) {
      var v = data[col];
      return (v === undefined || v === null) ? '' : v;
    }
    return existingValues ? existingValues[i] : '';
  });
}

/** Ubah object data menjadi array sesuai urutan COLUMNS */
function buildRow_(data) {
  return COLUMNS.map(function (col) {
    var v = data[col];
    return (v === undefined || v === null) ? '' : v;
  });
}

function writeRowAt_(sheetName, rowIndex, data) {
  if (!rowIndex || rowIndex < 2) throw new Error('rowIndex tidak valid');
  var sheet = getSheet_(sheetName);
  ensureHeaders_(sheet);

  // Baca nilai lama dan gabungkan supaya kolom yang tidak diedit tidak hilang
  var existing = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = buildRowForSheet_(sheet, data, existing);
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function deleteRowAt_(sheetName, rowIndex) {
  if (!rowIndex || rowIndex < 2) throw new Error('rowIndex tidak valid');
  var sheet = getSheet_(sheetName);
  sheet.deleteRow(rowIndex);
}

/* ============================================================
 * DASHBOARD & KPI
 * ============================================================ */

var MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
var ZONES_SUL = ['MAKASSAR', 'MANADO', 'TERNATE'];

function getDashboard() {
  var dash2026 = readSheetRawMatrix_(SHEETS.DASH_2026);
  var dashSul = readSheetRawMatrix_(SHEETS.DASH_SUL);
  var pvtSul = readSheetRawMatrix_(SHEETS.PVT_SUL);
  var pivotKal = readSheetRawMatrix_(SHEETS.PIVOT_KAL);
  return {
    dashboard_2026: dash2026,
    dashboard_sulawesi: dashSul,
    pvt_dash_sul: pvtSul,
    pivot_kal: pivotKal
  };
}

function readSheetRawMatrix_(sheetName) {
  var sheet = getSheet_(sheetName);
  if (sheet.getLastRow() < 1) return { headers: [], rows: [] };
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var hasValue = values[i].some(function (c) { return c !== ''; });
    if (hasValue) rows.push(values[i]);
  }
  return { headers: headers, rows: rows };
}

function getKPI() {
  var all = getSiteSUL().concat(getSiteKAL());
  var kpi = {
    total_site: all.length,
    total_mos: 0,
    total_hi_done: 0,
    total_connected: 0,
    total_sm_atp: 0,
    total_fi_ineom: 0
  };

  all.forEach(function (r) {
    if (toStr_(r['MOS']) !== '') kpi.total_mos++;
    if (isDone_(r['HI Done'])) kpi.total_hi_done++;
    if (isDone_(r['Connected Date']) || isDone_(r['Connected Info'])) kpi.total_connected++;
    if (isDone_(r['SM ATP'])) kpi.total_sm_atp++;
    if (isDone_(r['FI Ineom'])) kpi.total_fi_ineom++;
  });

  // Override dengan angka dari Dashboard_2026 bila tersedia
  try {
    var d26 = readSheetRawMatrix_(SHEETS.DASH_2026);
    var totals = sumTotalsFromDash_(d26);
    if (totals.mos > 0) kpi.total_mos = totals.mos;
    if (totals.hi_done > 0) kpi.total_hi_done = totals.hi_done;
    if (totals.connected > 0) kpi.total_connected = totals.connected;
    if (totals.sm_atp > 0) kpi.total_sm_atp = totals.sm_atp;
    if (totals.fi_ineom > 0) kpi.total_fi_ineom = totals.fi_ineom;
  } catch (ignored) {}

  return kpi;
}

/** Anggap selesai jika nilainya bukan kosong/'-'/'N'/false/pending */
function isDone_(val) {
  var s = toStr_(val).toUpperCase();
  if (s === '' || s === '-' || s === 'N' || s === 'NO' || s === 'FALSE' ||
      s === 'NULL' || s.indexOf('PENDING') !== -1 || s.indexOf('BELUM') !== -1) {
    return false;
  }
  return true;
}

function sumTotalsFromDash_(dash) {
  var t = { mos: 0, hi_done: 0, connected: 0, sm_atp: 0, fi_ineom: 0 };
  if (!dash.headers || !dash.headers.length) return t;
  var hIdx = {};
  dash.headers.forEach(function (h, i) { hIdx[String(h).trim().toUpperCase()] = i; });
  dash.rows.forEach(function (row) {
    var label = toStr_(row[hIdx['METRIC']] !== undefined ? row[hIdx['METRIC']] : row[0]).toUpperCase();
    var value = num_(row[row.length - 1]);
    if (label.indexOf('MOS') !== -1) t.mos += value;
    else if (label.indexOf('HI') !== -1) t.hi_done += value;
    else if (label.indexOf('CONNECT') !== -1) t.connected += value;
    else if (label.indexOf('ATP') !== -1) t.sm_atp += value;
    else if (label.indexOf('INEOM') !== -1) t.fi_ineom += value;
  });
  return t;
}

/* ============================================================
 * SINKRONISASI PIVOT (MANUAL SAJA - TIDAK OTOMATIS)
 *
 * PENTING: Auto-sync sudah DINONAKTIFKAN agar tabel pivot
 * manual di spreadsheet tidak tertimpa. Fungsi ini HANYA
 * berjalan jika dipanggil eksplisit dari editor Apps Script.
 * CRUD tidak lagi memicunya.
 * ============================================================ */

function syncAllData() {
  try {
    var sul = readSheetObjects_(SHEETS.SITE_SUL);
    var kal = readSheetObjects_(SHEETS.SITE_KAL);
    var all = sul.concat(kal);

    // a. Dashboard_2026 : MOS per bulan per ZTE ZONE (tahun 2026)
    writeMatrix_(SHEETS.DASH_2026, buildDash2026_(all));

    // b. Dashboard Sulawesi : ringkasan per ZTE ZONE (Site_SUL)
    writeMatrix_(SHEETS.DASH_SUL, buildZoneSummary_(sul));

    // c. Pvt Dash Sul : group by ZTE ZONE + Monthly Assignment (Site_SUL)
    writeMatrix_(SHEETS.PVT_SUL, buildZoneMonthly_(sul));

    // d. Pivot Kal : group by ZTE ZONE + Monthly Assignment (Site_KAL)
    writeMatrix_(SHEETS.PIVOT_KAL, buildZoneMonthly_(kal));

    return { success: true, message: 'Sinkronisasi berhasil' };
  } catch (err) {
    return { success: false, error: String(err), message: 'Sinkronisasi gagal' };
  }
}

/**
 * Deteksi kolom wilayah/zona secara adaptif.
 * Site_SUL memakai 'ZTE ZONE'; Site_KAL (struktur baru) memakai 'Branch'.
 */
function zoneColName_(rows) {
  if (!rows || !rows.length) return 'ZTE ZONE';
  var keys = Object.keys(rows[0]);
  var candidates = ['ZTE ZONE', 'Branch', 'Cluster', 'Region', 'Area'];
  for (var i = 0; i < candidates.length; i++) {
    if (keys.indexOf(candidates[i]) !== -1) return candidates[i];
  }
  return 'ZTE ZONE';
}

/** Matrix [Month | zone... | TOTAL] berisi jumlah site MOS tiap bulan tahun 2026 */
function buildDash2026_(rows) {
  var zCol = zoneColName_(rows);
  var zones = collectZones_(rows, zCol);
  var header = ['MONTH'].concat(zones).concat(['TOTAL']);
  var matrix = [header];

  var counts = {}; // counts[zone][monthIdx] = n
  zones.forEach(function (z) {
    counts[z] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  });

  rows.forEach(function (r) {
    var zone = normalizeZone_(toStr_(r[zCol]), zones);
    if (!zone) return;
    var mosDate = parseDate_(r['MOS']);
    if (!mosDate || mosDate.getFullYear() !== 2026) {
      // Fallback: coba dari Monthly Assignment (mis. "2026-01" / "JAN-26")
      var mA = toStr_(r['Monthly Assignment']);
      var mi = matchMonth_(mA);
      if (mi < 0) return;
      counts[zone][mi]++;
    } else {
      counts[zone][mosDate.getMonth()]++;
    }
  });

  MONTH_NAMES.forEach(function (mn, mi) {
    var rowVals = zones.map(function (z) { return counts[z][mi]; });
    var total = rowVals.reduce(function (a, b) { return a + b; }, 0);
    matrix.push([mn].concat(rowVals).concat([total]));
  });

  // Baris total per zone
  var colTotals = zones.map(function (z) {
    return counts[z].reduce(function (a, b) { return a + b; }, 0);
  });
  var grandTotal = colTotals.reduce(function (a, b) { return a + b; }, 0);
  matrix.push(['TOTAL'].concat(colTotals).concat([grandTotal]));

  return matrix;
}

/** Matrix [ZTE ZONE | Total Site | MOS | HI Done | Connected | SM ATP | FI INEOM] */
function buildZoneSummary_(rows) {
  var zCol = zoneColName_(rows);
  var header = ['ZTE ZONE', 'Total Site', 'MOS', 'HI Done', 'Connected', 'SM ATP', 'FI INEOM'];
  var matrix = [header];

  var groups = {};
  rows.forEach(function (r) {
    var z = toStr_(r[zCol]) || '(KOSONG)';
    if (!groups[z]) groups[z] = [];
    groups[z].push(r);
  });

  Object.keys(groups).sort().forEach(function (z) {
    var g = groups[z];
    matrix.push([
      z,
      g.length,
      g.filter(function (r) { return toStr_(r['MOS']) !== ''; }).length,
      g.filter(function (r) { return isDone_(r['HI Done']); }).length,
      g.filter(function (r) { return isDone_(r['Connected Date']) || isDone_(r['Connected Info']); }).length,
      g.filter(function (r) { return isDone_(r['SM ATP']); }).length,
      g.filter(function (r) { return isDone_(r['FI Ineom']); }).length
    ]);
  });

  // Grand total
  var totals = [ 'TOTAL', rows.length ];
  for (var i = 2; i < header.length; i++) {
    var sum = 0;
    for (var r = 1; r < matrix.length; r++) sum += num_(matrix[r][i]);
    totals.push(sum);
  }
  matrix.push(totals);

  return matrix;
}

/** Matrix [ZTE ZONE | Monthly Assignment | Total] */
function buildZoneMonthly_(rows) {
  var zCol = zoneColName_(rows);
  var header = ['ZTE ZONE', 'MONTHLY ASSIGNMENT', 'TOTAL'];
  var matrix = [header];

  var map = {};
  rows.forEach(function (r) {
    var z = toStr_(r[zCol]) || '(KOSONG)';
    var mA = toStr_(r['Monthly Assignment']) || '-';
    var key = z + '|||' + mA;
    if (!map[key]) map[key] = { zone: z, month: mA, total: 0 };
    map[key].total++;
  });

  Object.keys(map)
    .map(function (k) { return map[k]; })
    .sort(function (a, b) {
      if (a.zone !== b.zone) return a.zone < b.zone ? -1 : 1;
      return a.month < b.month ? -1 : (a.month > b.month ? 1 : 0);
    })
    .forEach(function (item) {
      matrix.push([item.zone, item.month, item.total]);
    });

  return matrix;
}

function collectZones_(rows, zCol) {
  zCol = zCol || zoneColName_(rows);
  var set = {};
  rows.forEach(function (r) {
    var z = toStr_(r[zCol]);
    if (z) set[z.toUpperCase()] = true;
  });
  var zones = Object.keys(set);
  // Urutkan zona standar lebih dulu bila ada
  var std = ZONES_SUL.filter(function (z) { return zones.indexOf(z) !== -1; });
  var extra = zones.filter(function (z) { return std.indexOf(z) === -1; }).sort();
  return std.concat(extra.length ? extra : ZONES_SUL.slice());
}

function normalizeZone_(zone, validZones) {
  var u = zone.toUpperCase();
  return validZones.indexOf(u) !== -1 ? u : (u || null);
}

/** Cocokkan nama bulan dalam teks bebas -> index bulan (0-11) atau -1 */
function matchMonth_(text) {
  var s = toStr_(text).toUpperCase();
  if (!s) return -1;
  for (var i = 0; i < MONTH_NAMES.length; i++) {
    if (s.indexOf(MONTH_NAMES[i]) !== -1) return i;
  }
  // alternatif nama Inggris
  var en = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  for (var j = 0; j < en.length; j++) {
    if (s.indexOf(en[j]) !== -1) return j;
  }
  var mNum = s.match(/2026[-\/ ]?(\d{1,2})/);
  if (mNum) {
    var mi = parseInt(mNum[1], 10) - 1;
    return (mi >= 0 && mi <= 11) ? mi : -1;
  }
  return -1;
}
