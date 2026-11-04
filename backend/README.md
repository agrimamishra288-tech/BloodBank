# 🩸 Blood Bank & Donor Matching System — Backend

A production-grade REST API for managing blood bank donors, inventory, blood requests, and automated donor-patient matching based on blood group compatibility and location.

**Stack:** Node.js · Express · PostgreSQL  
**Auth:** JWT (Bearer token)

---

## Project Structure

```
backend/
├── src/
│   ├── app.js                        # Express app entry point
│   ├── db/
│   │   ├── pool.js                   # PostgreSQL connection pool
│   │   ├── schema.sql                # Full database schema
│   │   ├── seed.sql                  # Sample seed data
│   │   └── init.js                   # DB initialization script
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT authentication & role authorization
│   │   ├── error.middleware.js       # Global error handler
│   │   └── validate.middleware.js    # Joi request validation
│   ├── services/
│   │   ├── matching.service.js       # Core donor-patient matching engine
│   │   └── donation.service.js       # Donation recording service
│   └── routes/
│       ├── auth.routes.js            # POST /register, /login, GET /me
│       ├── donors.routes.js          # Donor CRUD + donation history
│       ├── banks.routes.js           # Blood bank management + stock
│       ├── inventory.routes.js       # Blood unit inventory management
│       ├── requests.routes.js        # Blood requests + matching + fulfillment
│       └── dashboard.routes.js       # Stats, reports, analytics
├── .env.example
├── package.json
└── README.md
```

---

## Database Schema

### Tables (11)

| Table | Description |
|---|---|
| `blood_groups` | Lookup: 8 valid blood group codes |
| `blood_compatibility` | Donor → Recipient compatibility map (28 rows) |
| `blood_banks` | Registered blood bank centers |
| `users` | Auth table — donors, hospital staff, admins |
| `donors` | Donor profiles linked to users |
| `donations` | Each donation event |
| `inventory` | Individual blood unit bags |
| `patients` | Patients needing blood |
| `blood_requests` | Blood requests raised by hospitals |
| `request_donor_matches` | Donors matched/notified for a request |
| `audit_log` | Auto-logged changes on critical tables |

### Views (4)

| View | Description |
|---|---|
| `vw_available_stock` | Available units grouped by blood group + bank |
| `vw_eligible_donors` | Donors eligible to donate today (90+ day gap) |
| `vw_pending_requests` | Pending requests sorted by urgency |
| `vw_expiring_soon` | Units expiring within 7 days |

### Triggers (5)

| Trigger | Action |
|---|---|
| `trg_updated_at` | Auto-updates `updated_at` on any table row change |
| `trg_audit_inventory` | Logs all inventory changes to audit_log |
| `trg_audit_requests` | Logs all request changes to audit_log |
| `trg_inventory_expiry` | Auto-sets expiry_date = collection_date + 42 days |
| `trg_donor_donation_count` | Updates total_donations & last_donation_date after donation |

### Stored Procedures / Functions (4)

| Function | Description |
|---|---|
| `fn_find_matching_donors(blood_group, city)` | Compatible + eligible donors, exact match first |
| `fn_find_matching_units(blood_group)` | Compatible available units, nearest expiry first |
| `sp_fulfill_request(request_id, unit_ids[])` | Atomic: mark units issued + update request status |
| `sp_register_donation(donor_id, bank_id, ...)` | Record donation + add inventory unit atomically |

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+

### 1. Install PostgreSQL & Create Database

```sql
-- In psql:
CREATE DATABASE bloodbank;
CREATE USER bloodbank_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE bloodbank TO bloodbank_user;
```

### 2. Clone & Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

`.env` values:
```
PORT=5000
DATABASE_URL=postgresql://bloodbank_user:yourpassword@localhost:5432/bloodbank
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
DONATION_GAP_DAYS=90
LOW_STOCK_THRESHOLD=3
NODE_ENV=development
```

### 4. Initialize Database

