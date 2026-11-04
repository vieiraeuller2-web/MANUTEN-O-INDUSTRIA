# KRON 1.0 — Auditoria final AUTH62 e preparação de go-live

**Data:** 2026-11-04  
**Decisão técnica:** **NO-GO temporário** para a nova aplicação em produção, até resolver e comprovar os bloqueios abaixo.  
**Escopo:** revisão estática do GitHub, configurações/metadata da Vercel e evidência dos testes locais enviada pelo usuário. **Não** houve acesso ao código-fonte efetivamente implantado no GAS, alteração da planilha ou testes negativos reais.  
**Branch candidata:** `feat/tecnico-mobile-equipe`  
**SHA do aplicativo homologado:** `402277f11799d053431b08c69ada203d7a3c4c38` (commits de documentação posteriores não alteram os arquivos do aplicativo).  
**Preview confirmado Vercel:** `dpl_Hs4JoGrftUB8mXb5c3RtZJEJWiKx` — `https://manutencao-industria-f2dtakwbs-vieiraeuller2-8287s-projects.vercel.app` — target Preview, READY.  
**Produção anterior observada:** `dpl_GghmgR34urWJej2oKAy4HuCsxHPB`, branch `main`, commit `8364fe5fa3b113cadb152acea6f3916d8f13eed5`, READY, rollbackCandidate=true. Não confundir com a RC.

## Evidência de qualidade aprovada

- `npm test`: 153/153 testes, 32/32 arquivos, em 2026-11-04 (relatório do terminal).
- `npx tsc --noEmit`: sem erros no relatório.
- `npm run build`: Vite concluiu em 35,68 s.
- Homologação visual de Lançamento de OS e Equipe: **aprovada pelo usuário** no Preview RC.
- A aprovação visual **não** corresponde a testes reais de autenticação, revogação de sessões, carga ou alteração de credenciais.

## Bloqueios de lançamento (corrigir/validar antes de Production)

### P0 — Ambiente de produção incompleto (confirmado pela Vercel)

No resultado de variáveis **do projeto** há `SESSION_COOKIE_SECRET` e `GAS_WEBAPP_URL` para Preview e Development, mas **não aparecem com target Production**. Esses dois valores são usados pelas serverless functions `api/_shared/gas-client.ts`. A ausência efetiva causaria falha de autenticação/integração do novo app.

**Próxima ação:** configurar esses dois nomes em **Production**, com valores revisados pelo operador diretamente na Vercel (não enviar segredos por chat, não copiar automaticamente sem verificar a instância GAS desejada). Confirmar via nova listagem **somente os nomes e targets**, nunca os valores. Revalidar login em ambiente de staging de produção antes da promoção.

### P0 — Fluxos protegidos ainda acessam GAS diretamente do navegador (confirmado no código)

- `src/lib/sheets-api.ts`: `createOSInSheet` envia `registrar_os` por `fetch(API_URL)`, sem passar por `/api/proxy`; o fluxo está ligado a `src/hooks/use-paginated-os.ts`, usado pelo Lançamento de OS.
- `src/lib/sheets-external.ts`: `fetchSheet` e `createSheetRow` chamam endpoint Google Apps Script diretamente; utilizados, por exemplo, no módulo Obras e em Serviços Externos.
- `src/lib/obras-api.ts`: `postObraAction` chama diretamente o GAS para gravações de Obras.
- `src/pages/Lubrificacao.tsx`: consulta `fetch(ENDPOINT)` diretamente.
- `src/services/qrPublicoApi.ts`: consulta pública do QR e login QR dedicado usam GAS direto **intencionalmente**, e exigem tratamento de exceção distinto.

O botão/menu protegido pelo React **não** protege o endpoint GAS acessível diretamente. As actions legadas e seus roteadores precisam de autorização oficial no servidor ou migração controlada para a Vercel. Não trocar arbitrariamente actions nem métodos: é preciso verificar a compatibilidade do GAS atual.

**Próxima ação:** montar inventário completo por rota (público vs protegido, GET vs POST, identidade no token, permissão, exceção), migrar cada fluxo protegido com teste de contrato e homologação. Confirmar que scripts legados não permitem escrita sem sessão válida.

### P0 — Backend publicado e Enforcement 6.3B não auditados ao vivo

Especificação histórica 6.3B: chave em Script Properties; para rotas mapeadas, sem token/expirado/sem permissão bloqueia. Rotas **não mapeadas** originalmente seguiam `unmapped_fail_closed=false` (fail-open + log). Não há evidência nesta auditoria de quais rotinas, hooks doPost/doGet, mapa 6.3A, exceções e Script Properties estão efetivamente implantados.

