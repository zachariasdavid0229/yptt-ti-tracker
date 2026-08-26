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

var SPREADSHEET_KEY = '1pLiQ7FnirEunpWQUGFU136Nld416RqN_';

/** Versi backend — naikkan setiap deploy agar health check bisa memverifikasi sinkron */
var BACKEND_VERSION = '3.0.7-final.1';

/* ============================================================
 * FUNGSI EDITOR RAMAH (mudah dicari di dropdown ▶ Run)
 * Jalankan dari editor Apps Script — berjalan sebagai pemilik,
 * TIDAK butuh token. Setelah mengganti Code.gs: Ctrl+S cukup
 * (tanpa "New version" — itu hanya untuk update Web App).
 * ============================================================ */

/** ▶ RUN INI: jalankan calculation engine -> tulis sheet ENGINE_* */
function JALANKAN_ENGINE() {
  var res = runEngineSync_();
  Logger.log(JSON.stringify(res));
  return res;
}

/** ▶ Jalankan SEKALI: pasang trigger onEdit ke spreadsheet aktif */
function PASANG_TRIGGER() {
  return installTriggers();
}

/** ▶ Uji agregasi di memori (tidak menulis apa pun) */
function UJI_ENGINE() {
  test_engine_smoke();
}

/** Tahun anggaran aktif untuk agregasi dashboard */
var ACTIVE_YEAR = 2026;

/**
 * Sheet hasil calculation engine (SAFE MODE).
 * KEPUTUSAN DESAIN: engine TIDAK PERNAH menimpa sheet input manual.
 * Semua output derived ditulis ke sheet bayangan berprefix "ENGINE ".
 * Sheet manual (Pvt Dash Sul, Pivot Kal, Dashboard Sulawesi) tetap utuh.
 */
var ENGINE_PREFIX = 'ENGINE ';

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

/** Sheet bayangan output engine (safe mode) */
var ENGINE_SHEETS = {
  PVT_DASH_SUL: ENGINE_PREFIX + 'Pvt Dash Sul',
  PIVOT_KAL: ENGINE_PREFIX + 'Pivot Kal',
  DASH_SULAWESI: ENGINE_PREFIX + 'Dashboard Sulawesi',
  SUMMARY_SUL: ENGINE_PREFIX + 'Summary Sul',
  SUMMARY_KAL: ENGINE_PREFIX + 'Summary Kal',
  DASH_SUL_MONTHLY: ENGINE_PREFIX + 'Dashboard SUL Monthly'
};

/** Sheet RAW yang boleh diedit user/API (source of truth) */
var RAW_WRITABLE = {};
RAW_WRITABLE[SHEETS.SITE_SUL] = true;
RAW_WRITABLE[SHEETS.SITE_KAL] = true;
RAW_WRITABLE[SHEETS.SITE_PLN] = true;
RAW_WRITABLE[SHEETS.INBOUND] = true;
RAW_WRITABLE[SHEETS.INBOUND_RETURN] = true;
RAW_WRITABLE[SHEETS.LOM] = true;

/** Header kontrak Site_KAL (94 kolom, BERBEDA dari Site_SUL — lihat DATA_MODEL.md).
 *  Hanya dipakai sebagai fallback bila sheet kosong dibuat; engine selalu
 *  membaca header LIVE dari baris 1. */
