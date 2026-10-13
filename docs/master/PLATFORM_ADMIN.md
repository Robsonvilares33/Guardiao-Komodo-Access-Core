# Painel de administração da plataforma (sec. 16): design

- **App separado** (`/platform`, de preferência em outro subdomínio), com login próprio e MFA obrigatório. Os papéis ficam em `kac_platform_staff` (platform_admin, support, billing), **sem** membership automática nos tenants.
- Visão padrão: metadados agregados (orgs, plano, uso, status), **sem dados de visitantes**.
- **Break-glass:** acesso aos dados de um tenant só com justificativa + ticket + prazo (máximo 2 h). Gera `kac_audit_log(action='break_glass')`, notifica o owner da org e é revisado semanalmente. A sessão é somente leitura por padrão.
- Ações sensíveis (mudar plano, suspender org, exportar dados) exigem confirmação dupla e ficam registradas.
