# UI_UX_AUTH_WRITE_FIX — YPTT TI Tracker

Tanggal: 2026-08-26 · Scope: Global frontend auth/write + Ringkasan Sulawesi pagination
Status perubahan: **LOKAL SAJA — belum di-commit/push/deploy** (menunggu review)

---

## 1. ROOT CAUSE

Error yang dilaporkan:

```
Gagal: Akses ditolak untuk action "update-site-kal":
butuh role OPERATOR, role Anda: ANONYMOUS.
```

Akar masalah (bukan khusus Site KAL):

1. **Semua fitur write melewati satu jalur yang sama (`apiCall`)** yang selalu
   mengirim `token: getToken()` membaca `localStorage['yptt_token']`.
   Ketika tidak ada token tersimpan → backend menolak dengan role ANONYMOUS
   untuk SEMUA action RAW (site-sul/kal/pln), bukan hanya site-kal.
2. **Tidak ada guard frontend**: request tetap dikirim ke backend walau user
   jelas anonymous → error mentah backend muncul sebagai pesan utama.
3. **Dua mekanisme token sempat bertabrakan** saat implementasi awal
   (`yptt_token` vs `yptt_auth_token`) — sudah dirapikan menjadi SATU sumber.
4. **Faktor data**: token pada `token.txt` lokal terverifikasi **INVALID**
   oleh backend (`role=INVALID`). Token yang salah/expires menghasilkan
   gejala ANONYMOUS yang identik meski user merasa "sudah login".

## 2. INVENTARIS SEMUA WRITE ACTION (hasil audit)

Ditemukan di `script.js` (SHEET_CONFIG + handler) dan diverifikasi terhadap
`Code.gs` → `WRITE_ACTIONS` (backend = source of truth):

| # | Action | Resource | Required Role (backend) | Frontend Function |
|---|--------|----------|-------------------------|-------------------|
| 1 | add-site-sul | Site_SUL | OPERATOR | saveForm() mode add |
| 2 | update-site-sul | Site_SUL | OPERATOR | saveForm() mode edit |
| 3 | delete-site-sul | Site_SUL | OPERATOR | deleteRow() / deleteFromDetail() |
| 4 | add-site-kal | Site_KAL | OPERATOR | saveForm() mode add |
| 5 | update-site-kal | Site_KAL | OPERATOR | saveForm() mode edit |
| 6 | delete-site-kal | Site_KAL | OPERATOR | deleteRow() / deleteFromDetail() |
| 7 | add-site-pln | Site Upgrade PLN | OPERATOR | saveForm() mode add |
| 8 | update-site-pln | Site Upgrade PLN | OPERATOR | saveForm() mode edit |
| 9 | delete-site-pln | Site Upgrade PLN | OPERATOR | deleteRow() / deleteFromDetail() |
| 10 | pivot-add | Pvt Dash Sul / Pivot Kal / Dashboard Sulawesi | OPERATOR* (**terkunci Pivot Lock**) | saveForm() via tab Pivot Data |
| 11 | pivot-update | idem | OPERATOR* (**terkunci Pivot Lock**) | saveForm() via tab Pivot Data |
| 12 | pivot-delete | idem | OPERATOR* (**terkunci Pivot Lock**) | deleteRow() via tab Pivot Data |
| 13 | sync-engine | ENGINE_* sheets | ADMIN | runEngineSync() |

\* Backend `WRITE_ACTIONS` menandai pivot-* sebagai OPERATOR pada mode
"parallel run", namun gate `YPTT_PIVOT_MIGRATED='1'` (enablePivotLock())
menolaknya untuk SEMUA role. Frontend kini memblokir pivot-* lebih awal
sesuai kebijakan aktif; backend tetap authority.

Catatan: Inbound/Return & LOM disebut di komentar gate arsitektur Code.gs,
tetapi **tidak memiliki endpoint write maupun UI edit** pada frontend saat
ini → tidak ada action write untuk resource tersebut yang perlu dibungkus.

READ-only (tidak diubah): health, auth-status/whoami, dashboard pieces,
sheet GET, pivot GET, compare, metric-wids, resolveApiBaseUrl probe.

## 3. WRITE PATH SEBELUMNYA vs SEKARANG

Sebelum:
- `saveForm()` → `apiCall()` (token dikirim, tapi tanpa guard)
- `deleteRow()` → `apiCall()` (idem)
- `runEngineSync()` → `apiCall('sync-engine')` (idem)
- Anonymous → request tetap dikirim → raw error tampil ke user

