# Política de Retenção e Privacidade — ALPR (Leitura de Placas) — RASCUNHO

> **Rascunho técnico, não é aconselhamento jurídico.** Deve ser revisado por advogado(a)/DPO antes de ativar o ALPR em produção. Status: **desligado** (nenhuma foto/placa real é processada hoje).

## 1. Escopo
Captura de foto de veículo e leitura automática da placa (ALPR) na portaria, para registrar entrada/saída de visitantes e prestadores no Guardião Komodo Access Core.

## 2. Dados tratados
| Dado | Categoria LGPD | Observação |
|---|---|---|
| Placa do veículo | Dado pessoal (identifica o titular indiretamente) | Texto normalizado (ex.: ABC1D23) |
| Foto do veículo | Dado pessoal; pode conter rosto de pessoas | Recorte focado na placa sempre que possível |
| Data/hora, portaria, operador | Dado pessoal (registro de acesso) | Já existente em `komodo_acessos` |
| Confiança da leitura (OCR) | Técnico | Para revisão humana |

Não é objetivo coletar biometria facial. Rostos visíveis devem ser **desfocados** ou a imagem recortada à placa antes de armazenar.

## 3. Finalidade e base legal (proposta)
- **Finalidade:** controle de acesso e segurança patrimonial do condomínio/empresa.
- **Base legal sugerida:** legítimo interesse (art. 7º, IX) do controlador, com **LIA** (teste de balanceamento) documentada; alternativa: execução de contrato (art. 7º, V) para moradores/funcionários.
- Proibido uso para marketing, perfilamento ou compartilhamento com terceiros fora de obrigação legal/ordem judicial.

## 4. Papéis
- **Controlador:** cada organização cliente (condomínio/empresa).
- **Operador:** Guardião Komodo (plataforma). Suboperadores: Supabase (banco/arquivos), Vercel (hospedagem), provedor de OCR se externo.
- **Encarregado (DPO):** a definir por cada controlador; contato exibido no aviso de privacidade.

## 5. Retenção (proposta — ajustável por organização)
| Item | Prazo padrão | Máximo permitido |
|---|---|---|
| Foto do veículo | **30 dias** | 90 dias |
| Placa + registro de acesso | **12 meses** | 24 meses |
| Logs de auditoria de acesso às fotos | 12 meses | 24 meses |

- Exclusão automática diária (job agendado) após o prazo; exclusão registrada em auditoria (sem a foto).
- **Retenção estendida** apenas para incidente formal (boletim/ocorrência), com justificativa registrada e prazo definido.

## 6. Segurança
- Fotos em bucket **privado**, isolado por `organization_id`; acesso só por URL assinada de curta duração (≤ 5 min).
- Somente papéis admin/operador da própria organização veem fotos; todo acesso gera registro em `kac_audit_log`.
- Criptografia em trânsito (TLS) e em repouso (provedor).
- Sem fotos em logs, e-mails, backups públicos ou repositório (o repositório é público).
- Backups: o backup diário criptografado **não inclui** fotos; somente metadados.

## 7. Transparência
- Placa/aviso visível na entrada: "Ambiente com leitura automática de placas — finalidade: controle de acesso. Saiba mais: <link>".
- Aviso de privacidade com finalidade, prazos, direitos e contato do encarregado.

## 8. Direitos do titular (art. 18)
Acesso, correção, eliminação (quando cabível), informação sobre compartilhamento. Prazo de resposta interno: **15 dias**. Pedido via encarregado; o admin da organização exporta/elimina pelo painel.

## 9. Incidentes
Comunicação à organização controladora em até **24 h** da ciência; o controlador avalia comunicação à ANPD e titulares (Res. CD/ANPD nº 15/2024 — prazo de 3 dias úteis).

## 10. Requisitos de foto (para a fase de testes)
- Usar **somente fotos sintéticas, próprias ou com autorização** — nunca de terceiros sem consentimento.
- Resolução mínima 1280×720; placa com ≥ 120 px de largura; ângulo ≤ 30°; foco nítido; dia e noite (IR).
- Formatos JPEG/WebP, ≤ 2 MB; padrões Mercosul e antigo (cinza).
- Conjunto mínimo de validação: ~50 imagens variadas (luz, chuva, sujeira, motos), com o texto da placa anotado.
- Metadados EXIF (GPS) removidos no upload.

## 11. Ativação
O ALPR só pode ser ligado por organização (flag), após: (a) revisão jurídica deste documento; (b) LIA assinada pelo controlador; (c) aviso de privacidade publicado; (d) job de exclusão testado.
