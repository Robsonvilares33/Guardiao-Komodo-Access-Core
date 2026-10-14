# Fase D — UX e acessibilidade (escopo)

Objetivo: melhorar uso no celular, teclado e leitor de tela **sem alterar regras de negócio, API, banco ou fluxos**. Cada item: risco baixo, reversível por revert, coberto por teste estático e checado ao vivo (smoke + E2E de UI + CSP 0 violações).

## Critérios gerais
- Nenhuma mudança em `api/`, migrações, `ApiService`/repositórios ou eventos do formulário.
- Somente HTML (atributos), CSS e textos de ajuda. JS só quando isolado e testado.
- WCAG 2.2 AA como referência: 1.3.1 (rótulos), 2.1.1 (teclado), 2.4.1 (pular blocos), 2.4.7 (foco visível), 2.5.8 (alvo ≥24px; usamos 44px), 2.3.3 (movimento reduzido).
- Verificação: `node --test`, `scripts/e2e/ui-visit-actions.mjs` (mobile 390px), smoke.

## Itens
| # | Item | Situação |
|---|---|---|
| D1 | Link "Pular para a agenda" + alvo focável | implementado, testado (estático) |
| D2 | Foco visível e `prefers-reduced-motion` no login e `/auth.html` | implementado, testado (estático) |
| D3 | `aria-label` nos campos que só tinham placeholder (nome, placa, cor, unidade, documento, acompanhantes, filtro de marca); `alt` do logo | implementado, testado (estático) |
| D4 | Botões Visita/Cliente, Carro/Moto com `aria-pressed` sincronizado | planejado (exige JS no FormManager → teste de UI) |
| D5 | Mensagens de erro do formulário ligadas ao campo (`aria-describedby`, `aria-invalid`) | planejado |
| D6 | Estado vazio/carregando da agenda com `role="status"` | planejado |
| D7 | Auditoria automática (axe-core vendorizado no E2E, sem CDN) | planejado |
| D8 | Contraste das cores do tema verificado (tokens) | planejado |

## Fora de escopo
Redesenho visual, mudança de fluxo de cadastro, novos campos, textos legais.
