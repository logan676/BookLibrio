# BookPost

A digital library application for managing ebooks, magazines, and reading progress. Features PDF/EPUB readers, cover scanning, note-taking, and cross-device sync.

## Architecture

```
+-------------+     +-------------+     +---------+     +-------------+
|   Browser   | --> |   Vercel    | --> | Fly.io  | --> |  Supabase   |
|   (Web)     |     |   (CDN)     |     |  (API)  |     | (PostgreSQL)|
+-------------+     +-------------+     +---------+     +-------------+
                                             |
+-------------+                              |
|   Mobile    | -----------------------------+
| (Expo/RN)   |                              |
+-------------+                         +----+----+
                                        |   R2    |
                                        | (Files) |
                                        +---------+
```

| Component | Technology | Deployment |
|-----------|------------|------------|
| Web | React 18 + Vite + TailwindCSS | Vercel |
| API | Hono + Drizzle ORM | Fly.io |
| Mobile | React Native + Expo | App Store |
| Database | PostgreSQL | Supabase |
| Storage | S3-compatible | Cloudflare R2 |

## Project Structure

```
bookpost/
├── packages/
│   ├── web/           # React frontend (Vite)
│   ├── api/           # Hono backend
│   ├── mobile/        # React Native (Expo)
│   └── shared/        # Shared types & utilities
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── .github/workflows/ # CI/CD pipelines
```

## Features

### Ebooks & Magazines
- PDF and EPUB reader with page navigation
- Magazine collection organized by publisher
- Ebook collection organized by category
- Text highlighting and note-taking

### Reading History
- Track reading progress across devices
- Resume from last position
- View recent reading activity

### Book Scanning
- Scan physical book covers with camera
- OCR text extraction (Google Vision API)
- Automatic metadata lookup (Google Books API)

## Quick Start

### Prerequisites
- Node.js 18+
- npm (with workspaces support)

### 1. Clone and Install

```bash
git clone https://github.com/logan676/bookpost.git
cd bookpost
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp packages/api/.env.example packages/api/.env

# Edit with your credentials
```

Required environment variables:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Cloudflare R2 Storage
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=bookpost
```

### 3. Run Development Servers

```bash
# Start both API and web
npm run dev:all

# Or run separately
npm run dev:api   # API at http://localhost:3001
npm run dev       # Web at http://localhost:5173
```

### 4. Run Mobile (Expo)

```bash
cd packages/mobile
npm start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web dev server |
| `npm run dev:api` | Start API dev server |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Build web for production |
| `npm run lint` | Run ESLint across packages |
| `npm run test` | Run tests across packages |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ebooks` | GET | List ebooks |
| `/api/ebooks/:id` | GET | Get ebook details |
| `/api/magazines` | GET | List magazines |
| `/api/categories` | GET | List categories |
| `/api/reading-history` | GET/POST | Reading progress |
| `/api/notes` | GET/POST | User notes |
| `/api/books` | GET/POST | Physical books |

## Deployment

### API (Fly.io)

```bash
cd packages/api
fly deploy
```

Auto-deploys on push to `main` via GitHub Actions.

### Web (Vercel)

Auto-deploys on push to `main` via Vercel GitHub integration.

### Mobile (Expo)

```bash
cd packages/mobile
eas build --platform ios
eas build --platform android
```

## CI/CD

Path-filtered workflows run only when relevant packages change:

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Lint, build, test per package |
| `deploy-api.yml` | Push to main (packages/api) | Deploy to Fly.io |

## Tech Stack Details

### Web (`packages/web`)
- React 18 with TypeScript
- Vite for fast builds
- TailwindCSS v4 for styling
- React Router v7 for navigation
- TanStack Query for data fetching
- React Hook Form + Zod for forms

### API (`packages/api`)
- Hono (lightweight web framework)
- Drizzle ORM (type-safe queries)
- Zod for validation
- OpenAPI spec generation

### Mobile (`packages/mobile`)
- React Native 0.81
- Expo SDK 54
- React Navigation
- Async Storage

## Documentation

- [Deployment Architecture](docs/DEPLOYMENT_ARCHITECTURE.md) - Detailed deployment guide

## License

MIT