var COLUMNS_KAL = [
  'No', 'ASSIGNMENT DATE', 'WID', 'DU NAME', 'DU', 'Site ID', 'NE ID', 'Subc',
  'Site Name', 'Branch', 'Cluster', 'RTPO / Kabupaten', 'Tower Owner', 'Program',
  'Long', 'Lat', 'Address', 'Detail SOW', 'Band', 'SOW', 'Dismantle', 'CAF',
  'Nodin', 'Site Solution', 'Datafill', 'Permite Submite', 'Permite Realease',
  'Permite Expired', 'Simple Data Preparation (%)', 'Delivery Order 1',
  'Delivery Order 2', 'Delivery Order 3', 'Delivery Note 1', 'Delivery Note 2',
  'Delivery Note 3', 'Material On Site', 'LDM', 'Delivery Return', 'Return Note',
  'Validation', 'Remaks', 'Simple Data Preparation (%)', 'TI Partner',
  'Team On Site', 'Clock in Date', 'MOS', 'HI Start', 'HI Done', 'HI Progress',
  'CI', 'CI Status', 'Connected Broadcast', 'Connected Date', 'Connected Status',
  'GAP Analysis', 'Blocking Issue', 'SM Status', 'SM Kitting, PTW & EHS',
  'SM Dismantle', 'SM ATP Status', 'SM ATP', 'FI Ineom', 'FI Ineom Status',
  'ATP IEPMS', 'Dismantle', 'Alarm Status', 'DEPEDENCY', 'DETAIL DEPEDENCY',
  'Clock out Date', 'Implementation Duration', 'Task Progress', 'Task Tamplate',
  'Remarks', 'Simple Closing (%)', 'Date Submit ATP', 'eATP STATUS',
  'eATP BLOCKING', 'SYSTEM UPLOAD', 'APPROVAL DATE', 'Simple Closing (%)',
  'BAPA', 'BASO', 'BAUT/BAST', 'BARA', 'REMARK', 'Simple Closing (%)',
  'STATUS', 'DATE', 'HISTORY', 'GAP', 'gap remark', 'PO Status', 'PO Number',
  'PO Release Date'
];

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
  'Years Assigned', 'WID Recti', 'Remark', 'Type Antenna BOQ', 'Qty BOQ Antenna',
  'Mounting Bracket', 'RRU Type', 'Qty RRU', 'Cabinet', 'BBU', 'CCE1B', 'CCF0',
  'BPN2', 'BPQ2', 'GPS', 'PM5', 'DCPD7', 'DCPD10', 'CR0', 'optic', 'Filter',
  'Dismentle Antenna BOQ', 'Qty Antenna', 'Mounting Bracker', 'Dismentel Filter',
  'Qty Filter', 'Dismentle RRU', 'Qty RRU', 'Dismentle Board', 'TP', 'Status Permit',
  'Permit Release', 'Permit Ineom', 'DOID', 'PIC Muver', 'PIC TI', 'TI Engineer',
  'Site Productivity Status', 'Addcost Productivity Status', 'Add Cost Amount',
  'Add Cost Description', 'Total PO Amt (IDR) No Tax', 'MOS', 'MOS Info', 'HI Start',
  'HI Done', 'HI Info', 'HI Progress', 'Installation Start', 'Installation Finished',
  'Connected Date', 'Connected Info', 'GAP Analysis', 'Blocking Issues', 'SM Status',
  'SM Kitting, PTW & EHS', 'SM Dismantle', 'SM ATP', 'ATP Passed', 'FI Ineom',
  'Ineom Passed', 'Asset Ineom', 'Ineom Dismentel', 'Blocking SM & Ineom',
  'Status Dismentle', 'Dismantle Date', 'Status Material', 'DR & LDM Status',
  'Date Inbond', 'DRID', 'PIC Mover', 'Remark INBOUND', 'Date Upload', 'Blocking BARA',
  'eATP Submit Date', 'eATP Approve TSEL Date', 'eATP Status', 'PO Status', 'PO Number',
  'PO Release Date', 'BAUT Approved by Tsel', 'BAUT Status', 'BAST SAP Status',
  'YPMS Status', 'inv status', 'BOQ Source'
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

    // ---------- AUTHORIZATION (spec V2 §19) ----------
    // Endpoint tulis WAJIB token dengan role cukup; READ tetap publik.
    var minRole = WRITE_ACTIONS[action] || null;
    if (minRole && action.indexOf('pivot-') === 0 && isPivotMigrated_()) {
      appendAuditLog_('SYSTEM', 'pivot-write-blocked', action + ' (migrasi aktif)', false);
      return jsonOutput_(err_('Pivot adalah DERIVED (migrasi selesai): input manual dinonaktifkan. Perubahan hanya melalui RAW -> engine.'));
    }
    var actorRole = null;
    if (minRole) {
      var authReq = {};
      var k;
      for (k in params) authReq[k] = params[k];
      for (k in (body || {})) authReq[k] = body[k];
      actorRole = resolveRole_(authReq);
      requireRole_(minRole, actorRole, action);
    }

    var result;

    switch (action) {
      // ---------- HEALTH ----------
      // FIX (audit K2): sebelumnya ada dua blok "health" — blok kedua tak terjangkau.
      // 'health' = ringan (service up). 'workbook-health' = pindai penuh (berat).
      case 'health':
      case 'api/health':
        result = ok_(getHealthLight_(), 'Service berjalan normal');
        break;
      case 'workbook-health':
        result = ok_(getWorkbookHealth(), 'Workbook health status');
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
        assertNotEngineSheet_(body.sheet);
        result = ok_({ rowIndex: addPivotRow_(validPivotSheet_(body.sheet), body.data || {}) }, 'Data berhasil ditambahkan');
        break;
      case 'pivot-update':
        assertNotEngineSheet_(body.sheet);
        writeRowAt_(validPivotSheet_(body.sheet), body.rowIndex, body.data || {});
        result = ok_({}, 'Data berhasil diperbarui');
        break;
      case 'pivot-delete':
        assertNotEngineSheet_(body.sheet);
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
      // FIX (audit K1): writer formula lama DESTRUKTIF (menghapus layout
      // Dashboard_2026/Dashboard Sulawesi + menulis formula salah kolom).
      // Dinonaktifkan sesuai keputusan user; gantinya gunakan 'sync-engine'
      // yang menulis hasil agregasi ke sheet bayangan ENGINE_*.
      case 'create-formulas':
      case 'api/create-formulas':
        result = err_('Dinonaktifkan: writer formula lama terbukti merusak layout dashboard. ' +
          'Gunakan action=sync-engine (sheet ENGINE_*) — lihat PROJECT_AUDIT.md K1.');
        break;

      // ---------- FIX DASHBOARD SUL ----------
      // FIX (audit K1): fungsi lama menarget sheet salah & menghapus konten valid.
      case 'fix-dashboard-sul':
      case 'api/fix-dashboard-sul':
        result = err_('Dinonaktifkan: fixDashboardSULFormulas_ lama menimpa Dashboard Sulawesi ' +
          'dengan formula tanpa filter bulan. Rekonstruksi angka tersedia via action=sync-engine.');
        break;

      // ---------- DATA QUALITY ----------
      case 'quality':
      case 'api/quality':
        var sheetName = (body && body.sheet) ? body.sheet : 'Site_SUL';
        assertNotProtectedSheet_(sheetName); // USERS/SESSIONS/AUDIT_LOG tidak boleh diprobing
        result = ok_(getDataWithQualityStatus(sheetName), 'Data quality status for ' + sheetName);
        break;

      // ---------- ENGINE / LINEAGE (PHASE 3-5) ----------
      // Ringkasan per sheet: ?action=summary&sheet=Site_SUL&year=2026
      case 'summary':
        result = ok_(getSummary(body.sheet || params.sheet, body.year || params.year),
          'Summary ' + (body.sheet || params.sheet || ''));
        break;

      // Lineage satu metrik: ?action=lineage&metric=connected&year=2026&month=8&zone=MAKASSAR
      case 'lineage':
        result = ok_(getMetricLineage(body.metric || params.metric,
          body.year || params.year, body.month || params.month,
          body.zone || params.zone), 'Lineage metrik');
        break;

      // Rekonsiliasi MANUAL vs ENGINE (parallel run): ?action=compare[&year=2026]
      case 'compare':
        result = ok_(getManualVsEngineCompare_(body.year || params.year),
          'Perbandingan manual vs engine');
        break;

      // Telusuri WID penyusun metrik (investigasi delta):
      // ?action=metric-wids&source=sul&metric=mos&year=2026&month=8[&zone=MAKASSAR]
      // Drill kohort: &assignFrom=2026-01&assignTo=2026-08
      case 'metric-wids':
        result = ok_(collectMetricWids_(
          body.source || params.source || 'sul',
          body.metric || params.metric,
          body.year || params.year,
          body.month || params.month,
          body.zone || params.zone,
          body.assignFrom || params.assignFrom,
          body.assignTo || params.assignTo), 'WID penyusun metrik');
        break;

      // Diagnostik timing pembacaan: ?action=diag-read&sheet=Site_SUL
      case 'diag-read':
        var drName = body.sheet || params.sheet || 'Site_SUL';
        assertNotProtectedSheet_(drName); // name probing ke sheet auth dilarang
        result = ok_(diagRead_(drName), 'Diagnostik pembacaan ' + drName);
        break;

      // Snapshot kontrak header semua RAW sheet (anti-drift, DATA_MODEL.md §8)
      case 'schema':
        result = ok_(getHeaderSchemaAll_(), 'Header schema snapshot');
        break;

      // Final migration gate — mengunci Pivot/Summary/Dashboard agar READ ONLY
      // HANYA ADMIN (bootstrap: jika belum ada ADMIN token, izinkan sekali)
      case 'enable-pivot-lock':
        (function () {
          var admTok = PropertiesService.getScriptProperties().getProperty('YPTT_TOKEN_ADMIN');
          if (admTok) {
            var r = resolveRole_(Object.assign({}, params, body || {}));
            requireRole_('ADMIN', r, 'enable-pivot-lock');
          }
        })();
        result = ok_({ locked: true, message: enablePivotLock() }, 'Pivot lock enabled — derived authority aktif');
        break;

      // Jalankan calculation engine -> tulis sheet ENGINE_* (aman, tak menyentuh manual)
      case 'sync-engine':
        result = runEngineSync_();
        break;

      // Verifikasi token/role: ?action=auth-status (token dikirim via body)
      case 'auth-status':
        result = ok_(whoami_(body || params), 'Status otorisasi');
        break;

      // ---------- ACCOUNT AUTH (Phase 1, dormant: YPTT_AUTH_USERS='0') ----------
      // Kredensial HANYA diterima dari POST body (bukan query string).
      case 'auth-login':
        result = authLogin_(body);
        break;
      case 'auth-logout':
        result = authLogout_(body || {});
        break;

      // ---------- SINKRONISASI MANUAL ----------
      // FIX (audit K5): action 'sync' lama MENIMPA sheet input manual.
      // Sekarang dialihkan ke jalur aman yang sama dengan 'sync-engine'.
      case 'sync':
        result = runEngineSync_();
        break;

      default:
        result = err_('Endpoint tidak dikenal: ' + action);
    }

    // Audit log semua operasi tulis (siapa, apa, hasil)
    if (minRole) {
      appendAuditLog_(actorRole || 'UNKNOWN', action,
        JSON.stringify({ rowIndex: body ? body.rowIndex : undefined }), true);
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
    // FIX (audit M3): Site_KAL punya kontrak header sendiri, bukan COLUMNS Site_SUL
    var headers = null;
    if (name === SHEETS.SITE_SUL) headers = COLUMNS;
    else if (name === SHEETS.SITE_KAL) headers = COLUMNS_KAL;
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
 * PERF FIX (v3.0.3): workbook import Excel bisa melaporkan lastColumn
 * puluhan ribu & lastRow patologis. Header di-cap 2000 kolom; baris nyata
 * dicari bottom-up per jendela (lihat boundedLastRow_).
 */
function readSheetObjects_(sheetName) {
  var sheet = getSheet_(sheetName);
  if (sheet.getLastRow() < 1) return [];

  var HEADER_CAP = 2000;
  var headSpan = Math.min(sheet.getLastColumn(), HEADER_CAP);
  var rawHeaders = sheet.getRange(1, 1, 1, headSpan).getValues()[0];
  var headersAll = rawHeaders.map(function (h) { return String(h).trim(); });
  var eff = headersAll.length;
  while (eff > 0 && !headersAll[eff - 1]) eff--;
  if (eff === 0) return [];
  var headers = headersAll.slice(0, eff);

  // Batas bawah baris nyata (hindari phantom rows)
  var lastRow = Math.min(sheet.getLastRow(), boundedLastRow_(sheet, headersAll));

  var values = sheet.getRange(1, 1, lastRow, eff).getValues();

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

/**
 * Cari baris data terakhir yang NYATA — BOTTOM-UP PER JENDELA (v3.0.3).
 * v3.0.2 membaca kolom anchor setinggi getLastRow() penuh; jika getLastRow()
 * patologis (jutaan baris formatting), pemindaian itu sendiri yang lambat.
 * Sekarang: jendela awal 4.000 baris dari bawah, melebar 4x maks 3 kali.
 */
function boundedLastRow_(sheet, headersAll) {
  var wanted = ['no', 'no.', 'wid', 'site name impl', 'site name', 'zte zone', 'branch'];
  var anchors = [];
  var seen = {};
  for (var w = 0; w < wanted.length; w++) {
    for (var i = 0; i < headersAll.length && i < 2000; i++) {
      var nk = normHeader_(headersAll[i]);
      if (nk && nk === normHeader_(wanted[w]) && !seen[nk]) {
        anchors.push(i + 1);
        seen[nk] = true;
        break;
      }
    }
  }
  var totalRows = sheet.getLastRow();
  if (!anchors.length || totalRows <= 1) return totalRows;

  var win = 4000;
  for (var attempt = 0; attempt < 4; attempt++) {
    if (win > totalRows && attempt > 0) break;
    var startRow = Math.max(1, totalRows - win + 1);
    var span = Math.min(win, totalRows - startRow + 1);
    for (var a = 0; a < anchors.length; a++) {
      var colVals = sheet.getRange(startRow, anchors[a], span, 1).getValues();
      for (var r = colVals.length - 1; r >= 0; r--) {
        if (toStr_(colVals[r][0]) !== '') {
          return startRow + r; // posisi absolut
        }
      }
    }
    win *= 4; // tidak ketemu -> perlebar jendela
  }
  return totalRows; // fallback aman
}

/**
 * Diagnostik timing pembacaan satu sheet (READ-only) — untuk memastikan
 * bottleneck nyata bila performa masih lambat.
 * ?action=diag-read&sheet=Site_SUL
 */
function diagRead_(sheetName) {
  var out = { sheet: sheetName };
  var t0 = Date.now();
  var sheet = getSheet_(sheetName);
  out.lastRowMeta = sheet.getLastRow();
  out.lastColMeta = sheet.getLastColumn();
  out.maxRowsGrid = sheet.getMaxRows();
  out.maxColsGrid = sheet.getMaxColumns();
  out.msMeta = Date.now() - t0;

  var t = Date.now();
  var span = Math.min(out.lastColMeta, 2000);
  var headFull = sheet.getRange(1, 1, 1, span).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  out.msHeaderRead = Date.now() - t;
  out.headerSpan = span;

  var eff = headFull.length;
  while (eff > 0 && !headFull[eff - 1]) eff--;
  out.effWidth = eff;

  t = Date.now();
  out.boundedLastRow = boundedLastRow_(sheet, headFull);
  out.msAnchorWindowed = Date.now() - t;

  var probeRows = Math.max(1, Math.min(out.boundedLastRow, out.lastRowMeta));
  t = Date.now();
  sheet.getRange(1, 1, probeRows, eff).getDisplayValues();
  out.msMainRead = Date.now() - t;
  out.mainCellsProbed = probeRows * eff;
  out.totalMs = Date.now() - t0;
  return out;
}

/** Bersihkan nilai sel: Date -> ISO date string, kosong -> '' */
function cleanCell_(val) {
  if (val === null || val === undefined) return '';
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return val;
}

/** Normalisasi ke string ter-trim; null/undefined -> '' */
function toStr_(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function num_(val) {
  var n = parseFloat(String(val == null ? '' : val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
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
// Alias baca sheet ENGINE (hasil calculation engine) — dipakai resolver frontend.
(function () {
  ['Pvt Dash Sul', 'Pivot Kal', 'Dashboard Sulawesi'].forEach(function (n) {
    PIVOT_HEADERS[ENGINE_PREFIX + n] = PIVOT_HEADERS[n];
  });
})();

function validPivotSheet_(name) {
  assertNotProtectedSheet_(name); // USERS*/SESSIONS*/AUDIT_LOG* tidak lewat jalur apa pun
  if (!name || !PIVOT_HEADERS[name]) {
    throw new Error('Sheet pivot tidak dikenal: ' + name +
      '. Yang diizinkan: ' + Object.keys(PIVOT_HEADERS).join(', '));
  }
  return name;
}

/** Sheet ENGINE adalah output engine — TIDAK BOLEH ditulis manual via API, kapan pun. */
function assertNotEngineSheet_(name) {
  if (name && String(name).indexOf(ENGINE_PREFIX) === 0) {
    throw new Error('Sheet "' + name + '" adalah output ENGINE: tidak dapat diubah manual. Perubahan hanya melalui RAW -> engine.');
  }
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
  var v = validateRowData_(SHEETS.SITE_SUL, data, 'add');
  if (!v.ok) throw new Error('Validasi gagal: ' + v.errors.join('; '));
  var sheet = getSheet_(SHEETS.SITE_SUL);
  ensureHeaders_(sheet);
  var row = buildRowForSheet_(sheet, data, null);
  sheet.appendRow(row);
  var idx = sheet.getLastRow();
  onRawDataChanged_(SHEETS.SITE_SUL);
  return idx;
}

function updateSiteSUL(rowIndex, data) {
  var v = validateRowData_(SHEETS.SITE_SUL, data, 'update');
  if (!v.ok) throw new Error('Validasi gagal: ' + v.errors.join('; '));
  writeRowAt_(SHEETS.SITE_SUL, rowIndex, data);
  onRawDataChanged_(SHEETS.SITE_SUL);
  return true;
}

function deleteSiteSUL(rowIndex) {
  deleteRowAt_(SHEETS.SITE_SUL, rowIndex);
  onRawDataChanged_(SHEETS.SITE_SUL);
  return true;
}

/* ============================================================
 * CRUD - Site_KAL
 * ============================================================ */

function getSiteKAL() {
  return readSheetObjects_(SHEETS.SITE_KAL);
}

function addSiteKAL(data) {
  var v = validateRowData_(SHEETS.SITE_KAL, data, 'add');
  if (!v.ok) throw new Error('Validasi gagal: ' + v.errors.join('; '));
  var sheet = getSheet_(SHEETS.SITE_KAL);
  ensureHeadersKAL_(sheet);
  var row = buildRowForSheet_(sheet, data, null);
  sheet.appendRow(row);
  var idx = sheet.getLastRow();
  onRawDataChanged_(SHEETS.SITE_KAL);
  return idx;
}

function updateSiteKAL(rowIndex, data) {
  var v = validateRowData_(SHEETS.SITE_KAL, data, 'update');
  if (!v.ok) throw new Error('Validasi gagal: ' + v.errors.join('; '));
  writeRowAt_(SHEETS.SITE_KAL, rowIndex, data);
  onRawDataChanged_(SHEETS.SITE_KAL);
  return true;
}

function deleteSiteKAL(rowIndex) {
  deleteRowAt_(SHEETS.SITE_KAL, rowIndex);
  onRawDataChanged_(SHEETS.SITE_KAL);
  return true;
}

/* ============================================================
 * CRUD - Site_Upgrade PLN
 * ============================================================ */

function getSitePLN() {
  return readSheetObjects_(SHEETS.SITE_PLN);
}

function addSitePLN(data) {
  var v = validateRowData_(SHEETS.SITE_PLN, data, 'add');
  if (!v.ok) throw new Error('Validasi gagal: ' + v.errors.join('; '));
  var sheet = getSheet_(SHEETS.SITE_PLN);
  ensureHeadersPLN_(sheet);
  var row = buildRowForSheet_(sheet, data, null);
  sheet.appendRow(row);
  var idx = sheet.getLastRow();
  onRawDataChanged_(SHEETS.SITE_PLN);
  return idx;
}

function updateSitePLN(rowIndex, data) {
  var v = validateRowData_(SHEETS.SITE_PLN, data, 'update');
  if (!v.ok) throw new Error('Validasi gagal: ' + v.errors.join('; '));
  writeRowAt_(SHEETS.SITE_PLN, rowIndex, data);
  onRawDataChanged_(SHEETS.SITE_PLN);
  return true;
}

function deleteSitePLN(rowIndex) {
  deleteRowAt_(SHEETS.SITE_PLN, rowIndex);
  onRawDataChanged_(SHEETS.SITE_PLN);
  return true;
}

/** Fallback header Site_KAL (bukan COLUMNS Site_SUL — fix audit M3) */
function ensureHeadersKAL_(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, Math.min(COLUMNS_KAL.length, 60)).getValues()[0];
  var empty = firstRow.every(function (c) { return c === ''; });
  if (empty) {
    sheet.getRange(1, 1, 1, COLUMNS_KAL.length).setValues([COLUMNS_KAL]).setFontWeight('bold');
  }
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
 * CALCULATION ENGINE (terpusat — satu definisi business logic)
 * RAW DATA -> ENGINE -> DERIVED -> API -> WEBSITE/AI
 * Semua KPI dihitung dari sini. Dashboard TIDAK menjadi sumber KPI.
 * ============================================================ */

var MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
var MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
var ZONES_SUL = ['MAKASSAR', 'MANADO', 'TERNATE'];

/* ---------- Semantic Status Engine (spec V2 §5) ----------
 * TIDAK ADA lagi "non-empty = DONE". State diklasifikasi dari kamus
 * yang bisa dikonfigurasi lewat Script Property YPTT_STATUS_RULES (JSON).
 *
 * PERF HOTFIX (v3.0.4): rules DI-MEMOIZE 5 menit per eksekusi.
 * Sebelumnya getStatusRules_ memanggil PropertiesService SETIAP
 * classifyStatus_ (ribuan kali/request) -> kpi/dashboard/engine TIMEOUT.
 */
var STATUS_STATES = ['DONE', 'IN_PROGRESS', 'NOT_STARTED', 'BLOCKED', 'NOT_APPLICABLE', 'UNKNOWN'];

var _STATUS_RULES_CACHE = null;
var _STATUS_RULES_TS = 0;

function getStatusRules_() {
  var now = Date.now();
  if (_STATUS_RULES_CACHE && (now - _STATUS_RULES_TS) < 300000) return _STATUS_RULES_CACHE;
  var defaults = {
    DONE: ['passed', 'passed ', 'done', 'done tagging', 'approved', 'released'],
    IN_PROGRESS: ['progress', 'in progress', 'ongoing', 'on progress', 'process'],
    NOT_STARTED: ['work not start', 'not started', 'work not started', 'pending', 'ny', 'ny sm', 'belum', 'open'],
    BLOCKED: ['blocked', 'blocking', 'expired need extend'],
    NOT_APPLICABLE: ['no need', '-', 'n/a', 'na', 'none', 'nil']
  };
  var custom = PropertiesService.getScriptProperties().getProperty('YPTT_STATUS_RULES');
  if (custom) {
    try {
      var parsed = JSON.parse(custom);
      if (parsed && typeof parsed === 'object') _STATUS_RULES_CACHE = parsed;
    } catch (ignored) {}
  }
  if (!_STATUS_RULES_CACHE) _STATUS_RULES_CACHE = defaults;
  _STATUS_RULES_TS = now;
  return _STATUS_RULES_CACHE;
}

/** Normalisasi nilai status: trim, lower, collapse spasi, buang prefix nomor ("01-Passed" -> "passed") */
function normStatus_(v) {
  var s = toStr_(v).toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = s.replace(/^\d+\s*[-.]?\s*/, ''); // "01-Passed" -> "passed", "08-eATP..." -> "eatp..."
  return s;
}

/**
 * Klasifikasikan nilai sel status menjadi state semantik.
 * Return '' untuk sel kosong (bukan state — artinya belum ada info).
 */
function classifyStatus_(v) {
  var raw = toStr_(v);
  if (!raw) return '';
  var s = normStatus_(raw);
  var rules = getStatusRules_();
  for (var i = 0; i < STATUS_STATES.length; i++) {
    var st = STATUS_STATES[i];
    var list = rules[st] || [];
    if (list.indexOf(s) !== -1 || list.indexOf(raw.toLowerCase().replace(/\s+/g, ' ').trim()) !== -1) {
      return st;
    }
  }
  return 'UNKNOWN';
}

/* ---------- Header mapping (spec V2 §6) ----------
 * HEADER ADALAH KONTRAK. Tidak ada huruf kolom sebagai business contract.
 */
function normHeader_(h) {
  return String(h === undefined || h === null ? '' : h).replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Snapshot header sebuah sheet: [{letter:'B', col:2, name:'WID'}...] + index pencarian.
 * Dipakai getColumnIndexByHeader_ dan endpoint schema (anti-drift, DATA_MODEL.md §8).
 */
function getHeaderSnapshot_(sheetName, force) {
  var cache = CacheService.getScriptCache();
  var key = 'hdr_' + normHeader_(sheetName).replace(/[^A-Z0-9]/g, '');
  if (!force) {
    var hit = cache.get(key);
    if (hit) { try { return JSON.parse(hit); } catch (ignored) {} }
  }
  var sheet = getSheet_(sheetName);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var raw = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var columns = [];
  var index = {};
  for (var c = 0; c < raw.length; c++) {
    var name = String(raw[c]).replace(/\s+/g, ' ').trim();
    if (!name) continue;
    var entry = { letter: columnToLetter_(c + 1), col: c + 1, name: name };
    columns.push(entry);
    var nk = normHeader_(name);
    if (!index[nk]) index[nk] = [];
    index[nk].push(c + 1);
  }
  var snap = { sheet: sheetName, capturedAt: new Date().toISOString(), columns: columns, index: index };
  try { cache.put(key, JSON.stringify(snap), 21600); } catch (ignored) {}
  return snap;
}

function columnToLetter_(col) {
  var s = '';
  while (col > 0) {
    var m = (col - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

/**
 * Resolve indeks kolom berdasarkan NAMA HEADER (occurrence ke-n, default pertama).
 * Mengatasi header duplikat (mis. "Qty RRU" x2 pada Site_SUL).
 */
function getColumnIndexByHeader_(sheetOrName, headerName, occurrence) {
  var snap = getHeaderSnapshot_(typeof sheetOrName === 'string' ? sheetOrName : sheetOrName.getName());
  var hits = snap.index[normHeader_(headerName)] || [];
  if (!hits.length) throw new Error('Header tidak ditemukan: "' + headerName + '" pada sheet ' + snap.sheet);
  var i = Math.min(Math.max(occurrence || 1, 1), hits.length) - 1;
  return hits[i];
}

/** Ambil nilai field pertama yang ada dari daftar kandidat header (untuk row-object) */
function pickField_(rowObj, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    if (Object.prototype.hasOwnProperty.call(rowObj, candidates[i])) return rowObj[candidates[i]];
  }
  return undefined;
}

/* ---------- Kontrak field per tracker (header-name based) ---------- */
var FIELDS_SUL = {
  zone: ['ZTE ZONE'],
  wid: 'WID',
  assignment: ['Monthly Assignment', 'Monthly Target'],
  MOS: ['MOS'], HI_DONE: ['HI Done'], CONNECTED: ['Connected Date'],
  SM_ATP: ['SM ATP'], ATP_PASSED: ['ATP Passed'],
  FI_INEOM: ['FI Ineom'], INEOM_PASSED: ['Ineom Passed'],
  SM_KITTING: ['SM Kitting, PTW & EHS'], SM_DISMANTLE: ['SM Dismantle'],
  INBOUND_DONE: ['Remark INBOUND'], EATP: ['eATP Status'], BAUT: ['BAUT Status']
};
var FIELDS_KAL = {
  zone: ['Branch', 'Cluster'],
  wid: 'WID',
  assignment: ['ASSIGNMENT DATE'],
  MOS: ['MOS'], HI_DONE: ['HI Done'], CONNECTED: ['Connected Date'],
  SM_ATP: ['SM ATP'], ATP_PASSED: ['ATP IEPMS'],
  FI_INEOM: ['FI Ineom'], INEOM_PASSED: ['FI Ineom Status'],
  SM_KITTING: ['SM Kitting, PTW & EHS'], SM_DISMANTLE: ['SM Dismantle'],
  INBOUND_DONE: [], EATP: ['eATP STATUS'], BAUT: ['BAUT/BAST']
};

/* ---------- Definisi metrik (SATU sumber definisi — spec V2 §14) ----------
 * type 'date'   : milestone tercapai bila field memuat tanggal valid;
 *                 filter periode memakai RENTANG TANGGAL eksplisit (>= awal bulan, < awal bulan depan).
 *                 timeBasis = EVENT_DATE (periodApplied=true bila ada filter periode).
 * type 'status' : milestone tercapai bila classifyStatus_ == DONE.
 * type 'suffix' : done bila nilai dinormalisasi berakhiran suffix.
 *                 timeBasis = SNAPSHOT_STATUS -> nilai adalah snapshot saat ini;
 *                 FILTER BULAN/TAHUN TIDAK DITERAPKAN (periodApplied=false).
 */
var METRIC_DEFS = {
  assignment:    { label: 'Assignment',   type: 'date',   field: 'assignment', timeBasis: 'EVENT_DATE' },
  mos:           { label: 'MOS Done',     type: 'date',   field: 'MOS', timeBasis: 'EVENT_DATE' },
  hi_done:       { label: 'HI Done',      type: 'date',   field: 'HI_DONE', timeBasis: 'EVENT_DATE' },
  connected:     { label: 'Connected',    type: 'date',   field: 'CONNECTED', timeBasis: 'EVENT_DATE' },
  sm_atp:        { label: 'SM ATP',       type: 'status', field: 'SM_ATP', timeBasis: 'SNAPSHOT_STATUS' },
  atp_passed:    { label: 'ATP Passed',   type: 'status', field: 'ATP_PASSED', timeBasis: 'SNAPSHOT_STATUS' },
  fi_ineom:      { label: 'FI INEOM',     type: 'status', field: 'FI_INEOM', extraDone: ['done tagging'], timeBasis: 'SNAPSHOT_STATUS' },
  ineom_passed:  { label: 'Ineom Passed', type: 'status', field: 'INEOM_PASSED', timeBasis: 'SNAPSHOT_STATUS' },
  sm_kitting:    { label: 'SM Kitting',   type: 'status', field: 'SM_KITTING', timeBasis: 'SNAPSHOT_STATUS' },
  sm_dismantle:  { label: 'SM Dismantle', type: 'status', field: 'SM_DISMANTLE', timeBasis: 'SNAPSHOT_STATUS' },
  inbound_done:  { label: 'Inbound Done', type: 'status', field: 'INBOUND_DONE', extraDone: ['inbound'], timeBasis: 'SNAPSHOT_STATUS' },
  eatp_done:     { label: 'eATP Done',    type: 'suffix', field: 'EATP', suffix: 'eatp approved tsel', timeBasis: 'SNAPSHOT_STATUS' },
  baut_done:     { label: 'BAUT Done',    type: 'status', field: 'BAUT', timeBasis: 'SNAPSHOT_STATUS' }
};

/* ---------- Util tanggal (rentang eksplisit — spec V2 §7) ---------- */
/** Parse longgar: Date | serial Excel | ISO | dd/mm/yyyy | teks lain. null jika bukan tanggal. */
function parseDateLoose_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    if (v > 20000 && v < 60000) return new Date(Math.round((v - 25569) * 86400 * 1000)); // serial Excel
    return null;
  }
  var s = String(v).trim();
  if (/^#/.test(s)) return null; // error value
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Rentang [start, end) satu bulan kalender — filter bulanan EKSPLISIT */
function monthRange_(year, month1based) {
  var start = new Date(year, month1based - 1, 1);
  var end = new Date(year, month1based, 1);
  return { start: start.getTime(), end: end.getTime() };
}

function dateInRange_(d, rng) {
  if (!d || !rng) return true; // tanpa filter rentang = semua
  var t = d.getTime();
  return t >= rng.start && t < rng.end;
}

/** Cocokkan nama bulan dalam teks bebas -> index 0-11 atau -1 */
function matchMonth_(text) {
  var s = toStr_(text).toUpperCase();
  if (!s) return -1;
  for (var i = 0; i < MONTH_NAMES.length; i++) {
    if (s.indexOf(MONTH_NAMES[i]) !== -1) return i;
  }
  for (var j = 0; j < MONTH_EN.length; j++) {
    if (s.indexOf(MONTH_EN[j]) !== -1) return j;
  }
  var mNum = s.match(/(\d{4})[-\/ ]?(\d{1,2})/);
  if (mNum) {
    var mi = parseInt(mNum[2], 10) - 1;
    return (mi >= 0 && mi <= 11) ? mi : -1;
  }
  return -1;
}

function zoneColName_(rows) {
  if (!rows || !rows.length) return 'ZTE ZONE';
  var keys = Object.keys(rows[0]);
  var candidates = ['ZTE ZONE', 'Zona', 'Branch', 'Cluster', 'Region', 'Area'];
  for (var i = 0; i < candidates.length; i++) {
    if (keys.indexOf(candidates[i]) !== -1) return candidates[i];
  }
  return 'ZTE ZONE';
}

function normalizeZone_(zone, validZones) {
  var u = toStr_(zone).toUpperCase();
  return validZones.indexOf(u) !== -1 ? u : (u || null);
}

/* ---------- Data Versioning (spec V2 §21) ----------
 * PERF (v3.0.4): versi di-memoize per eksekusi; bump memperbarui memo
 * sehingga request berikutnya tetap konsisten tanpa akses Properties berulang.
 */
var _DATA_VERSION_CACHE = null;

function getDataVersion_() {
  if (_DATA_VERSION_CACHE !== null) return _DATA_VERSION_CACHE;
  var v = PropertiesService.getScriptProperties().getProperty('YPTT_DATA_VERSION');
  _DATA_VERSION_CACHE = v ? parseInt(v, 10) : 1;
  return _DATA_VERSION_CACHE;
}
function bumpDataVersion_(reason) {
  var props = PropertiesService.getScriptProperties();
  var v = getDataVersion_() + 1;
  props.setProperty('YPTT_DATA_VERSION', String(v));
  props.setProperty('YPTT_DATA_VERSION_AT', new Date().toISOString());
  if (reason) props.setProperty('YPTT_DATA_VERSION_REASON', String(reason));
  _DATA_VERSION_CACHE = v; // sinkronkan memo
  try { CacheService.getScriptCache().put('yptt_version', String(v), 21600); } catch (ignored) {}
  return v;
}

/* ---------- Authorization & Audit Log (spec V2 §19) ---------- */
var ROLE_RANK = { ANONYMOUS: 0, VIEWER: 1, OPERATOR: 2, ADMIN: 3 };

/** Token dibaca dari Script Properties: YPTT_TOKEN_ADMIN / _OPERATOR / _VIEWER.
 *  Phase 1: setelah cek statis, fallback session lookup (YPTT_AUTH_USERS='1').
 *  Flag '0' (default) => perilaku identik dengan versi sebelumnya. */
function resolveRole_(req) {
  var token = '';
  if (req && req.token) token = String(req.token);
  else if (req && req.authToken) token = String(req.authToken);
  if (!token) return 'ANONYMOUS';
  var props = PropertiesService.getScriptProperties();
  if (token === props.getProperty('YPTT_TOKEN_ADMIN')) return 'ADMIN';
  if (token === props.getProperty('YPTT_TOKEN_OPERATOR')) return 'OPERATOR';
  if (token === props.getProperty('YPTT_TOKEN_VIEWER')) return 'VIEWER';
  // --- PHASE 1 SEAM: account session (dormant bila flag off) ---
  var sessionRole = resolveSessionRole_(token);
  if (sessionRole) return sessionRole;
  return 'INVALID';
}

function requireRole_(minRole, role, actionName) {
  if ((ROLE_RANK[role] || 0) < (ROLE_RANK[minRole] || 0)) {
    throw new Error('Akses ditolak untuk action "' + actionName + '": butuh role ' + minRole +
      ', role Anda: ' + role + '. Berikan token melalui field "token".');
  }
}

function appendAuditLog_(role, action, detail, ok) {
  try {
    var ss = getSS_();
    var sh = ss.getSheetByName('AUDIT_LOG');
    if (!sh) {
      sh = ss.insertSheet('AUDIT_LOG');
      sh.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Role', 'Action', 'Detail', 'Result', 'ExecId']])
        .setFontWeight('bold');
    }
    sh.appendRow([new Date(), role, action,
      typeof detail === 'string' ? detail.substring(0, 450) : JSON.stringify(detail).substring(0, 450),
      ok === false ? 'DENIED/FAIL' : 'OK', Utilities.getUuid().substring(0, 8)]);
  } catch (ignored) { /* audit tidak boleh mematikan operasi utama */ }
}

/** Endpoint ringan: verifikasi token -> role */
function whoami_(req) {
  var role = resolveRole_(req || {});
  var out = {
    role: role,
    authenticated: role === 'VIEWER' || role === 'OPERATOR' || role === 'ADMIN',
    canWriteRaw: (ROLE_RANK[role] || 0) >= ROLE_RANK.OPERATOR,
    canAdmin: role === 'ADMIN',
    backendVersion: BACKEND_VERSION,
    dataVersion: getDataVersion_()
  };
  // auth-status: tambahkan username + expiresAt HANYA bila sesi terautentikasi.
  // Token statis (ADMIN/OPERATOR/VIEWER) tidak memilikinya.
  if (authUsersEnabled_() && req && req.token) {
    var id = lookupSessionIdentity_(String(req.token));
    if (id) { out.username = id.username; out.expiresAt = id.expiresAt; }
  }
  return out;
}

/** Peta action tulis -> role minimum (endpoint READ tetap publik utk monitoring) */
var WRITE_ACTIONS = {};
(function () {
  var opActions = [
    'add-site-sul', 'update-site-sul', 'delete-site-sul',
    'add-site-kal', 'update-site-kal', 'delete-site-kal',
    'add-site-pln', 'update-site-pln', 'delete-site-pln',
    // SIFAT SEMENTARA (parallel run, keputusan user 25 Agu): pivot masih
    // layer input manual. GATE di bawah menguncinya saat hari migrasi tiba.
    'pivot-add', 'pivot-update', 'pivot-delete'
  ];
  opActions.forEach(function (a) { WRITE_ACTIONS[a] = 'OPERATOR'; });
  ['sync-engine'].forEach(function (a) { WRITE_ACTIONS[a] = 'ADMIN'; });
})();

/* ============================================================
 * ACCOUNT-BASED AUTHENTICATION — PHASE 1 (DORMANT)
 * ------------------------------------------------------------
 * Kill switch : YPTT_AUTH_USERS ('0' default / '1' aktif)
 *   '0' => seluruh fitur di bawah TIDAK AKTIF. Perilaku autentikasi
 *          produksi byte-equivalent dengan static-token behavior.
 *   '1' => session lookup aktif sebagai fallback SETELAH cek token statis.
 *
 * PASSWORD KDF (BUKAN PBKDF2 — iterated SHA-256, algoritma eksplisit):
 *   salt      : 16 byte acak -> 32 karakter hex lowercase
 *   h0        = SHA256( UTF8(salt_hex + ':' + password) ) -> hex lowercase
 *   h(i)      = SHA256( UTF8( hex(h(i-1)) ) )            untuk i = 1..N-1
 *   stored    = "iter-sha256$<N>$<salt_hex>$<h(N-1)_hex>"
 *   N default : 12000 (konstanta AUTH_ITERATIONS)
 *   Verifikasi mengulang ranting yang sama lalu membandingkan hex
 *   secara constant-time (XOR akumulatif).
 *
 * SESSION:
 *   SESSIONS.SessionId = Utilities.getUuid()
 *   TTL 8 jam; RevokedAt kosong = aktif.
 *   ROLE TIDAK disimpan sebagai authority — selalu dibaca LIVE dari
 *   USERS.Role via join Username pada saat resolusi request.
 *
 * URUTAN RESOLUSI (resolveRole_):
 *   1) token statik YPTT_TOKEN_ADMIN/_OPERATOR/_VIEWER (bootstrap, utuh)
 *   2) session -> Username -> USERS(Active=TRUE).Role
 *   3) selainnya INVALID
 *
 * LARANGAN: kredensial hanya lewat POST body; tidak pernah masuk
 * query string, console, atau AUDIT_LOG. USERS/SESSIONS/AUDIT_LOG
 * tidak dapat dibaca endpoint publik apa pun (lihat blocklist).
 * ============================================================ */

var AUTH_USERS_FLAG = 'YPTT_AUTH_USERS';
var AUTH_ITERATIONS = 12000;
var SESSION_TTL_HOURS = 8;
var LOGIN_MAX_FAILS = 5;
var LOGIN_LOCK_MINUTES = 15;
var AUTH_PROTECTED_SHEETS = ['USERS', 'SESSIONS', 'AUDIT_LOG'];
var VALID_AUTH_ROLES = ['VIEWER', 'OPERATOR', 'ADMIN'];

function authUsersEnabled_() {
  try {
    return PropertiesService.getScriptProperties()
      .getProperty(AUTH_USERS_FLAG) === '1';
  } catch (e) { return false; }
}

/** Guard nama sheet sensitif — dipakai reader/writer generik apa pun. */
function isProtectedSheetName_(name) {
  var n = String(name == null ? '' : name).trim().toUpperCase();
  for (var i = 0; i < AUTH_PROTECTED_SHEETS.length; i++) {
    if (n.indexOf(AUTH_PROTECTED_SHEETS[i]) === 0) return true; // USERS*, SESSIONS*, AUDIT_LOG*
  }
  return false;
}

function assertNotProtectedSheet_(name) {
  if (isProtectedSheetName_(name)) {
    throw new Error('Sheet "' + name + '" adalah sheet sistem auth dan tidak dapat diakses melalui endpoint.');
  }
}

/* ---------------- KDF: iter-sha256 ---------------- */

function bytesToHex_(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]; // GAS Digest = signed byte
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

function sha256Hex_(str) {
  return bytesToHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8));
}

/** Rantai iteratif sesuai spesifikasi di header seksi. */
function computeIterSha256_(saltHex, password, iterations) {
  var hex = sha256Hex_(saltHex + ':' + password); // h0
  for (var i = 1; i < iterations; i++) {
    hex = sha256Hex_(hex);
  }
  return hex;
}

function randomSaltHex_(byteLen) {
  var uuidHex = Utilities.getUuid().replace(/-/g, ''); // 32 hex / 16 byte
  while (uuidHex.length < byteLen * 2) {
    uuidHex += Utilities.getUuid().replace(/-/g, '');
  }
  return uuidHex.slice(0, byteLen * 2);
}

/** Bandingkan string hex constant-time-ish (XOR akumulatif). */
function safeHexEqual_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return diff === 0;
}

function hashPassword_(password) {
  var salt = randomSaltHex_(16);
  var hash = computeIterSha256_(salt, String(password), AUTH_ITERATIONS);
  return 'iter-sha256$' + AUTH_ITERATIONS + '$' + salt + '$' + hash;
}

function verifyPassword_(password, stored) {
  try {
    var parts = String(stored || '').split('$');
    if (parts.length !== 4 || parts[0] !== 'iter-sha256') return false;
    var iter = parseInt(parts[1], 10);
    if (!(iter > 0 && iter <= 200000)) return false;
    var computed = computeIterSha256_(parts[2], String(password), iter);
    return safeHexEqual_(computed, parts[3]);
  } catch (e) { return false; }
}

/* ---------------- Sheet helpers (lazy, toleran missing) ---------------- */

function ensureAuthSheets_() {
  var ss = getSS_();
  var defs = [
    ['USERS', ['Username', 'Email', 'PassHash', 'Role', 'Active',
               'CreatedAt', 'UpdatedAt', 'LastLoginAt', 'LockedUntil', 'Notes']],
    ['SESSIONS', ['SessionId', 'Username', 'IssuedAt', 'ExpiresAt', 'RevokedAt']]
  ];
  defs.forEach(function (d) {
    var sh = ss.getSheetByName(d[0]);
    if (!sh) {
      sh = ss.insertSheet(d[0]);
      sh.getRange(1, 1, 1, d[1].length).setValues([d[1]]).setFontWeight('bold');
      try { sh.hideSheet(); } catch (ignored) {}
      try { sh.protect().setDescription('AUTH system sheet (Phase 1)'); } catch (ignored) {}
    }
  });
}

function authReadTable_(sheetName) {
  var ss = getSS_();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
}

function isoOrNull_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var d = (v instanceof Date) ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function findUserByLogin_(login) {
  // login sudah lowercase dari pemanggil
  var rows = authReadTable_('USERS');
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var uname = String(r[0] || '').trim().toLowerCase();
    var email = String(r[1] || '').trim().toLowerCase();
    if ((uname && uname === login) || (email && email === login)) {
      return {
        rowIndex: i + 2,
        username: uname,
        email: email,
        passHash: String(r[2] || ''),
        role: String(r[3] || '').trim().toUpperCase(),
        active: (r[4] === true) || String(r[4]).trim().toUpperCase() === 'TRUE',
        createdAt: isoOrNull_(r[5]),
        lastLoginAt: isoOrNull_(r[7]),
        lockedUntil: isoOrNull_(r[8])
      };
    }
  }
  return null;
}

function getUserRoleLive_(username) {
  var u = findUserByLogin_(String(username).toLowerCase());
  if (!u || !u.active) return '';
  return (VALID_AUTH_ROLES.indexOf(u.role) !== -1) ? u.role : '';
}

/* ---------------- Sessions ---------------- */

function createSession_(username) {
  ensureAuthSheets_();
  var sh = getSS_().getSheetByName('SESSIONS');
  var token = Utilities.getUuid();
  var issued = new Date();
  var expires = new Date(issued.getTime() + SESSION_TTL_HOURS * 3600 * 1000);
  sh.appendRow([token, username, issued.toISOString(), expires.toISOString(), '']);
  return { token: token, issuedAt: issued, expiresAt: expires };
}

/** Return {username,rowIndex} sesi aktif, atau null. Expired ditandai revoked. */
function findActiveSession_(sessionToken) {
  var ss = getSS_();
  var sh = ss.getSheetByName('SESSIONS');
  if (!sh) return null;
  var rows = authReadTable_('SESSIONS');
  var now = new Date();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[0]) !== String(sessionToken)) continue;
    var revoked = isoOrNull_(r[4]);
    var expires = isoOrNull_(r[3]);
    if (revoked) return null;
    if (!expires || expires.getTime() <= now.getTime()) {
      try { sh.getRange(i + 2, 5).setValue(new Date().toISOString()); } catch (ignored) {}
      return null;
    }
    return { username: String(r[1]), rowIndex: i + 2, expiresAt: expires ? expires.toISOString() : null };
  }
  return null;
}

function revokeSession_(sessionToken) {
  var ss = getSS_();
  var sh = ss.getSheetByName('SESSIONS');
  if (!sh) return null;
  var rows = authReadTable_('SESSIONS');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(sessionToken) &&
        !isoOrNull_(rows[i][4])) {
      sh.getRange(i + 2, 5).setValue(new Date().toISOString());
      return String(rows[i][1]);
    }
  }
  return null;
}

