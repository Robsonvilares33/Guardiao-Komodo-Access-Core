# Pesquisa — projetos reais e alternativas (2026-10)

Os números de estrelas e atividade foram consultados no GitHub em out/2026 e são aproximados.

## Gestão de visitantes (OSS)
Os repositórios OSS encontrados são pequenos, pouco mantidos e sem multi-tenant. **Conclusão:** não vale fazer fork. Usamos apenas as ideias de domínio (pré-cadastro, check-in/out, crachá, histórico).

## Multi-tenancy em Supabase/Postgres
| Abordagem | Prós | Contras |
|---|---|---|
| **BD compartilhado + `organization_id` + RLS** (padrão da documentação Supabase; helpers como pgrls e tenant-guard) | Custo zero, uma migração serve a todos, funciona no plano Free | Um bug de policy vaza dados → mitigar com testes negativos e filtro duplo na API |
| Schema por tenant | Isolamento lógico forte | O PostgREST expõe schemas fixos; migrações N vezes |
| BD/projeto por tenant | Isolamento máximo | O plano Free limita a 2 projetos; custo linear |

## RBAC
| Abordagem | Prós | Contras |
|---|---|---|
| Papéis fixos em `memberships.role` (owner/admin/operator/viewer) | Simples, testável em SQL | Menos granular |
| Permissões granulares (tabela role_permissions) | Flexível | Complexidade prematura |
Decisão: papéis fixos agora, com permissões granulares depois, se houver demanda.

## ALPR / OCR
| Projeto | Licença | Situação | Uso |
|---|---|---|---|
| fast-alpr | MIT | Ativo (~830★) | **Recomendado**: ONNX, detecção + OCR de placa, roda em CPU |
| openalpr | AGPL-3.0 | Parado desde 2024 | Evitar (licença viral para SaaS) |
| PaddleOCR | Apache-2.0 | Ativo | Alternativa para OCR geral, mais pesado |
| tesseract.js | Apache-2.0 | Ativo | Roda no navegador; precisão fraca em placas |

## Offline sync
| Projeto | Licença | Nota |
|---|---|---|
| PGlite / ElectricSQL | Apache-2.0 | Postgres em WASM; usado aqui para testar as migrações |
| PowerSync | Apache-2.0 (SDK) | Sync com Supabase pronto; o serviço tem plano gratuito limitado |
| Fila local (IndexedDB) + reenvio idempotente | — | **Recomendado no MVP**: zero custo, suficiente para portaria |

## Autenticação
| Abordagem | Prós | Contras |
|---|---|---|
| Sessões próprias (atual) | Já funciona, controle total | Sem MFA, OIDC nem reset de senha; mais superfície de manutenção |
| **Supabase Auth** (MIT) com e-mail + Google OIDC | MFA, OIDC, 50k MAU grátis, `auth.uid()` nativo no RLS | Migrar usuários (reset de senha) |

## Billing (somente sandbox)
| | Mercado Pago | Stripe BR |
|---|---|---|
| SDK | sdk-nodejs, MIT | stripe-node, MIT |
| Recorrência no cartão | 4,99% (recebimento imediato) / 3,99% (30d) | 3,99% + R$0,39, mais 0,7% do Billing |
| Pix recorrente | Pix Automático (normalmente sem tarifa) | 1,19%, só por convite |
| Mensalidade | Não tem | Não tem |
**Recomendação:** Mercado Pago como primário para o público brasileiro, atrás de uma interface `PaymentProvider` que permita Stripe depois.
