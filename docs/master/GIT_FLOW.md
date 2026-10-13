# Fluxo de entrega (sec. 18)

1. Branch de trabalho `work/<tema>` → push → **Preview** automático da Vercel.
2. Os previews têm **Vercel Authentication (SSO)**. Testar via API com o token (ex.: header de *protection bypass* gerado com autorização) **sem desligar a proteção**.
3. Testes verdes + checagem do preview → merge fast-forward em `main` → Production.
4. Rollback: `request_rollback`/promover o deploy anterior (o SHA anterior fica registrado no relatório).
