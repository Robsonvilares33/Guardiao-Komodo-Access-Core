# Guardião Komodo Access Core — validação de atomicidade PostgreSQL

Status: PLANO E CONTRATOS DE TESTE. Não aplicado a Supabase nem a banco de produção.

## Objetivo
Eliminar as corridas do bootstrap inicial e do rate limit. A implementação atual do handler não deve ser considerada atomicamente segura sob concorrência.

## Contrato requerido para bootstrap
1. Uma operação transacional no PostgreSQL serializa o bootstrap global.
2. A operação consulta a existência de qualquer usuário e insere o primeiro administrador dentro da mesma transação serializada.
3. Duas chamadas simultâneas com e-mails diferentes: exatamente uma retorna `created=true`; a outra retorna `created=false` (ou conflito explícito); o banco termina com exatamente um administrador inicial.
4. A função é `SECURITY DEFINER` somente se necessário, fixa `search_path`, revoga execução de `PUBLIC`, `anon` e `authenticated`, e concede execução somente ao backend confiável.
5. Validar os grants reais do Supabase/PostgreSQL; não presumir que a role `service_role` esteja disponível em um PostgreSQL genérico.

## Contrato requerido para rate limit
1. Uma operação transacional serializa por hash do IP.
2. Dentro da transação, remove tentativas com mais de 24 horas, conta tentativas nos últimos 15 minutos e insere uma nova tentativa apenas quando o limite ainda não foi atingido.
3. Com limite 10, 20 requisições simultâneas de um mesmo IP e janela vazia: no máximo 10 são admitidas; as demais recebem HTTP 429.
4. A chave do IP deve vir de proxy confiável, não de um cabeçalho que o cliente possa falsificar.
5. Confirmar índice `(ip_hash, created_at)` e validar custo de lock/limpeza em volume representativo.

## Casos de teste para PostgreSQL descartável
- Duas sessões concorrentes executam bootstrap com e-mails diferentes; só uma cria o primeiro administrador.
- Vinte sessões concorrentes chamam o RPC de rate limit com o mesmo IP hash; exatamente dez recebem permissão.
- Dois IP hashes diferentes podem operar sem serialização global desnecessária.
- Tentativas antigas são eliminadas; tentativas de menos de 15 minutos continuam contando.
- Role `anon` e `authenticated` não conseguem chamar os RPCs nem ler tabelas protegidas.
- Regressão: login, logout, expiração de sessão, autorização admin/operator, CRUD de visitantes e limites de entrada.

## Bloqueios
- A ferramenta bloqueou a gravação do artefato SQL de RPC em uma tentativa anterior; este arquivo é apenas documentação em Markdown, não migração executável.
- Não foi identificado nem utilizado um PostgreSQL descartável nesta execução. Não executar os testes contra o projeto Supabase real.
- Não integrar o handler com nomes de RPC presumidos antes de validar os contratos e o esquema em um banco descartável.

## Próxima ação segura
Preparar a migração em ferramenta autorizada e um banco PostgreSQL temporário; executar os casos concorrentes acima; só então adaptar o handler. Sem deploy e sem alterações no projeto Supabase real.
