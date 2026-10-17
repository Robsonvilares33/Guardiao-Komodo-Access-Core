# Rollout em produção — `work/phase-c-d` (b67364c) → `main`

**Status: PREPARADO, não executado.** PR #1 (rascunho): https://github.com/Robsonvilares33/Guardiao-Komodo-Access-Core/pull/1

O que entra:
- identidade visual v3;
- novo login (Supabase Auth + MFA) com `KAC_SUPABASE_AUTH=on`;
- correções da auditoria (achados 1–14).

Continuam DESLIGADOS: `KAC_AI`, `KAC_BILLING`, `KAC_ALPR`. O banco já está pronto: as migrations 010, 011 e 012 foram aplicadas em 17/10, e são compatíveis tanto com o código novo quanto com o atual (a72b830).

## 1. Situação verificada (17/10/2026, 18:45 BRT)
| Item | Resultado |
|---|---|
| CI no PR #1 | `unit-tests` ✅, Vercel Preview ✅. Smoke público/auth/a11y só rodam no deploy de produção. Local: 302/302 testes, bundles em dia, PGlite 010/011/012 ✅ |
| Merge | `main` (a72b830) é ancestral da branch: 23 commits, sem conflito |
| Deploy de produção atual | `dpl_3p7Lz34BArELi8YFhuHn3gtpCw2L` (a72b830, 16/10 15:38 BRT) |
| Provedores do Supabase Auth | `email` e `google` ligados. **Cadastro aberto LIGADO** (`disable_signup=false`), ver a decisão D1 |
| Contas | Robson: papel admin, owner da "Guardião Komodo", vinculado, Google, TOTP verificado. kactest3: owner da org de teste, vinculado, e-mail+senha, TOTP verificado. smoke-ci: viewer, não vinculado |

### Env de produção (Vercel → Settings → Environment Variables → Production)
Só os nomes; nenhum valor foi lido nem impresso.

| Nome | Produção hoje | Ação |
|---|---|---|
| `SUPABASE_URL` | SET | manter |
| `SUPABASE_SERVICE_ROLE_KEY` | SET (sensitive) | manter |
| `KAC_SUPABASE_ANON_KEY` | **MISSING** (existe só no Preview da branch) | **criar** em Production: a chave pública anon/publishable do projeto `hcqcmirculeiyrpiwlpm` |
| `KAC_SUPABASE_AUTH` | **MISSING** (= desligado) | **criar** em Production com o valor `on` |
| `KAC_AI`, `KAC_BILLING`, `KAC_ALPR` | MISSING (= desligado) | **não criar** |
| `KAC_BOOTSTRAP_SECRET` | MISSING | não criar (o primeiro acesso fica desligado e `/auth/status` não consulta o banco) |
| `GROQ_API_KEY`, `MP_*` | só no Preview | não copiar para Production |

### Supabase Auth → URL Configuration
Não dá para conferir só lendo, com as ferramentas disponíveis: a API pública não mostra a lista de redirects. O registro da Fase C (13/10) diz que já foi cadastrado:
- **Site URL:** `https://guardiao-komodo-access-core.vercel.app`
- **Redirect URLs:** `https://guardiao-komodo-access-core.vercel.app/**`

**Conferir no painel antes de ligar** (passo 0.3). Sem isso, o retorno do Google cai no Site URL em vez de `/auth.html`.

### Proteção contra senhas vazadas
**Não está disponível no plano Free.** É só do Pro (US$ 25/mês) ou acima; no Free o botão aparece desligado. Por isso o aviso WARN do advisor continua. Alternativas R$0, todas no painel:
- Auth → Providers → Email: senha mínima de 12 caracteres e exigir letras, números e símbolos;
- manter o MFA obrigatório para owner/admin (já é assim no código);
- incentivar o login com Google.

## 2. Como o login fica com o flag ON
- **Admin vinculado** (papel `admin` ou owner/admin numa empresa, com `auth_user_id`):
  - o login antigo com senha responde 403 `use_new_login`;
  - a tela mostra "use o novo login", com o link para `/auth.html`.
- **Robson:** em `/auth.html`, **Entrar com Google** → código TOTP → aal2 → agenda da "Guardião Komodo". A senha antiga deixa de servir para ele.
- **kactest3:** em `/auth.html`, e-mail+senha → TOTP → org de teste. Comprovado no E2E de 17/10. O login antigo dela também é bloqueado, porque ela é owner.
- **Não vinculados** (por exemplo smoke-ci): o login antigo continua funcionando. É a transição combinada, para dar tempo de vincular a conta.
- **Owner/admin sem aal2:** 403 `mfa_required` nas rotas de admin e na abertura da sessão.
- **Sessões antigas por cookie** (12 h) continuam válidas até vencer. Se quiser forçar todo mundo a entrar de novo, use o passo opcional 3.4.

## Decisões antes de executar
- **D1 — cadastro aberto:** hoje qualquer pessoa pode criar uma conta Supabase e, com o flag ON, criar uma empresa nova pelo onboarding.
  - Para só convidados: Auth → Providers → Email → desligar "Allow new users to sign up". Os convites continuam funcionando.
  - Para SaaS aberto: manter como está. O limite de onboarding já usa o banco (011).
- **D2 — horário:** fazer fora do horário da portaria. Sugestão: depois das 20h.

## 3. Runbook (tempo total ~30–40 min)
### 0. Preparação (~10 min, sem impacto)
1. **Backup** (5 min): rodar na box
   `node scripts/backup/dump.mjs /workspace/backups/kac_prerollout_<data>.json <manifest>`
   - cifrar com a chave que já existe (`/home/box/.kac_backup_key`, mesmo procedimento da 012) e copiar para `C:\Users\yyy\Documents\kac_backups`;
   - anotar o md5 das visitas. Esperado: `cc9fe7b3edad64f6423b865a40a729af`.
