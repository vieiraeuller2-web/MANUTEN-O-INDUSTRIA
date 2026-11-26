# KRON 1.0 — Candidato a lançamento (RC)

Estado em 2026-11-04: **CANDIDATO EM HOMOLOGAÇÃO**, não aprovado para produção.

## Referência de código
- Branch: `feat/tecnico-mobile-equipe`
- Commit-base original do candidato visual: `402277f11799d053431b08c69ada203d7a3c4c38`
- **Nova RC com correções da ponte legada:** `f5d685e3b1a383ccc8dc2e049af290c1bc072a73` (Preview verificado pela Vercel em 2026-11-04)
- Preview deve ser gerado somente após testes locais.
- Não promover a `main`/produção nem ativar Enforcement 6.3B sem autorização explícita.

## Gate A — Qualidade local [TESTES E BUILD APROVADOS; BENCHMARK PENDENTE]
- [x] `git pull --ff-only` (log local: atualização `402277f` → `f5d685e`, fast-forward)
- [x] `npm test` 100% aprovado (**165/165 testes, 34/34 arquivos**; log local de 2026-11-04)
- [x] `npx tsc --noEmit` sem erros (log local)
- [x] `npm run build` concluído (Vite, **3032 módulos; 32,42 s**; log local de 2026-11-04)
- [ ] Conferir warnings e bundles mais pesados; benchmark real de navegação.

## Gate B — Preview [NOVA RC READY; HOMOLOGAÇÃO DOS FLUXOS MIGRADOS PENDENTE]
- [x] **Nova RC:** `npx vercel` READY; URL `https://manutencao-industria-6ily0hmm5-vieiraeuller2-8287s-projects.vercel.app`; verificado por Vercel como `dpl_HGrKGRrLaBCcMBta7A78tQ6RtjUB`, Preview, SHA `f5d685e3b1a383ccc8dc2e049af290c1bc072a73`.
- [x] **Nova RC:** usuário confirmou em 2026-11-04 que as consultas de Histórico de OS, Obras, Lubrificação, Notas Fiscais e Serviços Externos funcionaram no Preview. **Escopo informado:** leitura/navegação em conta autorizada, sem comprovação de mutações ou testes de permissões negativas.
- [ ] **Nova RC:** testes reais de gravações somente em ambiente/conta de teste e contratos de permissões por perfil (inclusive negações e rollback).
- [ ] **Nova RC:** validar gravação de OS em ambiente de teste autorizado (não gravar OS de teste na base operacional), sessão, idempotência e confirmação de horímetro.
- [ ] **Nova RC:** garantir que QR público e fluxo QR de OS não sofreram regressão.
- [x] Homologação visual de Lançamento de OS declarada pelo usuário em 2026-11-04, sem gravação real (não equivale a teste negativo do backend).
- [x] Homologação visual de Equipe declarada pelo usuário em 2026-11-04 (busca, filtros, Exibir mais e estados).
- [ ] Conferir desktop/mobile e regressões de Histórico de OS
- [ ] Matriz de perfis ADM, PCM, GESTAO, TECNICO e teste de acesso negado
- [ ] Verificar recuperação após indisponibilidade do GAS e respostas inválidas

## Retomada de 2026-11-25 — inspeção de estado e hardening sem deploy

- [x] Memória Obsidian lida: `JARVIS/JARVIS_BRAIN/10_PROJECTS/CONTROLE_MANUTENCAO_INDUSTRIAL/SESSIONS/KRON_MEMORIA_CONTINUIDADE_2026-11-04.md`.
- [x] GitHub confirmado antes das novas alterações: branch `feat/tecnico-mobile-equipe` em `6cbc423`, `main` ainda em `8364fe5`; produção não foi alterada nesta retomada.
- [x] Vercel Preview existente continua `READY`, `dpl_HGrKGRrLaBCcMBta7A78tQ6RtjUB`, SHA `f5d685e`.
- [x] Vercel Production ainda não lista `GAS_WEBAPP_URL`, `SESSION_COOKIE_SECRET` ou `LEGACY_SHEETS_GAS_URL`; nenhum segredo foi lido, copiado ou configurado.
- [x] `api/proxy.ts`: erro bruto de fetch (potencialmente com URL de token) não é mais registrado. Novo teste de regressão em `src/test/auth62-revogacao-integracao.test.ts`; **alterações ainda aguardam execução de testes e novo Preview**.
- [ ] Executar `npm test`, `npx tsc --noEmit` e `npm run build` depois do pull, sem publicar Production.
- [x] Identificar projeto GAS candidato via link enviado: Google Drive confirmou o nome **INDUSTRIA**, MIME `application/vnd.google-apps.script`, Script ID `1KeJfc3EnVuUvS9kVZd5YZSh98akbr96INxWuEIBmk-0wYcF7VRbiaUT9`. Isso **não comprova** que é a implantação usada por Vercel/QR.
- [x] **Clone e auditoria do GAS realizados:** `clasp clone-script` baixou 103 arquivos de HEAD e v53; usuário conferiu hashes de cada arquivo sem diferenças e enviou os dois ZIPs. Auditoria estática consolidada em `AUDITORIA_KRON_AUTH62_GAS_V53_2026-11-26.md` (Obsidian/Drive restrito); **não copiar ZIPs, segredos ou relatório sensível ao GitHub**.
- [x] **Conferência de identificação:** implantação v53 `AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw` coincide com a URL legada registrada no KRON. Não presumir que v53 seja o único deployment ativo ou que HEAD seja igual ao publicado.
- [x] **Receber e analisar HEAD/v53:** 103 arquivos comparados, análise estática concluída; sem invocar endpoints operacionais, e sem demonstrar revogação/bypass por testes reais.
- [x] Acesso read-only a código HEAD/v53 e lista de implantações; usuário confirmou via captura de tela em 26/11/2026 **dois estados das Script Properties**. Outros vínculos de implantação e cenários de segurança reais permanecem pendentes.
- [ ] Validar a revogação imediata de sessões e divergência `ATIVO` vs `STATUS` em conta de teste; confirmar permissão no GAS legado público.
- [ ] Configurar variáveis de Production **apenas** depois de confirmar endpoints e política de segredos; stage Production com rollback sob autorização explícita.

