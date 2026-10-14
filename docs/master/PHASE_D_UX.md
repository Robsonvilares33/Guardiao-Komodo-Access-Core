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
| D4 | `aria-pressed` nos botões de alternância e `aria-current=date` na aba do dia (`src/ui/A11yEnhancer.js`, por observação do DOM; sem tocar handlers) | implementado, testado (unit + clique ao vivo) |
| D5 | Dica no campo ao sair dele: nome <3 e placa (regra do `ValidationManager`) → `aria-invalid` + `aria-describedby`; só informa, o salvar continua igual | implementado, testado (unit + clique ao vivo) |
| D6 | Região `role=status` antes da agenda anuncia "N registros" ou a mensagem de vazio existente | implementado, testado (unit + ao vivo) |
| D7 | `scripts/e2e/a11y-audit.mjs`: axe-core 4.14 (local, fora do deploy) em login, auth, empresarial, residencial (390px) + cliques D4–D6; falha em violação crítica | implementado; linha de base achou 1 crítica (`#quickTime` sem rótulo) → corrigida |
| D8 | Contraste (regra `color-contrast` do axe, WCAG AA) nas 4 páginas | verificado: 0 violações no estado renderizado; modais/estados não abertos não cobertos |

## Fora de escopo
Redesenho visual, mudança de fluxo de cadastro, novos campos, textos legais.
