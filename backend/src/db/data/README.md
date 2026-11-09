# Public blood-bank directory snapshot

`blood-banks-india-2026-11-03.json` contains 2,823 public blood-bank directory listings. It was downloaded as a versioned JSON snapshot from the IndiaDigital open-data mirror on 3 November 2026.

## Attribution and licence

- Original data: Blood Bank Directory, National Health Portal / NIHFW / Ministry of Health and Family Welfare, Government of India, published through [data.gov.in](https://www.data.gov.in/resource/blood-bank-directory-updated-till-last-month), under the Government Open Data License–India.
- Snapshot/cleaned packaging: [IndiaDigital open data](https://www.indiadigital.org/open/data/), licensed CC BY 4.0. Attribute both the official government source and IndiaDigital when reusing this cleaned file.
- Snapshot version: 3 November 2026.
- Underlying government data last updated: 12 July 2022, according to the dataset publisher. Contact details and facilities may have changed.

## Important data boundary

This is a public **facility directory**, not a private hospital database. It contains no patient records or donor accounts. It does not provide live inventory. The imported rows live in `public_blood_bank_directory`, separate from the project's operational `blood_banks` and `inventory` tables. The project should not present these directory rows as live stock or confirmed active centres.

For current stock availability, the page links to [e-RaktKosh](https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/stockAvailability.cnt). C-DAC describes e-RaktKosh as the Government of India's blood-bank and stock information platform and says it offers open APIs; integration should use an officially documented API and approved credentials, not page scraping.
