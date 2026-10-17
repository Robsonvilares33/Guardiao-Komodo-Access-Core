# Identidade visual KAC v1 (proposta, branch work/visual-identity)

## Paleta (tema escuro único; contraste WCAG)
| Token | Cor | Uso | Contraste |
|---|---|---|---|
| --kac-bg | #0f1115 | fundo | — |
| --kac-surface | #181b21 | cartões, modais, barras | — |
| --kac-border | #343a46 | bordas | — |
| --kac-text | #f3f4f6 | texto | 17,2:1 no fundo, 15,7:1 na superfície |
| --kac-muted | #a7adb8 | texto secundário | 8,4:1 / 7,7:1 |
| --kac-primary | #d4b26a | ação principal, marca | 9,3:1 no fundo |
| --kac-on-primary | #141414 | texto em botão dourado | 9,1:1 |
| --kac-success | #34d399 | chegou / ok | 9,0:1 |
| --kac-danger | #f87171 | erro / excluir | 6,2:1 |
| --kac-warning | #fbbf24 | atenção / sem conexão | 10,3:1 |
| --kac-info | #7cb4ff | informação | 8,1:1 |
| --kac-focus | #ffd166 | contorno de foco | 13,1:1 |

## Tipografia
Fonte do sistema. Escala: 13 / 14 / 16 (base) / 20 / 24 px. Títulos com inicial maiúscula, sem CAIXA ALTA espaçada. Rótulos de 14 px, nunca 11 px.

## Espaçamento e forma
Espaçamento de 4 / 8 / 12 / 16 / 24 / 32 px. Cantos de 8 px (controles), 12 px (cartões) e 16 px (blocos). Área de toque de 48 px (no mínimo 44).

## Componentes
- Botão primário: dourado com texto escuro.
- Botão secundário: borda neutra.
- Botão de perigo: borda e texto vermelhos.
- Campo de 48 px com borda neutra; ganha foco amarelo.
- Cartão com superfície e borda, sem vidro desfocado.
- Barra inferior com ícone e rótulo.
- Avisos (toast, offline) na superfície com borda da cor do estado.

## Ícones
SVG de traço 2 px no estilo Lucide, desenhados no próprio HTML, sem dependência e compatíveis com a CSP. Emoji não é usado em botões.

## Voz e tom
Português simples e direto, tratando por "você". Verbos curtos: Entrar, Salvar, Nova visita. Erros dizem o que houve e o que fazer, por exemplo "E-mail ou senha incorretos. Confira e tente de novo.". Nada de "ACESSO NEGADO", "Sovereign" ou "Operador".

## v2 — identidade do site guardiao-komodo-web
Paleta do site: ouro #c2a057/#dfbe76/#b59461, preto #0d0d0d, azul-noite #1a1a2e/#141424/#34364f, Poppins (auto-hospedada em assets/fonts, latin 400/600/700/800).
Logo: emblema raster 3D (assets/brand/*.webp). Efeitos (src/ui/KomodoBrand3D.js + src/ui/styles/kac-brand.css): perspectiva + inclinação com dedo/mouse e balanço lento,
brilho dourado pulsando (4s), 3 anéis girando (25/35/50s), reflexo metálico, botão dourado com reflexo, partículas douradas só nas telas de entrada, ícones flutuantes.
Tudo desligado com prefers-reduced-motion e pausado com aba oculta. Sem CDN (CSP intacta). Nenhuma lógica alterada.
