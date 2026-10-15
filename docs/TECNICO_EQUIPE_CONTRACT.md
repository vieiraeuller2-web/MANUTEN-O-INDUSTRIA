# Contrato Técnico / Equipe — Auditoria Inicial

Data da auditoria: 2026-10-15

## Objetivo

Preparar a experiência mobile do perfil TECNICO e a futura tela administrativa de Equipe/Técnicos sem inventar actions, payloads ou schemas.

## Actions comprovadas no sistema vivo

| Action | Método HTTP | Módulo AUTH62 | Ação | Evidência |
| --- | --- | --- | --- | --- |
| `equipe_colaboradores` | GET | `EQUIPE_COLABORADORES` | `VISUALIZAR` | AUTH_SHADOW com acesso ADM |
| `equipe_colaborador_historico` | GET | `EQUIPE_COLABORADORES` | `VISUALIZAR` | AUTH_SHADOW com acesso ADM |
| `minhas_os` | GET | `MINHAS_OS` | `VISUALIZAR` | AUTH_SHADOW com acesso TECNICO |
| `os_manual_tecnico` | POST | `OS_MANUAL` | `CRIAR` | AUTH_SHADOW com acesso TECNICO |

Essas actions foram adicionadas à whitelist segura da Vercel em `api/_shared/gas-client.ts`.

## Estado já confirmado no backend

- Fase 6.5A — Equipe/Colaboradores: implementada e testada.
- Fase 6.6A — Minhas OS: implementada.
- Fase 6.6B — OS Manual do técnico: implementada no backend.
- Perfil TECNICO possui os módulos `OS_QR`, `OS_MANUAL` e `MINHAS_OS`.
- QR público resolve o equipamento automaticamente.
- OS Manual deve permitir somente equipamento cadastrado.
- Minhas OS deve retornar apenas registros do técnico autenticado.

## Estruturas canônicas relacionadas

### CADASTRO_COLABORADORES

Cabeçalhos observados:

`ID_COLABORADOR, NOME_EXIBICAO, NOME_BD_EXATO, NOME_NORMALIZADO, FUNCAO, ESPECIALIDADE, ATIVO, STATUS_CADASTRO, DATA_CADASTRO, OBSERVACAO, TIPO_VINCULO, CONTABILIZAR_HH_CUSTO`

### USUARIOS

Cabeçalhos observados:

`ID_USUARIO, NOME, LOGIN, SENHA_HASH, SENHA_SALT, PERFIL, ID_COLABORADOR, UNIDADE, ATIVO, PRIMEIRO_ACESSO, DATA_CADASTRO, DATA_ATUALIZACAO, ULTIMO_LOGIN, OBSERVACAO, CREDENCIAL_TIPO`

Conclusão: colaborador e usuário são entidades distintas e o vínculo oficial é feito por `ID_COLABORADOR`.

## Schema real capturado — `equipe_colaboradores`

Captura realizada em Preview em 2026-10-15, autenticado como ADM.

Top-level observado:

`success, total, colaboradores, versao`

Item de `colaboradores` observado:

`id_colaborador, nome, nome_bd, funcao, especialidade, ativo, status_cadastro, tipo_vinculo, contabilizar_hh_custo, custo_atual`

Tipos observados no primeiro item:

- strings: `id_colaborador`, `nome`, `nome_bd`, `funcao`, `especialidade`, `ativo`, `status_cadastro`, `tipo_vinculo`, `contabilizar_hh_custo`;
- `custo_atual`: `null` no primeiro item observado; tipo definitivo ainda não fechado.

A resposta não expôs hash/salt de senha nem campos de credencial de `USUARIOS`.

## Schema real capturado — `equipe_colaborador_historico`

Captura realizada em Preview em 2026-10-15, autenticado como ADM.

Top-level observado:

`success, colaborador, historico, versao`

Objeto `colaborador` observado:

`id_colaborador, nome, funcao, ativo, tipo_vinculo, contabilizar_hh_custo`

O array `historico` veio vazio na primeira captura. Por isso os itens do histórico permanecem intencionalmente como `unknown[]` até existir uma amostra real.

## O que NÃO está confirmado ainda

Não foi localizada evidência canônica de uma action HTTP vigente para:

- criar usuário TECNICO;
- vincular um usuário novo a um `ID_COLABORADOR`;
- redefinir senha de técnico;
- ativar/desativar usuário técnico via API.

O backup legado possui funções como `criarUsuario`, mas pertence a uma arquitetura anterior e não deve ser tratado como contrato atual.

## Próxima validação

Antes de criar páginas React:

1. publicar esta branch em Preview;
2. autenticar com ADM e capturar apenas a estrutura de resposta de:
   - `equipe_colaboradores`;
   - `equipe_colaborador_historico`;
3. autenticar com TECNICO e capturar apenas a estrutura de:
   - `minhas_os`;
4. testar `os_manual_tecnico` com payload controlado somente após o contrato de entrada ser recuperado/confirmado;
5. criar tipos TypeScript a partir dos schemas reais;
6. só então implementar Equipe/Técnicos, OS Manual e Minhas OS.

Nenhuma alteração de Produção ou Enforcement 6.3B faz parte desta etapa.
