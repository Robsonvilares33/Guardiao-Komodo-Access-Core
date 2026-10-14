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