**Próxima ação:** inspecionar o projeto GAS **atualmente publicado** (fonte e ID de implantação), produzir mapa real das actions e resultados Shadow, separar QR público e integrações legítimas, executar testes negativos com contas de teste. Não ligar 6.3B ainda.

### P0 — Contrato de conta ativa e revogação de sessões (confirmado como divergência no patch; implantação real a validar)

`backend-patches/auth62_performance_v1.gs` lê `USUARIOS.STATUS === ATIVO` e guarda usuário/sessão em cache de até 60s. Já `backend-patches/equipe_tecnicos_v1.gs` atualiza `USUARIOS.ATIVO = SIM/NAO` ao ativar/desativar acesso e **não** invalida explicitamente caches/sessões. Troca de senha também não encerra explicitamente sessões anteriores.

**Próxima ação:** conferir cabeçalhos e semântica reais de `USUARIOS`, `SESSOES` e o GAS publicado; definir invalidação por usuário e por sessão; testar com conta sintética em dois navegadores; manter rollback. Não modificar contas operacionais.

### P1 — Tokens em URLs internas de GET (confirmado no código Vercel)

`api/_shared/gas-client.ts` encaminha o `token` de sessão via query string em `GET_ACTIONS` (Equipe, KPI, Minhas OS etc.). Essas URLs são geradas no **servidor**, não no navegador, mas podem aparecer em logs/telemetria/infra de destino. `auth_me` já usa POST e evita isso.

**Próxima ação:** preferir transporte de tokens no corpo POST para demais actions, somente após verificar que doPost do GAS aceita cada uma; não fazer migração genérica que interrompa leituras existentes. Evitar logar URLs completas com token.

### P1 — Ambiente de produção exige smoke test de autenticação e rollback

Vercel indica SSO Protection no projeto (`ssoProtection.enabled=true`). Confirmar domínios e experiência de acesso planejada antes de promover. O Preview homologado não foi promovido. Produção antiga continua separada.

**Próxima ação:** validar os targets Vercel, ambiente e proteção de deployment; guardar ID e URL do deployment atual para reverter com `vercel rollback` caso a liberação seja aprovada futuramente.

## Passo a passo recomendado para resolução

1. **Inventário de rotas**: separar consultas e gravações diretas (OS, Obras, Serviços Externos, Lubrificação) das interfaces públicas de QR. Definir ação/permite por AUTH62.
2. **Backend e sessões**: abrir o Apps Script publicado, conferir `ATIVO`/`STATUS`, hooks 6.3A/6.3B e invalidadores. Preparar mudanças/rollback do GAS, **sem implantar ainda**.
3. **Migração em feature branch**: mover fluxos protegidos legados para API autenticada ou autorização server-side equivalente. Testes automatizados e novo Preview, pois haverá mudança de contrato.
4. **Configuração Vercel Production**: adicionar `SESSION_COOKIE_SECRET` e `GAS_WEBAPP_URL` no target correto (sem exibir valores), confirmar login sob ambiente de staging de produção.
5. **Negativos + carga controlada**: verificar GET/POST sem token, token inválido/expirado/revogado, PERFIS_ACESSO divergentes, usuário inativo, troca de senha, bypass direto no GAS, QR público e integrações. Medir latência sem executar mutações reais.
6. **Go/No-Go**: só após os gates verdes e autorização expressa, preparar um build de Production sem atribuição de domínio (`vercel deploy --prod --skip-domain`), homologá-lo, e depois promover o mesmo build. Não promover Preview como se fosse o mesmo artefato de Production. Preservar backup do deploy atual.
7. **Pós-lançamento**: smoke tests de login, F5, logout, OS e permissões; monitorar erros e executar rollback se houver perda de acesso ou gravação.

## O que foi realizado nesta auditoria

- Leitura estática de `api/proxy.ts`, `api/auth/*.ts`, `api/_shared/gas-client.ts`, `backend-patches/*.gs` relevantes e clientes legados.
- Verificação por Vercel da **identidade exata do Preview** e existência de deployment de Production anterior para rollback.
- Conferência somente de **nomes/targets** das variáveis de ambiente, sem consultar seus valores.
- Nenhum deploy, mutação de contas, ativação de Enforcement, acesso a planilhas privadas ou alteração do GAS.

**Decisão:** KRON 1.0 continua homologado visualmente, porém **NÃO AUTORIZADO PARA PRODUÇÃO** por dependências de segurança e configuração. Ajustes técnicos exigirão nova homologação do candidato.
