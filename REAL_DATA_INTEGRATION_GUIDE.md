# Real data integration guide

## What this project can use now

The project imports a public blood-bank facility directory into `public_blood_bank_directory`. It contains facility listings only; it has no donor accounts, patient records, or live unit counts. The backend checks the licensed publisher's version index at startup and once every 24 hours, then imports only when that publisher releases a newer snapshot:

```powershell
cd backend
npm run db:refresh-public-directory
```

The current package is dated 3 November 2026, but its publisher says the underlying official directory was last updated on 12 July 2022. Rechecking the mirror will not make that source data newer; verify details by phone. The importer keeps the public directory separate from the project's own `blood_banks` and `inventory` tables.

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
