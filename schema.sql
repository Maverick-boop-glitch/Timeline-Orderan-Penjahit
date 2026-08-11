-- Skema database D1 untuk aplikasi Jahitan.
--
-- Desain: seluruh state aplikasi (master penjahit, master produk,
-- dan semua order) disimpan sebagai satu baris JSON di tabel
-- app_state. Ini sengaja dibuat sederhana (mirip key-value store)
-- supaya cocok 1:1 dengan struktur data yang sudah dipakai di
-- frontend (index.html) tanpa perlu mapping kolom yang rumit.
--
-- Konsekuensi: setiap kali ada perubahan (tambah order, ubah
-- status, edit master data, dsb), seluruh state dikirim ulang dan
-- menimpa baris ini (last-write-wins). Ini cukup untuk skala satu
-- toko dengan beberapa staf. Kalau ke depannya butuh laporan SQL
-- lintas tabel yang lebih canggih (mis. query langsung ke kolom
-- qty/status di database), skema ini bisa dipecah jadi tabel
-- tailors/products/orders yang relasional — lihat catatan di
-- README.md.

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
