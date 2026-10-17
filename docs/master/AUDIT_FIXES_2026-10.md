# Correções da auditoria (RELATORIO.md) — branch `work/phase-c-d`, out/2026

Sem merge na main. Nenhuma env ou flag de produção foi alterada, e as flags continuam desligadas. Nenhuma migration foi aplicada em produção. Custo: R$0. A branch do Supabase é paga (US$ 0,01344/h), então as migrations foram ensaiadas no PGlite.

## O que foi feito (1 commit por achado, cada um com testes)
| Achado | Commit | Resumo |
|---|---|---|
| 1 Alta | ca35da7 | Admin vinculado não entra mais só com senha quando `KAC_SUPABASE_AUTH=on` (403 `use_new_login`, com link para o novo login). Com o flag OFF, nada muda. |
| 2 Alta | c5ba33b | Excluir visita usa o papel na empresa (owner/admin). |
| 3 Alta | b718c34 | LGPD: migration 010 (retenção por empresa, cascade do histórico, expurgo, exportação/exclusão por titular), telas do admin, aviso ao visitante (`privacidade-visitante.html`), workflow diário (em `docs/master/workflows`). |
| 4 Média | 7bef331 | Portaria offline: fila de check-in/out e agenda do dia cifradas (AES-GCM, chave não exportável) no IndexedDB, só os campos mínimos, por até 24 h; sincroniza ao voltar a rede (409 vira conflito, sem sobrescrever); tudo é apagado no logout. |
| 5 Média | fe502c2 | Busca sanitizada antes do `or()` do PostgREST. |
| 5 Média | a4f5483 | Sessão, usuário e empresa numa só consulta (embedding pelas FKs, sem migration), com fallback para as 3 consultas antigas. |
| 8 Média | f2ad96f | Agenda em 1 bundle com `defer` (`node scripts/build-bundles.mjs`; um teste falha se o bundle estiver desatualizado), `AuthGate` redireciona sem sessão antes de baixar o bundle, espaço da navegação reservado (CLS 0), sem layout forçado nas abas. |
| 9 Baixa | b390c1c | `auth.html` com CLS 0 (logo já no tamanho final, fallback de fonte com as métricas da Poppins, cartão ancorado no topo). |
| 12 Baixa | dd57f60 | POST/PUT/PATCH/DELETE vindos de outra origem → 403 `bad_origin`. |
| 10/11/14 Baixa | a87a279 | Limite compartilhado no banco (migration 011 `kac_rate_hit`, que até ser aplicada cai na memória), limite por conta no login, IP desconhecido com balde por e-mail; índices das 3 FKs. |
| 13 Baixa | a95c53d | `/auth/status` não consulta o banco quando o bootstrap está desligado. |
| 14 (limpeza) | b718c34 | Sessões vencidas e tentativas de login entram no expurgo diário da 010. |
| /admin 404 | b718c34 | `GET /admin` virou alias do resumo e foi criado `/admin/seguranca`. |
| 15, 17 | — | Ficaram como propostas, por decisão do Robson: `PROPOSAL_MULTI_ORG.md`, `PROPOSAL_CAMERA_POLICY.md`. |
| 16 Info | — | RLS sem policy nas tabelas só do servidor é intencional (nega tudo; só o service_role acessa). |
| Produto | — | `PRODUCT_DESIGN_NEXT.md`: visitantes recorrentes (~3 d), convite por QR (~4–5 d), alerta ao anfitrião (~3 d). |

## Pendente de aprovação do Robson
### Migration 010 — LGPD (`010_lgpd_retention.sql`, sha256 e113cc05…)
- **O que muda:**
  - adiciona `kac_organizations.retention_months` (padrão 12);
  - apaga linhas de histórico órfãs (de visitas já apagadas);
  - o trigger deixa de registrar DELETE;
  - adiciona a FK do histórico com `ON DELETE CASCADE`;
  - cria as RPCs `kac_purge_expired`, `kac_subject_export` e `kac_subject_delete`, executáveis só pelo service_role.
- **Não apaga nenhuma visita ao ser aplicada.** O expurgo só roda quando chamado: pelo workflow, ou manualmente.
- **Ensaio no PGlite:** 13 PASS (aplica, md5 das visitas intacto, cascade, expurgo, isolamento entre empresas, anon/authenticated negados, rollback, reaplicação).