```bash
# Run schema + seed data together:
npm run init-db

# Or schema only:
node src/db/init.js --schema-only

# Or seed only (after schema is already created):
node src/db/init.js --seed-only
```

### 5. Start the Server

```bash
# Development (with auto-restart):
npm run dev

# Production:
npm start
```

Server runs at: `http://localhost:5000`

---

## API Reference

### Base URL: `http://localhost:5000/api`

### Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

### Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register a new user (donor / hospital) |
| POST | `/auth/login` | ❌ | Login and receive JWT token |
| GET | `/auth/me` | ✅ | Get current user profile |

**Register (Donor) example:**
```json
POST /api/auth/register
{
  "name": "Rohan Mehta",
  "email": "rohan@example.com",
  "password": "Test@1234",
  "role": "donor",
  "phone": "+919810000001",
  "blood_group": "O-",
  "city": "Delhi",
  "state": "Delhi",
  "age": 28,
  "gender": "M"
}
```

**Login example:**
```json
POST /api/auth/login
{
  "email": "rohan@example.com",
  "password": "Test@1234"
}
```

---

### Donor Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/donors` | ❌ | List donors (filter: blood_group, city, eligible) |
| GET | `/donors/:id` | ❌ | Get donor profile |
| PUT | `/donors/:id` | ✅ Donor/Admin | Update donor profile |
| GET | `/donors/:id/donations` | ❌ | Donation history |
| POST | `/donors/:id/donate` | ✅ Donor/Admin | Record a new donation |

**Filter eligible donors in Delhi:**
```
GET /api/donors?blood_group=O-&city=Delhi&eligible=true
```

---

### Blood Bank Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/banks` | ❌ | List all blood banks (filter: city) |
| POST | `/banks` | ✅ Admin | Register new blood bank |
| GET | `/banks/:id` | ❌ | Get bank details |
| GET | `/banks/:id/stock` | ❌ | Stock summary + expiring units for a bank |
| PATCH | `/banks/:id` | ✅ Admin | Update bank details |

---

### Inventory Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/inventory` | ❌ | List units (filter: blood_group, status, bank_id) |
| GET | `/inventory/summary` | ❌ | Stock grouped by blood group with low_stock flag |
| GET | `/inventory/expiring` | ❌ | Units expiring within N days |
| POST | `/inventory` | ✅ Admin/Hospital | Add inventory unit |
| GET | `/inventory/:id` | ❌ | Get single unit details |
| PATCH | `/inventory/:id/status` | ✅ Admin | Update unit status |

**Stock summary response example:**
```json
[
  {
    "blood_group": "O+",
    "total_units": 12,
    "low_stock": false,
    "banks": [
      { "bank_name": "City Central Blood Bank", "city": "Delhi", "units": 7 },
      { "bank_name": "AIIMS Blood Bank", "city": "Delhi", "units": 5 }
    ]
  },
  {
    "blood_group": "AB-",
    "total_units": 1,
    "low_stock": true,
    "banks": [...]
  }
]
```

---

### Blood Request Endpoints ⭐ (Core Feature)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/requests` | ❌ | List requests (filter: status, urgency, city) |
| POST | `/requests` | ✅ | Create blood request |
| GET | `/requests/:id` | ❌ | Request details with matched donors |
| PATCH | `/requests/:id/status` | ✅ Admin/Hospital | Update request status |
| **GET** | **`/requests/:id/match`** | ✅ | **Run matching algorithm** |
| POST | `/requests/:id/notify/:donor_id` | ✅ Admin/Hospital | Notify a matched donor |
| POST | `/requests/:id/fulfill` | ✅ Admin | Fulfill request with inventory units |
| DELETE | `/requests/:id` | ✅ Admin | Cancel a request |

