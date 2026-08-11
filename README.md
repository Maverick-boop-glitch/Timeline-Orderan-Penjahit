# Jahitan — Sistem Laporan & Estimasi Timeline Order Penjahit

Aplikasi web satu-halaman (HTML/CSS/JS murni, tanpa build tools) untuk mengelola
order jahit dan mengestimasi tanggal & jam selesai secara otomatis berdasarkan
master data produk (rata-rata waktu kerja/pcs) dan kapasitas kerja penjahit.

## Menjalankan secara lokal

Tidak perlu instalasi apa pun. Cukup buka `index.html` langsung di browser,
atau jalankan server statis sederhana:

```bash
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

## Penyimpanan data

Aplikasi ini memakai **Cloudflare D1** (database SQL bawaan Cloudflare) lewat
sebuah Pages Function di `functions/api/state.js`. Semua master data
(penjahit, produk) dan seluruh order disimpan **terpusat** di database itu,
jadi datanya **sinkron di semua perangkat** — cocok untuk dipakai beberapa
staf/penjahit sekaligus dari HP atau komputer masing-masing.

Jika endpoint `/api/state` belum tersedia (D1 belum dihubungkan, atau
aplikasi dibuka tanpa menjalankan Functions-nya), aplikasi tetap bisa
dipakai normal, hanya saja perubahan tidak tersimpan permanen (indikator di
pojok kanan atas halaman Master Data akan menunjukkan status ini).

## Setup Cloudflare D1 (database)

Butuh [Node.js](https://nodejs.org) & [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) terpasang (`npm install -g wrangler`), lalu login:

```bash
wrangler login
```

1. **Buat database D1:**

   ```bash
   wrangler d1 create jahitan-db
   ```

   Perintah ini menampilkan blok konfigurasi berisi `database_id`. Salin
   nilai `database_id` tersebut, lalu tempel ke `wrangler.toml` (ganti
   `GANTI_DENGAN_DATABASE_ID_ANDA`).

2. **Buat tabel** dengan skema yang sudah disiapkan:

   ```bash
   # untuk database di cloud (production)
   wrangler d1 execute jahitan-db --remote --file=./schema.sql

   # (opsional) untuk testing lokal
   wrangler d1 execute jahitan-db --local --file=./schema.sql
   ```

3. **Coba jalankan lokal** (opsional, sebelum deploy):

   ```bash
   wrangler pages dev . --d1 DB=jahitan-db
   ```

   Buka `http://localhost:8788` — cek indikator di halaman Master Data,
   harus muncul "Tersambung ke database…".

## Deploy ke Cloudflare Pages via GitHub

1. **Push repo ini ke GitHub** (termasuk `wrangler.toml`, folder
   `functions/`, dan `schema.sql`):

   ```bash
   git init
   git add .
   git commit -m "Initial commit: sistem laporan & estimasi timeline order penjahit"
   git branch -M main
   git remote add origin https://github.com/<username>/<nama-repo>.git
   git push -u origin main
   ```

2. **Buka Cloudflare Dashboard** → **Workers & Pages** → **Create
   application** → tab **Pages** → **Connect to Git**, lalu pilih repo ini.

3. Pengaturan build:

   | Setting                  | Nilai            |
   |---------------------------|-------------------|
   | Framework preset          | `None`            |
   | Build command             | *(kosongkan)*     |
   | Build output directory    | `/`               |

4. Klik **Save and Deploy** — tunggu build selesai.

5. **Hubungkan database D1 ke project Pages ini** (langkah wajib — binding
   di `wrangler.toml` hanya berlaku untuk `wrangler pages dev` lokal, untuk
   production harus di-set lewat dashboard):

   Buka project Pages Anda → **Settings** → **Functions** →
   **D1 database bindings** → **Add binding**:
   - Variable name: `DB`
   - D1 database: pilih `jahitan-db`

   Simpan, lalu **re-deploy** project (Deployments → tombol "..." →
   **Retry deployment**, atau push commit baru) supaya binding aktif.

6. Buka `https://<nama-project>.pages.dev` — indikator di halaman Master
   Data akan menunjukkan "Tersambung ke database" begitu binding berhasil.

Setiap kali Anda `git push` perubahan baru ke branch `main`, Cloudflare
Pages otomatis rebuild & redeploy (binding D1 yang sudah di-set di
dashboard akan tetap terpakai).

### ⚠️ Catatan keamanan

Endpoint `/api/state` saat ini **tidak memakai autentikasi** — siapa pun
yang tahu URL situs bisa membaca maupun menimpa seluruh data lewat
`fetch('/api/state')`. Ini cukup untuk pemakaian internal dengan tim
terpercaya, tapi kalau situs ini publik/mudah ditemukan, pertimbangkan
menambahkan proteksi seperti:

- **Cloudflare Access** (mudah, tanpa ubah kode — tinggal aktifkan di
  dashboard untuk membatasi siapa yang boleh membuka situs ini sama
  sekali), atau
- Login sederhana di aplikasi + memvalidasi token/API key di
  `functions/api/state.js` sebelum membaca/menulis ke D1.

Beri tahu saya kalau Anda ingin salah satu dari ini ditambahkan.



## Struktur file

```
jahitan-app/
├── index.html            # seluruh UI aplikasi (HTML+CSS+JS)
├── functions/
│   └── api/
│       └── state.js       # Pages Function: GET/POST /api/state (baca/tulis D1)
├── schema.sql              # skema tabel D1
├── wrangler.toml            # konfigurasi nama project & binding D1 (untuk dev lokal)
└── README.md
```

## Mengubah master data

Buka tab **Master Data** di aplikasi untuk menambah/mengubah/menghapus:

- **Penjahit** — nama, jam kerja efektif/hari, status.
- **Produk** — kode, nama, kategori, **rata-rata waktu kerja per pcs
  (menit)**, HPP, harga jual, satuan, minimal order.

Perubahan ini langsung dipakai ulang oleh mesin estimasi di form **Order
Baru** dan tabel **Data Order** — tidak perlu edit kode.

Jika ingin mengganti data awal (dummy) yang dikirim pertama kali ke database
(saat `/api/state` masih kosong), edit array `state.tailors`,
`state.products`, dan fungsi `buildOrders()` di dalam tag `<script>` pada
`index.html`.
