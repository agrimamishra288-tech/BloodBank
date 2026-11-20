# Public blood-bank directory snapshot

`blood-banks-india-2026-11-03.json` contains 2,823 public blood-bank directory listings. It was downloaded as a versioned JSON snapshot from the IndiaDigital open-data mirror on 3 November 2026.

## Attribution and licence

- Original data: Blood Bank Directory, National Health Portal / NIHFW / Ministry of Health and Family Welfare, Government of India, published through [data.gov.in](https://www.data.gov.in/resource/blood-bank-directory-updated-till-last-month), under the Government Open Data License–India.
- Snapshot/cleaned packaging: [IndiaDigital open data](https://www.indiadigital.org/open/data/), licensed CC BY 4.0. Attribute both the official government source and IndiaDigital when reusing this cleaned file.
- Snapshot version: 3 November 2026.
- Underlying government data last updated: 12 July 2022, according to the dataset publisher. Contact details and facilities may have changed.

## Important data boundary

This is a public **facility directory**, not a private hospital database. It contains no patient records or donor accounts. It does not provide live inventory. The imported rows live in `public_blood_bank_directory`, separate from the project's operational `blood_banks` and `inventory` tables. The project should not present these directory rows as live stock or confirmed active centres.

The backend checks the IndiaDigital version index on startup and every 24 hours. If a new licensed `blood-banks` snapshot is published, it refreshes the public directory table from that version. Run `npm run db:refresh-public-directory` in `backend/` to check and sync it manually. This only refreshes when the publisher releases a newer snapshot; the publisher currently reports that its underlying government directory data dates to 12 July 2022, so an automatic check does not make the records themselves current.

For current stock availability, the page links to [e-RaktKosh](https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/stockAvailability.cnt). C-DAC describes e-RaktKosh as the Government of India's blood-bank and stock information platform and says it offers open APIs; this project does not have the technical API specification or approved credentials yet, so it does not import live stock or donor data. Integration should use an officially documented API and approved credentials, not page scraping.

# Tamil Nadu blood bank licence lists

`tn-private-blood-banks-data-gov-in.json` and `tn-government-blood-banks-data-gov-in.json` are the JSON exports of [Details of Private Blood Banks](https://www.data.gov.in/resource/details-private-blood-banks) and [Details of State Government Blood Banks](https://www.data.gov.in/resource/details-state-government-blood-banks), published on data.gov.in by the Health and Family Welfare Department, Government of Tamil Nadu, under the Government Open Data License–India. They were downloaded on 19 November 2026 and are imported into `licensed_blood_banks` by `npm run db:import-licensed-blood-banks`. They list each bank's name, address, drug licence number, issue date and validity; the latest validity date is in 2023.
