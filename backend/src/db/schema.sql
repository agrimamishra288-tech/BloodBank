-- ============================================================
-- Blood Bank & Donor Matching System
-- PostgreSQL Database Schema
-- ============================================================

-- Enable UUID extension (optional, using SERIAL for simplicity)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. LOOKUP TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS blood_groups (
    blood_group TEXT PRIMARY KEY
);

INSERT INTO blood_groups VALUES
    ('A+'), ('A-'), ('B+'), ('B-'), ('AB+'), ('AB-'), ('O+'), ('O-')
ON CONFLICT DO NOTHING;

-- Maps which donor blood group can donate to which recipient group
CREATE TABLE IF NOT EXISTS blood_compatibility (
    donor_group     TEXT NOT NULL REFERENCES blood_groups(blood_group),
    recipient_group TEXT NOT NULL REFERENCES blood_groups(blood_group),
    PRIMARY KEY (donor_group, recipient_group)
);

INSERT INTO blood_compatibility (donor_group, recipient_group) VALUES
    -- O- is universal donor
    ('O-', 'O-'), ('O-', 'O+'), ('O-', 'A-'), ('O-', 'A+'),
    ('O-', 'B-'), ('O-', 'B+'), ('O-', 'AB-'), ('O-', 'AB+'),
    -- O+
    ('O+', 'O+'), ('O+', 'A+'), ('O+', 'B+'), ('O+', 'AB+'),
    -- A-
    ('A-', 'A-'), ('A-', 'A+'), ('A-', 'AB-'), ('A-', 'AB+'),
    -- A+
    ('A+', 'A+'), ('A+', 'AB+'),
    -- B-
    ('B-', 'B-'), ('B-', 'B+'), ('B-', 'AB-'), ('B-', 'AB+'),
    -- B+
    ('B+', 'B+'), ('B+', 'AB+'),
    -- AB-
    ('AB-', 'AB-'), ('AB-', 'AB+'),
    -- AB+ can only donate to AB+
    ('AB+', 'AB+')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. BLOOD BANKS
-- ============================================================