/** SEAM TUNGGAL ke resolveRole_. '' bila flag off / tak valid / error. */
function resolveSessionRole_(sessionToken) {
  if (!authUsersEnabled_()) return '';
  try {
    var s = findActiveSession_(sessionToken);
    if (!s) return '';
    return getUserRoleLive_(s.username); // authority: USERS.Role LIVE
  } catch (e) {
    console.warn('resolveSessionRole_ gagal:', e && e.message);
    return '';
  }
}

/** Identity sesi aktif (username + expiresAt) untuk auth-status.
 *  null bila flag off / tak valid / user tidak aktif. Role TIDAK disimpan. */
function lookupSessionIdentity_(sessionToken) {
  if (!authUsersEnabled_()) return null;
  try {
    var s = findActiveSession_(sessionToken);
    if (!s) return null;
    var u = findUserByLogin_(s.username);
    if (!u || !u.active) return null;
    return { username: u.username, expiresAt: s.expiresAt };
  } catch (e) { return null; }
}

/* ---------------- Rate limit / lockout ---------------- */

function failCounterKey_(id) { return 'rl_login_' + id; }

function bumpFailCounter_(identity, userRowIndex) {
  try {
    var cache = CacheService.getScriptCache();
    var key = failCounterKey_(identity);
    var n = parseInt(cache.get(key) || '0', 10) + 1;
    cache.put(key, String(n), LOGIN_LOCK_MINUTES * 60);
    if (n >= LOGIN_MAX_FAILS && userRowIndex > 0) {
      var until = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60000);
      getSS_().getSheetByName('USERS')
        .getRange(userRowIndex, 9).setValue(until.toISOString()); // kolom LockedUntil
      cache.remove(key);
    }
  } catch (e) { console.warn('bumpFailCounter_:', e && e.message); }
}

