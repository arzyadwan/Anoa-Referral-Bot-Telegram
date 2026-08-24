# Deployment ke VPS

Deployment production menggunakan Docker Compose, PostgreSQL, backend NestJS, frontend Next.js, dan Caddy sebagai reverse proxy HTTPS.

## Prasyarat

- VPS Linux dengan Docker Engine dan Docker Compose plugin.
- Satu domain untuk frontend dan satu subdomain untuk API, misalnya:
  - `app.example.com`
  - `api.example.com`
- DNS `A/AAAA` kedua domain mengarah ke IP VPS.
- Port publik `80` dan `443` tersedia untuk Caddy.

## Instalasi pertama

```bash
git clone https://github.com/USERNAME/REPOSITORY.git
cd REPOSITORY

cp .env.example .env
chmod 600 .env
nano .env
```

Isi minimal `POSTGRES_*`, `DATABASE_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `APP_DOMAIN`, `API_DOMAIN`, `NEXT_PUBLIC_API_URL`, dan `FRONTEND_ORIGIN`.

`DATABASE_URL` di dalam container harus menggunakan hostname service Docker:

```env
DATABASE_URL=postgresql://ce_referral:password@postgres:5432/ce_referral_db?schema=public
```

Validasi konfigurasi lalu build dan jalankan:

```bash
docker compose -f docker-compose.yml -f compose.production.yaml config
docker compose -f docker-compose.yml -f compose.production.yaml build
docker compose -f docker-compose.yml -f compose.production.yaml up -d
```

Service `migrate` menjalankan migration Prisma sebelum backend dinyalakan. Setelah container siap, buat admin dan setting awal satu kali:

```bash
docker compose -f docker-compose.yml -f compose.production.yaml run --rm migrate npx prisma db seed
```

Periksa status dan log:

```bash
docker compose -f docker-compose.yml -f compose.production.yaml ps
docker compose -f docker-compose.yml -f compose.production.yaml logs -f backend
```

Buka `https://app.example.com` setelah Caddy berhasil memperoleh sertifikat HTTPS.

## Update aplikasi

Gunakan branch atau tag yang sudah direview, lalu:

```bash
git pull --ff-only
docker compose -f docker-compose.yml -f compose.production.yaml build
docker compose -f docker-compose.yml -f compose.production.yaml up -d
```

Migration baru akan dijalankan oleh service `migrate` sebelum backend aktif kembali.

## Backup PostgreSQL

Simpan backup di luar VPS dan uji proses restore secara berkala:

```bash
mkdir -p /var/backups/ce-referral
docker compose -f docker-compose.yml -f compose.production.yaml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "/var/backups/ce-referral/$(date +%F).sql.gz"
```

## Catatan operasional

- Hanya satu instance backend yang menjalankan bot Telegram polling.
- Jangan membuka port PostgreSQL atau Redis ke internet.
- Jangan menyimpan `.env` di GitHub.
- Jika bot token pernah dibagikan di repository, rotasi token melalui BotFather sebelum production.
