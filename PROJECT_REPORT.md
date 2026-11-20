# Hemora — Blood Bank and Donor Management System

**Project report · 19 November 2026**

## 1. Project overview

Hemora is a web-based blood-bank coordination prototype. It brings together donor profiles, blood-bank listings, blood inventory, donations, and patient blood requests. The application provides a React interface, an Express REST API, and a PostgreSQL relational database.

This is an academic prototype. It is not a production clinical system and is not connected to a hospital's private patient or donor records.

## 2. Problem and objective

Finding a compatible blood donor or blood unit can involve contacting multiple people and facilities. Hemora demonstrates how structured records and a web interface can help organize donors, banks, stock, and requests in one application. The goal is to support searching, recording, and coordinating these records while applying database constraints and matching rules.

## 3. System architecture

```text
React frontend (Vite)
        │  HTTP requests to /api
        ▼
Express backend (Node.js)
        │  parameterized SQL through node-postgres
        ▼
PostgreSQL 18 — database: bloodbank
```

The frontend does not connect directly to PostgreSQL. Requests pass through the backend, where validation, authentication, authorization, and database queries are handled.

## 4. Main database entities

The verified database contains 13 base tables, 4 views, 39 indexes, 9 triggers, and 10 routines. The main entities include:

| Entity | Purpose |
| --- | --- |
| `users` | Login identity, role, and account status |
| `donors` | Donor profile and donation eligibility/history fields |
| `blood_banks` | Banks used by the application's operational workflows |
| `inventory` | Blood units, blood group, status, collection, and expiry |
| `donations` | Recorded donations and their donor relationship |
| `patients` | Patient records associated with blood requests |
| `blood_requests` | Requested group, quantity, fulfilment, and status |
| `blood_compatibility` / `blood_groups` | Blood-group reference and compatibility rules |
| `public_blood_bank_directory` | Separate public facility directory reference data |

Foreign keys relate users to donor profiles, donations to donors, inventory to banks, and requests to patients and banks. Unique constraints and validation prevent duplicate account emails and invalid values. Views support available-stock and expiry summaries. Database triggers/routines maintain selected derived values and rules.

## 5. Current database contents

The local database status check succeeded on 19 November 2026. It reported:

| Table | Rows at time of check |
| --- | ---: |
| Users | 26 |
| Donors | 20 |
| Operational blood banks | 5 |
| Inventory units | 35 |
| Donations | 63 |
| Patients | 11 |
| Blood requests | 11 |
| Public facility directory | 2,823 |

The directory is public reference data packaged from a Government of India blood-bank directory published through data.gov.in and an IndiaDigital mirror. Its publisher reports that the underlying government directory was last updated on 12 July 2022. It is a facility directory, not live stock and not a hospital database. The operational records are the project's own demo database records.

The check found zero duplicate emails, zero duplicate donor profiles, zero invalid request totals, zero expired units left available, and zero donor-history count mismatches.

## 6. Authentication and access

Email/phone and password authentication is handled by the backend. Password sign-in and account registration use the application's authenticator-code flow. Google sign-in uses Firebase Authentication in the browser; the backend verifies Firebase's signed ID token and links it to an existing Hemora account by verified email. Google sign-in is configured to show Google's account chooser and then completes without Hemora's separate authenticator-code prompt.

**Google sign-in still needs Firebase Console setup before it can be demonstrated:** enable Google as an Authentication provider, authorize the local website host, and set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON from the same Firebase project. The backend Firebase project ID has been matched to the frontend configuration. Do not commit the service-account JSON or `.env` files.

## 7. Data source and live-data boundary

The app's PostgreSQL database is local to the development setup. The public directory provides authentic facility listings, but the project's live inventory and donor tables are not synced with real hospitals. No real hospital donor/patient records are present or claimed.

e-RaktKosh is the appropriate official source to ask about blood-stock integration. C-DAC describes APIs for integration, but this project does not yet have an approved API specification or credentials. A live feed must wait for access approval and should display its source and last-updated timestamp. Donor personal data should not be imported without explicit authorization.

Official references:

- [e-RaktKosh portal](https://www.eraktkosh.mohfw.gov.in/eraktkoshPortal/)
- [C-DAC e-RaktKosh information and contact](https://cdac.gov.in/index.aspx?id=product_details&productId=e-RaktKosh)
- [Government blood-bank directory dataset](https://www.data.gov.in/resource/blood-bank-directory-updated-till-last-month)

## 8. Running the local demonstration

The current local setup uses PostgreSQL port **5433** because port 5432 was unavailable in this environment.

1. Start PostgreSQL 18 and confirm the configured database is reachable with `npm run db:status` from `backend/`.
2. In `backend/`, run `npm run dev`. The API listens on `http://localhost:5000`.
3. In `frontend/`, run `npm run dev`. Open the local URL printed by Vite; this session's preview is `http://localhost:5179/login`.
4. The API health endpoint is `http://localhost:5000/api/health`.

Keep the backend and frontend terminal windows open while presenting. The API and frontend returned HTTP 200 during the latest check; the database status and integrity check also succeeded.

## 9. Viva summary

> “Hemora is a React and Express application backed by PostgreSQL. The frontend calls REST API routes, and the backend validates requests and uses parameterized SQL to read or update the relational database. The database stores demo users, donor profiles, banks, stock, donations, patients, and requests. It also has a separate 2,823-row public blood-bank directory snapshot; that snapshot is a directory only and is not live stock. The current system is not connected to a hospital. We are seeking the approved e-RaktKosh API details before claiming live inventory integration. Google login uses Firebase and still needs its server service-account credentials and provider settings to be completed.”

## 10. Remaining setup before final submission

- Enable the Google provider and add the local host to Firebase Authentication's authorized domains.
- Generate a Firebase Admin service-account JSON for the matching Firebase project and configure its path in `backend/.env`.
- Confirm Google sign-in with an existing Hemora account whose email matches the selected Google account.
- Keep describing stock and donor records as project demo data until an authorized external feed is approved and verified.
- If pursuing e-RaktKosh access, request read-only stock API documentation, approval requirements, a sandbox, credentials, rate limits, and data-use terms from C-DAC.
