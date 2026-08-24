# Telegram Referral & Community Growth Bot

Aplikasi manajemen pertumbuhan komunitas Telegram berbasis tautan rujukan langsung (**Direct Group Invite Link**) terintegrasi dengan **Dasbor Admin Web**. Fokus utama aplikasi ini adalah melacak keaslian rujukan (anti-abuse) dan aktivitas anggota tanpa sistem poin/XP atau pembayaran langsung.

---

## 📋 Deskripsi Proyek

Proyek ini dibangun untuk membantu pertumbuhan grup Telegram dengan melacak siapa yang mengundang siapa secara transparan. Untuk mencegah rujukan palsu (bot/akun kloningan), sistem ini dilengkapi dengan **Engine Validasi Anti-Abuse** otomatis yang memeriksa apakah anggota baru benar-benar aktif di grup dan menetap dalam durasi waktu tertentu sebelum rujukan tersebut dianggap **VALID**.

---

## ⚡ Fitur Utama

### 1. Telegram Bot (`@AnoaRevBot`)
*   **Direct Group Invite Links**: Bot membuatkan tautan undangan grup Telegram unik (`t.me/+...`) khusus untuk masing-masing pengguna. Teman yang diundang langsung masuk ke grup tanpa harus melewati chat bot terlebih dahulu.
*   **Pencatatan Otomatis (Group Join Tracking)**: Bot memantau grup dan mendeteksi secara otomatis saat ada anggota baru masuk melalui tautan rujukan unik tersebut.
*   **Statistik Rujukan Pribadi**: Menampilkan jumlah rujukan dengan status `VALID`, `PENDING`, dan `INVALID` secara real-time.
*   **Papan Peringkat (Leaderboard)**: Menampilkan peringkat 10 anggota teratas dengan rujukan valid terbanyak.
*   **Daftar Tugas Kampanye (Tasks)**: Pengguna bisa melihat daftar tugas (misal: bergabung ke channel sponsor) dan menekan tombol cek instan untuk memverifikasi penyelesaiannya.
*   **Check-in Harian (Daily Check-in)**: Fitur keaktifan harian di bot.

### 2. Engine Validasi Anti-Abuse (Background Validator)
*   **Aturan Validasi Otomatis**: Setiap rujukan baru masuk dengan status `PENDING` dan akan dievaluasi setiap 30 detik berdasarkan:
    1.  **Keanggotaan Wajib**: Harus tetap menjadi anggota grup target.
    2.  **Durasi Tinggal Minimum**: Harus menetap di grup minimal selama waktu tertentu (default: 24 jam).
    3.  **Tingkat Keaktifan**: Harus mengirimkan minimal sejumlah pesan di grup obrolan (default: 5 pesan).
*   **Pencegahan Kecurangan**:
    *   **Anti-Self-Referral**: Pengguna tidak bisa mengundang akunnya sendiri.
    *   **Anti-Mutual-Invite**: Pengguna A mengundang B, maka B tidak bisa mengundang A kembali.
    *   **Anti-Duplicate**: Akun Telegram yang sudah pernah bergabung di masa lalu tidak akan dihitung sebagai rujukan baru.

### 3. Dasbor Admin (Web Interface)
*   **Ringkasan Statistik (Analytics)**: Kartu metrik KPI (Total Anggota, Rasio Validasi, DAU/WAU) dan grafik pertumbuhan 30 hari (Chart.js).
*   **Detail Rujukan (Siapa Mengundang Siapa)**: 
    *   Di halaman **Pengguna (Users)**, admin cukup mengklik baris pengguna untuk membuka **Panel Samping (Slide-over Drawer)** yang menjabarkan daftar lengkap orang-orang yang telah diundang oleh pengguna tersebut secara detail.
*   **Manajemen Status Rujukan**: Admin dapat melakukan *override* manual untuk menyetujui (`VALID`) atau menolak (`INVALID`) rujukan secara sepihak.
*   **CRUD Aturan & Tugas**: Mengubah parameter minimal pesan, minimal jam tinggal, dan membuat tugas kampanye baru.
*   **Siaran Pengumuman (Broadcast)**: Mengirimkan pesan siaran massal ke seluruh pengguna bot secara langsung dari dasbor web.

---

## 🛠️ Tech Stack

