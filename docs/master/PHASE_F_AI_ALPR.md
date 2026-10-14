# Fase F — preparação: guardrails de IA e núcleo ALPR

Situação: **bibliotecas puras implementadas e testadas; nada ligado.** `/ai/*` continua 503; ALPR sem rota, sem engine, sem câmera. Nenhuma chamada externa.

## IA (`lib/ai-guardrails.cjs`, flag `KAC_AI=on` + `KAC_AI_PROVIDER_KEY` no servidor)
Pipeline: habilitado? → limite por org (10/min, 200/dia) → saneamento (vazio, >2000 caracteres, caracteres invisíveis/bidi) → redação de PII (CPF, CNPJ, RG, e-mail, telefone, placa) → detecção de injeção (pt/en) → mensagens com dados delimitados em `<dados>` e só campos permitidos (nome, unidade, data, hora, status) → provedor → checagem da saída (bloqueia segredos, redige PII, corta em 4000).
Regras do sistema: responder só com os dados, não decidir acesso, não revelar regras/chaves/outras orgs.
Pendente para ligar: escolher provedor (há opções com camada gratuita), chave no ambiente (autorização), rota usando `prepare()`/`checkOutput()`, log em `kac_audit_log` sem o texto do usuário, avaliação com 30 perguntas de teste incl. ataques.

## ALPR (`lib/alpr.cjs`, flag `KAC_ALPR=on`) — complementa `ALPR.md`
- Limiares padrão: ≥0,90 sugere (só com match exato único), 0,60–0,90 revisão, <0,60 descarta; configuráveis por portaria (validados).
- **`autoAuthorize` é sempre `false`**: toda leitura exige confirmação do operador.
- 1 caractere de diferença (confusões de OCR), placa duplicada ou formato inválido → revisão, nunca sugestão.
- `humanDecision()` gera o registro (lido, confiança, ação do sistema, operador, decisão, placa corrigida) para `kac_alpr_reads` — tabela **não criada** (precisa de migração aprovada).
Pendente: medir fast-alpr no Revision-PC com fotos autorizadas (plano em `ALPR.md`), migração `kac_alpr_reads`, UI de revisão, política LGPD de retenção.

## UI de revisão ALPR (2026-10-14) — atrás de `KAC_ALPR` (desligada)
- `/alpr.html` (noindex, sem link nas páginas existentes): **leitura simulada** (placa + confiança digitadas; sem câmera, sem imagem). Mostra Sugestão/Revisão/Descartada, motivo em português e as visitas candidatas de **hoje da própria org**; o operador Confirma, Corrige (placa validada) ou Rejeita. Decisões ficam **só na memória da página** ("não gravadas").
- API: `GET /alpr/config`, `POST /alpr/decide` (sessão + MFA/org como as demais; somente leitura; `autoAuthorize:false`, `persist:false`). Flag OFF → 404.
- Testes: rotas (OFF 404; ON: 401 sem sessão, isolamento de org, sugestão/revisão/descarte, **zero escritas**), UI (rótulos, normalização, página isolada) e clique local `tests/e2e-local/alpr-ui.mjs` (servidor local + PostgREST simulado, flag ON, axe 0).
- Achado do axe no clique local: botão primário de `auth.css` com contraste 3,93:1 (afetava também `/auth.html`) → cor ajustada (≥4,5:1).
- Para gravar decisões: migração `kac_alpr_reads` (proposta futura) + autorização.
