# Guardião Komodo Access Core — release gate
Date: 2026-10-13

## Completed in the isolated lab
- Proposed PostgreSQL migrations 001, 002, and 003 are present in this directory.
- Migration 003 introduces transaction-scoped advisory locks for atomic initial-admin bootstrap and per-IP login attempt consumption.
- API draft now calls the two database RPCs rather than performing the bootstrap check/insert and rate-limit count/insert as separate REST operations.
- Login rate-limit address selection prefers x-real-ip, then the first x-forwarded-for entry. This still must be verified against the actual Vercel ingress headers.
- PGlite (PostgreSQL WASM, not a network server) applied migrations 001–003 and passed schema/constraint/RLS smoke checks.
- Mock/contract test suite passed 17/17 after adapting mocks to the new RPC contract.

## Important limitations
- PGlite runs as an embedded WASM engine. Its tests do not establish multi-connection or multi-instance concurrency behavior on a PostgreSQL server.
- No real PostgreSQL server concurrency test has been completed.
- Read-only Supabase inventory for project hcqcmirculeiyrpiwlpm returned zero public tables and zero migrations. No schema or data changes were made.
- Vercel project creation for guardiao-komodo-access-core was denied by Vercel API with HTTP 403: the connector is not authorized for scope robsonvilares-projects. Re-authentication / access to that scope is required. The Vercel CLI is not installed.
- No production secrets were configured; no deployment was created. Do not publish this as a working production app yet.
- AI endpoints still return HTTP 503 in the current web API draft.
- The current SQL migrations are proposed only. Do not apply them to the real Supabase project without explicit authorization.

## Required release gates
1. Obtain authorized Vercel access to team/scope robsonvilares-projects.
2. Validate migrations 001–003 on a disposable real PostgreSQL server, including parallel bootstrap and parallel rate-limit tests using separate connections.
3. Review trust boundary for Vercel client IP headers and verify the deployed ingress behavior.
4. Obtain explicit authorization before applying migrations to the Supabase production project.
5. Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and KAC_BOOTSTRAP_SECRET only as encrypted server-side Vercel environment variables. Never place secrets in client assets.
6. Deploy and run end-to-end smoke tests only after all preceding gates pass.
7. Verify AI feature scope; either implement it or keep it clearly disabled in the first release.

## Cost and preservation constraints
- No paid services or upgrades initiated.
- Existing Vercel projects vilares-site and ofertasmaximas were not modified.
- Original Komodo project remains out of scope; edits are confined to the integration lab.