### Backend (NestJS + Telegraf)
*   **Framework**: NestJS (TypeScript)
*   **Bot Library**: Telegraf (Telegram Bot API)
*   **Database ORM**: Prisma ORM (v7) dengan Driver Adapter PostgreSQL (`@prisma/adapter-pg` & `pg`)
*   **Scheduler**: `@nestjs/schedule` (Menjalankan cron validator berkala tanpa ketergantungan Redis)
*   **Security**: JWT Passport untuk keamanan API REST Admin

### Frontend (Next.js + Tailwind CSS)
*   **Framework**: Next.js (App Router, Turbopack)
*   **Styling**: Vanilla CSS + Tailwind CSS
*   **Icon Library**: Lucide React
*   **Data Visualization**: Chart.js (React Chartjs 2)

---

## 🔄 Alur Kerja Aplikasi (Flow)

### 1. Alur Pendaftaran Rujukan
```mermaid
sequenceDiagram
    participant U1 as Pengundang (User A)
    participant B as Bot Telegram
    participant U2 as Teman (User B)
    participant G as Grup Telegram
    
    U1->>B: Klik menu "Tautan Referral Saya"
    B->>G: Buat Tautan Undangan Grup (createChatInviteLink)
    G-->>B: Berikan Tautan Unik (t.me/+AbCdEf)
    B-->>U1: Berikan Tautan ke User A
    U1->>U2: Bagikan Tautan Unik
    U2->>G: Klik Tautan & Gabung Grup Langsung
    G-->>B: Kirim Event "chat_member" (Link used: t.me/+AbCdEf)
    B->>B: Identifikasi User A sebagai Inviter
    B->>B: Catat User B sebagai Referrals (Status: PENDING)
```

### 2. Alur Validasi Rujukan
```mermaid
graph TD
    Pending[Rujukan Baru: PENDING] --> Scheduler{Cron Validator: Tiap 30 Detik}
    Scheduler --> CheckMember{Apakah terundang masih di grup?}
    CheckMember -- Tidak --> Invalid[Set Status: INVALID]
    CheckMember -- Ya --> CheckStay{Sudah menetap 24 jam?}
    CheckStay -- Belum --> KeepPending[Tetap PENDING & Perbarui Progress]
    CheckStay -- Ya --> CheckMessages{Sudah kirim minimal 5 pesan?}
    CheckMessages -- Belum --> KeepPending
    CheckMessages -- Ya --> Valid[Set Status: VALID]
```

---

## 🚀 Panduan Instalasi & Penggunaan

### Prasyarat
*   Node.js (v18 ke atas)
*   PostgreSQL Database (Pastikan servis Postgres lokal Anda menyala)
*   Akun Telegram & Bot Token (buat melalui [@BotFather](https://t.me/BotFather))

### 1. Konfigurasi Database & Bot Token
Buat berkas `.env` di folder `backend/` dengan parameter berikut:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ce_referral_db?schema=public"
JWT_SECRET="super-secret-jwt-key"
TELEGRAM_BOT_TOKEN="put-your-telegram-bot-token-here"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="put-a-strong-admin-password-here"
PORT=3001
```

> Jangan commit token Telegram, password database, atau JWT secret ke repository.

### 2. Jalankan Migrasi & Seeding Database
Jalankan perintah berikut di folder `backend/`:
```bash
# Terapkan migration yang sudah di-commit
npx prisma migrate deploy

# Jalankan Seeding untuk data awal admin & pengaturan default
npx prisma db seed
```

### 3. Konfigurasi Akses Bot di Telegram
*   Masukkan bot `@AnoaRevBot` ke dalam grup target Anda (misal: `@ANOAtoken`).
*   Jadikan bot sebagai **Administrator** di grup tersebut.
*   Aktifkan izin admin **Invite Users** dan **Read Messages** untuk bot.

### 4. Jalankan Server Pengembangan

**Jalankan Backend (NestJS)** di folder `backend/`:
```bash
npm run start:dev
```

**Jalankan Frontend (Next.js)** di folder `frontend/`:
```bash
npm run dev
```

Buka dasbor admin di browser Anda: [http://localhost:3000](http://localhost:3000)
*   **Username**: `admin`
*   **Password**: nilai `ADMIN_PASSWORD` dari `.env`

Untuk deployment full-Docker di VPS, baca [DEPLOYMENT.md](DEPLOYMENT.md).
