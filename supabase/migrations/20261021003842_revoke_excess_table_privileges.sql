-- PostgREST clients do not need DDL-level table privileges.
-- TRUNCATE bypasses row-level security, so remove it from client-facing roles.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
