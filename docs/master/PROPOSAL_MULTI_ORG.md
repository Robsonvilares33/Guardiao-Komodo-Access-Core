# Proposta — usuário em várias empresas (achado 15) · NÃO implementada

**Status:** só proposta, por decisão do Robson.

## Hoje
`withOrg`/`orgSession` (api) usa a membership mais antiga do usuário. Quem está em 2 empresas não consegue trocar de empresa. É seguro, porque nunca mistura dados, mas limita o uso.

## Proposta
1. **Seleção explícita:** o cliente manda o cabeçalho `x-kac-org: <uuid>`. O servidor só aceita se existir uma linha em `kac_memberships (user_id, organization_id)`. Se não existir, responde 403 `org_forbidden`. Se o cabeçalho faltar, continua valendo a membership mais antiga (o comportamento de hoje).
2. **Consulta única:** o embedding da F5b já traz todas as memberships. Basta escolher a que bate com o cabeçalho, sem nenhuma consulta extra.
3. **Papel por empresa:** `orgRole` sai da membership escolhida. As checagens de admin, de exclusão (F2) e de MFA usam esse papel.
4. **UI:** um seletor "Empresa" no menu "Mais", visível só com 2 ou mais memberships. A escolha fica em `sessionStorage` e o cache offline (F4) é separado por empresa, com a empresa na chave, e apagado ao trocar.
5. **Auditoria:** gravar a troca de empresa em `kac_audit_log` (`org.switch`).

## Riscos e mitigação
- **Mistura de dados entre empresas.** Todas as rotas já filtram por `organization_id=eq.<orgId da sessão>`. Teste obrigatório: com o cabeçalho de outra empresa, a resposta é 403 e nenhuma linha vaza.
- **Cache offline de outra empresa.** A chave do cache inclui a empresa e o cache é apagado na troca.

**Esforço:** cerca de 1,5 a 2 dias (API 0,5, UI 0,5, testes e E2E 0,5 a 1). **Migração:** nenhuma; a tabela `kac_memberships` já existe.
