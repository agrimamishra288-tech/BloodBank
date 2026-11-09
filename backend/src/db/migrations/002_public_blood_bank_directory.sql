-- Add a separately sourced public directory without mixing it with
-- operational Hemora banks or claiming public stock is live.
CREATE TABLE IF NOT EXISTS public_blood_bank_directory (
    external_id          TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    address              TEXT,
    city                 TEXT,
    district             TEXT,
    state                TEXT NOT NULL,
    pincode              TEXT,
    contact_phone        TEXT,
    helpline             TEXT,
    website              TEXT,
    category             TEXT,
    has_components       BOOLEAN,
    has_apheresis        BOOLEAN,
    service_hours        TEXT,
    latitude             DOUBLE PRECISION CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude            DOUBLE PRECISION CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    source_updated_at    DATE,
    snapshot_version     DATE NOT NULL,
    source_name          TEXT NOT NULL,
    source_url           TEXT NOT NULL,
    imported_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_banks_state_city
    ON public_blood_bank_directory(state, city);
CREATE INDEX IF NOT EXISTS idx_public_banks_name
    ON public_blood_bank_directory(LOWER(name));
