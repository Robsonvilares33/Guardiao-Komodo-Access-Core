# Proposta de UX — Guardião Komodo Access Core

> Status: proposta (sem código alterado). Base auditada: `main` @ 28f5de0, 16/10/2026.
> Objetivo: mobile-first, simples, acessível (WCAG 2.2 AA), rápido e seguro para portarias, comércios, prédios, agendamentos e visitas.
> Público principal: porteiro/operador em celular ou tablet, muitas vezes com uma mão livre, luz ruim e pressa; secundário: síndico/gestor (admin).

## 1. Auditoria das telas atuais

| Tela | O que funciona | Problemas encontrados (evidência no código) |
|---|---|---|
| `index.html` (agenda empresarial + cadastro) | Skip-link, `aria-live` no status da API, `prefers-reduced-motion` no CSS, CSP sem script inline | ~660 KB de JS bloqueante no `<head>` (jsPDF 420 KB, Chart.js 208 KB, autotable 32 KB) carregados antes de qualquer conteúdo, mesmo sem exportar/abrir dashboard; fundo animado (radar + canvas de partículas) gasta CPU/bateria; sem `<main>`/`<h1>`; abas dos dias são `<div class="tab">` (sem `role="tab"`, sem foco/teclado); botões só com emoji (⚙️ 🚪 🤖 ➤ ✖) e só `title` (sem nome acessível confiável); `<label>` sem `for` (rótulo visual não ligado ao campo, duplicado por `aria-label`); mês inicial fixo "MAIO" no HTML; cabeçalho com busca + 4 botões fica apertado no celular; formulário longo (2 veículos, acompanhante, foto) mostrado inteiro de uma vez; ação principal "CLIENTE E VISITA" em caixa alta e pouco descritiva |
| `residencial.html` | Mais rótulos/aria que o index | Mesma base visual pesada; duplica muito do index (manutenção dupla, divergência de UX entre módulos) |
| `login.html` (login atual) | Mensagens genéricas ("Credenciais inválidas"), cookie HttpOnly | `<label>` sem `for`; e-mail com `autocomplete="off"` e senha sem `autocomplete="current-password"` (atrapalha gerenciador de senhas e preenchimento automático); formulário de bootstrap do administrador na mesma página |
| `auth.html` (novo login, flag) | Melhor tela hoje: rótulos ligados, foco no título de cada etapa, `aria-live`, estado "Carregando…", wizard de empresa com erros por campo, alvos de 44 px | Visual diferente do resto do app; convites de equipe escondidos num `<details>` |
| Administração | Convites (owner/admin) e MFA existem | Não há tela de administração própria: equipe, papéis, empresa, plano e auditoria ficam espalhados (auth.html, modal de config, dashboard em modal) |
| `alpr.html` | Estrutura semântica correta (`main`, `h1`, `h2`) | Módulo desligado; fora do escopo da fase 1 |

## 2. Top 10 melhorias (ordem = impacto ÷ esforço)

Impacto: A (alto), M (médio). Esforço: P (≤1 dia), M (2–4 dias), G (1–2 semanas).

### 1. Carregar jsPDF/Chart.js só quando usados — Impacto A · Esforço P
- **Problema:** 660 KB de JS bloqueiam a primeira pintura da agenda; em 4G fraco o porteiro espera segundos para ver a lista.
- **Mudança:** remover os 3 `<script>` do `<head>`; importar sob demanda (`loadScript()` com promessa) ao clicar em "Exportar PDF" ou "Dashboard"; demais scripts com `defer`.
- **Como testar:** Lighthouse mobile (throttling 4G) antes/depois: meta LCP < 2,5 s e TBT < 200 ms; DevTools → Network sem jsPDF/Chart no carregamento inicial; teste e2e de exportar PDF continua passando.

### 2. Fundo animado opcional/desligado por padrão — Impacto A · Esforço P
- **Problema:** radar + canvas de partículas rodando sempre: consumo de bateria em tablets de portaria ligados o dia todo, distração e menor contraste do texto sobre o fundo.
- **Mudança:** fundo estático por padrão; animação só se o usuário ativar e se não houver `prefers-reduced-motion`; pausar quando a aba estiver oculta (`visibilitychange`).
- **Como testar:** Performance profile 30 s (CPU idle < 5%); verificar `prefers-reduced-motion` no DevTools (Rendering); contraste medido com axe.

### 3. Nomes acessíveis e rótulos ligados em todos os controles — Impacto A · Esforço P
- **Problema:** botões só com emoji (⚙️ 🚪 🤖 ➤ ✖) e `<label>` sem `for` — leitor de tela anuncia "botão" sem nome; falha WCAG 1.3.1/4.1.2.
- **Mudança:** `aria-label` explícito ("Configurações", "Sair", "Assistente", "Enviar", "Fechar") + texto visível curto ao lado do ícone em telas largas; `<label for>` em todos os campos e remover `aria-label` duplicado; emoji decorativo com `aria-hidden="true"`.
- **Como testar:** axe-core (0 violações "button-name"/"label"); teste estático no CI que falha se houver `<button>` sem texto/aria-label ou `<label>` sem `for`; NVDA/TalkBack em 3 fluxos.

### 4. Abas de dias acessíveis por teclado e toque — Impacto A · Esforço P
- **Problema:** `<div class="tab">` sem papel, sem foco, sem setas; mês "MAIO" fixo até o JS rodar.
- **Mudança:** `role="tablist"`/`button role="tab"` com `aria-selected`, setas ←/→, `Home/End`; abas roláveis horizontalmente no celular com "Hoje" fixo; mês e dia atuais renderizados pelo servidor/JS antes de pintar (sem "MAIO" no HTML).
- **Como testar:** navegação só com teclado (Tab até a lista, setas trocam o dia); teste unitário do AgendaNav para setas; teste visual 360×740.

