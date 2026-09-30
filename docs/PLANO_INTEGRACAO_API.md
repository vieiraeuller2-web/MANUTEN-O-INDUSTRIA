# PLANO DE INTEGRAÇÃO — API INTERMEDIÁRIA E AUTENTICAÇÃO

**Data:** 30/09/2026  
**Responsável:** Engenheiro de Software Principal  
**Versão:** 1.0  
**Status:** Aguardando aprovação

---

## PARTE A — VERIFICAÇÃO DA IMPLEMENTAÇÃO OTIMISTA

### A.1. Identificador oficial retornado pelo backend

**Situação:** O `createOSInSheet()` retorna `{ ...data, payloadEnviado: payload }` onde `data` é o JSON do Apps Script. O código atual no `use-sheet-os.ts` tenta extrair `result.id_os` e `result.numero_os` (linhas 80-81).

**Problema identificado:** Não há garantia de que o Apps Script retorne `id_os` ou `numero_os` na resposta. O código atual faz um fallback silencioso para string vazia, o que significa que a OS otimista pode aparecer no cache **sem identificador**.

**Evidência:** A função `createOSInSheet` (sheets-api.ts L430-494) parseia a resposta e verifica `data.success === true` e `getConfirmedHorimeter(data)`, mas não extrai nem valida nenhum campo de ID da resposta. O retorno é o objeto bruto espalhado.

**Ação necessária:** A correção correta depende de saber exatamente o que o backend devolve. Duas opções:

1. **Se o backend já retorna `id_os`:** O código funciona, mas precisa de validação explícita.
2. **Se o backend NÃO retorna `id_os`:** A OS otimista ficará sem número até a revalidação (30s). Isso não causa erro, mas o registro aparece como "Registro #N" na lista em vez de com o número oficial.

**Risco:** Nenhum dado é perdido — a OS está salva no backend. A revalidação em 30s corrige o identificador. Mas sem testes reais contra o backend, não posso afirmar que o campo existe na resposta.

### A.2. Cache versus filtros, paginação, usuário e unidade

**Situação atual:**

| Aspecto | Status | Análise |
|---------|--------|---------|
| **Filtros** | ✅ Correto | Filtros são aplicados no `ListaOS.tsx` em `useMemo` sobre os dados cacheados. O cache armazena a lista completa; filtros são estado local. A inserção otimista no cache não interfere nos filtros. |
| **Paginação** | ⚠️ Apenas visual | A paginação é 100% client-side (`paginateData` em data-helpers.ts). O cache contém TODOS os registros. A inserção otimista adiciona ao início, e a paginação recalcula automaticamente. |
| **Usuário** | ⚠️ Não separado | A query key é `["sheet-os"]` — fixa, sem parâmetro de usuário. Se dois usuários usarem o mesmo navegador (trocar de conta), verão o mesmo cache. Na prática, isso é mitigado pelo `gcTime` de 15min e pela revalidação. |
| **Unidade** | ⚠️ Não separado | O backend retorna OS de todas as unidades. Não há parâmetro de `unidade` na query key. O frontend não filtra por unidade. |

**Conclusão:** O cache é global — não diferencia por usuário nem por unidade. Isso é aceitável **enquanto o sistema não possui autenticação real**. Quando a autenticação for implementada, a query key precisará incluir o identificador do usuário/sessão para isolar os dados:

```typescript
// Futuro (após autenticação):
export const OS_QUERY_KEY = (userId: string) => ["sheet-os", userId] as const;
```

### A.3. Sincronização de 30 segundos

**Problema identificado:** A cada OS registrada, um `setTimeout` de 30s dispara `invalidateQueries`, que força um GET completo de todas as OS. Se o usuário registrar 5 OS em 2 minutos, haverá 5 timeouts pendentes, resultando em 5 consultas completas em sequência.

**O que acontece:**
1. OS1 registrada → timeout 1 agendado (t=0s)
2. OS2 registrada → timeout 2 agendado (t=10s)
3. Timeout 1 dispara (t=30s) → GET completo
4. Timeout 2 dispara (t=40s) → GET completo (redundante)

**Ação necessária:** Substituir os `setTimeout` individuais por uma abordagem de debounce — agendar apenas UMA revalidação, cancelando as anteriores.

### A.4. Risco de OS duplicadas ou perda de atualizações

**Cenário de duplicação:**