### Migration 011 — limite compartilhado + índices (`011_rate_limit_indexes.sql`, sha256 6272d38b…)
- **O que muda:**
  - cria a tabela `kac_rate_hits` (RLS ligada, sem policy) e a RPC atômica `kac_rate_hit`;
  - cria 3 índices.
- Não altera dados.
- **Ensaio no PGlite:** 13 PASS.

### Plano de backup (antes de cada uma)
1. `node scripts/backup/dump.mjs` gera um JSON privado em `/workspace/backups` (pasta 700) e no PC. Conferir o SHA-256 nos dois lados e registrar em `BACKUP_RESTORE.md`.
2. Guardar o md5 das visitas: `select md5(string_agg(t::text, ',' order by t.id)) from komodo_acessos t`. Valor atual: `cc9fe7b3edad64f6423b865a40a729af`.

### Aplicação (com a autorização)
- Aplicar com `apply_migration`, na ordem: 010, depois 011.
- Depois de cada uma, conferir o md5. Ele deve ser idêntico, porque nenhuma das duas mexe em visitas.
- Rodar o E2E local.

### Rollback
- **011:** `011_rate_limit_indexes_rollback.sql`. Remove a tabela, a RPC e os índices. O código volta sozinho ao limite em memória.
- **010:** `010_lgpd_retention_rollback.sql`. Remove as RPCs e a FK cascade, restaura o trigger que registra DELETE e remove `retention_months`.
  - As linhas órfãs de histórico apagadas pela 010 só voltam pelo backup do passo 1.
  - Visitas apagadas pelo expurgo só voltam pelo backup. Por isso, ligue o expurgo só depois de conferir a retenção.

### Ligar o expurgo diário (depois da 010)
1. Copiar `docs/master/workflows/lgpd-purge.yml` para `.github/workflows/`. O token da box não tem o escopo `workflow`, então isso precisa ser feito pelo Robson.
2. Cadastrar os secrets do Actions `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
3. Criar a variável `KAC_PURGE_ENABLED=true`.

Roda às 04:17, horário de Brasília.

## Números
- **Testes:** 273 → **302** passando. PGlite: 010 com 13/13 e 011 com 13/13.
- **Lighthouse mobile** (local, servidor estático sem gzip; média de 3 rodadas onde indicado):

| Página | Antes | Depois |
|---|---|---|
| Agenda, sem sessão (o que um visitante externo vê) | perf 79, LCP 4,9 s | perf 91–94, LCP 2,9–3,4 s |
| Agenda, com sessão | perf 85, LCP 3,8 s, CLS 0,10 | perf 83–95 (mediana ~85), LCP ~3,0 s, CLS 0 |
| auth.html | perf 97, CLS 0,079 (0,22 na auditoria) | perf 98–99, CLS 0 |
| login.html | — | perf 98, CLS 0 |

  - Na agenda com sessão, a meta de 90+ ainda **não é estável** no local. O que sobra é o 1º layout completo da página (cerca de 100 ms reais, ou ~400 ms com CPU 4×); o JS não é mais o gargalo.
  - Próximo passo sugerido: simplificar o CSS pesado (blur/sombras) e medir no Preview com gzip/HTTP2. O Preview é protegido e não há bypass, então a medição autenticada foi feita no box.
- **Stress** (servidor local da box, org de teste, 25 usuários, 30 s, lista do dia autenticada):
  - 2010 req, **0 erros**;
  - **p50 317 ms, p95 607 ms**, p99 1474 ms, 66 req/s;
  - antes: p50 622 ms, p95 862 ms, 37 req/s;
  - a sessão em 1 consulta, em vez de 3, foi conferida no banco real.
- **Segurança (refeito):**
  - sem sessão → 401;
  - POST/DELETE de outra origem → 403;
  - admin com aal1 → 403 `mfa_required`;
  - IDOR → 404;
  - status desatualizado → 409;
  - busca com injeção de filtro → 0 resultados;
  - owner com papel antigo "operador" consegue excluir (F2);
  - cabeçalhos ok.
- **md5 das visitas reais:** `cc9fe7b3edad64f6423b865a40a729af`, inalterado.