function clearFailCounter_(identity) {
  try { CacheService.getScriptCache().remove(failCounterKey_(identity)); } catch (e) {}
}

/* ---------------- Endpoint handlers (dormant by default) ---------------- */

var AUTH_LOGIN_GENERIC_FAIL = 'Login gagal. Periksa username/email dan password.';

function authLogin_(body) {
  if (!authUsersEnabled_()) {
    return err_('Auth berbasis akun belum diaktifkan (YPTT_AUTH_USERS).');
  }
  body = body || {};
  var login = String(body.login == null ? '' : body.login).trim().toLowerCase();
  var password = String(body.password == null ? '' : body.password);
  if (!login || !password || login.length > 120 || password.length > 200) {
    return err_('Format kredensial tidak valid.');
  }
  try {
    var u = findUserByLogin_(login);
    var now = new Date();
    if (u && u.lockedUntil && u.lockedUntil.getTime() > now.getTime()) {
      appendAuditLog_('ANONYMOUS', 'login-fail', u.username + ':locked', false);
      return err_(AUTH_LOGIN_GENERIC_FAIL);
    }
    var ok = (u && u.active) ? verifyPassword_(password, u.passHash) : false;
    if (!ok) {
      bumpFailCounter_(u ? u.username : login, u ? u.rowIndex : 0);
      appendAuditLog_('ANONYMOUS', 'login-fail', (u ? u.username : 'unknown:' + login), false);
      return err_(AUTH_LOGIN_GENERIC_FAIL); // pesan seragam: anti-enumeration
    }
    clearFailCounter_(u.username);
    touchLastLogin_(u.rowIndex);
    var sess = createSession_(u.username);
    appendAuditLog_(u.role, 'login-ok', u.username, true);
    return ok_({
      sessionToken: sess.token,
      username: u.username,
      role: u.role,
      expiresAt: sess.expiresAt.toISOString(),
      dataVersion: getDataVersion_()
    }, 'Login sukses');
  } catch (e) {
    console.warn('authLogin_ error:', e && e.message);
    return err_('Gagal memproses login.');
  }
}

