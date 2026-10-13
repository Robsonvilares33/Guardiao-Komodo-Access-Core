# Matriz de Auditoria — Guardião Komodo (Fase A, 2026-10-13)

Legenda de situação: **IMPL** = implementado · **TEST** = testado automaticamente · **VALID** = validado ao vivo · **PLAN** = planejado.

| Componente | Situação | Evidência | Risco | Impacto | Melhoria | Esforço | Dependências | Critério de aceitação |
|---|---|---|---|---|---|---|---|---|
| Sincronia local/GitHub/Vercel | VALID | Os 3 estavam em `6482b9a` antes da Fase A; deploy READY | Baixo | Médio | Fixar SHA no relatório de cada deploy | P | — | SHA do deploy = HEAD de `main` |
| Autenticação web (sessão própria, PBKDF2, cookie HttpOnly/Strict) | VALID | Migrações 002/003; E2E de login/logout | Médio (sem MFA, sem recuperação de senha) | Alto | Migrar para Supabase Auth (ADR-02) | G | 005 | Login, logout, expiração 12h e rate-limit testados |
| Rate limit de login | TEST | RPC com advisory lock (003) | Baixo | Médio | Métricas de bloqueio | P | — | 5 falhas → bloqueio temporário |
| Isolamento de dados | IMPL (single-tenant) | RLS ligado sem policies; só service_role acessa | **Alto para SaaS**: não há `organization_id` | Crítico | Migrações 005/006 | G | ADR-01 | Testes negativos Org A×B passam (20/20 no PGlite) |
| Agenda: coluna `data` | VALID | Migração 004 aplicada; `data` gravada na criação | Linhas legadas com `data` nula | Médio | Estratégia de legado (ver SAAS_ARCHITECTURE §7) | P | — | Visitas legadas continuam aparecendo pelo `dia` |
| Agenda: navegação semana/data/Hoje/Próximos/Histórico | TEST (validação ao vivo após o deploy) | `src/ui/AgendaNav.js`, `tests/agenda-sec73.test.cjs` | Baixo | Alto | Visão mensal | P | — | 10 testes da sec. 7.3 (8 passam, 2 são *todo* e dependem de schema) |
| API de período `GET /api/visitantes/:mod?de&ate` | TEST | Validação ISO, máximo e 400 "Período inválido." | Baixo | Médio | Paginação | P | — | Período inválido → 400 |
| Histórico de reagendamento | PLAN (testado no PGlite) | 006: `kac_visit_history` + trigger | Médio | Alto | Expor na UI | M | 005, 006 | Reagendar gera linha `rescheduled` com data antiga e nova |
| Audit log | PLAN | 006: `kac_audit_log` | Médio | Alto | Gravar pela API | M | 006 | Toda escrita gera evento com ator e org |
| Rotas de IA | VALID (desligadas) | Retornam 503 | Baixo | — | Guardrails antes de ligar | M | — | Continuam 503 até haver aprovação |
| ALPR | PLAN (só design) | — | Médio (LGPD: placa é dado pessoal) | Médio | fast-alpr no edge/servidor | G | 005 | Confirmação humana obrigatória |
| Billing | PLAN | — | Médio | Alto | Abstração de provedor, só sandbox | G | 005, 007 | Máquina de estados testada com webhooks de sandbox |
| Dependências vendor | TEST | jspdf 4.2.1, jspdf-autotable 5.0.8, chart.js 4.5.1: 0 vulnerabilidades, MIT | Baixo | Baixo | Dependabot | P | — | `npm audit` = 0 |
| Segredos | TEST | Histórico git: 0 ocorrências; assets ao vivo sem chaves; service_role só em env do servidor | Baixo | Crítico | Ativar secret scanning no GitHub | P | — | Varredura = 0 |
| Hospedagem | VALID | Vercel Hobby | **Alto**: o plano Hobby proíbe uso comercial | Alto | Vercel Pro ou outro host antes de cobrar | P | Decisão do usuário | Plano compatível antes do 1º cliente pago |
| Banco | VALID | Supabase Free | Alto: pausa após 1 semana inativo, sem backup | Alto | Pro (US$25/mês) ou dump agendado | P | Decisão do usuário | Backup diário restaurável |
| Erros em migrações propostas | TEST | O PGlite achou 2 bugs (FK em trigger BEFORE; falta de EXECUTE) e ambos foram corrigidos | — | — | Rodar o PGlite no CI | P | — | Teste roda no CI |
