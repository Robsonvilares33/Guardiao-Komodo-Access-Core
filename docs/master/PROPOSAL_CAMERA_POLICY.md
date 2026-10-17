# Proposta — política de câmera (achado 17) · NÃO implementada

**Status:** só proposta, por decisão do Robson. Nada no código ou nos cabeçalhos mudou.

## Hoje
`vercel.json` envia `Permissions-Policy: camera=()`, que bloqueia a câmera em todas as páginas. Isso é o certo enquanto nenhuma função usa a câmera.

## Quando liberar
Só quando existir uma função que precise dela: foto de documento, leitura de QR do convite (ver `PRODUCT_DESIGN_NEXT.md`) ou ALPR pelo celular.

## Como liberar (mínimo necessário)
1. Liberar só na página que usa a câmera, com um bloco `headers` próprio no `vercel.json` para essa rota: `camera=(self)`. As outras páginas continuam com `camera=()`.
2. Pedir a câmera só depois de um toque do usuário, com um texto antes do prompt do sistema explicando o motivo.
3. Processar no aparelho sempre que der (QR com `BarcodeDetector` ou jsQR local). Nenhum quadro de vídeo é enviado ao servidor.
4. Foto de documento: só com uma base legal definida no `PRIVACY_NOTICE.md`, guardada cifrada, com retenção curta (sugestão: 30 dias) e incluída no expurgo da 010.
5. ALPR: seguir o `ALPR_LGPD_POLICY.md` (flag `KAC_ALPR`, desligado).

## Testes quando for implementar
- O cabeçalho só tem `camera=(self)` na rota nova (teste de `vercel.json`).
- Sem gesto do usuário, nenhuma chamada a `getUserMedia`.
- Nenhum quadro sai do aparelho no fluxo de QR.

**Esforço:** cerca de 0,5 dia, mais o tempo da função que usar a câmera.
