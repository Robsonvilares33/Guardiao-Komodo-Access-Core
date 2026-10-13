# Backup e restauração (Supabase Free não tem backups automáticos)

## Backup (R$0)
1. `pg_dump` com a connection string do banco (lida do ambiente, nunca colada no comando) → `kac_YYYYMMDD.dump` (formato custom).
2. Guardar cifrado (age/gpg) em armazenamento do usuário (Google Drive/OneDrive), com retenção de 7 diários + 4 semanais.
3. Agendar via GitHub Actions (gratuito para repositório público; **o segredo fica em Actions secrets**) ou no Revision-PC. **Pendente de autorização**, porque cria um segredo novo.
4. Manter ping semanal para evitar a pausa por inatividade.

## Restauração (testar trimestralmente)
1. Criar um banco descartável (PGlite/Postgres local ou 2º projeto Free).
2. `pg_restore --no-owner` → conferir contagens por tabela e rodar `tests/pglite/migrations-rls.mjs`.
3. Registrar RPO (≤24 h) e RTO medidos.

**Status: PLANEJADO; nenhum backup foi configurado ainda.**
