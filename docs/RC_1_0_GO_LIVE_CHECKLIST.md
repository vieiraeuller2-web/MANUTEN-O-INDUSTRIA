# KRON 1.0 — Candidato a lançamento (RC)

Estado em 2026-11-04: **CANDIDATO EM HOMOLOGAÇÃO**, não aprovado para produção.

## Referência de código
- Branch: `feat/tecnico-mobile-equipe`
- Commit-base do candidato: `402277f11799d053431b08c69ada203d7a3c4c38`
- Preview deve ser gerado somente após testes locais.
- Não promover a `main`/produção nem ativar Enforcement 6.3B sem autorização explícita.

## Gate A — Qualidade local [PENDENTE]
- [ ] `git pull --ff-only`
- [ ] `npm test` 100% aprovado
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run build` concluído
- [ ] Conferir warnings e bundles mais pesados; benchmark real de navegação.

## Gate B — Preview [PENDENTE]
- [ ] `npx vercel`, confirmar URL e commit implantado
- [ ] Homologar Lançamento de OS sem gravar dados reais (campos, TAG, horários e falha de opções)
- [ ] Homologar Equipe (busca, filtros, Exibir mais, estados de carregamento)
- [ ] Conferir desktop/mobile e regressões de Histórico de OS
- [ ] Matriz de perfis ADM, PCM, GESTAO, TECNICO e teste de acesso negado
- [ ] Verificar recuperação após indisponibilidade do GAS e respostas inválidas

## Gate C — AUTH62 e Enforcement 6.3B [PENDENTE, NÃO ATIVAR]
- [ ] Auditar o GAS efetivamente publicado: `doGet`/`doPost`, Shadow 6.3A, enforcement 6.3B e versão das rotas
- [ ] Confirmar por telemetria real que todas as actions protegidas são mapeadas e recebem `session_token`
- [ ] Confirmar exceções intencionais de rotas públicas, QR, relatórios públicos e integrações servidor-servidor
- [ ] Executar casos negativos: sem token, token expirado/revogado, permissão insuficiente, actions desconhecidas e bypass direto do GAS
- [ ] Inspecionar diferença `ATIVO`/`STATUS` do AUTH62 e revogação de sessões/caches com conta de teste autorizada
- [ ] Confirmar `unmapped_fail_closed` e política de logs antes de chamar 6.3B de proteção abrangente
- [ ] Definir janela controlada, monitoramento de ACCESS_DENIED e rollback das Script Properties

## Gate D — Publicação [PENDENTE]
- [ ] Backup/tag do estado atualmente publicado e rollback testado
- [ ] Aprovação explícita da versão e do plano de lançamento
- [ ] Deploy controlado de produção da Vercel, após gates A/B/C pertinentes
- [ ] Smoke tests pós-deploy: autenticação, telas críticas, consulta, ações autorizadas/negadas
- [ ] Monitoramento inicial, com critério de rollback para falhas de autenticação, leituras ou gravação

## Como o 6.3B funciona (especificação histórica)
- Implementado no Apps Script, ligado/desligado por Script Properties.
- Quando ligado: rotas mapeadas sem token, com token inválido/expirado ou com perfil sem permissão são bloqueadas.
- Rotas permitidas passam.
- O desenho original usava **fail-open + log** para rotas não mapeadas enquanto `unmapped_fail_closed=false`; portanto ativar o enforcement **não garante bloquear rotas não mapeadas**.
- Estado histórico em 2026-09-19: `enforcement_ativo=false`, `unmapped_fail_closed=false`. O estado publicado atual deve ser verificado novamente.
- Risco observado na telemetria Shadow: chamadas reais sem token; ativação prematura poderia interromper a operação.

Referências: memorial histórico `MEMORIAL_COMPLETO_CONTROLE_MANUTENCAO_INDUSTRIAL_20260924.md`, seção 17; `docs/PLANO_INTEGRACAO_API.md`; `docs/auth62-revogacao-homologacao.md`.

Este arquivo é um plano de gates; **não confirma** que qualquer gate esteja aprovado, que o GAS publicado tenha a mesma versão do arquivo histórico ou que a versão 1.0 esteja pronta.