CREATE TABLE IF NOT EXISTS blood_banks (
    bank_id         SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    address         TEXT NOT NULL,
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,
    pincode         TEXT,
    contact_phone   TEXT NOT NULL,
    contact_email   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. USERS (Auth table — roles: donor, hospital, admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'donor'
                        CHECK (role IN ('donor', 'hospital', 'admin')),
    phone           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. DONORS
-- ============================================================

CREATE TABLE IF NOT EXISTS donors (
    donor_id            SERIAL PRIMARY KEY,
    user_id             INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    blood_group         TEXT NOT NULL REFERENCES blood_groups(blood_group),
    age                 INT NOT NULL CHECK (age BETWEEN 18 AND 65),
    gender              TEXT NOT NULL CHECK (gender IN ('M', 'F', 'O')),
    city                TEXT NOT NULL,
    state               TEXT NOT NULL,
    address             TEXT,
    last_donation_date  DATE,
    total_donations     INT NOT NULL DEFAULT 0,
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. DONATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS donations (
    donation_id     SERIAL PRIMARY KEY,
    donor_id        INT NOT NULL REFERENCES donors(donor_id) ON DELETE RESTRICT,
    bank_id         INT NOT NULL REFERENCES blood_banks(bank_id) ON DELETE RESTRICT,
    donation_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    volume_ml       INT NOT NULL DEFAULT 450 CHECK (volume_ml BETWEEN 300 AND 550),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. INVENTORY (one row per blood unit/bag)
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory (
    unit_id         SERIAL PRIMARY KEY,
    bank_id         INT NOT NULL REFERENCES blood_banks(bank_id) ON DELETE RESTRICT,
    blood_group     TEXT NOT NULL REFERENCES blood_groups(blood_group),
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date     DATE,           -- auto-set by trigger if NULL
    status          TEXT NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available', 'issued', 'expired', 'discarded')),
    donation_id     INT REFERENCES donations(donation_id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expiry CHECK (expiry_date IS NULL OR expiry_date > collection_date)
);

-- ============================================================
-- 7. PATIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS patients (
    patient_id      SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    age             INT CHECK (age > 0),
    gender          TEXT CHECK (gender IN ('M', 'F', 'O')),
    blood_group     TEXT NOT NULL REFERENCES blood_groups(blood_group),
    hospital_name   TEXT NOT NULL,
    hospital_city   TEXT NOT NULL,
    hospital_state  TEXT NOT NULL,
    contact_phone   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. BLOOD REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS blood_requests (
    request_id          SERIAL PRIMARY KEY,
    patient_id          INT NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    requested_by        INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    blood_group         TEXT NOT NULL REFERENCES blood_groups(blood_group),
    units_needed        INT NOT NULL CHECK (units_needed > 0),
    units_fulfilled     INT NOT NULL DEFAULT 0,
    city                TEXT NOT NULL,
    urgency             TEXT NOT NULL DEFAULT 'normal'
                            CHECK (urgency IN ('normal', 'urgent', 'critical')),
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'matched', 'partially_fulfilled',
                                              'fulfilled', 'cancelled')),
    notes               TEXT,
    request_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. REQUEST DONOR MATCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS request_donor_matches (
    match_id        SERIAL PRIMARY KEY,
    request_id      INT NOT NULL REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    donor_id        INT NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    notified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response        TEXT NOT NULL DEFAULT 'pending'
                        CHECK (response IN ('pending', 'accepted', 'declined')),
    responded_at    TIMESTAMPTZ,
    UNIQUE (request_id, donor_id)
);

-- ============================================================
-- 10. AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    log_id      SERIAL PRIMARY KEY,
    table_name  TEXT NOT NULL,
    operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id   INT NOT NULL,
    old_data    JSONB,
    new_data    JSONB,
    changed_by  TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_donors_blood_city      ON donors(blood_group, city);
CREATE INDEX IF NOT EXISTS idx_donors_user_id         ON donors(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_group_status ON inventory(blood_group, status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_bank         ON inventory(bank_id);
CREATE INDEX IF NOT EXISTS idx_requests_status_urgency ON blood_requests(status, urgency);
CREATE INDEX IF NOT EXISTS idx_requests_group_city    ON blood_requests(blood_group, city);
CREATE INDEX IF NOT EXISTS idx_matches_request        ON request_donor_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_matches_donor          ON request_donor_matches(donor_id);
CREATE INDEX IF NOT EXISTS idx_audit_table_record     ON audit_log(table_name, record_id);

-- ============================================================
-- VIEWS
-- ============================================================

-- Available stock grouped by blood group + bank
CREATE OR REPLACE VIEW vw_available_stock AS
SELECT
    i.blood_group,
    i.bank_id,
    b.name            AS bank_name,
    b.city            AS bank_city,
    b.contact_phone   AS bank_contact,
    COUNT(*)          AS units_available,
    MIN(i.expiry_date) AS earliest_expiry
FROM inventory i
JOIN blood_banks b ON b.bank_id = i.bank_id
WHERE i.status = 'available'
  AND i.expiry_date >= CURRENT_DATE
GROUP BY i.blood_group, i.bank_id, b.name, b.city, b.contact_phone;

-- Donors eligible to donate today (90+ days since last donation)
CREATE OR REPLACE VIEW vw_eligible_donors AS
SELECT
    d.donor_id,
    u.name,
    u.email,
    u.phone,
    d.blood_group,
    d.city,
    d.state,
    d.last_donation_date,
    d.total_donations,
    CASE
        WHEN d.last_donation_date IS NULL THEN 'Never donated'
        ELSE (CURRENT_DATE - d.last_donation_date)::TEXT || ' days ago'
    END AS last_donated_info
FROM donors d
JOIN users u ON u.user_id = d.user_id
WHERE d.is_available = TRUE
  AND u.is_active = TRUE
  AND (
      d.last_donation_date IS NULL
      OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days'
  );

-- Pending blood requests sorted by urgency
CREATE OR REPLACE VIEW vw_pending_requests AS
SELECT
    r.request_id,
    r.blood_group,
    r.units_needed,
    r.units_fulfilled,
    r.city,
    r.urgency,
    r.status,
    r.request_date,
    p.name          AS patient_name,
    p.hospital_name,
    p.hospital_city,
    p.contact_phone AS patient_contact,
    u.name          AS requested_by_name
FROM blood_requests r
JOIN patients p  ON p.patient_id  = r.patient_id
JOIN users u     ON u.user_id     = r.requested_by
WHERE r.status = 'pending'
ORDER BY
    CASE r.urgency
        WHEN 'critical' THEN 0
        WHEN 'urgent'   THEN 1
        ELSE                 2
    END,
    r.request_date;

-- Units expiring within 7 days
CREATE OR REPLACE VIEW vw_expiring_soon AS
SELECT
    i.unit_id,
    i.blood_group,
    i.collection_date,
    i.expiry_date,
    i.status,
    (i.expiry_date - CURRENT_DATE) AS days_until_expiry,
    b.bank_id,
    b.name          AS bank_name,
    b.city          AS bank_city,
    b.contact_phone AS bank_contact
FROM inventory i
JOIN blood_banks b ON b.bank_id = i.bank_id
WHERE i.status = 'available'
  AND i.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY i.expiry_date;

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Attach updated_at trigger to all relevant tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','donors','inventory','blood_requests','blood_banks']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
             CREATE TRIGGER trg_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
            t, t
        );
    END LOOP;
END;
$$;

-- Auto-set expiry_date on inventory insert (42 days from collection)
CREATE OR REPLACE FUNCTION fn_set_inventory_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.expiry_date IS NULL THEN
        NEW.expiry_date := NEW.collection_date + INTERVAL '42 days';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_expiry ON inventory;
CREATE TRIGGER trg_inventory_expiry
BEFORE INSERT ON inventory
FOR EACH ROW EXECUTE FUNCTION fn_set_inventory_expiry();

-- Update donor stats after a donation is recorded
CREATE OR REPLACE FUNCTION fn_update_donor_after_donation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE donors
    SET
        total_donations    = total_donations + 1,
        last_donation_date = NEW.donation_date,
        updated_at         = NOW()
    WHERE donor_id = NEW.donor_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donor_donation_count ON donations;
CREATE TRIGGER trg_donor_donation_count
AFTER INSERT ON donations
FOR EACH ROW EXECUTE FUNCTION fn_update_donor_after_donation();

-- Audit trigger for inventory changes
CREATE OR REPLACE FUNCTION fn_audit_inventory()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, operation, record_id, old_data, new_data)
        VALUES ('inventory', 'UPDATE', OLD.unit_id,
                row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, operation, record_id, old_data)
        VALUES ('inventory', 'DELETE', OLD.unit_id, row_to_json(OLD)::JSONB);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_inventory ON inventory;
CREATE TRIGGER trg_audit_inventory
AFTER UPDATE OR DELETE ON inventory
FOR EACH ROW EXECUTE FUNCTION fn_audit_inventory();

-- Audit trigger for blood_requests changes
CREATE OR REPLACE FUNCTION fn_audit_requests()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, operation, record_id, old_data, new_data)
        VALUES ('blood_requests', 'UPDATE', OLD.request_id,
                row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, operation, record_id, old_data)
        VALUES ('blood_requests', 'DELETE', OLD.request_id, row_to_json(OLD)::JSONB);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_requests ON blood_requests;
CREATE TRIGGER trg_audit_requests
AFTER UPDATE OR DELETE ON blood_requests
FOR EACH ROW EXECUTE FUNCTION fn_audit_requests();

-- ============================================================
-- STORED FUNCTIONS / PROCEDURES
-- ============================================================

-- fn_find_matching_donors: returns compatible + eligible donors in a city
CREATE OR REPLACE FUNCTION fn_find_matching_donors(
    p_blood_group TEXT,
    p_city        TEXT
)
RETURNS TABLE (
    donor_id           INT,
    name               TEXT,
    blood_group        TEXT,
    phone              TEXT,
    city               TEXT,
    last_donation_date DATE,
    total_donations    INT,
    is_exact_match     BOOLEAN
) LANGUAGE sql STABLE AS $$
    SELECT
        d.donor_id,
        u.name,
        d.blood_group,
        u.phone,
        d.city,
        d.last_donation_date,
        d.total_donations,
        (d.blood_group = p_blood_group) AS is_exact_match
    FROM donors d
    JOIN users u ON u.user_id = d.user_id
    JOIN blood_compatibility c
        ON c.donor_group = d.blood_group
       AND c.recipient_group = p_blood_group
    WHERE d.city ILIKE p_city
      AND d.is_available = TRUE
      AND u.is_active = TRUE
      AND (
          d.last_donation_date IS NULL
          OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days'
      )
    ORDER BY
        (d.blood_group = p_blood_group) DESC,   -- exact match first
        d.last_donation_date ASC NULLS FIRST;    -- never donated first
$$;

-- fn_find_matching_units: available compatible units, nearest expiry first
CREATE OR REPLACE FUNCTION fn_find_matching_units(
    p_blood_group TEXT
)
RETURNS TABLE (
    unit_id        INT,
    blood_group    TEXT,
    bank_id        INT,
    bank_name      TEXT,
    bank_city      TEXT,
    bank_contact   TEXT,
    collection_date DATE,
    expiry_date    DATE,
    is_exact_match BOOLEAN
) LANGUAGE sql STABLE AS $$
    SELECT
        i.unit_id,
        i.blood_group,
        b.bank_id,
        b.name          AS bank_name,
        b.city          AS bank_city,
        b.contact_phone AS bank_contact,
        i.collection_date,
        i.expiry_date,
        (i.blood_group = p_blood_group) AS is_exact_match
    FROM inventory i
    JOIN blood_banks b ON b.bank_id = i.bank_id
    JOIN blood_compatibility c
        ON c.donor_group = i.blood_group
       AND c.recipient_group = p_blood_group
    WHERE i.status = 'available'
      AND i.expiry_date >= CURRENT_DATE
    ORDER BY
        (i.blood_group = p_blood_group) DESC,   -- exact match first
        i.expiry_date ASC;                       -- nearest expiry first
$$;

-- sp_register_donation: atomically record donation + add inventory unit
CREATE OR REPLACE FUNCTION sp_register_donation(
    p_donor_id  INT,
    p_bank_id   INT,
    p_volume_ml INT  DEFAULT 450,
    p_notes     TEXT DEFAULT NULL
)
RETURNS INT              -- returns the new donation_id
LANGUAGE plpgsql AS $$
DECLARE
    v_blood_group TEXT;
    v_donation_id INT;
BEGIN
    -- Validate donor exists and get their blood group
    SELECT blood_group INTO v_blood_group
    FROM donors WHERE donor_id = p_donor_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Donor with id % not found', p_donor_id;
    END IF;

    -- Check 90-day eligibility
    IF EXISTS (
        SELECT 1 FROM donors
        WHERE donor_id = p_donor_id
          AND last_donation_date > CURRENT_DATE - INTERVAL '90 days'
    ) THEN
        RAISE EXCEPTION 'Donor is not yet eligible — must wait 90 days since last donation';
    END IF;

    -- Insert donation record (trigger will update donor stats)
    INSERT INTO donations (donor_id, bank_id, donation_date, volume_ml, notes)
    VALUES (p_donor_id, p_bank_id, CURRENT_DATE, p_volume_ml, p_notes)
    RETURNING donation_id INTO v_donation_id;

    -- Add one blood unit to inventory (trigger sets expiry_date)
    INSERT INTO inventory (bank_id, blood_group, collection_date, donation_id)
    VALUES (p_bank_id, v_blood_group, CURRENT_DATE, v_donation_id);

    RETURN v_donation_id;
END;
$$;

-- sp_fulfill_request: atomically mark units issued + update request status
CREATE OR REPLACE PROCEDURE sp_fulfill_request(
    p_request_id INT,
    p_unit_ids   INT[]
)
LANGUAGE plpgsql AS $$
DECLARE
    v_units_needed    INT;
    v_units_fulfilled INT;
    v_unit_id         INT;
    v_valid_count     INT := 0;
BEGIN
    -- Lock and fetch request
    SELECT units_needed, units_fulfilled
    INTO v_units_needed, v_units_fulfilled
    FROM blood_requests
    WHERE request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Blood request % not found', p_request_id;
    END IF;

    -- Mark each unit as issued (only if currently available + not expired)
    FOREACH v_unit_id IN ARRAY p_unit_ids
    LOOP
        UPDATE inventory
        SET status = 'issued', updated_at = NOW()
        WHERE unit_id = v_unit_id
          AND status = 'available'
          AND expiry_date >= CURRENT_DATE;

        IF FOUND THEN
            v_valid_count := v_valid_count + 1;
        END IF;
    END LOOP;

    -- Update units_fulfilled and request status
    v_units_fulfilled := v_units_fulfilled + v_valid_count;

    UPDATE blood_requests
    SET
        units_fulfilled = v_units_fulfilled,
        status = CASE
            WHEN v_units_fulfilled >= v_units_needed THEN 'fulfilled'
            WHEN v_units_fulfilled > 0               THEN 'partially_fulfilled'
            ELSE status
        END,
        updated_at = NOW()
    WHERE request_id = p_request_id;

    IF v_valid_count = 0 THEN
        RAISE EXCEPTION 'No valid available units were found among the provided IDs';
    END IF;
END;
$$;
