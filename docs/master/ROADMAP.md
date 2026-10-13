# Roadmap

| Fase | Entrega | Critério de aceitação | Status |
|---|---|---|---|
| A | Auditoria, pesquisa, ADRs, arquitetura, migrações propostas + PGlite, navegação da agenda | Docs no repo; 44 testes unitários (42 pass, 2 todo); PGlite 26/26; deploy READY | **Concluída** |
| B | Aplicar 005/006 em produção (com aprovação); API grava org e histórico; UI de histórico de reagendamento | Contagens preservadas; 7.3-09 e 7.3-10 viram testes reais e passam | Planejado |
| C | Supabase Auth (e-mail + Google OIDC, MFA); convites e membros; limites de seats | Testes negativos A×B via JWT real; reset de senha do admin | Planejado |
| D | Sites/unidades/portarias, pessoas, veículos; fila offline (IndexedDB) | Visita criada offline sincroniza uma única vez | Planejado |
| E | Billing sandbox (Mercado Pago) atrás de PaymentProvider | Máquina de estados coberta por webhooks de sandbox | Planejado |
| F | Pré-requisitos comerciais: Vercel Pro ou outro host, Supabase com backup, termos/LGPD | Plano permite uso comercial; backup restaurado com sucesso | Decisão do usuário |
| G | ALPR piloto (fast-alpr) e IA com guardrails | Confirmação humana; precisão medida em amostra real | Planejado |