Sekarang (SEMUA write wajib):
- `saveForm()` → **apiWrite()**
- `deleteRow()` → **apiWrite()**
- `runEngineSync()` → **apiWrite('sync-engine')**
- Tidak ada lagi pemanggil fetch/POST write di luar wrapper
  (diverifikasi: satu-satunya `fetch(` POST selain apiCall adalah
  auth-status verify, yang bersifat read-only verifikasi).

## 4. GLOBAL AUTH FLOW

```
User klik Edit/Save/Hapus/Jalankan Engine
        ↓
saveForm/deleteRow/runEngineSync
        ↓
apiWrite(action, payload)
        ↓
ensureAuthenticatedForWrite(action)
   • sync-engine → butuh role ADMIN
   • pivot-*     → blok (Pivot Lock) — request TIDAK dikirim
   • RAW         → butuh token + role OPERATOR/ADMIN
   • gagal?      → toast friendly + openAuthPanel() + focus input
                   → Promise.reject('AUTH_BLOCKED') — form TIDAK direset
        ↓ (lolos)
apiCall(action, payload)  ← token otomatis dari getToken()
        ↓
Backend requireRole_ (authority tetap di backend)
        ↓
RAW update → ENGINE recalc → dataVersion++
        ↓
setDataVersion(json.data.dataVersion)
invalidateAfterWrite(sheetKey)  (cache purge, TANPA full reload)
loadSheet(key, true) + loadDashboard bila relevan
```

Inisialisasi sesi: `DOMContentLoaded → resolveApiBaseUrl() → initAuth()`
— initAuth memulihkan token dari storage dan (bila ada) memanggil
`verifyAuth({silent:true})` agar badge status langsung benar.

## 5. TOKEN ARCHITECTURE

- **Satu sumber**: `localStorage['yptt_token']` (kompatibel dengan mekanisme
  lama; `getToken()` tetap pembaca tunggal). sessionStorage ikut diisi sebagai
  mirror sesi tab.
- Role sesi: `sessionStorage['yptt_auth_role']` (dibersihkan saat logout/hapus).
- Fungsi: `initAuth() · getAuthToken() · saveAuthToken() · clearAuthToken() ·
  verifyAuth() · getAuthRole()/setAuthRole()`.
- Verifikasi WAJIB sebelum dianggap valid: hanya menerima role
  VIEWER/OPERATOR/ADMIN. Backend membalas `INVALID` untuk token salah →
  frontend membuang token & menampilkan "Token tidak valid".
- Token TIDAK pernah: di-hardcode, di URL, dirender ke DOM (input password +
  `inp.value=''` setelah simpan), atau dicetak ke console (log hanya
  `tokenAttached: true/false`).
- ⚠️ Temuan keamanan: file `token.txt` berada di root repo (untracked) dan
  isinya INVALID. Saran: hapus file, tambahkan ke `.gitignore`, dan set ulang
  token OPERATOR/ADMIN via Script Properties (`YPTT_TOKEN_*`).

## 6. apiWrite() ARCHITECTURE

```js
function apiWrite(action, payload) {
  if (!ensureAuthenticatedForWrite(action)) return reject('AUTH_BLOCKED');
  dbgLog('[WRITE]', { action, tokenAttached: !!getToken(), role });
  return apiCall(action, payload)
    .then(j => { dbgLog('[WRITE]', {action, result:'SUCCESS'}); return j; })
    .catch(err => { dbgLog('[WRITE]', {action, result:'FAILED'}); throw err; });
}
```

`ensureAuthenticatedForWrite()` memakai role hasil VERIFIKASI (bukan tebakan
UI) dan metadata backend (`canWriteRaw`, `canAdmin`) via auth-status.

## 7. ROLE MATRIX (backend = source of truth, Code.gs WRITE_ACTIONS)

Lihat tabel §2. Frontend guard mengikuti persis; tidak ada permission backend
yang diubah/dilonggarkan. Pivot Lock tidak dibobol — justru diperkuat di UI.

## 8. PAGINATION RINGKASAN SULAWESI

- `state.dashboard = { page, pageSize:10, totalRows, totalPages }`
- Pipeline: API data → filter → sort → **pagination (slice)** → render.
  Page change TIDAK memicu request baru (murni slice array lokal).
- Controls: Prev/Next (disabled di ujung) + nomor halaman (≤7 penuh,
  >7 dengan elipsis) + info `Menampilkan X–Y dari N`.
