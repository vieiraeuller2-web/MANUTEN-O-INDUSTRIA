# KRON RC1 — Migração de rotas legadas (2026-11-04)

## Implementado em feature branch (não implantado nem testado no Preview ainda)
- `src/lib/sheets-api.ts`: `registrar_os` passou a chamar `apiProxy`; mantidos payload original, `client_submission_id` e conferência de horímetro.
- `api/legacy-sheets.ts`: novo endpoint de intermediação, com cookie HttpOnly, confirmação `auth_me` ao AUTH62, lista fechada de abas e verificação da permissão atual do backend. Falhas de auth não permitem consulta ou gravação.
- `src/lib/sheets-external.ts`: consulta e criação em `notas_fiscais`, `servicos_externos` e consulta de `obras` passam pela Vercel.
- `src/pages/Lubrificacao.tsx`: consulta via ponte.
- `src/lib/obras-api.ts`: `registrar_obra`, `iniciar_obra`, `concluir_obra` usam ponte; permissão CRIAR para registro, EDITAR para iniciar/concluir — exigem homologação da matriz AUTH62.
- `src/test/legacy-sheets-auth.test.ts`: testes simulados para bloqueios, sessões e ações válidas.
- `src/test/os-proxy-seguranca.test.ts`: testes do contrato da gravação de OS.
- `LEGACY_SHEETS_GAS_URL` criado no **Preview** do projeto Vercel. É uma variável server-side, não `VITE_`; **não** foi configurada em Production. O projeto Vercel não está conectado à integração Git, portanto o escopo individual da branch não foi suportado; a variável ficou aplicada a Preview geral.

## Verificação obrigatória (ainda não executada)
Na pasta do projeto, em `feat/tecnico-mobile-equipe`:
```powershell
git pull --ff-only
npm test
npx tsc --noEmit
npm run build
npx vercel
```
O último comando somente após os demais passarem. Uma alteração de variável de ambiente não retroage em deployments antigos; o novo Preview precisa ser gerado.

## Homologação funcional sem mutação real
1. Login e F5 com ADM, PCM, GESTAO e TECNICO.
2. Confirmar visibilidade por perfil e acesso negado a módulos não autorizados.
3. Histórico e Lançamento de OS: consultar e abrir formulário; **não gravar OS real sem conta/dados de teste autorizados**.
4. Obras: testar consulta, visibilidade e ações disponíveis; testar gravação somente em dados de teste autorizados.
5. Notas Fiscais, Serviços Externos e Lubrificação: consultas autorizadas; testar gravação de cadastro somente com dados de teste.
6. Confirmar que erro de comunicação/auth_me falha fechado e não consulta o legado.
7. Validar roteamento `/api/legacy-sheets` no Preview, inclusive redirects GET/POST do Apps Script.
8. Confirmar compatibilidade do contrato e permissão de `registrar_os` com o AUTH62 ativo no GAS.
9. Rever `src/lib/sheets-api.ts::fetchOSFromSheet` e `useSheetOS` (leitura Supabase legada em outras telas). Não migrou nesta fase para evitar impacto sobre relatórios.
10. Testar que QR público e QR OS continuam com o mecanismo de autenticação próprio.

## Bloqueios ainda abertos
- **P0:** Vercel Production ainda não tem `SESSION_COOKIE_SECRET`, `GAS_WEBAPP_URL` nem `LEGACY_SHEETS_GAS_URL`. Configuração exige escolher corretamente os backends e segredos, **sem colar valores no chat**.
- **P0:** GAS original é um Web App acessível diretamente. A ponte Vercel protege apenas pedidos que passam pela Vercel; **não protege o endpoint original**. É obrigatória autorização server-side nas rotas e planilhas do GAS antigo (ou restrição de acesso à implantação) antes de considerar a brecha fechada.
- **P0:** Inspecionar a versão REAL do Apps Script do AUTH62, os hooks 6.3A/6.3B, `ATIVO` vs `STATUS` e a política de invalidação de sessões/caches. Patches versionados não provam implantação.
- **P1:** A Vercel ainda pode enviar token na query string de algumas GETs protegidas do AUTH62. Migração para POST depende de compatibilidade no doPost publicado.
- **P1:** Confirmar contrato de resposta legado para gravações (POST retorna JSON de confirmação) e permissões de cada aba/ação.

## Decisão
Não fazer `vercel --prod`, não ativar Enforcement 6.3B, não modificar contas reais e não publicar patches GAS até completar verificação dos pontos P0 e regressão.