| Cenário | Risco | Análise |
|---------|-------|---------|
| Inserção otimista + revalidação | BAIXO | A revalidação substitui TODO o cache pelo resultado do GET. Se a OS estiver na planilha, aparece normalmente. Se o `id_os` otimista for diferente do real, pode haver duplicação momentânea entre t=0 e t=30s. |
| Dois usuários registrando simultaneamente | NENHUM (cache local) | Cada navegador tem seu próprio cache. Não há cache compartilhado entre browsers. |
| `client_submission_id` | O backend usa este campo para deduplicação server-side (se implementado). Não há duplicação real na planilha. |

**Cenário de perda de atualizações:**

| Cenário | Risco | Análise |
|---------|-------|---------|
| Outro usuário registra OS | NÃO VISÍVEL ATÉ REVALIDAÇÃO | O cache local só mostra o que foi carregado + a OS otimista. OS de outros usuários só aparecem após refetch (botão "Atualizar dados" ou revalidação dos 30s). |
| Edição de OS existente por outro sistema | MESMA SITUAÇÃO | O cache não recebe push updates. Apenas o botão "Atualizar dados" ou a revalidação trazem novidades. |

**Conclusão:** Não há risco de duplicação real na planilha. O risco é visual: a OS otimista pode aparecer com dados ligeiramente diferentes dos confirmados pelo backend até a revalidação. Sem `id_os` confirmado, a mesma OS pode aparecer duas vezes momentaneamente no cache (uma otimista sem ID e uma real com ID).

### A.5. Persistência do cache entre telas

**Verificação:** ✅ Funciona corretamente.

**Evidência:**
- `useSheetOS()` usa `refetchOnMount: false` — não refaz a consulta ao montar o componente
- `staleTime: 5min` — dados são considerados frescos por 5 minutos
- `gcTime: 15min` — cache mantido em memória mesmo sem observadores ativos
- React Query armazena no `QueryClient` que é instanciado uma vez no `App.tsx`
- Consumidores: `ListaOS`, `NovaOS`, `Relatorios`, `Dashboard` — todos compartilham o mesmo cache

**Fluxo confirmado:**
1. Usuário abre `/os` → GET carrega cache
2. Navega para `/os/nova` → `useSheetOS()` reutiliza cache (sem nova requisição)
3. Registra OS → cache atualizado otimistamente
4. Volta para `/os` → `useSheetOS()` reutiliza cache (com a nova OS já presente)

---

## PARTE B — PROPOSTA DE PAGINAÇÃO NO BACKEND

### B.1. Endpoint Proposto

```
GET https://script.google.com/macros/s/.../exec
    ?action=listar_os_paginado
    &page=1
    &limit=50
```

### B.2. Parâmetros

| Parâmetro | Tipo | Obrigatório | Default | Validação |
|-----------|------|-------------|---------|-----------|
| `action` | string | sim | — | Deve ser `"listar_os_paginado"` |
| `page` | integer | não | `1` | `min(1)` |
| `limit` | integer | não | `50` | `min(10), max(200)` |
| `filtro_setor` | string | não | — | Match exato (case-insensitive) |
| `filtro_area` | string | não | — | Match exato (case-insensitive) |
| `filtro_tipo` | string | não | — | Match exato (case-insensitive) |
| `filtro_responsavel` | string | não | — | Match exato (case-insensitive) |
| `data_de` | string | não | — | Formato `YYYY-MM-DD` |
| `data_ate` | string | não | — | Formato `YYYY-MM-DD` |
| `busca` | string | não | — | Busca textual em número, equipamento, observações |
| `ordenar_por` | string | não | `"data_inicio"` | Coluna válida da planilha |
| `ordem` | string | não | `"desc"` | `"asc"` ou `"desc"` |
| `token` | string | sim* | — | *Quando autenticação estiver ativa |

### B.3. Estrutura da Resposta

```json
{
  "success": true,
  "action": "listar_os_paginado",
  "page": 1,
  "limit": 50,
  "total": 2847,
  "total_pages": 57,
  "has_next": true,
  "has_prev": false,
  "data": [
    {
      "id_os": "OS-20260930-141500-A1B2C3D4",
      "numero_os": "OS-20260930-141500-A1B2C3D4",
      "equipamento": "MTF001",
      "setor": "SERRARIA",
      "area": "LUBRIFICAÇÃO",
      "responsavel": "GABRIEL",
      "tipo": "CORRETIVA",
      "data_inicio": "2026-09-30",
      "hora_inicio": "07:30",
      "data_conclusao": "2026-09-30",
      "hora_conclusao": "09:45",
      "horimetro": 6520,
      "observacoes": "Troca de correia do motor principal"
    }
  ],
  "filtros_aplicados": {
    "setor": null,
    "area": null,
    "tipo": null,
    "responsavel": null,
    "data_de": null,
    "data_ate": null,
    "busca": null
  }
}
```

