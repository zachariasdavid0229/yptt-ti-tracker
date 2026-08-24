# 📝 CATATAN LANJUTAN — YPTT TI Tracker
> Dibuat otomatis: 23 Agustus 2026 · Untuk melanjutkan pekerjaan besok

## 🔗 Link & Kredensial
| Item | Nilai |
|------|-------|
| Web App (live) | https://zachariasdavid0229.github.io/yptt-ti-tracker/ |
| Repo GitHub | github.com/zachariasdavid0229/yptt-ti-tracker (branch `main`, deploy otomatis) |
| GAS Backend (URL AKTIF) | `https://script.google.com/macros/s/AKfycbyMFXVcUZtsUDdchmscpgmBtvgMCN-66kP5iMjBnJwJ1aNeZ1kxGRKi-oMzAYW27PXs/exec` |
| Spreadsheet Key | `1Iegz1iOI97vs_Qnt3RIcGM6Euy5VGsKl_H5bLLAIuYw` |
| Login GitHub | zachariasdavid0229 |

## 📁 File Aplikasi (folder ini)
- `index.html` — UI lengkap (Dashboard / Site SUL / Site KAL / Pivot Data) + splash screen Alien Blue
- `style.css` — tema Dark Blue + Glassmorphism + Excel-style tables
- `script.js` — semua logika frontend (cache, lazy load, CRUD generik, chart)
- `Code.gs` — backend GAS (salin ke script.google.com saat ada perubahan!)
- `yptt-1.png` — logo (dipakai di splash & header)

## ✅ Status Saat Ini
- Auto-sync DINONAKTIFKAN (pivot manual via web; `syncAllData()` hanya manual)
- Pivot Sul dibuang; 3 pivot = tabel input reguler format panjang:
  - `Pvt Dash Sul`: PO Year | Kategori | Bulan | Zona | Jumlah
  - `Pivot Kal`: PO Year | Kategori | Bulan | Jumlah
  - `Dashboard Sulawesi`: PO Year | Zona | Milestone | Bulan | Plan | Ach | Persen | Remarks
- CRUD lengkap semua sheet + pagination 10/baris + klik baris → popup detail
- Smart dropdown (statis/dinamis/freeSolo), filter kolom bertingkat + debounce
- Excel-style table: header gradient berikon + sortir klik ▲▼, gridlines, status badge
- Freeze panes 2 kolom + sticky header (applyFreeze, hitung lebar dinamis)
- Tema Dark Blue Glassmorphism + splash Alien Blue (logo yptt-1.png, sekali per sesi)
- Full Dashboard: header statistik (incl Issue/Blocking), KPI %, 4 grafik, blok sheet asli ditumpuk vertikal (prune baris/kolom kosong), 5 data terbaru
- Performa: cache localStorage TTL 5 menit (SWR), lazy staged rendering, loading progress n/4

## ⏳ PENDING (besok)
1. **Tempel layout asli `Dashboard_2026`** (blok TI SULAWESI/KALIMANTAN dgn Qty/Plan/Ach/% per bulan) → Trend line otomatis muncul (sekarang auto-hidden)
2. **Bersihkan sisa tempelan lama** di `Pvt Dash Sul` (baris 4–93) & `Pivot Kal` saat tim siap input via web — grafik otomatis pindah sumber (prioritas 3 lapis sudah dipasang)
3. Verifikasi data Site_KAL terbaru (Excel baru ~814 baris; live terakhir dicek 182)
4. Opsional: endpoint ringkas backend untuk kurangi payload kunjungan pertama

## 🔧 Pola Penting (jangan dilupakan)
- Tiap rilis frontend: **bump `?v=YYYYMMDD`** di index.html (cache buster) → commit → push
- Perubahan Code.gs: salin manual ke Apps Script → *Manage deployments → ✏️ → New version*
- Mutasi data via POST body JSON `{action, ...}` (GAS tak mendukung PUT/DELETE)
- Edit selalu merge nilai lama (`buildRowForSheet_`) → kolom ekstra SUL aman
- Tes mobile/emulasi: skrip di `C:\Users\Admin\AppData\Local\Temp\opencode\test-mobile2.js`
