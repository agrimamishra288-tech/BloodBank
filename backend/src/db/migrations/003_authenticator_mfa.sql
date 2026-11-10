-- Store authenticator-based second-factor state. Secrets are encrypted by the
-- application using a key derived from JWT_SECRET before they are written.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
