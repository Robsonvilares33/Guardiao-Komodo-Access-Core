# Design — próximas funções de produto (não implementadas)

Estimativas para 1 dev que conhece o código, incluindo testes. Custo de infraestrutura R$0 nos 3 casos, dentro do Supabase Free e do Vercel Hobby.

## 1. Visitantes recorrentes (cadastro reutilizável)
**Problema:** o porteiro redigita nome, placa e unidade de quem vem toda semana.
**Proposta:**
- Tabela `kac_visitors` (organization_id, nome, placa, unidade padrão, observação, `last_seen_at`), com RLS como as demais.
- O "Agendar rápido" sugere nomes da própria empresa por autocomplete, com no mínimo 3 letras e a busca sanitizada da F5a.
- A visita (`komodo_acessos`) ganha `visitor_id`, opcional.
- **LGPD:** entra no expurgo da 010 (cadastro sem visita há mais que a retenção é apagado) e na exportação/exclusão do titular. O visitante não vê o cadastro.

**Esforço:** cerca de 3 dias. Migração 012 com backup e rollback, API (CRUD + sugestões), UI (autocomplete), testes e PGlite.

## 2. Convite por QR
**Problema:** o morador ou a empresa quer liberar um visitante sem ligar para a portaria.
**Proposta:**
- O anfitrião cria um convite com data, janela de horário e nome.
- O servidor gera um token aleatório de 128 bits, guarda só o hash (como as sessões) e devolve um link ou QR para mandar por WhatsApp.
- Na portaria, a leitura do QR (câmera liberada só nessa tela, ver `PROPOSAL_CAMERA_POLICY.md`) ou a digitação do código curto marca a chegada.
- Regras: uso único, expira no fim da janela, pode ser revogado.
- **Segurança:** o token não identifica a pessoa; tem limite de tentativas pela RPC da 011; cada uso gera um registro de auditoria.

**Esforço:** cerca de 4 a 5 dias. Migração (`kac_visit_invites`), API, tela do anfitrião, leitura na portaria, testes. A câmera depende da aprovação da proposta de câmera; sem ela, só o código digitado (cerca de 3 dias).

## 3. Alerta para o anfitrião ("seu visitante chegou")
**Problema:** quem recebe não sabe que o visitante está na portaria.
**Proposta:**
- Quando o status vai para "Chegou", o servidor manda um aviso ao anfitrião.
- Canal R$0: Web Push (VAPID) para quem tem o PWA instalado, ou e-mail pela cota grátis do Resend. WhatsApp e SMS têm custo e ficam fora.
- O aviso mostra só o primeiro nome e o horário, nunca a placa.
- Fila simples: o envio acontece depois da resposta ao porteiro, para não atrasar o check-in.
- **Privacidade:** o anfitrião ativa e desativa (opt-in); a inscrição push fica guardada por empresa.

**Esforço:** cerca de 3 dias. Inscrição push + service worker, envio no servidor, preferências, testes. Precisa de um par de chaves VAPID novo em env, o que exige aprovação do Robson.

| Função | Esforço | Migração | Precisa de aprovação para |
|---|---|---|---|
| Visitantes recorrentes | ~3 d | 012 | aplicar a migração |
| Convite por QR | ~4–5 d (3 d sem câmera) | 013 | migração; câmera |
| Alerta ao anfitrião | ~3 d | 014 (inscrições) | migração; env VAPID |
