# 🚀 PS-212 Sistem Anti Gempa — Panduan Deploy Vercel + Neon

Panduan lengkap upload ke GitHub → Vercel + setup Neon PostgreSQL database.

## 📦 Yang Harus Anda Lakukan (5 Langkah)

### Langkah 1: Download & Ekstrak
1. Download file: `ps-212-Lengkap-Vercel-Neon.zip`
2. Ekstrak ke folder di komputer Anda

### Langkah 2: Upload ke GitHub
1. Buka https://github.com → login/sign up
2. Klik **+** → **New repository**
3. Nama: `ps-212-sistem-anti-gempa` → Public → **Create repository**
4. Klik **"uploading an existing file"**
5. Drag & drop **semua isi folder** (bukan folder utuhnya)
6. Klik **Commit changes**

### Langkah 3: Daftar Neon (Database Gratis)
1. Buka https://neon.tech → **Sign up** → **Continue with GitHub**
2. Klik **New Project**:
   - Project name: `ps-212-gempa`
   - Database name: `berita`
   - Region: **Singapore - ap-southeast-1** ⚠️ penting!
3. Klik **Create project**
4. **Copy connection string** (format: `postgresql://...?sslmode=require`)
5. Simpan di Notepad

### Langkah 4: Deploy ke Vercel
1. Buka https://vercel.com → **Sign Up** → **Continue with GitHub**
2. Klik **Add New** → **Project**
3. Pilih repo `ps-212-sistem-anti-gempa` → **Import**
4. ⚠️ **JANGAN klik Deploy dulu!** Scroll ke **Environment Variables**
5. Tambahkan 3 variabel:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | paste connection string Neon (postgresql://...) |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `gempa212` |

6. Klik **Deploy**
7. Tunggu 2-3 menit → muncul **"Congratulations!"** 🎉
8. URL: `https://ps-212-sistem-anti-gempa-xxx.vercel.app`

### Langkah 5: Push Schema ke Neon
Database Neon masih kosong (belum ada tabel). Jalankan di komputer lokal:

```bash
# Di folder proyek Anda
# 1. Set DATABASE_URL ke Neon (sementara)
# Windows PowerShell:
$env:DATABASE_URL="postgresql://neondb_owner:npg_xxx@ep-xxx.neon.tech/berita?sslmode=require"

# Mac/Linux:
export DATABASE_URL="postgresql://neondb_owner:npg_xxx@ep-xxx.neon.tech/berita?sslmode=require"

# 2. Switch schema ke PostgreSQL
npm run db:use-postgres

# 3. Push schema ke Neon (buat tabel)
npx prisma db push

# 4. Kembalikan ke SQLite untuk development
npm run db:use-sqlite

# 5. Commit & push ke GitHub
git add .
git commit -m "Setup Neon PostgreSQL"
git push
```

Vercel akan auto-deploy ulang. **Selesai!** ✅

---

## 🎯 Cara Kerja Database (Auto-Switch)

Sistem menggunakan `src/lib/db-config.ts` yang **otomatis deteksi** database:

| Environment | DATABASE_URL | Provider | File |
|-------------|--------------|----------|------|
| **Lokal** | `file:./db/custom.db` | SQLite | `db/custom.db` |
| **Vercel** | `postgresql://...neon.tech/...` | PostgreSQL | Neon cloud |

**Tidak perlu ubah kode apa-apa** — sistem otomatis switch berdasarkan `DATABASE_URL`.

### Script yang Tersedia

```bash
npm run db:use-sqlite     # Switch ke SQLite (development)
npm run db:use-postgres   # Switch ke PostgreSQL (production)
npm run db:sync           # Auto-detect dari DATABASE_URL
npm run db:push           # Push schema ke database aktif
```

---

## ✅ Verifikasi Setelah Deploy

Buka URL Vercel Anda dan test:

1. **Dashboard**: `https://[nama].vercel.app/` → gempa real-time + peta satelit
2. **Berita**: `https://[nama].vercel.app/berita` → daftar berita
3. **Admin Login**: `https://[nama].vercel.app/admin/login`
   - Username: `admin`
   - Password: `gempa212`
4. **Buat Berita**: Klik "Tambah Berita" → isi form → Simpan
5. **Cek Halaman Berita**: Berita baru harus muncul di `/berita`

Jika berita berhasil dibuat → **Neon PostgreSQL bekerja!** ✅

---

## 🔧 Troubleshooting

### Error: "Build failed" di Vercel
- Pastikan `next.config.ts` TIDAK ada `output: "standalone"`
- Pastikan `package.json` build script: `"build": "node scripts/sync-schema.mjs auto && next build"`

### Error: "Prisma Client not generated"
- Sudah ada `postinstall: "prisma generate"` di package.json
- Jika masih error, tambahkan manual di Vercel: Install Command = `npm install && npx prisma generate`

### Error: "Database connection failed"
- Cek `DATABASE_URL` di Vercel → Settings → Environment Variables
- Pastikan URL Neon ada `?sslmode=require` di akhir
- Pastikan tidak ada spasi di awal/akhir URL

### Berita gagal dibuat di Vercel
- Cek `/api/health` → `database.ready` harus `true`
- Jika `false`, berarti Neon belum ter-set atau schema belum di-push
- Jalankan Langkah 5 (Push Schema ke Neon)

### Peta tidak tampil
- Cek koneksi internet (peta dari Esri)
- Tidak perlu API key (gratis)

---

## 📋 Checklist Cepat

```
□ Download ps-212-Lengkap-Vercel-Neon.zip
□ Ekstrak file
□ Upload ke GitHub (drag-drop isi folder)
□ Daftar Neon (neon.tech, login GitHub)
□ Buat project Neon: region Singapore
□ Copy connection string Neon
□ Login Vercel → Import project GitHub
□ Set 3 Environment Variables di Vercel
□ Deploy
□ Push schema ke Neon (npm run db:use-postgres && npx prisma db push)
□ Test: login admin + buat berita
□ SELESAI! 🎉
```

**Waktu total: 15-20 menit** | **Biaya: GRATIS**

---

## 🆘 Butuh Bantuan?

Jika ada error, kirim screenshot ke AI assistant dengan info:
1. Di langkah mana error muncul?
2. Pesan error apa (copy-paste teks)?
3. URL Vercel Anda (jika sudah deploy)

Selamat deploy! 🚀
