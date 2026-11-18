-- Migration 001: Add GPS coordinates to blood_banks
-- NOTE: latitude, longitude, fn_haversine_km, and fn_find_matching_donors with
-- compatibility_score are all already defined in schema.sql (v2.0+).
-- This migration is intentionally a no-op to avoid re-running those definitions.
-- The schema.sql is the single source of truth.
SELECT 1; -- no-op placeholder
