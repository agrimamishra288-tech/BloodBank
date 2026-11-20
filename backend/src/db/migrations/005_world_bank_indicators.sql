-- National health indicators from the World Bank Indicators API, one row per
-- indicator, country and year. Reference data only; not tied to operational tables.
CREATE TABLE IF NOT EXISTS world_bank_indicators (
    indicator_code       TEXT NOT NULL,
    indicator_name       TEXT NOT NULL,
    country_code         CHAR(3) NOT NULL,
    country_name         TEXT NOT NULL,
    year                 SMALLINT NOT NULL,
    value                DOUBLE PRECISION NOT NULL,
    source_name          TEXT NOT NULL,
    source_url           TEXT NOT NULL,
    source_updated_at    DATE,
    imported_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (indicator_code, country_code, year)
);