### B.4. Estratégia de Paginação

**Tipo:** Offset-based (page/limit).

**Justificativa:** A planilha do Google Sheets não suporta cursores. O método mais natural é ler a faixa de linhas correspondente ao offset calculado. Com `getRange(offset, 1, limit, lastCol)` o Apps Script pode retornar apenas as linhas necessárias sem serializar toda a planilha.

**Ordenação:** A planilha armazena os registros em ordem cronológica de inserção. Para ordenar por `data_inicio` descendente, o backend precisa:
1. Ler todas as datas de início (apenas a coluna de data_inicio)
2. Construir um índice ordenado
3. Retornar apenas as linhas da página solicitada

**Alternativa simplificada:** Se a planilha já está ordenada cronologicamente (mais recentes no final), basta ler as últimas N linhas:
```javascript
// Página 1 = linhas (lastRow - 49) até lastRow
// Página 2 = linhas (lastRow - 99) até (lastRow - 50)
const inicio = Math.max(2, lastRow - (page * limit) + 1);
const fim = Math.min(lastRow, inicio + limit - 1);
```

### B.5. Filtros

Os filtros devem ser aplicados **no backend** antes da paginação:

```javascript
function listar_os_paginado(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('BD');
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  // Cabeçalhos na linha 1
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Índices das colunas relevantes
  const colIndex = {};
  headers.forEach((h, i) => colIndex[normalizeKey(h)] = i);
  
  // Todas as linhas de dados (necessário para filtros server-side)
  const allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  // Aplicar filtros
  let filtered = allData;
  if (params.filtro_setor) {
    filtered = filtered.filter(row => 
      String(row[colIndex.setor] || '').toUpperCase() === params.filtro_setor.toUpperCase()
    );
  }
  // ... demais filtros ...
  
  // Ordenar
  filtered.sort((a, b) => {
    // Por data_inicio descendente (default)
    return compareDates(b[colIndex.data_inicio], a[colIndex.data_inicio]);
  });
  
  // Paginar
  const total = filtered.length;
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(200, Math.max(10, parseInt(params.limit) || 50));
  const offset = (page - 1) * limit;
  const pageData = filtered.slice(offset, offset + limit);
  
  // Converter para objetos
  const data = pageData.map(row => rowToObject(row, headers));
  
  return {
    success: true,
    action: 'listar_os_paginado',
    page, limit, total,
    total_pages: Math.ceil(total / limit),
    has_next: offset + limit < total,
    has_prev: page > 1,
    data,
    filtros_aplicados: { ... }
  };
}
```

> **Nota:** Esta abordagem ainda lê todas as linhas na memória do Apps Script para filtrar. Isso é inevitável com o Google Sheets — não existe `WHERE` nativo. Porém, a resposta ao frontend será dramaticamente menor (50 registros vs. milhares).

### B.6. Proteção por Sessão

Quando a autenticação estiver ativa:

1. O frontend enviará o token de sessão via cookie HttpOnly
2. A API intermediária (Vercel) extrairá o token e o anexará à requisição ao Apps Script
3. O Apps Script validará o token via `auth_me` antes de retornar os dados
4. Sem token válido: `{ success: false, message: "Sessão inválida" }`

Enquanto o Enforcement estiver OFF, a proteção por sessão será apenas no frontend e na API intermediária.

### B.7. Compatibilidade com o Histórico Existente

| Funcionalidade | Impacto | Estratégia |
|----------------|---------|------------|
| GET completo (sem paginação) | Mantido | O endpoint `sheet=BD` via sheets-proxy continua funcionando. A nova action é adicional. |
| Filtros do ListaOS | Adaptação necessária | Os filtros passarão a ser enviados ao backend (server-side) em vez de aplicados localmente. |
| Cache do React Query | Adaptação necessária | A query key incluirá os parâmetros de paginação: `["sheet-os", { page, limit, filtros }]` |
| Dropdowns do NovaOS | Independente | Opções de equipamento/setor/tipo serão carregadas via endpoint separado (ver B.9). |
| Dashboard/Relatórios | Mantido inicialmente | Continuarão usando o GET completo até que endpoints específicos sejam criados para KPIs. |

### B.8. Impacto sobre o Motor de OS e KPIs

