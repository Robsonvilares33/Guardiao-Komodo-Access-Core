# Aviso de Privacidade — Guardião Komodo Access Core — RASCUNHO

> Rascunho técnico, **não é aconselhamento jurídico**; revisar com advogado(a)/DPO antes de publicar. Cada organização cliente (condomínio/empresa) é a **controladora** dos dados dos seus visitantes; o Guardião Komodo atua como **operador**.

## Dados tratados
Cadastro de visitas (nome, unidade, data/hora, status, documento quando informado), contas de usuários da portaria (e-mail, papel), registros de auditoria e, quando ativado, placa/foto de veículo (ver `ALPR_LGPD_POLICY.md`).

## Finalidade
Controle de acesso e segurança da portaria; prestação e cobrança do serviço; prevenção a fraudes e abuso.

## Suboperadores
| Suboperador | Função | Dados | Local | Status |
|---|---|---|---|---|
| Supabase | Banco de dados e autenticação | Todos os dados da aplicação | Brasil (sa-east-1) | Ativo |
| Vercel | Hospedagem da aplicação e da API | Dados em trânsito; logs técnicos sem conteúdo pessoal | EUA/global | Ativo |
| GitHub | Código e backup diário **criptografado** (artefato privado, 14 dias) | Cópia cifrada do banco | EUA | Ativo |
| **Groq, Inc.** | **Assistente de IA (respostas a perguntas do operador)** | **Somente dados minimizados: módulo, data, hora e status das visitas do dia + a pergunta com CPF/placa/e-mail/telefone mascarados. Nunca nome, unidade, placa, documento, fotos.** | **EUA (GCP)** | **Somente ambiente de teste; desligado em produção (`KAC_AI`)** |
| Mercado Pago | Pagamento de planos | Dados de cobrança da organização (não de visitantes) | Brasil | Sandbox; desligado em produção |
| Google (Gmail SMTP) | Envio de e-mails de autenticação | E-mail do usuário da portaria | EUA/global | Planejado |
| Serviços de push do navegador (Google FCM, Apple, Mozilla, Microsoft) | Entregar o aviso "seu visitante chegou" (opt-in) | Endereço de inscrição do aparelho; texto do aviso SEM dados do visitante (só o horário) | EUA/global | Onda 1, item 3 |
| Google (Gmail SMTP) — avisos | E-mail de reserva do aviso de chegada (opt-in, limite diário) | E-mail do usuário da portaria; texto sem dados do visitante | EUA/global | Onda 1, item 3 |

### Groq — detalhes
- Contrato (Groq Services Agreement §4.2): proibido usar entradas/saídas para treinar modelos sem autorização do cliente.
- Retenção: por padrão não retém; pode registrar por até 30 dias apenas para confiabilidade/abuso. Recomendado ativar **Zero Data Retention** no console.
- Transferência internacional (LGPD art. 33, cláusulas contratuais padrão via DPA do Groq).
- Respostas são sugestões; nenhuma decisão de acesso é automatizada (LGPD art. 20).
- Detalhes técnicos: `AI_ASSISTANT.md`.

## Retenção
Visitas e auditoria: conforme política de cada organização (padrão 12 meses). Backups criptografados: 14 dias. Fotos ALPR: ver política própria.

## Direitos do titular (LGPD art. 18)
Acesso, correção, eliminação, informação sobre compartilhamento e revisão de decisões automatizadas — solicitar ao encarregado da organização controladora; o Guardião Komodo apoia o atendimento.

## Contato
Encarregado (DPO): a definir por organização. Operador: contato do responsável pelo Guardião Komodo (a definir).
