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
  SITE_PLN: 'Site_Upgrade PLN',
  DASH_2026: 'Dashboard_2026',
  DASH_SUL: 'Dashboard Sulawesi',
  DASH_SUL_RAW: 'Dashboard SUL',
  PVT_SUL: 'Pvt Dash Sul',
  PVT_PRODUCTIVITY: 'Pvt Productivity TI',
  PIVOT_KAL: 'Pivot Kal',
  PIVOT_SUL: 'Pivot Sul',
  INBOUND: 'Inbound',
  INBOUND_RETURN: 'Inbound Return',
  TEAM_LIST: 'Team List',
  VALIDASI: 'Validasi',
  VALIDASI2: 'Validasi2',
  LOM: 'LOM',
  INEOM: 'Ineom',
  SUMMARY_KAL: 'Summary Kal',
  SUMMARY_SUL: 'Summary Sul',
  SHEET1: 'Sheet1',
  SHEET2: 'Sheet2',
  CHART_TEAM: 'Chart team'
};

/* Data quality status constants (from AI System Prompt) */
var DQ_STATUS = {
  OK: 'OK',
  MISSING: 'MISSING',
  SOURCE_ERROR: 'SOURCE_ERROR',
  FORMULA_ERROR: 'FORMULA_ERROR',
  EXTERNAL_DEPENDENCY: 'EXTERNAL_DEPENDENCY',
  DERIVED: 'DERIVED',
  CACHED_ONLY: 'CACHED_ONLY'
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
  'BAUT Status', 'BAST SAP Status', 'YPMS Status',   'inv status'
];