## Gate C — AUTH62 e Enforcement 6.3B [AUDITORIA ESTÁTICA REALIZADA; BLOQUEIOS P0, NÃO ATIVAR]
- [x] **Estado da configuração visto na tela de Script Properties em 26/11/2026:** `AUTH63B_ENFORCEMENT_ENABLED_V1 = NAO`; `AUTH63B_UNMAPPED_FAIL_CLOSED_V1 = SIM`. Informação confirmada por captura de tela enviada pelo usuário; nenhuma propriedade foi alterada. **O segundo valor não ativa o Enforcement enquanto o primeiro estiver em NAO.**
- [ ] **Manter Enforcement OFF.** Antes de propor ativação, corrigir rotas não autorizadas e segredos, conferir exceções QR/Telegram e executar testes isolados de autorização/revogação com rollback. **Decisão atual: NO-GO.**
- [x] Revisão do código no GitHub e das configurações/metadata da Vercel; ver `docs/AUDITORIA_FINAL_AUTH62_KRON_RC1.md`.
- [ ] **P0** Vercel Production não lista `GAS_WEBAPP_URL` nem `SESSION_COOKIE_SECRET` (aparecem em Preview/Development); configurar/revalidar somente no ambiente correto.
- [ ] **P0 (corrigido no código, testes simulados aprovados, backend real pendente)**: gravação OS, Obras, consultas/cadastros por `sheets-external` e Lubrificação usam API intermediária. 12 testes novos passaram, mas falta homologação dos contratos reais e bloqueio de bypass direto ao GAS; consultar `docs/RC1_CORRECOES_SEGURANCA_PENDENTES.md`.
- [ ] **P0** Corrigir riscos apontados na auditoria estática do GAS v53 e validar a revogação de sessões; usuário confirmou duas propriedades, mas faltam testes reais e autorizações das rotas protegidas.
- [x] Projeto Apps Script INDUSTRIA identificado; 103 arquivos de HEAD/v53 exportados e analisados. Drive direto retornava 403; obtenção ocorreu via `clasp`. Isso não comprova a cobertura de outros deployments ou backends legados.
- [ ] Auditar o GAS efetivamente publicado: `doGet`/`doPost`, Shadow 6.3A, enforcement 6.3B e versão das rotas
- [ ] Confirmar por telemetria real que todas as actions protegidas são mapeadas e recebem `session_token`
- [ ] Confirmar exceções intencionais de rotas públicas, QR, relatórios públicos e integrações servidor-servidor
- [ ] Executar casos negativos: sem token, token expirado/revogado, permissão insuficiente, actions desconhecidas e bypass direto do GAS
- [ ] Inspecionar diferença `ATIVO`/`STATUS` do AUTH62 e revogação de sessões/caches com conta de teste autorizada
- [x] Conferir o valor atual de `AUTH63B_UNMAPPED_FAIL_CLOSED_V1` por captura (`SIM`); política de logs, cobertura do mapeamento e exceções ainda exigem auditoria/testes antes de tratar 6.3B como proteção abrangente.
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
- Estado histórico em 2026-09-19: `enforcement_ativo=false`, `unmapped_fail_closed=false`. **Estado visto em 26/11/2026 na configuração do projeto INDUSTRIA:** Enforcement `NAO` e `unmapped_fail_closed` `SIM` — não inferir que proteção esteja ativa.
- Risco observado na telemetria Shadow: chamadas reais sem token; ativação prematura poderia interromper a operação.

Referências: memorial histórico `MEMORIAL_COMPLETO_CONTROLE_MANUTENCAO_INDUSTRIAL_20260924.md`, seção 17; `docs/PLANO_INTEGRACAO_API.md`; `docs/auth62-revogacao-homologacao.md`.

Este arquivo registra somente os gates comprovados por logs recebidos. Testes locais e Preview Ready não substituem homologação visual, smoke tests reais nem auditoria do GAS publicado. O KRON 1.0 ainda não está aprovado para produção.
