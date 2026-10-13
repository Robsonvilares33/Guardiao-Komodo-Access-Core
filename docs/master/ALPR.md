# Módulo ALPR (sec. 10): design, nada implementado

## Princípios
- **Módulo independente** (`alpr-worker`) com contrato próprio: `POST /alpr/reads {org_id, gate_id, image_ref, plate, confidence, engine, captured_at}`. O app funciona sem ele.
- **Thresholds por org/portaria** (padrão: ≥0,90 = sugere match; 0,60–0,90 = revisão; <0,60 = descarta).
- **Confiança baixa nunca autoriza nada automaticamente.** No MVP **nenhuma** leitura autoriza sozinha: o operador sempre confirma.
- **Log de decisão** (`kac_alpr_reads` + `kac_audit_log`): fonte (câmera/portaria), horário da captura, placa lida, confiança, engine/versão, operador, decisão (aceito/corrigido/rejeitado) e placa corrigida.
- **Retenção:** imagem por 7 dias (configurável, máximo 30); metadados por 12 meses; exclusão sob pedido do titular (LGPD).

## Avaliação a custo R$0
| Opção | Licença | Hardware | Prós/contras |
|---|---|---|---|
| fast-alpr (ONNX, CPU) | MIT | Revision-PC (Intel HD 620, CPU dual/quad-core) | Viável em **lote/quase tempo real** (estimativa: centenas de ms a alguns segundos por imagem em CPU; a **medir**) |
| PaddleOCR | Apache-2.0 | CPU | Mais pesado; OCR genérico |
| tesseract.js no navegador | Apache-2.0 | Cliente | Precisão fraca em placa Mercosul |
| Vercel Functions (Hobby) | — | — | Inadequado: limite de tamanho do bundle (~250 MB) e de duração, sem GPU; modelos ONNX + runtime estouram ou ficam lentos |
| openalpr | AGPL-3.0 | — | **Descartado** (licença e projeto parado) |

**Não prometemos tempo real.** Meta inicial: leitura sob demanda (operador tira a foto) com resposta em <5 s, a validar.

## Plano de medição (antes de qualquer promessa)
Amostra de ≥200 fotos reais autorizadas (placas Mercosul e antigas, dia/noite). Métricas: acurácia exata da placa, acurácia com 1 caractere de tolerância, p50/p95 de latência no Revision-PC e uso de CPU/RAM. Critério de aceite: ≥90% exata de dia e taxa de falso-match = 0 com a revisão humana.
