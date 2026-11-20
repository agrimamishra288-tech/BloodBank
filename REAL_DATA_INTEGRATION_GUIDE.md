# Real data integration guide

## What this project can use now

The project imports a public blood-bank facility directory into `public_blood_bank_directory`. It contains facility listings only; it has no donor accounts, patient records, or live unit counts. The backend checks the licensed publisher's version index at startup and once every 24 hours, then imports only when that publisher releases a newer snapshot:

```powershell
cd backend
npm run db:refresh-public-directory
```

The current package is dated 3 November 2026, but its publisher says the underlying official directory was last updated on 12 July 2022. Rechecking the mirror will not make that source data newer; verify details by phone. The importer keeps the public directory separate from the project's own `blood_banks` and `inventory` tables.

## Sync the directory from the official data.gov.in API

1. Sign in at [data.gov.in](https://data.gov.in), open **My Account**, and generate an API key.
2. Add it to `backend/.env` only (never `frontend/.env` or GitHub):
   ```
   DATA_GOV_IN_API_KEY=your_key
   ```
3. Check the connection without changing the database, then sync:
   ```powershell
   cd backend
   npm run db:check-data-gov-in   # prints record count, field names, and two mapped rows
   npm run db:sync-data-gov-in    # imports into public_blood_bank_directory
   ```
With the key set, the backend also syncs from resource `fced6df9-a360-4e08-8ca0-f283fc74ce15` (Blood Bank Directory, updated till last month) at startup and every `PUBLIC_DIRECTORY_REFRESH_HOURS`. If the API fails, it falls back to the IndiaDigital mirror. The reusable client is `backend/src/services/datagovin.js`; other data.gov.in resources can use `fetchAllRecords(resourceId)`.

## Sync national health indicators from the World Bank API

The World Bank Indicators API is public and needs no key. It provides yearly national figures (population, hospital beds, doctors, nurses, health spending, anaemia, maternal mortality, road-traffic deaths) that give context for blood demand and donor supply.

```powershell
cd backend
npm run init-db:schema        # creates world_bank_indicators (safe to re-run)
npm run db:check-world-bank   # prints each indicator's latest value without changing the database
npm run db:sync-world-bank    # imports into world_bank_indicators
```
Rows are keyed by indicator, country and year, and keep the source name, link and World Bank update date. The backend refreshes them at startup and every `PUBLIC_DIRECTORY_REFRESH_HOURS`. Change the countries or indicators with `WORLD_BANK_COUNTRIES` and `WORLD_BANK_INDICATORS` in `backend/.env`. If an indicator fails to download, its stored rows are kept.

## Import state blood bank licence lists (data.gov.in JSON exports)

Some data.gov.in datasets are not on the API yet but can be exported as JSON. The Tamil Nadu Health and Family Welfare Department lists [private](https://www.data.gov.in/resource/details-private-blood-banks) (198) and [state government](https://www.data.gov.in/resource/details-state-government-blood-banks) (86) blood banks with their licence number and validity. The exports are kept in `backend/src/db/data/` and imported into `licensed_blood_banks`:

```powershell
cd backend
npm run db:check-licensed-blood-banks   # prints row counts and parsed samples without changing the database
npm run db:import-licensed-blood-banks  # replaces each dataset's rows in licensed_blood_banks
```
To refresh one, download it again with **Export in Other Format → JSON** (or open the JSON tab and press Ctrl+S), replace its file in `backend/src/db/data/`, and re-run the import. Every licence in the current files expired by 2023, so treat them as historical.

## Filter reference blood banks by ownership, facility type and products

The `vw_blood_bank_reference` view combines `public_blood_bank_directory` and `licensed_blood_banks` into one list with these filter columns:

| Column | Values | Derived from |
|---|---|---|
| `ownership` | Government, Private, Charitable, Not stated | Directory category; which licence list a bank is in |
| `facility_type` | Hospital-based, Standalone | Bank name (hospital, medical college, health centre, nursing home…), via `fn_blood_bank_facility_type` |
| `blood_products` | Whole blood and components, Whole blood only, Not stated | Directory component-separation flag; "component" in a licensed bank's name |
| `has_apheresis` | true, false, null | Directory apheresis flag |
| `licence_status` | Valid, Expired, Not stated | Licence validity date (licensed banks only) |

```sql
SELECT name, city, state, blood_products
FROM vw_blood_bank_reference
WHERE ownership = 'Private' AND facility_type = 'Hospital-based' AND state = 'Tamil Nadu';
```
None of these public sources report which blood groups are in stock. That needs live stock data from e-RaktKosh (below).

## To connect live blood stock

1. Open the official [e-RaktKosh stock search](https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/stockAvailability.cnt) and confirm which stock fields the project needs to display.
2. Ask C-DAC for the official e-RaktKosh API specification, access approval, credentials, sandbox, permitted use, rate limits, and stock freshness semantics. C-DAC lists `eraktkosh@cdac.in` for e-RaktKosh information and says the platform offers open APIs.
3. Keep any issued credential in `backend/.env` only. Never place it in `frontend/.env`, source code, screenshots, or GitHub.
4. Implement a read-only backend integration after the official specification is received. Store external stock snapshots separately with the source bank ID, blood component/group, source timestamp, and fetch timestamp. Do not merge external values into the locally managed `inventory` table.
5. Display the source and last-updated time in the UI. If the API is unavailable or a stock record is old, show that clearly and link users to e-RaktKosh to confirm.

Do not scrape the e-RaktKosh website or guess undocumented endpoints. C-DAC confirms APIs exist, but the project does not currently have an official technical specification or authorized credentials.

## To import data from a real hospital

1. Contact the hospital's IT/data owner and request written permission for a student-project data extract. Ask for a small, de-identified sample or synthetic training data.
2. Agree on exactly which fields may be used, the purpose, retention period, who can see them, and whether the hospital permits the data to be shown to a teacher or committed to GitHub.
3. Do not request or import identifiable patient or donor information (such as names, phone numbers, addresses, government IDs, or medical record numbers) into this public student repository. Public directory listings are suitable; private hospital records are not public just because a copy is found online.
4. Map approved fields to a separate staging table first. Validate formats, missing values, duplicates, and source dates. Keep source, import time, and data owner in the staging metadata.
5. Ask the hospital data owner to review the mapped sample before using it. Move approved non-sensitive fields into the project only after that review; keep the current demo rows clearly labeled as sample data.
6. Keep access credentials and any approved private extract outside GitHub. Delete the extract when permission ends or the agreed retention period expires.

For a presentation without a hospital data agreement, use the public facility directory plus the project's clearly labeled sample operational records. Explain that the directory is authentic public facility data, while donor, donation, request, and inventory rows are demonstration records.
