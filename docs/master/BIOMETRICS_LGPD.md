# Reconhecimento facial (sec. 11): análise LGPD/RIPD, somente design

**Status: módulo DESLIGADO por padrão. Nada implementado. Ativação exige aprovação do usuário, RIPD assinado e parecer jurídico.**

## Enquadramento
- Biometria facial é **dado pessoal sensível** (LGPD art. 5º, II); o tratamento exige uma base do art. 11, tipicamente o **consentimento específico e destacado** ou a prevenção à fraude e segurança do titular (art. 11, II, g), com a ressalva de direitos fundamentais.
- Condomínios e empresas: a ANPD e decisões do Procon/Judiciário (casos de catracas faciais) exigem **alternativa não biométrica equivalente**. O consentimento não é livre se for a única forma de entrar.
- **RIPD/DPIA obrigatório** (art. 38) antes do uso.

## Riscos (RIPD resumido)
| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Vazamento de templates | Média | Muito alto (irrevogável) | Guardar só template cifrado, nunca a foto; chave por org; exclusão na saída |
| Falso positivo / viés | Média | Alto | Só como sugestão; confirmação humana; medir viés |
| Desvio de finalidade | Baixa | Alto | Uso restrito ao controle de acesso; proibido para monitoramento |
| Coleta sem consentimento válido | Alta | Alto | Opt-in por pessoa, revogável, com alternativa |

## Alternativas não biométricas (padrão recomendado)
1. **QR code** de uso único/temporário enviado na pré-autorização.
2. **Pré-autorização** pelo morador/anfitrião com documento conferido pelo porteiro.
3. Código PIN temporário.
4. Placa (ALPR) **com confirmação humana**.

## Pré-requisitos para ligar
Encarregado (DPO) nomeado, RIPD, termo de consentimento, política de retenção (excluir em até 30 dias após o vínculo), contrato de operador com o cliente (controlador), feature flag por org, testes de viés.
