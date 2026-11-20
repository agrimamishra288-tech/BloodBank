-- Blood bank licence lists published on data.gov.in by state health departments
-- (Tamil Nadu private and state government blood banks). Reference data only.
CREATE TABLE IF NOT EXISTS licensed_blood_banks (
    external_id          TEXT PRIMARY KEY,
    dataset_key          TEXT NOT NULL,
    name                 TEXT NOT NULL,
    address              TEXT,
    city                 TEXT,
    state                TEXT NOT NULL,
    pincode              TEXT,
    ownership            TEXT NOT NULL CHECK (ownership IN ('Government', 'Private')),
    operated_by          TEXT,
    licence_number       TEXT,
    licence_issued_on    DATE,
    licence_valid_until  DATE,
    source_name          TEXT NOT NULL,
    source_url           TEXT NOT NULL,
    imported_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licensed_banks_state_ownership
    ON licensed_blood_banks(state, ownership);

-- Classifies a blood bank as hospital-based from its name; the sources have no such field.
CREATE OR REPLACE FUNCTION fn_blood_bank_facility_type(bank_name TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN bank_name ~* '(hospital|medical college|medical cent|medical institute|institute of medical|nursing home|health cent|infirmary|dispensary|\m(aiims|pgimer|gh|chc|phc)\M)'
            THEN 'Hospital-based'
        ELSE 'Standalone'
    END
$$;

-- One filterable list of every reference blood bank, whatever its source.
CREATE OR REPLACE VIEW vw_blood_bank_reference AS
SELECT
    'public_blood_bank_directory'::TEXT AS source_table,
    external_id,
    name,
    address,
    city,
    district,
    state,
    pincode,
    contact_phone,
    CASE category
        WHEN 'Government' THEN 'Government'
        WHEN 'Private'    THEN 'Private'
        WHEN 'Charity'    THEN 'Charitable'
        ELSE 'Not stated'
    END AS ownership,
    fn_blood_bank_facility_type(name) AS facility_type,
    CASE has_components
        WHEN TRUE  THEN 'Whole blood and components'
        WHEN FALSE THEN 'Whole blood only'
        ELSE 'Not stated'
    END AS blood_products,
    has_apheresis,
    NULL::TEXT AS licence_number,
    NULL::DATE AS licence_valid_until,
    NULL::TEXT AS licence_status,
    source_name,
    source_url,
    source_updated_at,
    imported_at
FROM public_blood_bank_directory
UNION ALL
SELECT
    'licensed_blood_banks',
    external_id,
    name,
    address,
    city,
    NULL,
    state,
    pincode,
    NULL,
    ownership,
    fn_blood_bank_facility_type(name),
    CASE WHEN name ~* 'component' THEN 'Whole blood and components' ELSE 'Not stated' END,
    NULL,
    licence_number,
    licence_valid_until,
    CASE
        WHEN licence_valid_until IS NULL THEN 'Not stated'
        WHEN licence_valid_until >= CURRENT_DATE THEN 'Valid'
        ELSE 'Expired'
    END,
    source_name,
    source_url,
    NULL::DATE,
    imported_at
FROM licensed_blood_banks;