**O motor de KPIs do backend NÃO será afetado.** A paginação é uma nova action que apenas LÊ dados. Não modifica:
- A lógica de cálculo de MTTR/MTBF
- O cálculo de HH por colaborador
- O motor de custos
- A deduplicação de paradas
- Nenhuma fórmula ou script existente

**Os KPIs no frontend (Relatórios.tsx)** atualmente usam o GET completo e calculam localmente. Isso continuará funcionando. No futuro, é recomendável que os KPIs venham pré-calculados do backend.

### B.9. Endpoint Adicional: Opções de Formulário

Para liberar o NovaOS da dependência do carregamento completo:

```
GET ?action=opcoes_formulario_os
```

Resposta:
```json
{
  "success": true,
  "equipamentos": ["CTD001", "MTF001", ...],
  "setores": ["SERRARIA", "MARMORARIA", ...],
  "areas": ["LUBRIFICAÇÃO", "MAN. MECANICA", ...],
  "responsaveis": ["GABRIEL", "IVAN", ...],
  "tipos": ["CORRETIVA", "COR. PRO.", "PREVENTIVA", ...]
}
```

Cache: `staleTime: 30min` (opções mudam raramente)

---

## PARTE C — ARQUITETURA DA AUTENTICAÇÃO INTERMEDIÁRIA

### C.1. Mapeamento do Uso Atual do Supabase

O Supabase é usado em **quatro capacidades distintas**:

| Uso | Arquivos | Pode ser removido? |
|-----|----------|---------------------|
| **Autenticação** (login/sessão) | `Auth.tsx`, `RequireAuth.tsx`, `sheets-api.ts` (authHeaders) | ✅ Será substituído pela auth real |
| **Edge Function sheets-proxy** | `sheets-api.ts` (FN_URL), `supabase/functions/sheets-proxy/` | ⚠️ Precisará de substituto (API Vercel) |
| **Edge Function webhook-proxy** | `supabase/functions/webhook-proxy/` | ⚠️ Independente — proxy para n8n |
| **Banco de dados** (preventivas, NFs) | `Dashboard.tsx` (supabase.from("preventivas")), `DetalhesOS.tsx`, `EditarOS.tsx` (supabase.from("os_escaneadas")) | ❌ Dependência ativa |
| **Storage** (imagens de OS) | `supabase-helpers.ts` (supabase.storage) | ❌ Dependência ativa |

**Conclusão:** O Supabase **NÃO pode ser removido** — possui dependências ativas de banco de dados e storage. A autenticação Supabase será desativada, mas o cliente Supabase será mantido para as demais funcionalidades.

### C.2. Arquitetura Proposta

```
┌────────────┐                    ┌─────────────────────────┐
│  Frontend  │                    │    Vercel Serverless     │
│  (React)   │                    │    /api/                 │
│            │                    │                          │
│  Cookie ───┼── HttpOnly ───────►│ /api/auth/login          │
│  (sessão)  │  Secure            │ /api/auth/me             │
│            │  SameSite=Lax      │ /api/auth/logout         │
│            │                    │ /api/proxy/os            │
│            │                    │ /api/proxy/preventivas   │
│            │                    │ /api/proxy/opcoes        │
│            │                    │                          │
│            │                    │ ┌─────────────────────┐  │
│            │                    │ │  Token Apps Script   │  │
│            │                    │ │  (var. ambiente)     │  │
│            │                    │ │  NUNCA exposto ao    │  │
│            │                    │ │  navegador           │  │
│            │                    │ └─────────────────────┘  │
└────────────┘                    └──────────┬──────────────┘
                                             │
                                             │ POST/GET
                                             ▼
                                  ┌────────────────────┐
                                  │  Google Apps Script │
                                  │                    │
                                  │  auth_login         │
                                  │  auth_me            │
                                  │  auth_logout        │
                                  │  registrar_os       │
                                  │  listar_os_paginado │
                                  │  preventivas_*      │
                                  │  qr_*               │
                                  │  obras_*            │
                                  └────────────────────┘
```

### C.3. API Intermediária — Endpoints

#### Autenticação

| Endpoint | Método | Descrição | Cookie |
|----------|--------|-----------|--------|
| `/api/auth/login` | POST | Recebe `{ login, senha }`, envia `auth_login` ao Apps Script, retorna perfil e seta cookie de sessão | Set-Cookie |
| `/api/auth/me` | GET | Lê cookie, valida sessão contra `auth_me` do Apps Script | Lê cookie |
| `/api/auth/logout` | POST | Lê cookie, envia `auth_logout` ao Apps Script, limpa cookie | Limpa cookie |