function authLogout_(req) {
  if (!authUsersEnabled_()) {
    return err_('Auth berbasis akun belum diaktifkan (YPTT_AUTH_USERS).');
  }
  try {
    req = req || {};
    var token = String(req.token == null ? '' : req.token);
    if (!token) return err_('Token sesi wajib disertakan.');
    var uname = revokeSession_(token); // null bila tak ditemukan/sudah revoked
    appendAuditLog_('ANONYMOUS', 'logout', uname || 'unknown-session', true);
    return ok_({ loggedOut: true }, 'Logout diproses'); // idempotent
  } catch (e) {
    console.warn('authLogout_ error:', e && e.message);
    return err_('Gagal memproses logout.');
  }
}

function touchLastLogin_(userRowIndex) {
  try {
    getSS_().getSheetByName('USERS')
      .getRange(userRowIndex, 8).setValue(new Date().toISOString());
  } catch (e) { console.warn('touchLastLogin_:', e && e.message); }
}

/* ---------------- Provisioning (editor-only) ---------------- */

/**
 * Provisioning user HANYA lewat fungsi ini (jalankan manual dari editor).
 * Bukan endpoint. Tidak ada self-signup/reset/admin UI.
 * Contoh: provisionUser_('budi','budi@yptt.example','OPERATOR','RahasiaMin10char');
 * Returns ringkasan TANPA password/hash.
 */
function provisionUser_(username, email, role, password) {
  username = String(username || '').trim().toLowerCase();
  email = String(email || '').trim().toLowerCase();
  role = String(role || '').trim().toUpperCase();

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('Username 3-32 karakter [a-z0-9._-].');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Email tidak valid.');
  }
  if (VALID_AUTH_ROLES.indexOf(role) === -1) {
    throw new Error('Role harus salah satu dari: ' + VALID_AUTH_ROLES.join('/'));
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw new Error('Password 10-128 karakter.');
  }

  ensureAuthSheets_();
  var dup = findUserByLogin_(username) || findUserByLogin_(email);
  if (dup) throw new Error('Username/email sudah terdaftar.');

  var nowIso = new Date().toISOString();
  getSS_().getSheetByName('USERS').appendRow([
    username, email, hashPassword_(password), role, 'TRUE',
    nowIso, nowIso, '', '', ''
  ]);
  return 'User dibuat: ' + username + ' / ' + role + ' (kredensial tidak dicetak)';
}


/* ---------- GATE ARSITEKTUR FINAL (TEST K -> migrasi pivot) ----------
 * Target akhir yang disepakati:
 *   OPERATOR : Site_SUL/KAL, Inbound/Return, LOM, PLN  -> BOLEH
 *              Pivot / Summary / Dashboard / ENGINE_*   -> TIDAK
 * Cara mengaktifkan (tanpa redeploy), dari editor Apps Script:
 *   enablePivotLock()   -> YPTT_PIVOT_MIGRATED='1'  (pivot-* ditolak semua role)
 *   disablePivotLock()  -> kembali ke mode parallel run
 */
function isPivotMigrated_() {
  return PropertiesService.getScriptProperties().getProperty('YPTT_PIVOT_MIGRATED') === '1';
}

function enablePivotLock() {
  PropertiesService.getScriptProperties().setProperty('YPTT_PIVOT_MIGRATED', '1');
  appendAuditLog_('SYSTEM', 'pivot-lock-ON', 'derived read-only total', true);
  return 'pivot-* TERKUNCI: arsitektur final aktif (RAW -> engine saja)';
}

function disablePivotLock() {
  PropertiesService.getScriptProperties().setProperty('YPTT_PIVOT_MIGRATED', '0');
  appendAuditLog_('SYSTEM', 'pivot-lock-OFF', 'parallel run mode', true);
  return 'pivot-* dibuka kembali (mode parallel run)';
}

/* ---------- Validasi tulis RAW (spec V2 §18, TEST E) ---------- */
function validateRowData_(sheetName, data, mode) {
  var errors = [];
  var warnings = [];
  var qualityFlags = [];

  if (mode === 'add' && !toStr_(data['WID'])) {
    errors.push('WID wajib diisi');
    qualityFlags.push('MISSING');
  } else if (data['WID'] !== undefined && toStr_(data['WID']) && !/^[A-Za-z0-9_\-\.]+$/.test(toStr_(data['WID']))) {
    errors.push('Format WID tidak valid: ' + toStr_(data['WID']));
    qualityFlags.push('INVALID_WID');
  }

  var dateFields = Object.keys(data).filter(function (k) { return /date$/i.test(k); });
  dateFields.forEach(function (f) {
    var v = data[f];
    if (v === '' || v === undefined || v === null) return;
    if (!parseDateLoose_(v)) {
      errors.push('Nilai tanggal tidak valid pada "' + f + '": ' + v);
      qualityFlags.push('INVALID_DATE');
    }
  });

  var statusFields = ['SM ATP', 'ATP Passed', 'FI Ineom', 'Ineom Passed',
    'SM Status', 'SM Dismantle', 'GAP Analysis'];
  statusFields.forEach(function (f) {
    if (Object.prototype.hasOwnProperty.call(data, f) && toStr_(data[f])) {
      var st = classifyStatus_(data[f]);
      if (st === 'UNKNOWN') {
        warnings.push('Status tidak dikenal pada "' + f + '": ' + data[f] + ' -> akan diperlakukan UNKNOWN (bukan DONE)');
        qualityFlags.push('INVALID_STATUS');
      }
    }
  });

  return { ok: errors.length === 0, errors: errors, warnings: warnings, qualityFlags: qualityFlags };
}

/* ============================================================
 * CORE METRIC ENGINE — dipakai getKPI/getSummary/pivot/dashboard
 * Satu definisi perhitungan; tidak ada duplikasi logic di luar ini.
 * ============================================================ */

/**
 * Evaluasi SATU nilai field terhadap definisi metrik (dipakai bersama oleh
 * countMetric_ dan collectMetricWids_ agar tidak ada dua versi logika).
 * Return { hit:true } | { hit:false } | { hit:null, date } | { invalidDate:true } | { unknown:true }
 */
function evalMetricValue_(def, rawVal) {
  if (def.type === 'date') {
    if (rawVal === undefined || rawVal === null || toStr_(rawVal) === '') return { hit: false };
    var d = parseDateLoose_(rawVal);
    if (!d) return { hit: false, invalidDate: true };
    return { hit: null, date: d }; // keputusan akhir oleh filter rentang di caller
  }
  if (def.type === 'status') {
    var cls = classifyStatus_(rawVal);
    if (!cls) return { hit: false };
    if (cls === 'DONE') return { hit: true };
    if (def.extraDone && def.extraDone.indexOf(normStatus_(rawVal)) !== -1) return { hit: true };
    return cls === 'UNKNOWN' ? { hit: false, unknown: true } : { hit: false };
  }
  if (def.type === 'suffix') {
    return { hit: normStatus_(rawVal).indexOf(def.suffix) !== -1 };
  }
  return { hit: false };
}

/**
 * Hitung satu metrik pada kumpulan baris.
 * @param {Array<Object>} rows baris hasil readSheetObjects_
 * @param {Object} fieldsCfg FIELDS_SUL / FIELDS_KAL
 * @param {String} defKey key METRIC_DEFS
 * @param {Object} f filter {year, month(1-12), zone}
 * @return {{value:number, quality:string, invalidDates:number}}
 */
function countMetric_(rows, fieldsCfg, defKey, f) {
  var def = METRIC_DEFS[defKey];
  var candidates = fieldsCfg[def.field];
  if (!candidates || !candidates.length) {
    return { value: 0, quality: 'EXTERNAL_DEPENDENCY', invalidDates: 0 };
  }
  var rng = (f.year && f.month) ? monthRange_(Number(f.year), Number(f.month)) : null;
  var yearOnly = (f.year && !f.month && def.type === 'date') ? Number(f.year) : null;
  var zonesIn = f.zones || null; // SULAWESI_3_ZONES scope (keputusan TEST K)

  var value = 0;
  var invalidDates = 0;
  var unknownStatus = 0;

  rows.forEach(function (r) {
    var wid = toStr_(pickField_(r, [fieldsCfg.wid]));
    if (!wid) return; // baris tanpa WID bukan work item sah

    if (zonesIn) {
      var zl = toStr_(pickField_(r, fieldsCfg.zone)).toUpperCase();
      if (zonesIn.indexOf(zl) === -1) return;
    } else if (f.zone) {
      var z = toStr_(pickField_(r, fieldsCfg.zone)).toUpperCase();
      if (z !== String(f.zone).toUpperCase()) return;
    }

    // SNAPSHOT_STATUS: filter periode sengaja TIDAK diterapkan (periodApplied=false)
    var ev = evalMetricValue_(def, pickField_(r, candidates));
    if (ev.invalidDate) { invalidDates++; return; }
    if (ev.unknown) unknownStatus++;
    if (ev.hit === true) { value++; return; }
    if (ev.hit === null && ev.date) {
      if (rng && !dateInRange_(ev.date, rng)) return;
      if (!rng && yearOnly && ev.date.getFullYear() !== yearOnly) return;
      value++;
    }
  });

  var quality = 'DERIVED';
  if (invalidDates > 0 || unknownStatus > 0) quality = 'SOURCE_ERROR';
  return { value: value, quality: quality, invalidDates: invalidDates, unknownStatus: unknownStatus };
}

