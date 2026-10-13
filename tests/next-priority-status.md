# Próxima prioridade técnica — status

## Concluído no laboratório isolado
- Login limita a leitura de tentativas recentes a 11 linhas.
- Tentativas com mais de 24 horas são removidas no fluxo de login.
- Conflitos de unicidade no bootstrap retornam HTTP 409; a verificação prévia de usuário foi mantida.
- Testes de ciclo de sessão verificam logout (revogação e expiração do cookie) e rejeição/remoção de sessão expirada.
- A regressão mais recente executada em conjunto antes dos testes de sessão passou 15/15. A suíte de ciclo de sessão passou 2/2 em execução separada.

## Bloqueios abertos
- O bootstrap ainda precisa de proteção atômica no PostgreSQL; a consulta prévia e a restrição de unicidade do e-mail não garantem por si só que só exista um administrador inicial com e-mails diferentes.
- O limitador de tentativas ainda usa sequência de consulta e inserção no handler. Em concorrência, várias requisições podem ultrapassar o limiar. A limpeza executada em cada login também deve ser substituída por uma política operacional testada se o volume crescer.
- A proposta de RPC transacional e advisory locks precisa ser criada/revisada como migração de laboratório e validada em PostgreSQL descartável. A tentativa de gravar o arquivo SQL foi bloqueada pelas proteções da ferramenta; não foi tentado contornar o bloqueio.
- Nenhuma alteração foi aplicada ao Supabase real e nenhum deploy foi realizado.

## Próximo passo seguro
Validar a migração/RPC em PostgreSQL descartável quando a gravação autorizada do artefato SQL estiver disponível; executar testes concorrentes reais; depois integrar o handler às RPCs e repetir a suíte completa. Até lá, o protótipo web não está liberado para produção.
