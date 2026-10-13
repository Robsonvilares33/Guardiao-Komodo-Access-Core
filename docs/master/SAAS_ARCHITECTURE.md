# Arquitetura SaaS multi-tenant — Guardião Komodo

Situação: **PLANEJADO**. As migrações propostas foram testadas só no PGlite (26/26) e **não foram aplicadas em produção**.

## 1. Modelo de dados
| Tabela | Chave / campos principais | Migração |
|---|---|---|
| kac_organizations | id uuid, name, timezone (padrão America/Sao_Paulo), created_at | 005 |
| kac_memberships | (organization_id, user_id), role ∈ owner/admin/operator/viewer | 005 |
| kac_sites → kac_units → kac_gates | org_id, nome; portarias pertencem a unidades | 008 (futura) |
| kac_people / kac_vehicles | org_id, documento (hash + últimos dígitos), placa normalizada | 008 |
| komodo_acessos (visits) | + organization_id, `data` (data do evento), created_at, updated_at | 004 (aplicada) / 005 |
| kac_visit_history | visit_id, action (created/rescheduled/status/deleted), datas e hora antigas/novas, ator | 006 |
| kac_audit_log | org_id, ator, ação, entidade, detalhes jsonb | 006 |
| kac_plans / kac_subscriptions / kac_payment_events | limites: seats, sites, visitas/mês | 007 |
Seats = contagem de memberships ativas, comparada com `plans.max_seats` na API no momento do convite.

## 2. Isolamento e autorização
- Toda tabela de tenant tem `organization_id NOT NULL` e uma policy RLS via `kac_is_member(org, roles[])` (SECURITY DEFINER, search_path fixo).
- **Defesa em profundidade:** a API (service_role) **também** filtra por `organization_id` da sessão; nunca confia em org enviada pelo cliente.
- **Papéis da plataforma** (equipe Komodo: `platform_admin`, `support`) ficam numa tabela separada `kac_platform_staff`, sem membership automática. Acesso de suporte é registrado no audit_log e tem prazo.
- **Papéis do tenant:** owner (billing e membros), admin (configuração), operator (cria e edita visitas), viewer (somente leitura).

## 3. Regras de agenda (sec. 7)
- **Data do evento** (`data`) ≠ `created_at` (registro) ≠ `updated_at` (última edição). Filtros de agenda usam **sempre** `data`.
- "Hoje" é calculado no fuso da organização (padrão America/Sao_Paulo), nunca em UTC. Já está implementado em `KomodoDate.todayISO()`.
- Visões:
  - **Hoje:** data = hoje.
  - **Futuras:** data > hoje.
  - **Pendentes:** data ≤ hoje e status ≠ concluído/cancelado.
  - **Histórico:** data < hoje.
- **Reagendamento:** UPDATE de `data`/`hora`. O trigger grava `rescheduled` com valores antigos e novos (testado: 7.3-09).
- **Legado com `data` nula:** exibido pelo `dia` da semana na semana corrente (comportamento atual). O backfill proposto preenche `data = created_at::date` ajustado ao dia da semana mais próximo **somente com aprovação**; até lá, o filtro `or(data.eq.X,and(data.is.null,dia.eq.Y))` mantém compatibilidade.

## 4. Guardrails de IA (rotas seguem 503)
Ligar só por feature flag por org. Nada de dados pessoais no prompt (pseudonimizar). Saída de IA nunca executa escrita sem confirmação humana. Log de prompt/resposta sem PII. Limite de custo por org. Opt-in explícito (LGPD).

## 5. ALPR (somente design)
Câmera → captura → **fast-alpr (MIT)** num worker local da portaria ou no servidor → placa + confiança → comparação com visitas do dia da **mesma org** → **operador confirma** (nunca abre portão automaticamente no MVP). Imagens retidas por até 7 dias por padrão (configurável). Placa é dado pessoal: base legal, aviso na portaria e direito de exclusão. openalpr foi descartado (AGPL).

## 6. Máquina de estados do billing
```
trialing --pagamento ok--> active --falha--> past_due --pago--> active
trialing --fim do trial--> expired      past_due --carência 7d--> canceled
active --cancelamento--> canceled (acesso até current_period_end) --> expired
```
- Transições só via webhook verificado e idempotente (`UNIQUE(provider, provider_event_id)`).
- `expired`/`canceled`: modo somente leitura, sem perda de dados.
- **Somente sandbox.**