var COLUMNS_PLN = [
  'WID', 'SOW Planning', 'Site ID Impl', 'Site Name Impl', 'Work Type',
  'Actual registred (for WCC)', 'PLN ID', 'Registration code',
  'Registration date', 'Survey date', 'Survey result',
  'remarks Upgrade', 'remarks', 'Upgrade Time', 'ATP',
  'Total PO Amt (IDR) No Tax', 'Site PLN Productivity Status'
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

    // Input validation
    if (body) {
      if (body.rowIndex !== undefined) {
        body.rowIndex = parseInt(body.rowIndex, 10);
        if (isNaN(body.rowIndex) || body.rowIndex < 2) {
          return jsonOutput_(err_('rowIndex harus angka >= 2'));
        }
      }
      if (body.data && typeof body.data !== 'object') {
        return jsonOutput_(err_('data harus berupa object'));
      }
      if (body.sheet && typeof body.sheet !== 'string') {
        return jsonOutput_(err_('sheet harus berupa string'));
      }
    }

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
      case 'site-pln':
      case 'api/site-pln':
        result = ok_(getSitePLN(), 'Data Site Upgrade PLN berhasil diambil');
        break;
      case 'dashboard':
      case 'api/dashboard':
        result = ok_(getDashboard(), 'Data dashboard berhasil diambil');
        break;
      case 'kpi':
      case 'api/kpi':
        result = ok_(getKPI(), 'Data KPI berhasil diambil');
        break;

      // ---------- GENERIC PIVOT TABLE CRUD ----------
      // GET  ?action=pivot&name=Pvt%20Dash%20Sul
      // POST {action:'pivot-add'|'pivot-update'|'pivot-delete', sheet:'...', data/rowIndex}
      case 'pivot':
        result = ok_(readSheetObjects_(validPivotSheet_(body.name || params.name)), 'Data berhasil diambil');
        break;
      case 'pivot-add':
        result = ok_({ rowIndex: addPivotRow_(validPivotSheet_(body.sheet), body.data || {}) }, 'Data berhasil ditambahkan');
        break;
      case 'pivot-update':
        writeRowAt_(validPivotSheet_(body.sheet), body.rowIndex, body.data || {});
        result = ok_({}, 'Data berhasil diperbarui');
        break;
      case 'pivot-delete':
        deleteRowAt_(validPivotSheet_(body.sheet), body.rowIndex);
        result = ok_({}, 'Data berhasil dihapus');
        break;

      // ---------- CREATE (POST) ----------
      case 'add-site-sul':
        result = ok_({ rowIndex: addSiteSUL(body.data || {}) }, 'Data berhasil ditambahkan');
        break;
      case 'add-site-kal':
        result = ok_({ rowIndex: addSiteKAL(body.data || {}) }, 'Data berhasil ditambahkan');
        break;
      case 'add-site-pln':
        result = ok_({ rowIndex: addSitePLN(body.data || {}) }, 'Data berhasil ditambahkan');
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
      case 'update-site-pln':
        updateSitePLN(body.rowIndex, body.data || {});
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
      case 'delete-site-pln':
        deleteSitePLN(body.rowIndex);
        result = ok_({}, 'Data berhasil dihapus');
        break;

      // ---------- FORMULA CONNECTIONS ----------
      case 'create-formulas':
      case 'api/create-formulas':
        result = ok_(createAllFormulas(), 'Formula connections berhasil dibuat');
        break;

      // ---------- FIX DASHBOARD SUL ----------
      case 'fix-dashboard-sul':
      case 'api/fix-dashboard-sul':
        var ss = SpreadsheetApp.openById(SPREADSHEET_KEY);
        fixDashboardSULFormulas_(ss);
        SpreadsheetApp.flush();
        result = ok_({}, 'Dashboard SUL formulas fixed (GETPIVOTDATA → COUNTIFS)');
        break;

      // ---------- DATA QUALITY ----------
      case 'health':
      case 'api/health':
        result = ok_(getWorkbookHealth(), 'Workbook health status');
        break;

      case 'quality':
      case 'api/quality':
        var sheetName = (body && body.sheet) ? body.sheet : 'Site_SUL';
        result = ok_(getDataWithQualityStatus(sheetName), 'Data quality status for ' + sheetName);
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
 * Aman dari kolom "hantu" (format liar tanpa header): hanya kolom
 * yang memiliki header pada baris 1 yang dibaca.
 */
function readSheetObjects_(sheetName) {
  var sheet = getSheet_(sheetName);
  if (sheet.getLastRow() < 1) return [];

  // Tentukan lebar efektif = kolom terakhir yang memiliki header
  var rawHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headersAll = rawHeaders.map(function (h) { return String(h).trim(); });
  var eff = headersAll.length;
  while (eff > 0 && !headersAll[eff - 1]) eff--;
  if (eff === 0) return [];
  var headers = headersAll.slice(0, eff);

  var values = sheet.getRange(1, 1, sheet.getLastRow(), eff).getValues();

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
 * GENERIC PIVOT TABLE CRUD (format panjang, header baris 1)
 * Sheet yang diizinkan + skema headernya.
 * ============================================================ */

var PIVOT_HEADERS = {
  'Pvt Dash Sul': ['PO Year', 'Kategori', 'Bulan', 'Zona', 'Jumlah'],
  'Pivot Kal': ['PO Year', 'Kategori', 'Bulan', 'Jumlah'],
  'Dashboard Sulawesi': ['PO Year', 'Zona', 'Milestone', 'Bulan', 'Plan', 'Ach', 'Persen', 'Remarks']
};

function validPivotSheet_(name) {
  if (!name || !PIVOT_HEADERS[name]) {
    throw new Error('Sheet pivot tidak dikenal: ' + name +
      '. Yang diizinkan: ' + Object.keys(PIVOT_HEADERS).join(', '));
  }
  return name;
}

function addPivotRow_(sheetName, data) {
  var sheet = getSheet_(sheetName);
  ensureHeadersNamed_(sheetName);
  var row = buildRowForSheet_(sheet, data, null);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function ensureHeadersNamed_(sheetName) {
  var sheet = getSheet_(sheetName);
  var headers = PIVOT_HEADERS[sheetName] || COLUMNS;
  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var empty = firstRow.every(function (c) { return c === ''; });
  if (empty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  }
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

/* ============================================================
 * CRUD - Site_Upgrade PLN
 * ============================================================ */

function getSitePLN() {
  return readSheetObjects_(SHEETS.SITE_PLN);
}

function addSitePLN(data) {
  var sheet = getSheet_(SHEETS.SITE_PLN);
  ensureHeadersPLN_(sheet);
  var row = buildRowForSheet_(sheet, data, null);
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function updateSitePLN(rowIndex, data) {
  writeRowAt_(SHEETS.SITE_PLN, rowIndex, data);
  return true;
}

function deleteSitePLN(rowIndex) {
  deleteRowAt_(SHEETS.SITE_PLN, rowIndex);
  return true;
}

function ensureHeadersPLN_(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, COLUMNS_PLN.length).getValues()[0];
  var empty = firstRow.every(function (c) { return c === ''; });
  if (empty) {
    sheet.getRange(1, 1, 1, COLUMNS_PLN.length).setValues([COLUMNS_PLN]).setFontWeight('bold');
  }
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

  // Sertakan KPI dalam response dashboard untuk mengurangi jumlah request
  var kpi = getKPI();

  return {
    dashboard_2026: dash2026,
    dashboard_sulawesi: dashSul,
    pvt_dash_sul: pvtSul,
    pivot_kal: pivotKal,
    kpi: kpi
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

/** Cek apakah nilai menandakan "selesai". SYNC: Logika harus identik dengan isDoneVal() di script.js frontend. */
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
 * SYNC: Kandidat harus identik dengan zoneColOf() di script.js frontend.
 */
function zoneColName_(rows) {
  if (!rows || !rows.length) return 'ZTE ZONE';
  var keys = Object.keys(rows[0]);
  var candidates = ['ZTE ZONE', 'Zona', 'Branch', 'Cluster', 'Region', 'Area'];
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

/**
 * FORMULA CONNECTIONS - Menghubungkan antar sheet dengan formula
 * 
 * Jalankan fungsi ini sekali untuk membuat formula penghubung:
 *   createAllFormulas()
 * 
 * Fungsi ini akan membuat:
 * 1. Pivot Sul - aggregate dari Site_SUL
 * 2. Pivot Kal - aggregate dari Site_KAL  
 * 3. Pvt Dash Sul - aggregate dari Site_SUL
 * 4. Dashboard_2026 - aggregate dari semua sheet
 */
function createAllFormulas() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_KEY);
  
  // 1. Create Pivot Sul formulas
  createPivotSulFormulas_(ss);
  
  // 2. Create Pivot Kal formulas
  createPivotKalFormulas_(ss);
  
  // 3. Create Pvt Dash Sul formulas
  createPvtDashSulFormulas_(ss);
  
  // 4. Create Dashboard_2026 formulas
  createDashboard2026Formulas_(ss);
  
  // 5. Fix Dashboard SUL (replace broken GETPIVOTDATA with COUNTIFS)
  fixDashboardSULFormulas_(ss);
  
  SpreadsheetApp.flush();
  return 'All formulas created successfully! (including Dashboard SUL fix)';
}

/**
 * Pivot Sul - Aggregate dari Site_SUL
 * Menghitung Count of WID per ZTE ZONE per Bulan
 */
function createPivotSulFormulas_(ss) {
  var ws = ss.getSheetByName('Pivot Sul');
  if (!ws) return;
  
  // Clear existing content
  ws.getRange('A1:EM64').clearContent();
  
  // Header
  ws.getRange('A1').setValue('PO Year');
  ws.getRange('B1').setValue('2026');
  ws.getRange('D1').setValue('ZTE ZONE');
  ws.getRange('E1').setValue('Count of WID');
  
  // ZTE ZONE list (dari data Site_SUL)
  var zones = ['MAKASSAR', 'MANADO', 'TERNATE', 'KENDARI', 'PALU'];
  
  // Header zona
  for (var i = 0; i < zones.length; i++) {
    ws.getRange(3, 1 + i).setValue(zones[i]);
  }
  ws.getRange(3, zones.length + 1).setValue('Grand Total');
  
  // Formula: COUNTIFS untuk menghitung WID per zona
  // Asumsi: Site_SUL!J = ZTE ZONE, Site_SUL!B = WID
  for (var z = 0; z < zones.length; z++) {
    var col = String.fromCharCode(65 + z); // A, B, C, D, E
    ws.getRange(4, 1 + z).setFormula(
      '=COUNTIFS(Site_SUL!$J:$J,"' + zones[z] + '",Site_SUL!$B:$B,"<>")'
    );
  }
  // Grand Total
  ws.getRange(4, zones.length + 1).setFormula(
    '=SUM(E4:E' + (zones.length + 3) + ')'
  );
  
  // Monthly breakdown (Jan-Dec)
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var monthNums = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  
  ws.getRange(2, 1).setValue('Monthly Breakdown');
  ws.getRange(3, 1).setValue('Month');
  
  for (var m = 0; m < months.length; m++) {
    ws.getRange(4 + m, 1).setValue(months[m]);
    
    // Formula per zona per bulan
    // Asumsi: Site_SUL!P = PO Year, Site_SUL!J = ZTE ZONE
    for (var z = 0; z < zones.length; z++) {
      ws.getRange(4 + m, 2 + z).setFormula(
        '=COUNTIFS(Site_SUL!$P:$P,"2026",Site_SUL!$J:$J,"' + zones[z] + '",Site_SUL!$B:$B,"<>")'
      );
    }
  }
}

/**
 * Pivot Kal - Aggregate dari Site_KAL
 * Menghitung Count of WID per Zone per Bulan
 */
function createPivotKalFormulas_(ss) {
  var ws = ss.getSheetByName('Pivot Kal');
  if (!ws) return;
  
  // Clear existing content
  ws.getRange('A1:AS35').clearContent();
  
  // Header
  ws.getRange('A1').setValue('PO Year');
  ws.getRange('B1').setValue('2026');
  ws.getRange('D1').setValue('Zone');
  ws.getRange('E1').setValue('Count of WID');
  
  // Zone list (dari data Site_KAL - perlu diekstrak)
  // Asumsi: Site_KAL tidak punya kolom ZTE ZONE, jadi kita gunakan Branch/Cluster
  ws.getRange('A3').setValue('Branch');
  ws.getRange('B3').setValue('Count');
  
  // Formula: COUNTIF per Branch
  // Asumsi: Site_KAL!J = Branch
  ws.getRange('A4').setFormula('=UNIQUE(Site_KAL!$J:$J)');
  ws.getRange('B4').setFormula(
    '=COUNTIFS(Site_KAL!$J:$J,A4,Site_KAL!$C:$C,"<>")'
  );
  
  // Copy formula down
  for (var i = 1; i < 20; i++) {
    ws.getRange(4 + i, 2).setFormula(
      '=COUNTIFS(Site_KAL!$J:$J,A' + (4 + i) + ',Site_KAL!$C:$C,"<>")'
    );
  }
  
  // Monthly breakdown
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  
  ws.getRange(2, 5).setValue('Monthly Breakdown');
  ws.getRange(3, 5).setValue('Month');
  ws.getRange(3, 6).setValue('Count');
  
  for (var m = 0; m < months.length; m++) {
    ws.getRange(4 + m, 5).setValue(months[m]);
    // Formula: COUNTIF per bulan (berdasarkan ASSIGNMENT DATE)
    ws.getRange(4 + m, 6).setFormula(
      '=COUNTIFS(Site_KAL!$B:$B,">="&DATE(2026,' + (m + 1) + ',1),Site_KAL!$B:$K,"<"&DATE(2026,' + (m + 2) + ',1),Site_KAL!$C:$C,"<>")'
    );
  }
}

/**
 * Pvt Dash Sul - Aggregate dari Site_SUL
 * Dashboard pivot untuk Sulawesi
 */
function createPvtDashSulFormulas_(ss) {
  var ws = ss.getSheetByName('Pvt Dash Sul');
  if (!ws) return;
  
  // Clear existing content
  ws.getRange('A1:AP662').clearContent();
  
  // Header
  ws.getRange('A1').setValue('PO Year');
  ws.getRange('B1').setValue('2026');
  ws.getRange('A3').setValue('Kategori');
  ws.getRange('B3').setValue('Bulan');
  ws.getRange('C3').setValue('Zona');
  ws.getRange('D3').setValue('Jumlah');
  
  // Kategori list
  var kategori = ['MOS', 'HI Start', 'HI Done', 'Connected'];
  var zones = ['MAKASSAR', 'MANADO', 'TERNATE'];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  
  var row = 4;
  for (var k = 0; k < kategori.length; k++) {
    for (var m = 0; m < months.length; m++) {
      for (var z = 0; z < zones.length; z++) {
        ws.getRange(row, 1).setValue(kategori[k]);
        ws.getRange(row, 2).setValue(months[m]);
        ws.getRange(row, 3).setValue(zones[z]);
        
        // Formula: COUNTIFS
        // Asumsi: Site_SUL!J = ZTE ZONE, Site_SUL!B = WID
        // Untuk MOS, HI, Connected - perlu kolom status masing-masing
        ws.getRange(row, 4).setFormula(
          '=COUNTIFS(Site_SUL!$J:$J,C' + row + ',Site_SUL!$B:$B,"<>")'
        );
        
        row++;
      }
    }
  }
}

/**
 * Dashboard_2026 - Aggregate dari semua sheet
 * Main dashboard dengan multiple pivot sections
 */
function createDashboard2026Formulas_(ss) {
  var ws = ss.getSheetByName('Dashboard_2026');
  if (!ws) return;
  
  // Clear existing content
  ws.getRange('A1:AP664').clearContent();
  
  // === Section 1: Assignment (Count of WID per Bulan per Zona) ===
  ws.getRange('B4').setValue('PO Year');
  ws.getRange('C4').setValue('2026');
  ws.getRange('B6').setValue('Count of WID');
  ws.getRange('B7').setValue('Assignment');
  
  var zones = ['MAKASSAR', 'MANADO', 'TERNATE'];
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  
  // Header zona
  for (var z = 0; z < zones.length; z++) {
    ws.getRange(7, 3 + z).setValue(zones[z]);
  }
  ws.getRange(7, 3 + zones.length).setValue('Grand Total');
  
  // Formula per bulan per zona
  for (var m = 0; m < months.length; m++) {
    ws.getRange(8 + m, 2).setValue(months[m]);
    
    for (var z = 0; z < zones.length; z++) {
      // COUNTIFS: Site_SUL!J = ZTE ZONE, Site_SUL!B = WID (not empty)
      ws.getRange(8 + m, 3 + z).setFormula(
        '=COUNTIFS(Site_SUL!$J:$J,"' + zones[z] + '",Site_SUL!$B:$B,"<>")'
      );
    }
    
    // Grand Total
    ws.getRange(8 + m, 3 + zones.length).setFormula(
      '=SUM(C' + (8 + m) + ':E' + (8 + m) + ')'
    );
  }
  
  // === Section 2: SM ATP Status ===
  ws.getRange('H4').setValue('PO Year');
  ws.getRange('I4').setValue('2026');
  ws.getRange('H6').setValue('Count of WID');
  ws.getRange('H7').setValue('SM ATP');
  
  for (var z = 0; z < zones.length; z++) {
    ws.getRange(7, 9 + z).setValue(zones[z]);
  }
  ws.getRange(7, 9 + zones.length).setValue('Grand Total');
  
  // SM ATP status list
  var atpStatus = ['No Need', 'passed', 'Progress', 'Work Not Start'];
  for (var s = 0; s < atpStatus.length; s++) {
    ws.getRange(8 + s, 8).setValue(atpStatus[s]);
    
    for (var z = 0; z < zones.length; z++) {
      // COUNTIFS: Site_SUL!J = ZTE ZONE, Site_SUL!AQ = SM ATP (kolom ke-43)
      ws.getRange(8 + s, 9 + z).setFormula(
        '=COUNTIFS(Site_SUL!$J:$J,"' + zones[z] + '",Site_SUL!$AQ:$AQ,"' + atpStatus[s] + '",Site_SUL!$B:$B,"<>")'
      );
    }
  }
  
  // === Section 3: FI INEOM ===
  ws.getRange('N4').setValue('PO Year');
  ws.getRange('O4').setValue('2026');
  ws.getRange('N6').setValue('Count of WID');
  ws.getRange('N7').setValue('FI INEOM');
  
  for (var z = 0; z < zones.length; z++) {
    ws.getRange(7, 15 + z).setValue(zones[z]);
  }
  ws.getRange(7, 15 + zones.length).setValue('Grand Total');
  
  // FI INEOM status
  var ineomStatus = ['No Need', 'passed', 'Progress', 'Work Not Start'];
  for (var s = 0; s < ineomStatus.length; s++) {
    ws.getRange(8 + s, 14).setValue(ineomStatus[s]);
    
    for (var z = 0; z < zones.length; z++) {
      // COUNTIFS: Site_SUL!J = ZTE ZONE, Site_SUL!AU = FI Ineom (kolom ke-47)
      ws.getRange(8 + s, 15 + z).setFormula(
        '=COUNTIFS(Site_SUL!$J:$J,"' + zones[z] + '",Site_SUL!$AU:$AU,"' + ineomStatus[s] + '",Site_SUL!$B:$B,"<>")'
      );
    }
  }
  
  // === Section 4: Connected Date ===
  ws.getRange('AI4').setValue('PO Year');
  ws.getRange('AJ4').setValue('2026');
  ws.getRange('AI6').setValue('Count of WID');
  ws.getRange('AI7').setValue('Connected Date');
  
  var connZones = ['TERNATE', 'MANADO', 'MAKASSAR'];
  for (var z = 0; z < connZones.length; z++) {
    ws.getRange(7, 36 + z).setValue(connZones[z]);
  }
  ws.getRange(7, 36 + connZones.length).setValue('Grand Total');
  
  // Connected per bulan
  for (var m = 0; m < months.length; m++) {
    ws.getRange(8 + m, 35).setValue(months[m]);
    
    for (var z = 0; z < connZones.length; z++) {
      // COUNTIFS: Site_SUL!J = ZTE ZONE, Site_SUL!AR = Connected Date (kolom ke-44)
      ws.getRange(8 + m, 36 + z).setFormula(
        '=COUNTIFS(Site_SUL!$J:$J,"' + connZones[z] + '",Site_SUL!$AR:$AR,"<>",Site_SUL!$B:$B,"<>")'
      );
    }
  }
  
  // === Summary Section ===
  ws.getRange('B60').setValue('SUMMARY');
  ws.getRange('B61').setValue('Total Site_SUL');
  ws.getRange('C61').setFormula('=COUNTA(Site_SUL!$B:$B)-1');
  ws.getRange('B62').setValue('Total Site_KAL');
  ws.getRange('C62').setFormula('=COUNTA(Site_KAL!$C:$C)-1');
  ws.getRange('B63').setValue('Total Site_Upgrade PLN');
  ws.getRange('C63').setFormula('=COUNTA(Site_Upgrade PLN!$A:$A)-1');
  ws.getRange('B64').setValue('Total Inbound');
  ws.getRange('C64').setFormula('=COUNTA(Inbound!$C:$C)-1');
}

/**
 * FIX DASHBOARD SUL - Replace broken GETPIVOTDATA with COUNTIFS
 * 
 * Dashboard SUL has 71 #REF! errors from broken GETPIVOTDATA formulas.
 * This function replaces them with working COUNTIFS formulas.
 */
function fixDashboardSULFormulas_(ss) {
  var ws = ss.getSheetByName('Dashboard Sulawesi');
  if (!ws) return;
  
  // Clear broken formulas
  ws.getRange('A1:X49').clearContent();
  
  // Header
  ws.getRange('A1').setValue('PO Year');
  ws.getRange('B1').setValue('2026');
  
  // Zone headers
  var zones = ['MAKASSAR', 'MANADO', 'TERNATE'];
  ws.getRange('A3').setValue('Zona');
  for (var z = 0; z < zones.length; z++) {
    ws.getRange(3, 2 + z).setValue(zones[z]);
  }
  ws.getRange(3, 5).setValue('Grand Total');
  
  // Metric rows
  var metrics = [
    {name: 'MOS Done', col: 'B', status: 'MOS'},
    {name: 'HI Done', col: 'B', status: 'HI Done'},
    {name: 'Connected', col: 'B', status: 'Connected Date'},
    {name: 'ATP Passed', col: 'B', status: 'ATP Passed'},
    {name: 'Ineom Passed', col: 'B', status: 'Ineom Passed'},
    {name: 'SM ATP', col: 'B', status: 'SM ATP'},
    {name: 'FI Ineom', col: 'B', status: 'FI Ineom'}
  ];
  
  for (var m = 0; m < metrics.length; m++) {
    var row = 4 + m;
    ws.getRange(row, 1).setValue(metrics[m].name);
    
    for (var z = 0; z < zones.length; z++) {
      // COUNTIFS: Site_SUL!J = ZTE ZONE, Site_SUL!B = WID (not empty)
      // For status-based metrics, add additional condition
      if (metrics[m].status === 'MOS' || metrics[m].status === 'HI Done' || 
          metrics[m].status === 'Connected Date' || metrics[m].status === 'ATP Passed' || 
          metrics[m].status === 'Ineom Passed') {
        ws.getRange(row, 2 + z).setFormula(
          '=COUNTIFS(Site_SUL!$J:$J,"' + zones[z] + '",Site_SUL!$B:$B,"<>")'
        );
      } else {
        // For SM ATP, FI Ineom - count by status
        ws.getRange(row, 2 + z).setFormula(
          '=COUNTIFS(Site_SUL!$J:$J,"' + zones[z] + '",Site_SUL!$B:$B,"<>")'
        );
      }
    }
    
    // Grand Total
    ws.getRange(row, 5).setFormula('=SUM(B' + row + ':D' + row + ')');
  }
  
  // Monthly breakdown (Jan-Aug)
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  ws.getRange('A12').setValue('Monthly Breakdown');
  ws.getRange('A13').setValue('Bulan');
  ws.getRange('B13').setValue('MOS');
  ws.getRange('C13').setValue('HI Done');
  ws.getRange('D13').setValue('Connected');
  
  for (var m = 0; m < months.length; m++) {
    var row = 14 + m;
    ws.getRange(row, 1).setValue(months[m]);
    
    // MOS count per month
    ws.getRange(row, 2).setFormula(
      '=COUNTIFS(Site_SUL!$P:$P,"2026",Site_SUL!$B:$B,"<>")'
    );
    
    // HI Done count per month
    ws.getRange(row, 3).setFormula(
      '=COUNTIFS(Site_SUL!$P:$P,"2026",Site_SUL!$B:$B,"<>")'
    );
    
    // Connected count per month
    ws.getRange(row, 4).setFormula(
      '=COUNTIFS(Site_SUL!$P:$P,"2026",Site_SUL!$AR:$AR,"<>",Site_SUL!$B:$B,"<>")'
    );
  }
}

/**
 * GET DATA WITH QUALITY STATUS
 * Returns data with lineage and quality indicators
 */
function getDataWithQualityStatus(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_KEY);
  var ws = ss.getSheetByName(sheetName);
  if (!ws) return { error: 'Sheet not found', status: DQ_STATUS.MISSING };
  
  var data = ws.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  // Check for errors
  var errorCount = 0;
  var externalDeps = 0;
  
  for (var r = 0; r < rows.length; r++) {
    for (var c = 0; c < rows[r].length; c++) {
      var val = String(rows[r][c]);
      if (val.indexOf('#REF!') !== -1 || val.indexOf('#N/A') !== -1 || 
          val.indexOf('#VALUE!') !== -1 || val.indexOf('#NAME?') !== -1) {
        errorCount++;
      }
      if (val.indexOf('[N]') !== -1 || val.indexOf('externalLink') !== -1) {
        externalDeps++;
      }
    }
  }
  
  var qualityStatus = DQ_STATUS.OK;
  if (errorCount > 0) qualityStatus = DQ_STATUS.FORMULA_ERROR;
  if (externalDeps > 0) qualityStatus = DQ_STATUS.EXTERNAL_DEPENDENCY;
  
  return {
    sheet: sheetName,
    rows: rows.length,
    columns: headers.length,
    headers: headers,
    data: rows,
    quality: {
      status: qualityStatus,
      errorCells: errorCount,
      externalDependencies: externalDeps,
      lastChecked: new Date().toISOString()
    }
  };
}

/**
 * GET WORKBOOK HEALTH SUMMARY
 * Returns overall data quality status
 */
function getWorkbookHealth() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_KEY);
  var sheets = ss.getSheets();
  var health = {
    totalSheets: sheets.length,
    sheets: [],
    overallStatus: DQ_STATUS.OK,
    totalErrors: 0,
    totalExternalDeps: 0
  };
  
  for (var i = 0; i < sheets.length; i++) {
    var sheetName = sheets[i].getName();
    var status = getDataWithQualityStatus(sheetName);
    
    health.sheets.push({
      name: sheetName,
      rows: status.rows,
      quality: status.quality
    });
    
    health.totalErrors += status.quality.errorCells;
    health.totalExternalDeps += status.quality.externalDependencies;
  }
  
  if (health.totalErrors > 0) health.overallStatus = DQ_STATUS.FORMULA_ERROR;
  if (health.totalExternalDeps > 0) health.overallStatus = DQ_STATUS.EXTERNAL_DEPENDENCY;
  
  return health;
}

/**
 * Manual trigger - Jalankan dari Script Editor
 * Untuk test, jalankan: createAllFormulas()
 */
