# Hemora — Blood Bank & Donor Matching System

[![CI](https://github.com/agrimamishra288-tech/BloodBank/actions/workflows/ci.yml/badge.svg)](https://github.com/agrimamishra288-tech/BloodBank/actions/workflows/ci.yml)

A DBMS capstone project: a PostgreSQL-backed API and React dashboard for managing donors, blood inventory, requests, and donations, plus public reference data from data.gov.in and the World Bank.

## Live demo

- App: https://hemora-brown.vercel.app
- API: https://hemora-api.vercel.app (health check: `/api/health`)
- Demo sign-in: `admin@bloodbank.in` / `Test@1234` (other seeded accounts use the same password; the demo-only password allowlist lives in `DEMO_PASSWORD_ONLY_EMAIL`)

## Stack

- PostgreSQL, Express 4, React 18 with Vite and Tailwind CSS
- Firebase Authentication for Google sign-in
- Neon Postgres and Vercel (API as a serverless function) for the hosted demo

## Repository layout

```
backend/    Express API, SQL schema, migrations, seed data, import scripts
frontend/   React single-page dashboard
```

## Local setup

Requirements: Node.js 20+, PostgreSQL 14+.

### Backend

```bash
cd backend
npm install
cp .env.example .env      # set DATABASE_URL and JWT_SECRET
npm run init-db           # schema + migrations + seed (seeds only if the database is empty)
npm start                 # http://localhost:5000
```

- `npm run init-db:schema` applies schema and migrations only.
- `npm run init-db:seed` runs migrations and seeds only if the database is empty.
- Seeding never truncates existing records.
- `npm run db:status` prints table and row counts.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env      # Vite Firebase settings
npm run dev               # http://localhost:5173, proxies /api to port 5000
```

## Data provenance

- Operational records (users, donors, inventory, requests, donations) are seeded demo data, clearly marked as such in the UI.
- Public directory and indicator data come from official sources: the Blood Bank Directory (data.gov.in, Government Open Data License - India) and World Bank Indicators.
- The public directory lists licensed facilities, not live stock.

## Checks

- API health: `curl https://hemora-api.vercel.app/api/health` (expect `200` with a database timestamp)
- Local frontend build: `cd frontend && npm run build`
- Local API syntax: `cd backend && find src -name '*.js' -print0 | xargs -0 -n1 node --check`
- GitHub Actions runs both checks on every push to `main` and on pull requests.

## Deployment notes

- Vercel imports `backend/src/app.js`, which exports the Express app; the long-running listener lives in `backend/src/start.js` for local development.
- The database is hosted on Neon; redeploying does not reseed or modify existing data.
- Firebase Admin credentials come from `GOOGLE_APPLICATION_CREDENTIALS` (file path) locally or `GOOGLE_APPLICATION_CREDENTIALS_JSON` (inline JSON) when hosted.
- Google sign-in requires the frontend domain to be listed in Firebase Authentication -> Settings -> Authorized domains.

## Documentation

- `DATABASE_DEMO_GUIDE.md` — database walkthrough for the demo
- `PRODUCT_REQUIREMENTS_DOCUMENT.md` — requirements
- `PROJECT_REPORT.md` — report
- `REAL_DATA_INTEGRATION_GUIDE.md` — public data sources and imports
