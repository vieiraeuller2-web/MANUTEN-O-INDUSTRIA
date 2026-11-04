# KRON 1.0 — Candidato a lançamento (RC)

Estado em 2026-11-04: **CANDIDATO EM HOMOLOGAÇÃO**, não aprovado para produção.

## Referência de código
- Branch: `feat/tecnico-mobile-equipe`
- Commit-base do candidato: `402277f11799d053431b08c69ada203d7a3c4c38`
- Preview deve ser gerado somente após testes locais.
- Não promover a `main`/produção nem ativar Enforcement 6.3B sem autorização explícita.

## Gate A — Qualidade local [TESTES E BUILD APROVADOS; BENCHMARK PENDENTE]
- [x] `git pull --ff-only` (log recebido: atualização 7aa6356 → 402277f)
- [x] `npm test` 100% aprovado (153/153 testes, 32/32 arquivos; log de 2026-11-04)
- [x] `npx tsc --noEmit` sem erros (log local)
- [x] `npm run build` concluído (Vite, 3032 módulos; 35,68 s)
- [ ] Conferir warnings e bundles mais pesados; benchmark real de navegação.

## Gate B — Preview [PENDENTE]
- [x] `npx vercel` concluiu com Ready (Preview: https://manutencao-industria-f2dtakwbs-vieiraeuller2-8287s-projects.vercel.app). Deployment confirmado na Vercel: `dpl_Hs4JoGrftUB8mXb5c3RtZJEJWiKx`, SHA `402277f11799d053431b08c69ada203d7a3c4c38`.
- [x] Homologação visual de Lançamento de OS declarada pelo usuário em 2026-11-04, sem gravação real (não equivale a teste negativo do backend).
- [x] Homologação visual de Equipe declarada pelo usuário em 2026-11-04 (busca, filtros, Exibir mais e estados).
- [ ] Conferir desktop/mobile e regressões de Histórico de OS
- [ ] Matriz de perfis ADM, PCM, GESTAO, TECNICO e teste de acesso negado
- [ ] Verificar recuperação após indisponibilidade do GAS e respostas inválidas

## Gate C — AUTH62 e Enforcement 6.3B [AUDITORIA ESTÁTICA REALIZADA; BLOQUEIOS P0, NÃO ATIVAR]
- [x] Revisão do código no GitHub e das configurações/metadata da Vercel; ver `docs/AUDITORIA_FINAL_AUTH62_KRON_RC1.md`.
- [ ] **P0** Vercel Production não lista `GAS_WEBAPP_URL` nem `SESSION_COOKIE_SECRET` (aparecem em Preview/Development); configurar/revalidar somente no ambiente correto.
- [ ] **P0 (parcialmente corrigido em branch, não homologado)**: gravação OS, Obras, consultas/cadastros por `sheets-external` e Lubrificação agora usam API intermediária. Faltam testes e segurança do GAS exposto diretamente; consultar `docs/RC1_CORRECOES_SEGURANCA_PENDENTES.md`.
- [ ] **P0** Confirmar código e Script Properties do GAS efetivamente publicado e revogação de sessões.
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

Este arquivo registra somente os gates comprovados por logs recebidos. Testes locais e Preview Ready não substituem homologação visual, smoke tests reais nem auditoria do GAS publicado. O KRON 1.0 ainda não está aprovado para produção.