/** Metadata interpretasi sebuah perhitungan (mencegah salah baca snapshot). */
function metricPeriodMeta_(defKey, f) {
  var def = METRIC_DEFS[defKey];
  var periodApplied = def.type === 'date' && !!(f.year || f.month);
  return {
    metric: defKey,
    type: def.timeBasis,
    period: { year: f.year || null, month: f.month || null },
    periodApplied: periodApplied,
    scope: f.zones ? 'SULAWESI_3_ZONES' : (f.zone ? 'ZONE:' + String(f.zone).toUpperCase() : 'ALL'),
    note: def.timeBasis === 'SNAPSHOT_STATUS'
      ? 'Snapshot status saat ini — BUKAN jumlah site yang selesai pada periode tsb.'
      : undefined
  };
}

/**
 * Telusuri baris penyusun sebuah metrik (alat investigasi delta parallel-run).
 * ?action=metric-wids&source=sul&metric=mos&year=2026&month=8&zone=MAKASSAR
 * Drill silang kohort assignment (keputusan TEST K):
 *   &assignFrom=2026-01&assignTo=2026-08
 *   -> hanya baris yang Monthly Assignment-nya jatuh dalam jendela tsb;
 *      output memuat tanggal milestone + bulan assignment utk diff manual.
 */
function collectMetricWids_(source, metricKey, year, month, zone, assignFrom, assignTo) {
  var isKal = String(source).toLowerCase() === 'kal';
  var fieldsCfg = isKal ? FIELDS_KAL : FIELDS_SUL;
  var sheetName = isKal ? SHEETS.SITE_KAL : SHEETS.SITE_SUL;
  if (!METRIC_DEFS[metricKey]) {
    throw new Error('Metrik tidak dikenal: ' + metricKey);
  }
  var def = METRIC_DEFS[metricKey];
  var candidates = fieldsCfg[def.field];
  if (!candidates || !candidates.length) {
    return { metric: metricKey, source: sheetName, count: 0, rows: [], note: 'Field sumber tidak tersedia (EXTERNAL_DEPENDENCY)' };
  }
  var rng = (year && month) ? monthRange_(Number(year), Number(month)) : null;
  var yearOnly = (year && !month && def.type === 'date') ? Number(year) : null;

  // Jendela kohort assignment (opsional)
  var aFrom = parseYearMonth_(assignFrom); // {y,m} | null
  var aTo = parseYearMonth_(assignTo);

  var out = [];
  var rows = readSheetObjects_(sheetName);
  rows.forEach(function (r) {
    var wid = toStr_(pickField_(r, [fieldsCfg.wid]));
    if (!wid) return;
    var z = toStr_(pickField_(r, fieldsCfg.zone));
    if (zone && z.toUpperCase() !== String(zone).toUpperCase()) return;

    // Filter silang kohort assignment
    var asgRaw = pickField_(r, fieldsCfg.assignment);
    var inCohort = true;
    if (aFrom || aTo) {
      var am = assignmentMonthIndex_(asgRaw); // {y,m} | null
      if (!am) { inCohort = false; }
      else {
        if (aFrom && (am.y < aFrom.y || (am.y === aFrom.y && am.m < aFrom.m))) inCohort = false;
        if (inCohort && aTo && (am.y > aTo.y || (am.y === aTo.y && am.m > aTo.m))) inCohort = false;
      }
    }
    if (!inCohort) return;

    var rawVal = pickField_(r, candidates);
    var ev = evalMetricValue_(def, rawVal);
    var hit = false;
    if (ev.hit === true) hit = true;
    else if (ev.hit === null && ev.date) {
      hit = rng ? dateInRange_(ev.date, rng)
        : (!yearOnly || ev.date.getFullYear() === yearOnly);
    }
    if (!hit) return;
    out.push({
      wid: wid,
      siteName: toStr_(pickField_(r, ['Site Name Impl', 'Site Name'])),
      zone: z,
      value: cleanCell_(rawVal),
      assignment: cleanCell_(asgRaw)
    });
  });

  var LIMIT = 500;
  return {
    metric: metricKey,
    label: def.label,
    source: sheetName,
    filter: {
      year: year || null, month: month || null, zone: zone || null,
      assignFrom: assignFrom || null, assignTo: assignTo || null
    },
    periodMeta: metricPeriodMeta_(metricKey, { year: year ? Number(year) : null, month: month ? Number(month) : null, zone: zone || null }),
    count: out.length,
    truncated: out.length > LIMIT,
    rows: out.slice(0, LIMIT)
  };
}

/** 'YYYY-MM' -> {y,m} | null */
function parseYearMonth_(s) {
  var m = toStr_(s).match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return null;
  var y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { y: y, m: mo };
}

/** Nilai assignment (tanggal / teks) -> {y,m} | null */
function assignmentMonthIndex_(v) {
  if (v === undefined || v === null || toStr_(v) === '') return null;
  var d = parseDateLoose_(v);
  if (d) return { y: d.getFullYear(), m: d.getMonth() + 1 };
  var mi = matchMonth_(v);
  if (mi < 0) return null;
  var ym = toStr_(v).match(/(\d{4})/);
  return { y: ym ? Number(ym[1]) : ACTIVE_YEAR, m: mi + 1 };
}

/** Susun objek lineage standar untuk satu perhitungan metrik (spec V2 §23) */
function metricLineage_(fieldsCfg, sheetName, defKey, f, res) {
  var def = METRIC_DEFS[defKey];
  var candidates = fieldsCfg[def.field] || [];
  return {
    metric: defKey,
    label: def.label,
    sourceSheet: sheetName,
    sourceField: candidates.join(' | '),
    filter: {
      year: f.year || null,
      month: f.month || null,
      monthRange: (f.year && f.month)
        ? [monthRange_(Number(f.year), Number(f.month)).start, monthRange_(Number(f.year), Number(f.month)).end]
        : null,
      zone: f.zone || null
    },
    transformation: def.type === 'date'
      ? 'COUNT(WID where ' + candidates[0] + ' adalah tanggal valid dalam rentang)'
      : 'COUNT(WID where classifyStatus(' + (candidates[0] || '-') + ') == DONE)',
    aggregation: 'COUNT(WID)',
    result: res.value,
    quality: res.quality,
    invalidDates: res.invalidDates || 0,
    unknownStatus: res.unknownStatus || 0,
    periodMeta: metricPeriodMeta_(defKey, f)
  };
}

/**
 * KPI deterministik dari RAW saja (fix audit K4 — tidak ada override dari dashboard).
 * Response shape lama dipertahankan (total_site, total_mos, ...) agar frontend tidak putus.
 * PERF: hasil di-cache 2 menit per dataVersion — tulis RAW baru otomatis
 * membuat cache miss karena versi naik.
 */
function getKPI() {
  var vKey = 'kpi_v' + getDataVersion_();
  var cache = CacheService.getScriptCache();
  var hit = cache.get(vKey);
  if (hit) {
    try { return JSON.parse(hit); } catch (ignored) {}
  }

  var sul = readSheetObjects_(SHEETS.SITE_SUL);
  var kal = readSheetObjects_(SHEETS.SITE_KAL);
  var all = sul.concat(kal);

  function totalOf(defKey) {
    return countMetric_(sul, FIELDS_SUL, defKey, {}).value +
           countMetric_(kal, FIELDS_KAL, defKey, {}).value;
  }

  // Satu pass lineage per sheet (dipakai ulang; hindari hitung ganda)
  var linSulMos = countMetric_(sul, FIELDS_SUL, 'mos', {});
  var linKalMos = countMetric_(kal, FIELDS_KAL, 'mos', {});
  var linSulHi = countMetric_(sul, FIELDS_SUL, 'hi_done', {});
  var linSulConn = countMetric_(sul, FIELDS_SUL, 'connected', {});

  var kpi = {
    total_site: all.filter(function (r) { return toStr_(pickField_(r, ['WID'])); }).length,
    total_mos: linSulMos.value + linKalMos.value,
    total_hi_done: linSulHi.value + countMetric_(kal, FIELDS_KAL, 'hi_done', {}).value,
    total_connected: linSulConn.value + countMetric_(kal, FIELDS_KAL, 'connected', {}).value,
    total_sm_atp: totalOf('sm_atp'),
    total_fi_ineom: totalOf('fi_ineom')
  };

  kpi.lineage = [
    metricLineage_(FIELDS_SUL, SHEETS.SITE_SUL, 'mos', {}, linSulMos),
    metricLineage_(FIELDS_KAL, SHEETS.SITE_KAL, 'mos', {}, linKalMos),
    metricLineage_(FIELDS_SUL, SHEETS.SITE_SUL, 'hi_done', {}, linSulHi),
    metricLineage_(FIELDS_SUL, SHEETS.SITE_SUL, 'connected', {}, linSulConn)
  ];
  kpi.generatedAt = new Date().toISOString();
  kpi.dataVersion = getDataVersion_();

  try { cache.put(vKey, JSON.stringify(kpi), 120); } catch (ignored) {}
  return kpi;
}

/** Health ringan tanpa memindai seluruh workbook */
function getHealthLight_() {
  return {
    status: 'UP',
    backendVersion: BACKEND_VERSION,
    dataVersion: getDataVersion_(),
    timestamp: new Date().toISOString()
  };
}

function getDashboard() {
  // FIX: gunakan varian "opt" (toleran sheet tidak ada) untuk SEMUA sheet legacy.
  // Workbook baru belum tentu memuat 'Dashboard SUL' / 'Summary Sul' dll —
  // sheet hilang dikembalikan sebagai struktur kosong, bukan error 500.
  var dash2026 = readSheetRawMatrixOpt_(SHEETS.DASH_2026);
  var dashSul = readSheetRawMatrixOpt_(SHEETS.DASH_SUL);
  var pvtSul = readSheetRawMatrixOpt_(SHEETS.PVT_SUL);
  var pivotKal = readSheetRawMatrixOpt_(SHEETS.PIVOT_KAL);

  // Hasil engine (safe mode): sheet ENGINE_* bila sudah digenerate.
  var engine = {
    available: false,
    pvt_dash_sul: readSheetRawMatrixOpt_(ENGINE_SHEETS.PVT_DASH_SUL),
    pivot_kal: readSheetRawMatrixOpt_(ENGINE_SHEETS.PIVOT_KAL),
    dash_sulawesi: readSheetRawMatrixOpt_(ENGINE_SHEETS.DASH_SULAWESI),
    summary_sul: readSheetRawMatrixOpt_(ENGINE_SHEETS.SUMMARY_SUL)
  };
  engine.available = !!(engine.pvt_dash_sul.rows.length || engine.pivot_kal.rows.length ||
    engine.dash_sulawesi.rows.length);

  // Sertakan KPI dalam response dashboard untuk mengurangi jumlah request
  var kpi = getKPI();

  return {
    dashboard_2026: dash2026,
    dashboard_sulawesi: dashSul,
    pvt_dash_sul: pvtSul,
    pivot_kal: pivotKal,
    engine: engine,
    kpi: kpi,
    dataVersion: getDataVersion_()
  };
}

/** Baca sheet jadi matrix display; return struktur kosong bila sheet tidak ada */
function readSheetRawMatrixOpt_(sheetName) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 1) return { headers: [], rows: [] };
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var hasValue = values[i].some(function (c) { return c !== ''; });
    if (hasValue) rows.push(values[i]);
  }
  return { headers: headers, rows: rows };
}

/* ============================================================
 * DERIVED BUILDERS — output ke sheet bayangan ENGINE_* (SAFE MODE)
 *
 * KEPUTUSAN DESAIN (user): engine TIDAK menimpa tabel input manual
 * (Pvt Dash Sul / Pivot Kal / Dashboard Sulawesi). Semua hasil
 * agregasi ditulis ke sheet "ENGINE ..." yang setara secara skema,
 * sehingga UI web bisa memakai angka terkini tanpa merusak input.
 * ============================================================ */

var ENGINE_CATS_SUL = ['Assignment', 'HI Done', 'Connected', 'SM ATP', 'SM Dismantle',
  'Inbound Done', 'FI INEOM', 'eATP Done', 'BAUT Done'];
var ENGINE_CAT_TO_DEF = {
  'Assignment': 'assignment',
  'HI Done': 'hi_done',
  'Connected': 'connected',
  'SM ATP': 'sm_atp',
  'SM Dismantle': 'sm_dismantle',
  'Inbound Done': 'inbound_done',
  'FI INEOM': 'fi_ineom',
  'eATP Done': 'eatp_done',
  'BAUT Done': 'baut_done'
};
var ENGINE_CATS_KAL = ['MOS', 'HI', 'Connected'];
var ENGINE_CAT_KAL_TO_DEF = { 'MOS': 'mos', 'HI': 'hi_done', 'Connected': 'connected' };
var DASHSUL_MILESTONES = ['MOS Done', 'HI Done', 'Connected', 'SM ATP', 'ATP Passed',
  'FI Ineom', 'Ineom Passed', 'eATP Done'];