#### Proxy de dados (lista explícita de actions)

| Endpoint | Método | Actions autorizadas |
|----------|--------|---------------------|
| `/api/proxy` | POST | Lista fixa de actions permitidas (whitelist) |

```typescript
// api/proxy.ts — whitelist de actions
const ALLOWED_ACTIONS = new Set([
  "registrar_os",
  "listar_os_paginado",
  "opcoes_formulario_os",
  "preventivas_resumo",
  "preventivas_setores",
  "preventivas_ativos",
  "preventivas_planos",
  "preventivas_arvore",
  "preventivas_plano_completo",
  "preventiva_gerar_pdf_execucao",
  "preventiva_gerar_pdf_ativo",
  "preventiva_gerar_pdf_setor",
  "preventiva_gerar_pdf_geral",
  "preventiva_gerar_pdf_diretoria",
  "concluir_preventiva",
  // Obras
  "obras_listar",
  "obras_criar",
  "obras_editar",
]);
```

**NÃO incluídos** (ficam fora do proxy):
- QR Code público (`qr_resumo_ativo`, `qr_detalhe_preventiva`) — acessível sem autenticação
- QR OS fluxo técnico (`qr_os_login`, `qr_os_registrar`) — possui autenticação própria
- Telegram — comunicação server-to-server

### C.4. Cookies — Especificação

```typescript
// Configuração do cookie de sessão
const SESSION_COOKIE = {
  name: "cmi_session",          // controle manutenção industrial
  httpOnly: true,                // Não acessível via JavaScript
  secure: true,                  // Apenas HTTPS
  sameSite: "lax" as const,      // Protege contra CSRF em POSTs cross-origin
  path: "/",
  maxAge: 8 * 60 * 60,          // 8 horas (jornada de trabalho)
  // domain: inferido automaticamente pelo navegador
};
```

**Conteúdo do cookie:** Token de sessão criptografado/assinado (não o token bruto do Apps Script).

```typescript
// O que o cookie armazena internamente:
interface SessionPayload {
  token: string;       // Token real do Apps Script (nunca exposto ao frontend)
  perfil: string;      // ADM | PCM | GESTAO | TECNICO
  nome: string;        // Nome do usuário
  login: string;       // Login do usuário
  unidade: string;     // Unidade do usuário
  criado_em: number;   // Timestamp de criação
}
```

### C.5. Proteção contra CSRF

- `SameSite=Lax`: bloqueia envio de cookies em requisições POST cross-origin (proteção primária)
- Para segurança adicional, o proxy verificará o header `Origin` contra a lista de origens permitidas
- Não será necessário token CSRF separado com `SameSite=Lax`

### C.6. Validação de Sessão

```typescript
// api/auth/me.ts
export default async function handler(req, res) {
  const sessionCookie = req.cookies.cmi_session;
  if (!sessionCookie) {
    return res.status(401).json({ authenticated: false });
  }

  // Decodifica e valida o cookie
  const session = decryptSession(sessionCookie);
  if (!session || isExpired(session)) {
    // Limpa cookie expirado
    res.setHeader("Set-Cookie", clearCookie());
    return res.status(401).json({ authenticated: false });
  }

  // Valida contra o backend real
  const backendResponse = await callAppsScript("auth_me", {
    token: session.token,
  });

  if (!backendResponse.success) {
    res.setHeader("Set-Cookie", clearCookie());
    return res.status(401).json({ authenticated: false });
  }

  return res.status(200).json({
    authenticated: true,
    perfil: session.perfil,
    nome: session.nome,
    login: session.login,
    unidade: session.unidade,
  });
}
```

### C.7. Fluxo de Login Completo

```
1. Usuário digita login e senha no frontend
2. Frontend envia POST /api/auth/login { login, senha }
3. API Vercel envia POST ao Apps Script { action: "auth_login", login, senha }
4. Apps Script valida credenciais e retorna:
   { success: true, token: "...", perfil: "PCM", nome: "...", ... }
5. API Vercel cria cookie HttpOnly com o token e perfil
6. API Vercel retorna ao frontend:
   { authenticated: true, perfil: "PCM", nome: "...", login: "..." }
   (SEM o token)
7. Frontend armazena perfil/nome no contexto React
8. Frontend redireciona para a tela inicial do perfil
```

### C.8. Expiração de Sessão