- Reset `page=1` pada filter/sort/dataVersion change: semua jalur render
  non-user memanggil `renderDashboardStage3()` (default reset);
  `goToDashboardPage()` memanggil dengan `skipPageReset=true`.

## 9. ERROR HANDLING (mapper global)

`mapAuthError(err)` — dipanggil di catch `apiCall` (berlaku utk SEMUA tabel,
tidak per-handler):

| Pola error backend | Pesan user |
|---|---|
| ANONYMOUS + OPERATOR | "Token belum tersedia atau tidak valid.\nSilakan masukkan Token Operator." |
| ADMIN required | "Aksi ini membutuhkan role Admin." |
| OPERATOR required | "Aksi ini membutuhkan role Operator." |
| Failed to fetch / HTTP 5xx | "Tidak dapat terhubung ke server." |
| VALIDATION/kolom | "Periksa kembali data yang dimasukkan." |

Raw error selalu dicatat ke console (`[YPTT][RAW-ERROR]`).

## 10. DEBUG MODE (?debug=1)

Contoh output console (tanpa nilai token):
```
[YPTT DEBUG] [AUTH]  role: ANONYMOUS  authenticated: false
[YPTT DEBUG] [WRITE] action: update-site-kal  blockedBeforeRequest: true
[YPTT DEBUG] [WRITE] action: update-site-kal  tokenAttached: true  role: OPERATOR
[YPTT DEBUG] [WRITE] result: SUCCESS
```

## 11. TEST RESULT

### Live (dijalankan terhadap backend v3.0.7-final.1, dataVersion 8)
| Test | Hasil |
|---|---|
| Health check | ✅ UP, backendVersion 3.0.7-final.1, dataVersion 8 |
| auth-status anonymous | ✅ role ANONYMOUS, canWriteRaw=false |
| auth-status token palsu | ✅ role INVALID, authenticated=false → frontend membuang token |
| update-site-kal (anonymous) | ✅ DENIED oleh backend: "butuh role OPERATOR, role Anda: ANONYMOUS" — pesan inilah yang kini diterjemahkan mapper |

### Statis (verifikasi kode)
| Test | Hasil |
|---|---|
| node --check script.js | ✅ SYNTAX OK |
| Semua write melalui apiWrite | ✅ saveForm/deleteRow/runEngineSync; audit findstr: tidak ada fetch POST write lain |
| Form preservation | ✅ closeModal() hanya di then(); catch tidak mereset form |
| Pagination tanpa refetch | ✅ slice array lokal |
| Legacy Dashboard 2026 / Pivot Kalimantan | ✅ tetap tidak ada di index.html |
| Engine/business rule | ✅ Code.gs TIDAK disentuh pada sesi ini |

### Menunggu UAT manual (butuh token OPERATOR valid)
- TEST B: edit+save sukses per resource (SUL/KAL/PLN) dengan token valid.
- Persistensi token setelah reload (harusnya OK: localStorage + initAuth).
- Catatan: token.txt saat ini INVALID → ganti token sebelum UAT.

## 12. FILES CHANGED

| File | Perubahan |
|---|---|
| script.js | Auth state unifikasi (1 sumber token); initAuth/verifyAuth/updateAuthStatusBadge/openAuthPanel/clearTokenUI; ensureAuthenticatedForWrite; apiWrite; mapAuthError + integrasi di apiCall; saveToken rewrite (verify-first, INVALID handling, input dibersihkan); deleteRow→apiWrite; runEngineSync→apiWrite; saveForm catch tanpa toast duplikat; state.authToken/authRole; DOMContentLoaded boot: initAuth setelah resolveApiBaseUrl; renderDashboardPagination info "Menampilkan X–Y dari N" + tombol disabled; renderDashboardStage3(skipPageReset) |
| index.html | Tombol "Simpan & Verifikasi Token", "Hapus Token"; badge default "● Anonymous" |
| Code.gs | ❌ TIDAK DIUBAH (engine/business rules aman) |

## 13. SECURITY VERIFICATION

- [x] Tidak ada token hardcoded / di URL / di HTML / dicetak ke console
- [x] Tidak ada bypass OPERATOR/ADMIN; tidak ada anonymous write path
- [x] Backend authorization tetap authority (tidak diubah)
- [x] Pivot Lock tetap aktif; pivot-* diblokir juga di frontend
- [x] Write success flow: validate → ensure auth → apiWrite → backend →
      RAW update → engine recalc → dataVersion++ → invalidate cache →
      refresh UI (tanpa full page reload)
- [ ] Bersihkan token.txt dari working tree + .gitignore (rekomendasi)