var DASHSUL_MILESTONE_DEF = {
  'MOS Done': 'mos', 'HI Done': 'hi_done', 'Connected': 'connected',
  'SM ATP': 'sm_atp', 'ATP Passed': 'atp_passed', 'FI Ineom': 'fi_ineom',
  'Ineom Passed': 'ineom_passed', 'eATP Done': 'eatp_done'
};

/**
 * Pvt Dash Sul format panjang:
 * [PO Year | Kategori | Bulan | Zona | Jumlah] — kategori dipetakan ke field benar.
 */
function buildEnginePvtDashSul_(sulRows, year) {
  var matrix = [['PO Year', 'Kategori', 'Bulan', 'Zona', 'Jumlah']];
  ENGINE_CATS_SUL.forEach(function (cat) {
    var defKey = ENGINE_CAT_TO_DEF[cat];
    for (var m = 1; m <= 12; m++) {
      ZONES_SUL.forEach(function (z) {
        var res = countMetric_(sulRows, FIELDS_SUL, defKey, { year: year, month: m, zone: z });
        if (res.value > 0) {
          matrix.push([year, cat, MONTH_NAMES[m - 1], z, res.value]);
        }
      });
    }
  });
  return matrix;
}

/** Pivot Kal format panjang: [PO Year | Kategori | Bulan | Jumlah] (agregat seluruh KAL) */
function buildEnginePivotKal_(kalRows, year) {
  var matrix = [['PO Year', 'Kategori', 'Bulan', 'Jumlah']];
  ENGINE_CATS_KAL.forEach(function (cat) {
    var defKey = ENGINE_CAT_KAL_TO_DEF[cat];
    for (var m = 1; m <= 12; m++) {
      var res = countMetric_(kalRows, FIELDS_KAL, defKey, { year: year, month: m });
      if (res.value > 0) matrix.push([year, cat, MONTH_NAMES[m - 1], res.value]);
    }
  });
  return matrix;
}

/**
 * Dashboard Sulawesi format panjang:
 * [PO Year | Zona | Milestone | Bulan | Plan | Ach | Persen | Remarks]
 * Plan dibaca dari tabel manual bila ada (input user tetap berharga);
 * Ach dihitung engine; Persen = Ach/Plan.
 */
function buildEngineDashSulawesi_(sulRows, year, manualMatrix) {
  // Ambil Plan dari tabel manual: map "ZONA||MILESTONE||BULAN" -> Plan
  var planMap = {};
  if (manualMatrix && manualMatrix.headers.length) {
    var H = manualMatrix.headers.map(normHeader_);
    var iZ = H.indexOf('ZONA'), iM = H.indexOf('MILESTONE'), iB = H.indexOf('BULAN'),
        iP = H.indexOf('PLAN'), iY = H.indexOf('PO YEAR');
    if (iP >= 0) {
      manualMatrix.rows.forEach(function (r) {
        var y = iY >= 0 ? String(r[iY]).trim() : String(year);
        if (y && Number(y) !== Number(year)) return;
        var key = [String(r[iZ]).trim().toUpperCase(), String(r[iM]).trim().toUpperCase(),
                   String(r[iB]).trim().toUpperCase()].join('||');
        var p = num_(r[iP]);
        if (p > 0) planMap[key] = p;
      });
    }
  }

  var matrix = [['PO Year', 'Zona', 'Milestone', 'Bulan', 'Plan', 'Ach', 'Persen', 'Remarks']];
  DASHSUL_MILESTONES.forEach(function (ms) {
    var defKey = DASHSUL_MILESTONE_DEF[ms];
    for (var m = 1; m <= 12; m++) {
      ['SULAWESI'].concat(ZONES_SUL).forEach(function (z) {
        var f = { year: year, month: m };
        // KEPUTUSAN TEST K: baris SULAWESI = MAKASSAR+MANADO+TERNATE saja
        if (z === 'SULAWESI') f.zones = ZONES_SUL; else f.zone = z;
        var res = countMetric_(sulRows, FIELDS_SUL, defKey, f);
        var plan = planMap[[z.toUpperCase(), ms.toUpperCase(), MONTH_NAMES[m - 1].toUpperCase()].join('||')] || '';
        var pct = plan ? Math.round(res.value / plan * 100) + '%' : '';
        matrix.push([year, z, ms, MONTH_NAMES[m - 1], plan, res.value, pct, '']);
      });
    }
  });
  return matrix;
}

/** Summary per zona: [ZTE ZONE | Total Site | metrik...] — semantics benar */
function buildEngineSummary_(rows, fieldsCfg, metrics) {
  var header = ['ZTE ZONE', 'Total Site'].concat(metrics.map(function (m) { return METRIC_DEFS[m].label; }));
  var matrix = [header];
  var groups = {};
  rows.forEach(function (r) {
    var z = toStr_(pickField_(r, fieldsCfg.zone));
    if (!z) z = '(KOSONG)';
    if (!groups[z]) groups[z] = [];
    groups[z].push(r);
  });
  Object.keys(groups).sort().forEach(function (z) {
    var g = groups[z];
    var rowVals = [z, g.length];
    metrics.forEach(function (mk) {
      rowVals.push(countMetric_(g, fieldsCfg, mk, {}).value);
    });
    matrix.push(rowVals);
  });
  return matrix;
}

/** Rekonstruksi semantik Dashboard SUL (monthly MOS/HI/Connected, scope 3 zona) */
function buildEngineMonthlySul_(sulRows, year) {
  var metrics = ['mos', 'hi_done', 'connected'];
  var matrix = [['Bulan'].concat(metrics.map(function (m) { return METRIC_DEFS[m].label; })).concat(['TOTAL'])];
  for (var m = 1; m <= 12; m++) {
    var vals = metrics.map(function (mk) {
      // KEPUTUSAN TEST K: scope SULAWESI_3_ZONES
      return countMetric_(sulRows, FIELDS_SUL, mk, { year: year, month: m, zones: ZONES_SUL }).value;
    });
    matrix.push([MONTH_NAMES[m - 1]].concat(vals).concat([vals.reduce(function (a, b) { return a + b; }, 0)]));
  }
  return matrix;
}

/** Tulis matrix ke sheet ENGINE_* tanpa menyentuh sheet lain (safe write) */
function safeWriteEngineSheet_(ss, sheetName, matrix) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  var lastRow = Math.max(sh.getLastRow(), 1);
  var lastCol = Math.max(sh.getLastColumn(), 1);
  sh.getRange(2, 1, lastRow, lastCol).clearContent();
  sh.getRange(1, 1, 1, lastCol).clearContent();
  if (!matrix || !matrix.length) return;
  var maxLen = matrix[0].length;
  var normalized = matrix.map(function (r) {
    while (r.length < maxLen) r.push('');
    return r;
  });
  sh.getRange(1, 1, normalized.length, maxLen).setValues(normalized);
  sh.getRange(1, 1, 1, maxLen).setFontWeight('bold');
}

/**
 * Jalankan calculation engine penuh -> tulis semua sheet ENGINE_*.
 * Aman dipanggil ulang; tidak pernah menyentuh RAW/manual/presentation sheets.
 */
