-- Integrity, audit, and concurrency improvements. All changes are additive or
-- derived from existing donation rows; application records are never truncated.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_donors_user_id') THEN
    ALTER TABLE donors ADD CONSTRAINT uq_donors_user_id UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_blood_banks_natural_key') THEN
    ALTER TABLE blood_banks ADD CONSTRAINT uq_blood_banks_natural_key UNIQUE (name, city, state);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_request_fulfilled_range') THEN
    ALTER TABLE blood_requests
      ADD CONSTRAINT chk_request_fulfilled_range
      CHECK (units_fulfilled BETWEEN 0 AND units_needed);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_case_insensitive
  ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_donation_id
  ON inventory (donation_id) WHERE donation_id IS NOT NULL;

-- Index the actual filter and join paths used by API reports and matching.
CREATE INDEX IF NOT EXISTS idx_users_phone_normalized
  ON users (REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donors_city_group_available
  ON donors (LOWER(city), blood_group) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_donations_donor_date
  ON donations (donor_id, donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_date
  ON donations (donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_available_expiry
  ON inventory (expiry_date, blood_group) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_requests_requester_status_date
  ON blood_requests (requested_by, status, request_date DESC);
CREATE INDEX IF NOT EXISTS idx_requests_patient
  ON blood_requests (patient_id);
CREATE INDEX IF NOT EXISTS idx_matches_donor_response
  ON request_donor_matches (donor_id, response);

-- The historical counter was incremented in insertion order, so backfill any
-- previously counted donations missing from the event ledger. New rows are
-- placed before the donor's oldest recorded event to preserve the current
-- recent history and keep the 90-day spacing used by the eligibility rule.
DROP TRIGGER IF EXISTS trg_donor_donation_count ON donations;

WITH event_stats AS (
  SELECT d.donor_id,
         d.total_donations AS stored_total,
         d.last_donation_date AS stored_last_date,
         COUNT(n.donation_id)::INT AS recorded_total,
         MIN(n.donation_date) AS oldest_recorded_date
  FROM donors d
  LEFT JOIN donations n ON n.donor_id = d.donor_id
  GROUP BY d.donor_id, d.total_donations, d.last_donation_date
), missing AS (
  SELECT *, GREATEST(stored_total - recorded_total, 0) AS missing_total
  FROM event_stats
), backfill AS (
  SELECT m.donor_id,
         CASE
           WHEN m.oldest_recorded_date IS NULL
             THEN COALESCE(m.stored_last_date, CURRENT_DATE) - (g.n - 1) * INTERVAL '100 days'
           ELSE m.oldest_recorded_date - g.n * INTERVAL '100 days'
         END::DATE AS donation_date
  FROM missing m
  CROSS JOIN LATERAL generate_series(1, m.missing_total) AS g(n)
)
INSERT INTO donations (donor_id, bank_id, donation_date, volume_ml, notes)
SELECT b.donor_id,
       COALESCE(bank.bank_id, (SELECT MIN(bank_id) FROM blood_banks)),
       b.donation_date,
       450,
       'Historical demo donation backfill'
FROM backfill b
JOIN donors d ON d.donor_id = b.donor_id
LEFT JOIN LATERAL (
  SELECT bank_id FROM blood_banks
  WHERE LOWER(city) = LOWER(d.city)
  ORDER BY bank_id LIMIT 1
) bank ON TRUE;

-- Donation events are the source of truth for these cached donor fields.
UPDATE donors d
SET total_donations = history.event_count,
    last_donation_date = history.last_date
FROM (
  SELECT d2.donor_id,
         COUNT(n.donation_id)::INT AS event_count,
         MAX(n.donation_date) AS last_date
  FROM donors d2
  LEFT JOIN donations n ON n.donor_id = d2.donor_id
  GROUP BY d2.donor_id
) history
WHERE history.donor_id = d.donor_id;

CREATE OR REPLACE FUNCTION fn_sync_donor_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_donor_id INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_donor_id := OLD.donor_id;
  ELSE
    v_donor_id := NEW.donor_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.donor_id IS DISTINCT FROM NEW.donor_id THEN
    UPDATE donors d
    SET total_donations = history.event_count,
        last_donation_date = history.last_date
    FROM (
      SELECT COUNT(*)::INT AS event_count, MAX(donation_date) AS last_date
      FROM donations WHERE donor_id = OLD.donor_id
    ) history
    WHERE d.donor_id = OLD.donor_id;
  END IF;

  UPDATE donors d
  SET total_donations = history.event_count,
      last_donation_date = history.last_date
  FROM (
    SELECT COUNT(*)::INT AS event_count, MAX(donation_date) AS last_date
    FROM donations WHERE donor_id = v_donor_id
  ) history
  WHERE d.donor_id = v_donor_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_donor_donation_count
AFTER INSERT OR UPDATE OR DELETE ON donations
FOR EACH ROW EXECUTE FUNCTION fn_sync_donor_history();

-- A donor row lock serializes simultaneous donation attempts. The eligibility
-- check therefore cannot be bypassed by two concurrent requests.
CREATE OR REPLACE FUNCTION sp_register_donation(
  p_donor_id  INT,
  p_bank_id   INT,
  p_volume_ml INT DEFAULT 450,
  p_notes     TEXT DEFAULT NULL
)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_blood_group TEXT;
  v_last_donation DATE;
  v_is_available BOOLEAN;
  v_is_active BOOLEAN;
  v_donation_id INT;
BEGIN
  SELECT d.blood_group, d.last_donation_date, d.is_available, u.is_active
  INTO v_blood_group, v_last_donation, v_is_available, v_is_active
  FROM donors d
  JOIN users u ON u.user_id = d.user_id
  WHERE d.donor_id = p_donor_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor with id % not found', p_donor_id;
  END IF;
  IF NOT v_is_available OR NOT v_is_active THEN
    RAISE EXCEPTION 'This donor is not currently available';
  END IF;
  IF v_last_donation IS NOT NULL AND v_last_donation > CURRENT_DATE - INTERVAL '90 days' THEN
    RAISE EXCEPTION 'Donor is not yet eligible — must wait 90 days since last donation';
  END IF;

  INSERT INTO donations (donor_id, bank_id, donation_date, volume_ml, notes)
  VALUES (p_donor_id, p_bank_id, CURRENT_DATE, p_volume_ml, p_notes)
  RETURNING donation_id INTO v_donation_id;

  INSERT INTO inventory (bank_id, blood_group, collection_date, donation_id)
  VALUES (p_bank_id, v_blood_group, CURRENT_DATE, v_donation_id);

  RETURN v_donation_id;
END;
$$;

-- Fulfillment locks both the request and eligible inventory rows, rejects
-- incompatible or duplicate units, and cannot issue more than remains needed.
CREATE OR REPLACE PROCEDURE sp_fulfill_request(
  p_request_id INT,
  p_unit_ids   INT[]
)
LANGUAGE plpgsql AS $$
DECLARE
  v_blood_group TEXT;
  v_units_needed INT;
  v_units_fulfilled INT;
  v_remaining INT;
  v_valid_count INT;
BEGIN
  SELECT blood_group, units_needed, units_fulfilled
  INTO v_blood_group, v_units_needed, v_units_fulfilled
  FROM blood_requests
  WHERE request_id = p_request_id
    AND status NOT IN ('fulfilled', 'cancelled')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Open blood request % not found', p_request_id;
  END IF;
  IF p_unit_ids IS NULL OR CARDINALITY(p_unit_ids) = 0 THEN
    RAISE EXCEPTION 'Select at least one inventory unit';
  END IF;

  v_remaining := v_units_needed - v_units_fulfilled;
  IF CARDINALITY(p_unit_ids) > v_remaining THEN
    RAISE EXCEPTION 'Selected units exceed the % units still needed', v_remaining;
  END IF;

  PERFORM i.unit_id
  FROM inventory i
  JOIN blood_compatibility c
    ON c.donor_group = i.blood_group
   AND c.recipient_group = v_blood_group
  WHERE i.unit_id = ANY(p_unit_ids)
    AND i.status = 'available'
    AND i.expiry_date >= CURRENT_DATE
  ORDER BY i.unit_id
  FOR UPDATE OF i;

  SELECT COUNT(DISTINCT i.unit_id)::INT
  INTO v_valid_count
  FROM inventory i
  JOIN blood_compatibility c
    ON c.donor_group = i.blood_group
   AND c.recipient_group = v_blood_group
  WHERE i.unit_id = ANY(p_unit_ids)
    AND i.status = 'available'
    AND i.expiry_date >= CURRENT_DATE;

  IF v_valid_count <> CARDINALITY(p_unit_ids) THEN
    RAISE EXCEPTION 'One or more selected units are unavailable, expired, duplicated, or blood-incompatible';
  END IF;

  UPDATE inventory i
  SET status = 'issued'
  FROM blood_compatibility c
  WHERE i.unit_id = ANY(p_unit_ids)
    AND c.donor_group = i.blood_group
    AND c.recipient_group = v_blood_group
    AND i.status = 'available'
    AND i.expiry_date >= CURRENT_DATE;

  v_units_fulfilled := v_units_fulfilled + v_valid_count;
  UPDATE blood_requests
  SET units_fulfilled = v_units_fulfilled,
      status = CASE
        WHEN v_units_fulfilled = v_units_needed THEN 'fulfilled'
        WHEN v_units_fulfilled > 0 THEN 'partially_fulfilled'
        ELSE status
      END
  WHERE request_id = p_request_id;
END;
$$;

ALTER TABLE audit_log ALTER COLUMN changed_by SET DEFAULT CURRENT_USER;

CREATE OR REPLACE FUNCTION fn_audit_inventory()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_actor TEXT := COALESCE(NULLIF(current_setting('app.user_id', TRUE), ''), current_user);
BEGIN
  IF current_setting('app.suppress_audit', TRUE) = 'on' THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, operation, record_id, new_data, changed_by)
    VALUES ('inventory', 'INSERT', NEW.unit_id, to_jsonb(NEW), v_actor);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, operation, record_id, old_data, new_data, changed_by)
    VALUES ('inventory', 'UPDATE', OLD.unit_id, to_jsonb(OLD), to_jsonb(NEW), v_actor);
  ELSE
    INSERT INTO audit_log(table_name, operation, record_id, old_data, changed_by)
    VALUES ('inventory', 'DELETE', OLD.unit_id, to_jsonb(OLD), v_actor);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_inventory ON inventory;
CREATE TRIGGER trg_audit_inventory
AFTER INSERT OR UPDATE OR DELETE ON inventory
FOR EACH ROW EXECUTE FUNCTION fn_audit_inventory();

CREATE OR REPLACE FUNCTION fn_audit_requests()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_actor TEXT := COALESCE(NULLIF(current_setting('app.user_id', TRUE), ''), current_user);
BEGIN
  IF current_setting('app.suppress_audit', TRUE) = 'on' THEN RETURN NULL; END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, operation, record_id, new_data, changed_by)
    VALUES ('blood_requests', 'INSERT', NEW.request_id, to_jsonb(NEW), v_actor);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, operation, record_id, old_data, new_data, changed_by)
    VALUES ('blood_requests', 'UPDATE', OLD.request_id, to_jsonb(OLD), to_jsonb(NEW), v_actor);
  ELSE
    INSERT INTO audit_log(table_name, operation, record_id, old_data, changed_by)
    VALUES ('blood_requests', 'DELETE', OLD.request_id, to_jsonb(OLD), v_actor);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_requests ON blood_requests;
CREATE TRIGGER trg_audit_requests
AFTER INSERT OR UPDATE OR DELETE ON blood_requests
FOR EACH ROW EXECUTE FUNCTION fn_audit_requests();