- Cookie expira em 8 horas (maxAge)
- O Apps Script possui sua própria expiração de token
- Se o token do Apps Script expirar antes do cookie, o `auth_me` retornará erro
- O frontend detecta 401 e redireciona para o login
- **Não existe endpoint de renovação de sessão** — quando expira, o usuário faz login novamente

### C.9. Separação de Sessões

- Cada sessão é isolada pelo cookie do navegador
- Não há cache compartilhado entre usuários diferentes
- Quando a autenticação for implementada, a query key de OS incluirá o ID do usuário:
  ```typescript
  const OS_QUERY_KEY = (userId: string) => ["sheet-os", userId] as const;
  ```
- Logout limpa: cookie + cache do React Query + estado do React

### C.10. Token Protegido no Servidor

O token real do Apps Script **nunca é enviado ao navegador**:

1. Fica apenas na memória da função serverless da Vercel
2. É armazenado criptografado no cookie HttpOnly (inacessível ao JS do frontend)
3. O frontend recebe apenas: `{ perfil, nome, login, unidade, authenticated }`
4. A variável de ambiente `APPS_SCRIPT_URL` ficará apenas no servidor Vercel

### C.11. Logout Completo

```typescript
// api/auth/logout.ts
export default async function handler(req, res) {
  const session = decryptSession(req.cookies.cmi_session);
  
  if (session?.token) {
    // Notifica o backend para invalidar o token
    await callAppsScript("auth_logout", { token: session.token }).catch(() => {});
  }

  // Limpa o cookie independente do resultado
  res.setHeader("Set-Cookie", clearCookie());
  return res.status(200).json({ success: true });
}
```

No frontend: limpar cache do React Query + redirecionar para `/login`.

### C.12. Fluxos NÃO Afetados

| Fluxo | Motivo |
|-------|--------|
| **QR Code público** (`/equipamento/:codigo`) | Rota aberta, sem autenticação. Chama diretamente o Apps Script. Sem alteração. |
| **QR OS técnico** (login/registrar via QR) | Possui autenticação própria (`qr_os_login`, token separado). Sem alteração. |
| **Telegram** | Comunicação server-to-server. Sem alteração. |
| **Enforcement 6.3B** | Permanece DESLIGADO. Sem alteração. |

---

## PARTE D — CORREÇÕES PENDENTES NO CACHE

Com base na análise das 5 questões, as seguintes correções são necessárias no `use-sheet-os.ts`:

### D.1. Debounce da revalidação

Substituir múltiplos `setTimeout` por um mecanismo que cancela o timer anterior:

```typescript
let revalidationTimer: ReturnType<typeof setTimeout> | null = null;

// Dentro do onSuccess:
if (revalidationTimer) clearTimeout(revalidationTimer);
revalidationTimer = setTimeout(() => {
  revalidationTimer = null;
  queryClient.invalidateQueries({ queryKey: OS_QUERY_KEY });
}, BACKGROUND_REVALIDATION_DELAY);
```

### D.2. Validação do identificador da OS

Extrair explicitamente campos da resposta do backend e registrar warning quando ausentes:

```typescript
const novaOS: SheetOS = {
  id_os: String(result.id_os ?? result.numero_os ?? result.registro?.id_os ?? ""),
  // ...
};

if (!novaOS.id_os) {
  console.warn("[use-sheet-os] Backend não retornou id_os. A OS aparecerá sem número até a revalidação.");
}
```

### D.3. Separação por usuário (futura)

A ser implementada após a integração da autenticação real. Não é necessária agora.

---

## PARTE E — ORDEM DE IMPLEMENTAÇÃO

Após aprovação:

| Passo | Ação | Dependência |
|-------|------|-------------|
| 1 | Aplicar correções D.1 e D.2 no cache | Nenhuma |
| 2 | Criar `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` na Vercel | Nenhuma |
| 3 | Criar `/api/proxy` com whitelist na Vercel | Passo 2 |
| 4 | Criar contexto de autenticação no React (`AuthContext`) | Passo 2 |
| 5 | Implementar tela de login (Apps Script auth) | Passos 2-4 |
| 6 | Implementar `auth_me` no carregamento inicial | Passos 2-4 |
| 7 | Implementar logout | Passos 2-4 |
| 8 | Ativar proteção de rotas (`RequireAuth` com auth real) | Passos 5-7 |
| 9 | Implementar controle de perfil (ADM/PCM/GESTAO/TECNICO) | Passo 8 |
| 10 | Testes de autenticação | Passos 5-9 |
| 11 | Retomar otimização do histórico (paginação, query key por usuário) | Passos 9-10 + aprovação backend |