function runEngineSync_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { success: false, error: 'Engine lain sedang berjalan (lock aktif). Coba lagi nanti.' };
  }
  try {
    var sul = readSheetObjects_(SHEETS.SITE_SUL);
    var kal = readSheetObjects_(SHEETS.SITE_KAL);
    var ss = getSS_();
    var year = ACTIVE_YEAR;

    var manualDashSulawesi = readSheetRawMatrixOpt_(SHEETS.DASH_SUL);

    var out = {};
    out[ENGINE_SHEETS.PVT_DASH_SUL] = buildEnginePvtDashSul_(sul, year);
    out[ENGINE_SHEETS.PIVOT_KAL] = buildEnginePivotKal_(kal, year);
    out[ENGINE_SHEETS.DASH_SULAWESI] = buildEngineDashSulawesi_(sul, year, manualDashSulawesi);
    out[ENGINE_SHEETS.SUMMARY_SUL] = buildEngineSummary_(sul, FIELDS_SUL,
      ['mos', 'hi_done', 'connected', 'sm_atp', 'atp_passed', 'fi_ineom']);
    out[ENGINE_SHEETS.SUMMARY_KAL] = buildEngineSummary_(kal, FIELDS_KAL,
      ['mos', 'hi_done', 'connected', 'sm_atp', 'atp_passed', 'fi_ineom']);
    out[ENGINE_SHEETS.DASH_SUL_MONTHLY] = buildEngineMonthlySul_(sul, year);

    Object.keys(out).forEach(function (name) { safeWriteEngineSheet_(ss, name, out[name]); });

    var metaSheet = ss.getSheetByName(ENGINE_PREFIX + '_META');
    if (!metaSheet) metaSheet = ss.insertSheet(ENGINE_PREFIX + '_META');
    metaSheet.getRange(1, 1, 3, 2).setValues([
      ['generatedAt', new Date().toISOString()],
      ['year', year],
      ['backendVersion', BACKEND_VERSION]
    ]);

    bumpDataVersion_('engine-sync');
    return ok_({
      sheets: Object.keys(out),
      rowsWritten: Object.keys(out).map(function (k) { return { sheet: k, rows: out[k].length - 1 }; }),
      year: year,
      dataVersion: getDataVersion_()
    }, 'Engine sync selesai — sheet manual tidak disentuh');
  } catch (err) {
    return err_('Engine sync gagal: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================
 * SINKRONISASI EDIT (spec V2 §16-§17)
 * USER EDIT -> onEdit -> identify -> validate -> recalc affected
 * -> update derived (ENGINE_*) -> bump version -> website tahu.
 * ============================================================ */

/** Peta dependensi: RAW sheet -> derived yang harus direkalkulasi */
var DEPENDENCY_GRAPH = {};
DEPENDENCY_GRAPH[SHEETS.SITE_SUL] = [
  ENGINE_SHEETS.PVT_DASH_SUL, ENGINE_SHEETS.DASH_SULAWESI,
  ENGINE_SHEETS.SUMMARY_SUL, ENGINE_SHEETS.DASH_SUL_MONTHLY
];
DEPENDENCY_GRAPH[SHEETS.SITE_KAL] = [
  ENGINE_SHEETS.PIVOT_KAL, ENGINE_SHEETS.SUMMARY_KAL
];

var RECALC_FLAG = '_YPTT_RECALC_RUNNING';
var RECALC_COALESCE = '_YPTT_RECALC_PENDING';

/** Hook pasca-tulis RAW dari API: bump versi + jadwalkan rekalkulasi ringan */
function onRawDataChanged_(sheetName) {
  bumpDataVersion_('api-write:' + sheetName);
  scheduleRecalcForSheets_([sheetName]);
}

/**
 * Jadwalkan rekalkulasi (coalesced): edit beruntun dalam 30 dtk
 * hanya memicu SATU kali eksekusi engine.
 */
function scheduleRecalcForSheets_(sheetNames) {
  var affected = [];
  sheetNames.forEach(function (s) {
    (DEPENDENCY_GRAPH[s] || []).forEach(function (d) {
      if (affected.indexOf(d) === -1) affected.push(d);
    });
  });
  if (!affected.length) return; // sheet ini tidak punya derived

  var cache = CacheService.getScriptCache();
  cache.put(RECALC_COALESCE, '1', 30);
  var props = PropertiesService.getScriptProperties();

  if (props.getProperty(RECALC_FLAG) === '1') return; // sedang berjalan -> coalesce cukup
  props.setProperty(RECALC_FLAG, '1');
  try {
    // Jalankan inline (eksekusi GAS sudah dalam konteks trigger/request).
    var res = runEngineSync_();
    cache.remove(RECALC_COALESCE);
    appendAuditLog_('SYSTEM', 'auto-recalc', affected.join(','), !res || res.success !== false);
  } catch (e) {
    appendAuditLog_('SYSTEM', 'auto-recalc-FAIL', String(e), false);
  } finally {
    props.setProperty(RECALC_FLAG, '0');
  }
}

/**
 * Installable onEdit trigger — pasang SEKALI via installTriggers().
 * JANGAN gunakan nama onEdit(e) simple-trigger agar tidak dobel dengan logic ini.
 */
function onEditHandler(e) {
  try {
    if (!e || !e.range || !e.source) return;
    var sheetName = e.range.getSheet().getName();
    if (!RAW_WRITABLE[sheetName]) return; // bukan RAW -> abaikan

    // Validasi ringan nilai yang diedit
    var val = e.value;
    var colHeader = normHeader_(e.range.getSheet()
      .getRange(1, e.range.getColumn()).getValue());
    if (/date$/i.test(colHeader) && val !== null && toStr_(val) !== '' && !parseDateLoose_(val)) {
      appendAuditLog_('USER', 'edit-rejected', sheetName + '!' + e.range.getA1Notation() +
        ' (' + colHeader + ')=' + val, false);
      // Tandai masalah, jangan ubah data user diam-diam (spec: jangan fabrikasi)
      e.range.setNote('VALIDATION WARNING: nilai tanggal tidak valid: ' + val);
      return;
    }

    scheduleRecalcForSheets_([sheetName]);
  } catch (err) {
    appendAuditLog_('SYSTEM', 'onedit-error', String(err), false);
  }
}

/** Jalankan sekali dari editor untuk memasang trigger installable */
function installTriggers() {
  var ss = getSS_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onEditHandler') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onEditHandler').forSpreadsheet(ss).onEdit().create();
  return 'Trigger onEditHandler terpasang';
}

/* ============================================================
 * SUMMARY / LINEAGE / SCHEMA API (PHASE 5)
 * ============================================================ */

/**
 * Ringkasan zona x metrik dari RAW — semantics sama dengan engine.
 * ?action=summary&sheet=Site_SUL[&year=2026]
 */
function getSummary(sheetName, year) {
  var y = year ? Number(year) : ACTIVE_YEAR;
  var cfg = sheetName === 'Site_KAL'
    ? { rows: readSheetObjects_(SHEETS.SITE_KAL), fields: FIELDS_KAL, src: SHEETS.SITE_KAL }
    : { rows: readSheetObjects_(SHEETS.SITE_SUL), fields: FIELDS_SUL, src: SHEETS.SITE_SUL };

  var metrics = ['assignment', 'mos', 'hi_done', 'connected', 'sm_atp', 'atp_passed', 'fi_ineom', 'ineom_passed'];
  var zones = {};
  cfg.rows.forEach(function (r) {
    var z = toStr_(pickField_(r, cfg.fields.zone)) || '(KOSONG)';
    if (!zones[z]) zones[z] = [];
    zones[z].push(r);
  });

  var result = Object.keys(zones).sort().map(function (z) {
    var row = { zone: z, totalSite: zones[z].length };
    metrics.forEach(function (mk) {
      var res = countMetric_(zones[z], cfg.fields, mk, { year: y });
      row[mk] = res.value;
    });
    return row;
  });

  return {
    sheet: cfg.src,
    year: y,
    dataVersion: getDataVersion_(),
    generatedAt: new Date().toISOString(),
    rows: result,
    lineageNote: 'Semua angka dihitung dari RAW ' + cfg.src + ' via METRIC_DEFS (KPI_DEFINITIONS.md)'
  };
}

/**
 * Lineage satu metrik + hasil perhitungannya.
 * ?action=lineage&metric=connected&year=2026&month=8&zone=MAKASSAR
 */
function getMetricLineage(metricKey, year, month, zone) {
  var key = toStr_(metricKey) || 'connected';
  if (!METRIC_DEFS[key]) {
    throw new Error('Metrik tidak dikenal: ' + key + '. Tersedia: ' + Object.keys(METRIC_DEFS).join(', '));
  }
  var f = {};
  if (year) f.year = Number(year);
  if (month) f.month = Number(month);
  if (zone) f.zone = String(zone);

  var sulRes = countMetric_(readSheetObjects_(SHEETS.SITE_SUL), FIELDS_SUL, key, f);
  var kalRes = countMetric_(readSheetObjects_(SHEETS.SITE_KAL), FIELDS_KAL, key, f);

  return {
    metric: key,
    label: METRIC_DEFS[key].label,
    filter: f,
    sources: [
      metricLineage_(FIELDS_SUL, SHEETS.SITE_SUL, key, f, sulRes),
      metricLineage_(FIELDS_KAL, SHEETS.SITE_KAL, key, f, kalRes)
    ],
    combined: {
      value: sulRes.value + kalRes.value,
      quality: (sulRes.quality === 'DERIVED' && kalRes.quality === 'DERIVED') ? 'OK' : 'SOURCE_ERROR'
    },
    statusSemantics: getStatusRules_(),
    dataVersion: getDataVersion_(),
    generatedAt: new Date().toISOString()
  };
}

/** Snapshot kontrak header seluruh RAW sheet (anti-drift, DATA_MODEL.md §8) */
function getHeaderSchemaAll_() {
  var names = [SHEETS.SITE_SUL, SHEETS.SITE_KAL, SHEETS.SITE_PLN,
    SHEETS.INBOUND, SHEETS.INBOUND_RETURN, SHEETS.LOM];
  var out = { capturedAt: new Date().toISOString(), sheets: {} };
  names.forEach(function (n) {
    try { out.sheets[n] = getHeaderSnapshot_(n); }
    catch (e) { out.sheets[n] = { error: String(e) }; }
  });
  return out;
}

/* ============================================================
 * REKONSILIASI MANUAL vs ENGINE (parallel run — keputusan user)
 * Tidak mengubah business logic: hanya menyandingkan angka tabel
 * input manual dengan hasil engine + delta, agar setiap selisih
 * bisa diinvestigasi via lineage/metric-wids SEBELUM engine diubah.
 * ============================================================ */

var MONTH_UP = MONTH_NAMES; // sudah uppercase

/** Normalisasi label bulan panjang/pendek -> 'JAN'..'DES' atau null */
function normMonthLabel_(v) {
  var s = toStr_(v).toUpperCase().trim();
  if (!s) return null;
  for (var i = 0; i < MONTH_UP.length; i++) {
    if (s === MONTH_UP[i] || s.indexOf(MONTH_UP[i]) === 0) return MONTH_UP[i];
  }
  var en = MONTH_EN;
  for (var j = 0; j < en.length; j++) {
    if (s.indexOf(en[j]) === 0) return MONTH_UP[j];
  }
  return null;
}

/**
 * Agregasi tabel format-panjang menjadi map key->jumlah.
 * matrix: {headers, rows}; keyHeaders: nama kolom kunci; valueHeader: kolom angka.
 * Baris sampah (bulan tidak sah / jumlah bukan angka / PO Year beda) diabaikan.
 */
function aggLongFormat_(matrix, keyHeaders, valueHeader, year) {
  var out = {};
  if (!matrix || !matrix.headers || !matrix.headers.length) return out;
  var H = matrix.headers.map(normHeader_);
  var idx = {};
  keyHeaders.forEach(function (k) { idx[k] = H.indexOf(normHeader_(k)); });
  var iVal = H.indexOf(normHeader_(valueHeader));
  var iYear = H.indexOf(normHeader_('PO Year'));
  if (iVal < 0 || keyHeaders.some(function (k) { return idx[k] < 0; })) return out;

  matrix.rows.forEach(function (r) {
    if (iYear >= 0) {
      var y = String(r[iYear]).trim();
      if (y && Number(y) !== Number(year)) return;
    }
    var keyParts = [];
    for (var i = 0; i < keyHeaders.length; i++) {
      var rawPart = String(r[idx[keyHeaders[i]]]).trim();
      var part = keyHeaders[i].toLowerCase() === 'bulan'
        ? normMonthLabel_(rawPart)
        : rawPart.toUpperCase();
      if (!part) return; // baris tidak sah
      keyParts.push(part);
    }
    var val = num_(r[iVal]);
    if (!val && String(r[iVal]).trim() !== '0') return; // jumlah kosong/bukan angka
    var key = keyParts.join('||');
    out[key] = (out[key] || 0) + val;
  });
  return out;
}

function buildCompareSection_(label, manualMatrix, engineMatrix, keyHeaders, valueHeader, year, catToDef) {
  var man = aggLongFormat_(manualMatrix, keyHeaders, valueHeader, year);
  var eng = aggLongFormat_(engineMatrix, keyHeaders, valueHeader, year);

  var keys = {};
  Object.keys(man).forEach(function (k) { keys[k] = true; });
  Object.keys(eng).forEach(function (k) { keys[k] = true; });

  var rows = Object.keys(keys).sort().map(function (k) {
    var m = man.hasOwnProperty(k) ? man[k] : null;
    var e = eng.hasOwnProperty(k) ? eng[k] : null;
    return {
      key: k.split('||'),
      manual: m,
      engine: e,
      delta: (m === null || e === null) ? null : (e - m)
    };
  });

  var summary = { matched: 0, diff: 0, manualOnly: 0, engineOnly: 0 };
  rows.forEach(function (r) {
    if (r.manual === null) summary.engineOnly++;
    else if (r.engine === null) summary.manualOnly++;
    else if (r.delta === 0) summary.matched++;
    else summary.diff++;
  });

  // Metadata interpretasi per kategori (mencegah salah baca snapshot)
  var metricMeta = null;
  if (catToDef) {
    metricMeta = {};
    Object.keys(catToDef).forEach(function (k) {
      var def = METRIC_DEFS[catToDef[k]];
      if (!def) return;
      metricMeta[k] = {
        type: def.timeBasis,
        periodApplied: def.type === 'date',
        note: def.timeBasis === 'SNAPSHOT_STATUS'
          ? 'Snapshot status saat ini — angka identik di semua bulan, bukan capaian periode.'
          : undefined
      };
    });
  }

  return { sheet: label, keyHeaders: keyHeaders, valueHeader: valueHeader,
           metricMeta: metricMeta, summary: summary, rows: rows };
}

/**
 * Perbandingan penuh manual vs engine untuk tahun berjalan.
 * ?action=compare[&year=2026]
 */
function getManualVsEngineCompare_(year) {
  var y = year ? Number(year) : ACTIVE_YEAR;

  // Pvt Dash Sul (manual) vs ENGINE Pvt Dash Sul
  var secPvt = buildCompareSection_(
    'Pvt Dash Sul',
    readSheetRawMatrixOpt_(SHEETS.PVT_SUL),
    readSheetRawMatrixOpt_(ENGINE_SHEETS.PVT_DASH_SUL),
    ['Kategori', 'Bulan', 'Zona'], 'Jumlah', y, ENGINE_CAT_TO_DEF);

  // Pivot Kal vs ENGINE Pivot Kal
  var secKal = buildCompareSection_(
    'Pivot Kal',
    readSheetRawMatrixOpt_(SHEETS.PIVOT_KAL),
    readSheetRawMatrixOpt_(ENGINE_SHEETS.PIVOT_KAL),
    ['Kategori', 'Bulan'], 'Jumlah', y, ENGINE_CAT_KAL_TO_DEF);

  // Dashboard Sulawesi: bandingkan kolom ACH manual vs Ach engine
  var secDash = buildCompareSection_(
    'Dashboard Sulawesi (Ach)',
    readSheetRawMatrixOpt_(SHEETS.DASH_SUL),
    readSheetRawMatrixOpt_(ENGINE_SHEETS.DASH_SULAWESI),
    ['Milestone', 'Bulan', 'Zona'], 'Ach', y, DASHSUL_MILESTONE_DEF);

  return {
    year: y,
    dataVersion: getDataVersion_(),
    generatedAt: new Date().toISOString(),
    note: 'Delta ≠ 0 JANGAN langsung dianggap engine salah. Telusuri dulu via ' +
      'action=metric-wids (lineage): cached Excel lama salah / data berubah / ' +
      'hitungan lama terlalu longgar / tanggal invalid / definisi bisnis berbeda.',
    sections: [secPvt, secKal, secDash]
  };
}

/* ============================================================
 * SMOKE TEST ENGINE — jalankan dari editor Apps Script
 * Membangun agregasi di memori (TANPA menulis apa pun).
 * ============================================================ */
function test_engine_smoke() {
  var sul = readSheetObjects_(SHEETS.SITE_SUL);
  var kal = readSheetObjects_(SHEETS.SITE_KAL);
  Logger.log('Rows SUL=' + sul.length + ' KAL=' + kal.length);
  ['mos', 'hi_done', 'connected', 'sm_atp', 'fi_ineom'].forEach(function (m) {
    Logger.log(m + ': SUL=' + countMetric_(sul, FIELDS_SUL, m, {}).value +
      ' KAL=' + countMetric_(kal, FIELDS_KAL, m, {}).value);
  });
  var aug = countMetric_(sul, FIELDS_SUL, 'mos', { year: ACTIVE_YEAR, month: 8 });
  Logger.log('MOS SUL Aug' + ACTIVE_YEAR + '=' + aug.value + ' quality=' + aug.quality);
  Logger.log('PvtDashSul rows=' + (buildEnginePvtDashSul_(sul, ACTIVE_YEAR).length - 1));
  Logger.log('PivotKal rows=' + (buildEnginePivotKal_(kal, ACTIVE_YEAR).length - 1));
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
    if (isProtectedSheetName_(sheetName)) continue; // jangan bocorkan sheet sistem auth (USERS/SESSIONS/AUDIT_LOG)
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
 * Manual trigger - Jalankan dari Script Editor:
 *   installTriggers()     -> pasang onEditHandler (SEKALI saja)
 *   runEngineSync_()      -> generate sheet ENGINE_* (atau via API action=sync-engine)
 *   test_engine_smoke()   -> uji agregasi di memori tanpa menulis
 *
 * Setup token role (Script Properties):
 *   YPTT_TOKEN_ADMIN    = <token rahasia admin>
 *   YPTT_TOKEN_OPERATOR = <token operator>
 *   YPTT_TOKEN_VIEWER   = <token viewer> (opsional)
 */