**Match response example:**
```json
GET /api/requests/3/match
{
  "request": {
    "request_id": 3,
    "blood_group": "A+",
    "units_needed": 2,
    "city": "Delhi",
    "urgency": "critical",
    "status": "matched"
  },
  "matching_donors": [
    {
      "donor_id": 3,
      "name": "Aman Verma",
      "blood_group": "A+",
      "city": "Delhi",
      "phone": "+919810000003",
      "last_donation_date": "2024-05-15",
      "is_exact_match": true
    },
    {
      "donor_id": 1,
      "name": "Rohan Mehta",
      "blood_group": "O-",
      "is_exact_match": false
    }
  ],
  "available_units": [
    {
      "unit_id": 4,
      "blood_group": "A+",
      "bank_name": "City Central Blood Bank",
      "expiry_date": "2025-02-14",
      "is_exact_match": true
    }
  ],
  "matched_donor_count": 2,
  "compatibility_note": "Blood group A+ can receive from: A+, A-, O+, O-"
}
```

---

### Dashboard & Reports Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | ❌ | Aggregate system statistics |
| GET | `/dashboard/stock` | ❌ | Stock breakdown per blood group |
| GET | `/dashboard/reports/donation-trends` | ❌ | Daily donations over past N days |
| GET | `/dashboard/reports/request-summary` | ❌ | Requests grouped by status + urgency |
| GET | `/dashboard/reports/top-donors` | ❌ | Top 10 donors by donation count |

---

## Blood Compatibility Reference

| Donor → | O- | O+ | A- | A+ | B- | B+ | AB- | AB+ |
|---|---|---|---|---|---|---|---|---|
| **O-** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **O+** | | ✅ | | ✅ | | ✅ | | ✅ |
| **A-** | | | ✅ | ✅ | | | ✅ | ✅ |
| **A+** | | | | ✅ | | | | ✅ |
| **B-** | | | | | ✅ | ✅ | ✅ | ✅ |
| **B+** | | | | | | ✅ | | ✅ |
| **AB-** | | | | | | | ✅ | ✅ |
| **AB+** | | | | | | | | ✅ |

---

## Testing with Postman

Import this collection order for end-to-end testing:
1. `POST /auth/register` — create admin user
2. `POST /auth/login` — save the token
3. `GET /dashboard/stats` — verify system stats
4. `POST /requests` — create a blood request
5. `GET /requests/:id/match` — run matching
6. `POST /requests/:id/notify/:donor_id` — notify a donor
7. `POST /requests/:id/fulfill` — fulfill with inventory units
8. `GET /dashboard/stock` — verify stock decreased

---

## Key Design Decisions

- **Unit-level inventory**: Each blood bag is one row in `inventory` — precise tracking, no over-issuing
- **Data-driven compatibility**: The `blood_compatibility` table drives matching via JOIN — no hardcoded if-else logic
- **Atomic operations**: Fulfillment and donation registration use stored procedures wrapped in transactions
- **Audit trail**: All inventory and request changes are automatically logged to `audit_log` via triggers
- **90-day donor eligibility**: Enforced at the database function level, not just application level

---

## Sign-in options

- Email and password use the existing JWT login flow.
- Mobile number and password use the phone number stored on the user account. Phone numbers should include their country code where applicable.
- Google sign-in verifies the Google Identity Services ID token on the server and only signs into an existing Hemora account with the same verified email. It does not create donor or hospital profiles automatically.

### Configure Google sign-in

Google sign-in stays unavailable until a Google OAuth **Web application** client ID is configured.

1. Create a Web application OAuth client in Google Cloud and add your local frontend origin (for example, `http://localhost:5173` and `http://localhost:5174`) to **Authorized JavaScript origins**.
2. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_GOOGLE_CLIENT_ID` to that client ID.
3. Set the same `GOOGLE_CLIENT_ID` in `backend/.env`.
4. Restart both development servers so the environment variables are loaded.

The client ID is public configuration. Keep `JWT_SECRET`, database credentials, and any future OAuth client secrets in the backend environment only; never put them in the frontend `.env` file.
