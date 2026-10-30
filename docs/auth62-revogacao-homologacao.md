# AUTH62 — diagnóstico de revogação de sessão (2026-10-30)

## Estado conhecido
- A homologação visual do módulo Equipe passou em Preview.
- Gestão de acessos inclui desativação/ativação e redefinição de senhas.
- O patch de referência `backend-patches/auth62_performance_v1.gs` usa caches de sessão e usuário de até 60 segundos.
- O patch `backend-patches/equipe_tecnicos_v1.gs`, na função `equipe_acesso_status`, atualiza `ATIVO` na aba `USUARIOS`, mas não invalida explicitamente `auth_user_v2_<ID_USUARIO>` nem todas as sessões do colaborador.
- A versão real publicada do GAS não foi inspecionada nesta etapa; não assumir que o patch local representa integralmente produção.

## Risco a homologar
Uma sessão anterior à desativação pode continuar autorizada por tempo limitado se o cache de usuário estiver vigente. Também há divergência potencial entre `ATIVO=SIM/NAO` usado por Equipe e `STATUS=ATIVO` consultado no patch de performance do AUTH62. O esquema efetivo e o validador publicado precisam ser verificados antes de qualquer mudança.

A redefinição da senha altera hash/salt mas o patch não revoga explicitamente sessões anteriores. Não afirmar que redefinição desconecta outros dispositivos.

## Medidas desta etapa
- Testes simulados de revogação e falhas de sessão em `src/test/auth62-revogacao-integracao.test.ts`.
- Nenhuma conta real, sessão real, planilha real nem GAS publicado foram modificados.

## Homologação controlada posterior
1. Conferir o contrato real das abas `USUARIOS` e `SESSOES`, as rotas GAS publicadas, e a checagem efetiva de `ATIVO` e `STATUS`.
2. Planejar invalidação de cache/sessões no backend de forma transacional e com rollback. Não implantar sem autorização explícita.
3. Utilizar uma conta de teste autorizada, em duas sessões, para medir o comportamento de desativação, autenticação e requisições antigas, sem tocar usuários operacionais.
4. Manter Enforcement 6.3B desligado e Vercel Production inalterado.
