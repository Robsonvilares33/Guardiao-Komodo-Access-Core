# Modelo de ameaças (STRIDE resumido, sec. 14)

| Ameaça | Vetor | Controle atual | Lacuna / ação |
|---|---|---|---|
| Spoofing | Força bruta no login | PBKDF2 + rate limit atômico por IP | Sem MFA → Supabase Auth (Fase C) |
| Spoofing de IP | Rate limit usa `x-real-ip`/`x-forwarded-for` | Atrás da Vercel, `x-real-ip` é definido pela borda | **Confiar só em `x-real-ip` da Vercel**; ignorar XFF vindo do cliente (ajustar código na Fase B) |
| Tampering | Escrita cross-tenant | Single-tenant hoje; RLS 005 testada no PGlite (26/26) | Filtro duplo por org na API |
| Repudiation | Ação sem rastro | — | audit_log (006) |
| Information disclosure | Chave service_role | Só no env do servidor (sensitive); 0 ocorrências no git e nos assets | Secret scanning no GitHub |
| Information disclosure | XSS | Escape na renderização; X-Frame-Options DENY; HSTS | CSP em **enforce** (vercel.json) desde 14/10/2026 |
| DoS | Abuso da API | Limites da Vercel | Rate limit por sessão |
| Elevation | Viewer escrevendo | Papel checado na API | RLS por papel (testado) |
| Supabase Free pausa/sem backup | Disponibilidade | — | BACKUP_RESTORE.md |

## Plano de CSP (report-only primeiro)
`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
Passos:
1. Header **Report-Only** em preview.
2. Verificar violações no console (E2E).
3. Ajustar (ex.: scripts inline).
4. Enforce.
**Status: APLICADO (enforce) em 14/10/2026**, após Report-Only sem violações. Política vigente em vercel.json (inclui img blob:, font data:, connect-src origem Supabase, object-src 'none'). Sem cópia Report-Only: o mesmo texto só duplicaria avisos. Rollback: `git revert` do commit único (volta a `Content-Security-Policy-Report-Only`).