### 5. Fluxo "Chegou / Saiu" em 1 toque na lista — Impacto A · Esforço M
- **Problema:** o dia a dia da portaria é confirmar chegada e saída; hoje isso fica dentro do card/modal e mistura cadastro com operação.
- **Mudança:** cada card com estado claro (Agendado → Na portaria → Saiu) e botão grande primário com a próxima ação; desfazer por 5 s (toast); registro de hora automático no fuso da empresa; histórico já existente (`kac_visit_history`) mostra quem fez.
- **Como testar:** tarefa cronometrada com 3 operadores (meta: < 3 s por check-in); teste de API: transição inválida recusada; auditoria gravada; teste de isolamento de org.

### 6. Cadastro de visita em etapas curtas, com o essencial primeiro — Impacto A · Esforço M
- **Problema:** formulário longo exibindo 2 veículos, acompanhante e foto de uma vez; botões de câmera/IA misturados.
- **Mudança:** 1ª etapa só com nome, unidade/destino e horário (salvar já possível); "Adicionar veículo", "Adicionar acompanhante" e "Foto" como seções recolhíveis; teclado certo por campo (`inputmode`, placa em maiúsculas com máscara Mercosul/antiga); validação inline com mensagem por campo.
- **Como testar:** teste de usabilidade (tempo e erros para cadastrar visita simples: meta < 20 s); axe sem violações; teste unitário de validação de placa (ABC1D23 e ABC-1234).

### 7. Cabeçalho e navegação mobile-first — Impacto A · Esforço M
- **Problema:** busca + Residencial + Cliente e Visita + 2 ícones + status disputam a mesma linha; ação principal pouco clara.
- **Mudança:** no celular, barra inferior fixa (Agenda · Buscar · + Nova visita · Mais); botão primário "+ Nova visita" (texto em caixa normal); status da conexão como ponto discreto com texto acessível; `<header>`, `<nav>`, `<main>`, `<h1>` corretos.
- **Como testar:** capturas em 360, 768 e 1280 px; alvos ≥ 44×44 px (WCAG 2.5.8); teste de zoom 200% e 400% sem rolagem horizontal (1.4.10).

### 8. Login atual: preenchimento automático e separação do bootstrap — Impacto M · Esforço P
- **Problema:** `autocomplete="off"` no e-mail, senha sem `current-password`, rótulos soltos, bootstrap de admin na mesma tela.
- **Mudança:** `autocomplete="username"`/`"current-password"`, `<label for>`, mostrar/ocultar senha, mensagem de erro ligada ao campo (`aria-describedby`); bootstrap só aparece quando o servidor diz que é necessário (já existe status) e em seção própria.
- **Como testar:** gerenciador de senhas do Chrome/Android preenche; axe; teste e2e de login e bootstrap existentes continuam passando.

### 9. Tela de administração única ("Empresa") — Impacto M · Esforço G
- **Problema:** equipe, convites, papéis, MFA, plano e auditoria espalhados (auth.html, modal de config, dashboard).
- **Mudança:** página `admin.html` (owner/admin com aal2): abas Equipe (convidar, papel, remover), Empresa (nome, tipo, CNPJ, fuso — dados do onboarding), Segurança (MFA, sessões), Plano, Auditoria (filtro por data/ação). Reaproveita APIs existentes; tudo escopado à org da sessão.
- **Como testar:** testes de API por papel (viewer/operator recebem 403); teste de isolamento entre 2 orgs; axe; fluxo convidar → aceitar → aparece na lista.

### 10. PWA leve: instalável, retomada rápida e aviso offline — Impacto M · Esforço M
- **Problema:** sem manifest/ícones; tablet de portaria abre pelo navegador; sem aviso claro quando cai a internet.
- **Mudança:** `manifest.webmanifest` + ícones; service worker que guarda só o "casco" estático (HTML/CSS/JS), nunca respostas da API (dados pessoais); faixa "Sem conexão — dados podem estar desatualizados" e bloqueio de salvar offline (sem fila local, para não guardar dados pessoais no aparelho).
- **Como testar:** Lighthouse PWA "instalável"; modo avião no DevTools mostra a faixa; verificar que `Cache Storage` não contém `/api/*`.

## 3. Pacote da fase 1 (R$ 0)

Itens **1, 2, 3, 4 e 8** — só HTML/CSS/JS existentes, sem serviço pago, sem mudança de banco, sem novas variáveis de ambiente, risco baixo e reversível.

- **Ferramentas gratuitas:** Lighthouse (Chrome), axe-core (npm, dev only), Playwright já usado nos testes locais, NVDA (Windows) e TalkBack (Android).
- **Entrega:** branch → testes (unitários + axe + Lighthouse local) → CI → Preview → aprovação do Robson → main.
- **Critérios de aceite da fase 1:**
  - Lighthouse mobile: Performance ≥ 85, Acessibilidade ≥ 95 em `index.html` e `login.html`.
  - axe-core: 0 violações sérias/críticas nas 4 telas principais.
  - Navegação completa só por teclado na agenda (dias, cards, nova visita, sair).
  - Nenhum JS > 50 KB carregado antes da agenda aparecer.
  - Smoke 4/4 e md5 de `komodo_acessos` inalterado (nada toca dados).
- **Estimativa:** 3–5 dias de trabalho.

Fase 2 (sugerida): itens 5, 6 e 7 (operação de portaria). Fase 3: itens 9 e 10.

## 4. Princípios de segurança mantidos em todas as fases
- Nada de tokens/dados pessoais em `localStorage`/cache; DOM só via `textContent`; CSP sem script inline.
- Toda ação nova passa pela API com escopo da org da sessão e auditoria.
- Funções novas atrás de flag até validação no Preview.
