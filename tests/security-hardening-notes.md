# Guardiao Komodo Access Core — security hardening notes

## Implemented in the isolated Vercel prototype
- Login attempt query capped at 11 rows (enough to decide whether the threshold of 10 was reached).
- Login attempts older than 24 hours are pruned during login requests.
- Bootstrap checks for an existing user and handles PostgreSQL/PostgREST unique-violation responses as HTTP 409.
- Mock integration tests cover bootstrap sequencing, cookie flags, unauthenticated denial, visitor CRUD authorization, login throttling and old-attempt pruning.

## Required before production
- The bootstrap pre-check is not atomic. Add a database-level guard so concurrent requests cannot create two first administrators. Prefer a dedicated singleton bootstrap/installation row or an appropriate constraint and validate its behavior with concurrent requests. Do not rely on a pre-check alone.
- Confirm the actual migration defines unique `komodo_tbl_usuarios.email`, a valid role constraint, and indexes for `komodo_login_attempts(ip_hash, created_at)` and `komodo_login_attempts(created_at)`.
- A delete-before-count limiter is still susceptible to concurrent requests crossing the threshold. For a strict rate limit, use an atomic database function/RPC or another shared atomic limiter; test concurrent login attempts.
- Verify trusted proxy handling for `x-forwarded-for`; only trust the platform's documented proxy chain. Otherwise clients may spoof IPs.
- Confirm PostgREST filters, schema and types in a disposable PostgreSQL/Supabase project before any production migration.

## Safety status
- These tests use an in-memory mock only. No real Supabase database was queried or changed.
- No deployment, paid service, or production migration was performed.
