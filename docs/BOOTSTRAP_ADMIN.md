# Criação do primeiro administrador (bootstrap)

`POST /api/auth/bootstrap` só funciona quando:
1. `KAC_BOOTSTRAP_SECRET` está definida no servidor com **≥ 32 caracteres** (caso contrário: 403 sempre);
2. o segredo enviado confere (comparação em tempo constante);
3. não existe nenhum usuário (função atômica `komodo_bootstrap_admin_atomic` com advisory lock; 2ª tentativa → 409).

## Procedimento
1. Gere um segredo forte e aleatório **fora do chat**, guarde-o no 1Password (cofre Pessoal).
2. Defina `KAC_BOOTSTRAP_SECRET` no Vercel (Production, *Sensitive*) e faça redeploy.
3. Acesse `/login.html`, preencha e-mail, senha (≥ 12) e a chave do servidor. O campo é `type=password` e é limpo após o envio.
4. **Feche a janela imediatamente:** remova `KAC_BOOTSTRAP_SECRET` do Vercel e faça redeploy. Sem a variável, o endpoint responde 403.
5. Se o segredo vazou em qualquer momento, considere-o comprometido: gere outro (rotação) e confirme que não existem administradores indevidos.

O segredo **nunca** vai para JavaScript do navegador, arquivos estáticos, commits ou logs.
