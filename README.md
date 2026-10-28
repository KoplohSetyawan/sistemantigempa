# 🌐 PS-212 Sistem Anti Gempa

Sistem deteksi gempa real-time berbasis web dengan peta satelit interaktif, pencarian zona aman berbasis AI, dan peringatan dini untuk wilayah Indonesia.

![PS-212 Sistem Anti Gempa](https://img.shields.io/badge/PS--212-Sistem%20Anti%20Gempa-22c55e?style=for-the-badge)

## ✨ Fitur Utama

- 🔴 **Deteksi Gempa Real-time** — Data dari BMKG (Indonesia) & USGS (fallback)
- 🛰️ **Peta Satelit Interaktif** — Citra Esri World Imagery dengan Leaflet
- 🛡️ **Pencarian Zona Aman** — Mulai dari 10 km dari pusat gempa, berbasis AI
- 🤖 **Analisis & Rekomendasi AI** — Mitigasi gempa dalam Bahasa Indonesia
- 🎨 **Tema Warna Dinamis** — Hijau (ringan), Kuning (sedang), Merah (besar)
- 🌏 **Fokus Indonesia** — Hanya menampilkan gempa di wilayah Indonesia
- ⚠️ **Sistem Peringatan** — Alert otomatis untuk gempa M ≥ 5.0
- 📰 **Halaman Berita** — Berita gempa dari YouTube & siaran pers
- 🔐 **Login Admin** — Admin bisa kelola berita (video YouTube + siaran pers)
- 📱 **Responsive Design** — Bekerja di desktop & mobile

## 🛠️ Teknologi

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite)
- **Map**: Leaflet + Esri World Imagery
- **AI**: z-ai-web-dev-sdk (LLM)
- **Data Sources**: BMKG (data.bmkg.go.id) & USGS (earthquake.usgs.gov)

## 📋 Persyaratan Sistem

Sebelum menjalankan proyek, pastikan sudah terinstall:

- **Node.js** versi 18.17 atau lebih baru → [Download](https://nodejs.org/)
- **Bun** (opsional, tapi direkomendasikan) → [Install](https://bun.sh/)
- **Git** → [Download](https://git-scm.com/)

## 🚀 Cara Menjalankan Secara Lokal

### Langkah 1: Ekstrak File
Ekstrak file zip yang sudah didownload ke folder tujuan:
```bash
# Di Windows: klik kanan zip → Extract All
# Di Mac/Linux:
unzip ps-212-sistem-anti-gempa.zip
cd ps-212-sistem-anti-gempa
```

### Langkah 2: Install Dependencies

**Opsi A — Menggunakan Bun (direkomendasikan, lebih cepat):**
```bash
bun install
```

**Opsi B — Menggunakan npm:**
```bash
npm install
```

### Langkah 3: Cek File `.env`
File `.env` **sudah ada** di dalam proyek (tidak perlu dibuat). Cek isinya:
```bash
cat .env
```

Isi seharusnya:
```
DATABASE_URL=file:./db/custom.db
```

Jika file `.env` tidak ada (misal terhapus), salin dari `.env.example`:
```bash
# Mac/Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

### Langkah 4: Inisialisasi Database
Buat database SQLite dan tabel dari schema Prisma:
```bash
# Menggunakan Bun
bun run db:push

# Menggunakan npm
npx prisma db push --accept-data-loss
```

Perintah ini akan membuat file `db/custom.db` secara otomatis.

### Langkah 5: Jalankan Server Development
```bash
# Menggunakan Bun
bun run dev

# Menggunakan npm
npm run dev
```

Server akan berjalan di **http://localhost:3000**

### Langkah 6: Buka di Browser
Buka browser dan kunjungi:
```
http://localhost:3000
```

Dashboard sistem anti-gempa akan tampil. Tunggu 10-15 detik untuk pertama kali (memuat data dari BMKG/USGS & generate AI).

## 📁 Struktur Proyek

```
ps-212-sistem-anti-gempa/
├── prisma/
│   └── schema.prisma          # Schema database (Earthquake, SafeZone, Alert, News)
├── public/
│   └── logo.svg               # Logo
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── earthquakes/
│   │   │   │   ├── latest/    # API gempa terbaru
│   │   │   │   └── list/      # API daftar gempa
│   │   │   ├── safe-zones/    # API zona aman + AI
│   │   │   ├── alerts/        # API peringatan
│   │   │   ├── auth/          # API login/logout/session admin
│   │   │   │   ├── login/
│   │   │   │   ├── logout/
│   │   │   │   └── session/
│   │   │   └── news/          # API CRUD berita (admin only)
│   │   │       └── [id]/
│   │   ├── admin/             # Halaman admin
│   │   │   ├── login/         # Login admin
│   │   │   └── page.tsx       # Dashboard admin (kelola berita)
│   │   ├── berita/            # Halaman berita publik
│   │   │   └── page.tsx
│   │   ├── layout.tsx         # Layout root + metadata
│   │   ├── page.tsx           # Dashboard utama
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # Komponen shadcn/ui
│   │   └── earthquake-map.tsx # Komponen peta satelit Leaflet
│   └── lib/
│       ├── db.ts              # Prisma client
│       ├── auth.ts            # Autentikasi admin (cookie session)
│       ├── earthquake.ts      # Fetch data BMKG/USGS
│       └── safe-zones.ts      # Algoritma zona aman + AI
├── .env.example               # Template environment
├── package.json
├── prisma/schema.prisma
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🎯 Cara Menggunakan

1. **Dashboard Utama** — Menampilkan gempa terbaru, peta satelit, dan zona aman
2. **Klik gempa di daftar** — Analisis zona aman untuk gempa tersebut
3. **Tombol "Cari Zona Aman"** — Generate ulang rekomendasi zona aman + AI
4. **Peta Satelit** — Klik marker untuk detail episentrum & zona aman
5. **Auto-refresh** — Data diperbarui otomatis setiap 60 detik

## 🎨 Skema Warna Dinamis

Warna dashboard berubah otomatis sesuai kekuatan gempa terbaru:

| Magnitudo | Warna | Status |
|-----------|-------|--------|
| M < 5.0 | 🟢 Hijau | Gempa Ringan |
| M 5.0 – 5.9 | 🟡 Kuning | Gempa Sedang |
| M ≥ 6.0 | 🔴 Merah | Gempa Besar |

## 📊 Sumber Data

- **BMKG** (Badan Meteorologi, Klimatologi, dan Geofisika)
  - `https://data.bmkg.go.id/autogempa.xml` — Gempa terbaru
  - `https://data.bmkg.go.id/gempaterkini.json` — Gempa terkini M ≥ 5.0
  - `https://data.bmkg.go.id/gempadirasakan.json` — Gempa dirasakan

- **USGS** (United States Geological Survey)
  - `https://earthquake.usgs.gov/fdsnws/event/1/query` — Fallback global (dengan filter Indonesia)

## 🔐 Admin & Berita

### Login Admin
- **URL**: `http://localhost:3000/admin/login`
- **Kredensial default**:
  - Username: `admin`
  - Password: `gempa212`

> ⚠️ **Penting untuk Produksi**: Ganti kredensial default dengan set environment variable di file `.env`:
> ```
> ADMIN_USERNAME= username_anda
> ADMIN_PASSWORD= password_kuat_anda
> SESSION_SECRET= random_string_panjang
> ```

### Halaman Berita
- **URL**: `http://localhost:3000/berita`
- Publik (tidak perlu login)
- Menampilkan berita gempa dari YouTube & siaran pers

### Dashboard Admin
- **URL**: `http://localhost:3000/admin` (harus login dulu)
- Kelola berita: tambah, edit, hapus
- 2 tipe berita:
  - 📹 **Video YouTube** — paste URL YouTube, auto-embed & thumbnail
  - 📄 **Siaran Pers** — tulis artikel berita gempa
- Fitur: kategori (Gempa/Tsunami/Edukasi/Umum), pin berita, draft/publish

## ⚠️ Troubleshooting

### Error: "Cannot find module 'z-ai-web-dev-sdk'"
Pastikan semua dependencies terinstall:
```bash
bun install
# atau
npm install
```

### Error: Database tidak bisa dibuat
Pastikan folder `db/` ada dan punya permission write:
```bash
mkdir -p db
chmod 755 db
bun run db:push
```

### Panel AI kosong
AI menggunakan z-ai-web-dev-sdk yang butuh API key. Jika rate-limited (error 429), sistem otomatis menggunakan **fallback text** rule-based. Jadi panel AI akan tetap menampilkan konten.

### Peta tidak tampil
Pastikan ada koneksi internet (peta satelit di-load dari Esri). Jika di belakang proxy/firewall, pastikan domain berikut diizinkan:
- `server.arcgisonline.com` (peta satelit)
- `unpkg.com` (Leaflet JS/CSS)

### Port 3000 sudah digunakan
Ubah port di `package.json`:
```json
"dev": "next dev -p 3001"
```

## 🔧 Build untuk Production

```bash
# Build
bun run build

# Jalankan production server
bun run start
```

## 📝 Lisensi

Proyek ini dibuat untuk tujuan edukasi dan mitigasi bencana. Data gempa bersumber dari BMKG & USGS (publik).

## 🆘 Bantuan

Jika mengalami masalah:
1. Cek file `dev.log` untuk error log
2. Pastikan koneksi internet stabil
3. Pastikan Node.js versi 18.17+ atau Bun terinstall
4. Pastikan database sudah di-push (`bun run db:push`)

---

**PS-212 Sistem Anti Gempa** — Tetap aman, waspada bencana. 🙏
