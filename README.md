# Guardião Komodo Access Core

> **Status:** release candidato de laboratório; **não aprovado para produção**. Não implante nem habilite autenticação até que todos os bloqueios abaixo sejam resolvidos.

## Finalidade e arquitetura

Aplicação de controle de acesso com páginas estáticas (`index.html`, `login.html` e `residencial.html`), módulos JavaScript em `src/` e uma API serverless em `api/[...route].js`. O `vercel.json` configura a função com duração máxima de 10 segundos e cabeçalhos de segurança. A API usa apenas módulos nativos do Node.js e `fetch`; não há dependências de produção para instalar nesta cópia.

Quando configurada, a API acessa o Supabase PostgREST exclusivamente no servidor. A chave `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser enviada ao navegador. A sessão web usa cookie `HttpOnly`, `SameSite=Strict` e `Secure` quando a requisição chega por HTTPS. `/api/health` é apenas um teste de vida da função; **não** prova que banco, tabelas ou autenticação estejam prontos.

As rotas `/api/ai/chat` e `/api/ai/analyze` permanecem intencionalmente desabilitadas e respondem HTTP 503. Não há implementação de IA para hospedagem web neste release.

## Pré-requisitos e testes locais

- Node.js 22 ou compatível e Git.
- Não execute `npm install`: esta cópia não contém `package.json` e os testes usam `node:test` nativo.
- Na raiz deste diretório, execute a suíte isolada: `node --test tests/*.test.cjs`.
- Verifique sintaxe da API com `node --check "api/[...route].js"` e validade do arquivo de implantação com `node -e "JSON.parse(require('node:fs').readFileSync('vercel.json','utf8'))"`.
- Os testes usam mocks em memória e não devem acessar o Supabase real. Eles não substituem testes concorrentes em PostgreSQL.

## Variáveis de ambiente

Consulte `.env.example` somente como referência de nomes. Os valores ali são fictícios e não funcionam. As únicas variáveis atualmente lidas pela API são:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — somente no ambiente de servidor.
- `KAC_BOOTSTRAP_SECRET` — segredo temporário de bootstrap, somente no servidor e com pelo menos 32 caracteres.

Não configure valores `NEXT_PUBLIC_*`, `VITE_*` ou qualquer variável que exponha segredos ao navegador. Nenhuma variável de produção está incluída neste repositório ou configurada no projeto Vercel.

### Bootstrap administrativo seguro

O bootstrap só deve ser habilitado depois da validação e aprovação do esquema do banco. Gere um segredo aleatório forte com pelo menos 32 caracteres, cadastre-o apenas como variável criptografada do servidor Vercel e entregue-o ao administrador por canal controlado. Crie o primeiro administrador uma única vez em um ambiente protegido; remova `KAC_BOOTSTRAP_SECRET` do ambiente do servidor logo depois. O endpoint usa a verificação atômica proposta na migration 003, mas essa migration ainda não foi aplicada nem validada em PostgreSQL real. Não abra o bootstrap em produção enquanto o banco não estiver preparado e testado.

## Bloqueios obrigatórios antes de produção

1. O projeto Supabase autorizado está ativo, mas a consulta de metadados encontrou **zero tabelas públicas e zero migrations**. As migrations `docs/proposed_supabase_migration_001.sql`, `002_web_auth.sql` e `003_atomic_auth.sql` são propostas e não foram aplicadas. Sua aplicação em produção exige autorização específica posterior.
2. O `psql` não está instalado no Revision-PC; não foram executados testes de concorrência em servidor PostgreSQL descartável. A validação histórica com PGlite e mocks não comprova concorrência real, grants ou RLS.
3. As migrations 001 e 002 (revisadas em 2026-10-13) habilitam RLS sem políticas e revogam acesso de `anon`/`authenticated` em todas as tabelas; só a `service_role` (API no servidor) acessa. Ainda precisa ser validado em PostgreSQL real antes de qualquer aplicação.
4. A função de limite de tentativas lê `x-real-ip` e o primeiro valor de `x-forwarded-for`. A documentação oficial da Vercel informa que esses cabeçalhos são equivalentes e que a Vercel sobrescreve `X-Forwarded-For` para prevenir spoofing em seu caminho padrão. Ainda falta verificar o ingresso real deste projeto; não coloque um proxy externo na frente sem validar a cadeia de confiança.
5. A equipe Vercel pretendida usa Hobby, mas a criação do projeto exclusivo foi negada com HTTP 403. Não crie o projeto em outra conta/equipe nem altere a propriedade do repositório; é necessário corrigir legitimamente a permissão no escopo `robsonvilares-projects`.
6. Não existe implantação Vercel nem URL de produção. Login, sessão e banco não foram validados em produção.

Referência de cabeçalhos: [Vercel — Request headers](https://vercel.com/docs/headers/request-headers).

## Implantação e custos

Este repositório ainda não foi implantado. O escopo Hobby foi identificado, mas o projeto não pôde ser criado; portanto não há build de produção, URL, variáveis seguras cadastradas ou custo de implantação confirmado. Não compre planos, domínios, créditos ou serviços. Só prossiga quando o acesso ao escopo e o custo total de cada etapa estiverem confirmados como R$ 0.

## Documentação

- `docs/VERCEL_ENV_SETUP.md` — variáveis de ambiente no Vercel
- `docs/BOOTSTRAP_ADMIN.md` — primeiro administrador e fechamento da janela de bootstrap
- `docs/TESTING.md` — como rodar os testes
- `RELEASE_REPORT.md` — versão, testes e riscos

## Rollback e manutenção

Para reverter uma futura publicação de código, publique novamente um commit anterior conhecido; não reescreva o histórico remoto. Não reverta migrations automaticamente: mudanças de banco exigem plano e autorização específicos. Em incidente, suspenda o deploy pelo titular do projeto e rotacione os segredos por procedimento autorizado.