2. **Gravar o ponto de rollback:** deployment `dpl_3p7Lz34BArELi8YFhuHn3gtpCw2L` (a72b830).
3. **Painel Supabase:**
   - conferir o Site URL e as Redirect URLs (seção 1);
   - decidir o D1;
   - opcional: endurecer a política de senha.
4. **Vercel → Env → Production:**
   - criar `KAC_SUPABASE_ANON_KEY` (chave anon) e `KAC_SUPABASE_AUTH=on`;
   - **não** clicar em "Redeploy". A env só vale no próximo build, então o deploy atual continua igual.
   - Fazer as envs ANTES do merge garante **um único** deploy novo, e o a72b830 continua sendo o deploy imediatamente anterior. No plano Hobby, o Instant Rollback só volta ao anterior.

### 1. Merge (~2 min + build ~1 min)
1. No PR #1: "Ready for review" → **Create a merge commit** (não usar squash nem rebase, para o revert ser simples).
2. A Vercel faz o build da `main` automaticamente. Esperar o deploy de Production ficar **Ready** (~30–90 s).
3. O GitHub Actions roda sozinho `unit-tests` + `smoke-public` no deploy de produção. Esperar os dois ficarem verdes (~1–2 min).

### 2. Smoke tests (~15 min)
**Pelo agente, na box (sem login):**
- `GET /api/health` → 200;
- `GET /api/auth/status` → 200 com `hasAdmin:true`;
- `GET /api/auth/supabase/config` → **200** (com o flag OFF era 404);
- `GET /api/visitantes/empresarial` sem sessão → 401;
- POST de outra origem → 403;
- md5 das visitas inalterado.

**No navegador do Robson.** Usar uma janela anônima ou Ctrl+F5, porque o service worker novo é `kac-shell-2026-10-17-f5`.
1. `https://guardiao-komodo-access-core.vercel.app/login.html`: carrega com a identidade nova (logo 3D, dourado/azul-noite).
2. Login antigo com o e-mail e a senha do Robson → deve aparecer **"use o novo login"** com o link. ✅ = bloqueio do achado 1 funcionando.
3. `/auth.html` → **Entrar com Google** (conta robsonboiling@gmail.com) → código do autenticador → abrir o app → a agenda da **Guardião Komodo** mostra a visita real. **Não editar nada.**
4. Menu "Mais"/console admin → Segurança: MFA ativo, papel owner, retenção 12 meses. **Não usar "Apagar dados do titular".**
5. Sair. Em janela anônima, `/auth.html` com **kactest3** (e-mail+senha+TOTP) → org "TESTE Onboarding KAC":
   - criar uma visita, marcar "Chegou", excluir;
   - opcional: DevTools → Network → Offline → marcar "Chegou" mostra "registro guardado no aparelho" → voltar Online sincroniza;
   - sair.
6. `/privacidade-visitante.html` abre. No celular, a agenda abre sem pulos de layout.
7. **Agente:** md5 de novo e conferir que a org de teste ficou sem visitas.

**Critérios para fazer rollback:** qualquer 5xx persistente; o Robson não consegue entrar pelo Google+TOTP; a visita real não aparece ou foi alterada (md5); o smoke do CI fica vermelho.

### 3. Rollback (escolher pelo tipo de problema)
1. **Rollback rápido (≤1 min):** Vercel → Deployments → `dpl_3p7Lz34BArELi8YFhuHn3gtpCw2L` (a72b830) → **Instant Rollback / Promote**.
   - Volta código e envs daquele build; nele o flag não existia.
   - O banco não precisa mudar: 010/011/012 são compatíveis com a72b830.
2. **Desligar o flag** (~3 min). Mantém o visual e as correções novos, mas volta ao login antigo:
   - em Production, remover `KAC_SUPABASE_AUTH` (ou deixar vazio) e fazer **Redeploy** do deploy atual;
   - `/api/auth/supabase/*` volta a dar 404 e o login com senha volta a funcionar para todos.
3. **Revert definitivo no git** (~5 min): `git revert -m 1 <merge-commit>` na `main` → push → a Vercel faz o deploy. Depois disso, reabrir um PR da branch para a próxima tentativa.
4. **Opcional, depois de ligar:** para encerrar as sessões antigas de admin, apagar as linhas do Robson em `komodo_web_sessions`. Isso força o novo login. É uma mudança de dados: só com a autorização do Robson e com backup.

Depois de qualquer rollback: rodar os smoke tests da box de novo + conferir o md5, e registrar o horário e o motivo neste arquivo.

## 4. Depois do rollout (fora deste runbook)
- **Expurgo LGPD:** copiar `docs/master/workflows/lgpd-purge.yml` para `.github/workflows/`, cadastrar os secrets `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no Actions e criar a variável `KAC_PURGE_ENABLED=true`.
- **Smoke autenticado do CI:** a variável `KAC_SMOKE_AUTH` e os secrets `KAC_SMOKE_EMAIL`/`KAC_SMOKE_PASSWORD` usam o smoke-ci, que não é vinculado. Com o flag ON, o login antigo dele continua funcionando.
- **Smoke público:** a checagem de `/api/auth/status` não prova mais que o banco está acessível. Quem prova é o login com senha errada (401) e a sessão. Ajuste sugerido em `scripts/smoke.mjs` num próximo PR.
