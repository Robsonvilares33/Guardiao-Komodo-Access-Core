# Assistente de IA (Groq) — servidor apenas

Status: **código pronto, DESLIGADO em produção** (`KAC_AI` ausente). `GROQ_API_KEY` existe **somente** no Preview da branch `work/phase-c-d`.

## Fluxo (`POST /api/ai/chat`)
1. Sessão obrigatória (cookie ou Supabase); MFA quando exigido; org resolvida no servidor.
2. **Kill switch:** sem `KAC_AI=on` **e** `GROQ_API_KEY` → 503 e nenhuma chamada externa. `/api/ai/analyze` (imagens) permanece 503 — fotos não vão para provedor de IA.
3. Guardrails (`lib/ai-guardrails.cjs`): limite por org (10/min, 200/dia), sanitização, **redação de PII** na pergunta (CPF, CNPJ, e-mail, telefone, placa, RG), bloqueio de injeção de prompt (422).
4. **Minimização (LGPD):** o contexto enviado contém só `modulo, data, hora, status` das visitas **de hoje da própria org** (máx. 50). Nunca nome, unidade, placa, CPF, telefone ou e-mail. O `systemPrompt` enviado pelo navegador é **ignorado**; o prompt de sistema é fixo no servidor.
5. Provedor (`lib/ai-provider.cjs`): Groq `chat/completions`, modelo `openai/gpt-oss-20b` (override `KAC_AI_MODEL`), timeout 15 s, 600 tokens, sem identificadores de usuário/org.
6. Saída: filtro bloqueia vazamento de segredos e redige PII; resposta marcada como sugestão ("a decisão é do operador").
7. Auditoria `ai.chat` grava só contagem de tokens, tipos redigidos e se foi bloqueada — **nunca** pergunta ou resposta. Erros logados só como código.

## Variáveis
| Variável | Onde | Observação |
|---|---|---|
| `KAC_AI` | Preview (quando for testar) | `on` liga; ausente = desligado |
| `GROQ_API_KEY` | Preview `work/phase-c-d` | Segredo; nunca no front nem em logs |
| `KAC_AI_MODEL` | opcional | padrão `openai/gpt-oss-20b` |

## Termos do Groq (verificados em 16/10/2026)
- **Treino:** o Groq Services Agreement §4.2 proíbe usar entradas/saídas para treinar ou ajustar modelos sem permissão explícita do cliente.
- **Retenção:** por padrão não retém dados de inferência; pode registrar entradas/saídas **por até 30 dias** só para confiabilidade/abuso. **Zero Data Retention (ZDR)** pode ser ligado em console.groq.com → Settings → Data Controls (recomendado — ação do Robson).
- **Localização:** dados retidos ficam em GCP nos EUA → transferência internacional (LGPD art. 33); há DPA e cláusulas contratuais padrão. Registrar o Groq como **suboperador** no aviso de privacidade.
- Fontes: console.groq.com/docs/your-data · console.groq.com/docs/legal/services-agreement · console.groq.com/docs/legal/customer-data-processing-addendum

## Rollback
Remover `KAC_AI` (ou a chave) do ambiente → 503 imediato, sem deploy de código.
