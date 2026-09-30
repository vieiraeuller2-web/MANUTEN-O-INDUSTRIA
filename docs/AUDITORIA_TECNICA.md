# AUDITORIA TÉCNICA — CONTROLE DE MANUTENÇÃO INDUSTRIAL

**Data:** 30/09/2026  
**Responsável:** Engenheiro de Software Principal  
**Versão:** 1.0  
**Status:** Concluída

---

## 1. RELATÓRIO DO CODEX

> **Resultado:** O relatório de auditoria do Codex **NÃO foi encontrado** no repositório.
>
> Pesquisa realizada em todos os arquivos `.md`, `.txt`, `.log` e `.json` fora de `node_modules`.
> Nenhum arquivo com referência a "AUDITORIA", "codex", "RELATORIO" ou "REPORT" foi localizado.
>
> Esta auditoria foi realizada de forma independente, diretamente sobre o código-fonte.

---

## 2. ARQUITETURA ATUAL

### 2.1. Stack Tecnológica

| Camada       | Tecnologia                                  | Versão        |
|--------------|---------------------------------------------|---------------|
| Framework    | React                                       | ^18.3.1       |
| Linguagem    | TypeScript                                  | ^5.8.3        |
| Bundler      | Vite (SWC plugin)                           | ^5.4.19       |
| CSS          | Tailwind CSS + tailwindcss-animate          | ^3.4.17       |
| Componentes  | Radix UI + shadcn/ui                        | Vários        |
| Roteamento   | React Router DOM                            | ^6.30.1       |
| Estado/Cache | TanStack React Query                        | ^5.83.0       |
| Gráficos     | Recharts                                    | ^2.15.4       |
| PDF          | jsPDF + jspdf-autotable                     | ^4.2.1        |
| Formulários  | React Hook Form + Zod                       | ^7.61.1       |
| Auth (atual) | Supabase Auth                               | ^2.99.3       |
| Deploy       | Vercel                                      | Configurado   |
| Testes       | Vitest + Playwright + Testing Library       | Configurados  |

**Observação:** Todas as tecnologias pretendidas (React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Vercel) **já estão presentes** no repositório. Não será necessário recriar configurações base.

### 2.2. Estrutura de Pastas

```
INDUSTRIA/
├── src/
│   ├── App.tsx                    # Rotas e layout principal
│   ├── main.tsx                   # Ponto de entrada
│   ├── index.css                  # Design system (tokens CSS)
│   ├── App.css                    # Estilos auxiliares
│   ├── components/
│   │   ├── BottomNav.tsx          # Navegação inferior (mobile-first)
│   │   ├── RequireAuth.tsx        # Guard de autenticação (Supabase)
│   │   ├── PageHeader.tsx         # Cabeçalho de página
│   │   ├── RefreshButton.tsx      # Botão de atualização manual
│   │   ├── ThemeToggle.tsx        # Alternância claro/escuro
│   │   ├── NavLink.tsx            # Link de navegação
│   │   ├── preventivas/          # 11 componentes do módulo preventivas
│   │   ├── qr-os/
│   │   │   └── QrOsFlow.tsx      # Fluxo completo OS via QR Code
│   │   └── ui/                   # 49 componentes shadcn/ui
│   ├── hooks/
│   │   ├── use-sheet-os.ts       # Hook centralizado de OS (React Query)
│   │   ├── use-debounce.ts       # Debounce genérico
│   │   ├── use-mobile.tsx        # Detecção de mobile
│   │   └── use-toast.ts          # Sistema de notificações
│   ├── lib/
│   │   ├── sheets-api.ts         # API principal de OS (GET via Supabase proxy, POST direto)
│   │   ├── sheets-external.ts    # API genérica para abas (GET/POST direto ao Apps Script)
│   │   ├── obras-api.ts          # API de obras
│   │   ├── data-helpers.ts       # Normalização, paginação, busca textual
│   │   ├── time-helpers.ts       # Datas, horas, cálculos de tempo
│   │   ├── ia-package.ts         # Gerador de pacote para IA externa
│   │   ├── pdf-report.ts         # Geração de relatórios PDF
│   │   ├── export-csv.ts         # Exportação CSV
│   │   ├── supabase-helpers.ts   # Helpers Supabase
│   │   └── utils.ts              # Utilitário cn()
│   ├── services/
│   │   ├── preventivasApi.ts     # API completa de preventivas
│   │   ├── qrPublicoApi.ts      # API pública QR Code + fluxo OS técnico
│   │   └── qrOsSession.ts       # Gerenciamento de sessão QR
│   ├── integrations/supabase/
│   │   ├── client.ts             # Cliente Supabase
│   │   └── types.ts              # Tipos gerados
│   ├── pages/                    # 16 páginas
│   ├── types/
│   │   └── preventivas.ts        # Tipos TypeScript de preventivas
│   └── test/                     # Testes
├── dist/                         # Build de produção existente
├── public/                       # Assets estáticos
├── vercel.json                   # Configuração Vercel (rewrites SPA)
└── package.json                  # Dependências
```

### 2.3. Mapa de Rotas do Frontend

| Rota                    | Componente           | Módulo              |
|-------------------------|----------------------|---------------------|
| `/`                     | Lubrificacao         | Lubrificação        |
| `/lubrificacao`         | Lubrificacao         | Lubrificação        |
| `/os/nova`              | NovaOS               | Lançamento de OS    |
| `/os`                   | ListaOS              | Histórico de OS     |
| `/os/:id`               | DetalhesOS           | Detalhes da OS      |
| `/os/:id/editar`        | EditarOS             | Edição de OS        |
| `/preventivas`          | Estoque              | Estoque (!)         |
| `/nf`                   | NotasFiscais         | Notas Fiscais       |
| `/lancamentos`          | ServicosExternos     | Serviços Externos   |
| `/servicos-externos`    | ServicosExternos     | Serviços Externos   |
| `/obras`                | Obras                | Obras               |
| `/planos-manutencao`    | PlanosManutencao     | Planos Manutenção   |
| `/relatorios`           | Relatorios           | Dashboard/Relatórios|
| `/equipamento/:codigo`  | EquipamentoPublico   | QR Code público     |
| `*`                     | NotFound             | 404                 |

**Anomalia detectada:** A rota `/preventivas` aponta para `Estoque`, não para o módulo de preventivas real. Os componentes de preventivas em `components/preventivas/` são usados dentro de `PlanosManutencao`.

---

## 3. INTEGRAÇÕES COM O BACKEND

### 3.1. Endpoints do Google Apps Script

**URL única do backend:**
```
https://script.google.com/macros/s/AKfycbz.../exec
```

Todas as chamadas usam o mesmo endpoint, diferenciadas pelo parâmetro `action` (POST) ou `sheet` (GET).

### 3.2. Fluxos de Comunicação

```
┌───────────┐     GET      ┌──────────────────────┐     GET      ┌────────────────┐
│  Frontend │─────────────→│  Supabase Edge Fn    │─────────────→│  Apps Script   │
│  (Vite)   │  (authHeaders│  sheets-proxy        │              │  (Planilha)    │
│           │   via anon)  │                      │              │                │
└───────────┘              └──────────────────────┘              └────────────────┘
      │                                                                │
      │         POST (direto, sem proxy)                               │
      └────────────────────────────────────────────────────────────────┘
```

**Evidência crítica (sheets-api.ts, linha 460-466):**
- **GET** de OS: passa pelo proxy Supabase (`sheets-proxy` edge function)
- **POST** de OS (registrar): vai **direto** ao Apps Script, sem autenticação
- **POST** QR, preventivas, obras: vão **direto** ao Apps Script

### 3.3. Sistema de Autenticação

**Estado atual:** A autenticação usa **Supabase Auth** (email/senha).

| Componente        | Arquivo                    | Função                                   |
|-------------------|----------------------------|------------------------------------------|
| Login             | `pages/Auth.tsx`           | Login/signup via Supabase                |
| Guard             | `components/RequireAuth.tsx`| Redireciona para `/auth` se sem sessão   |

**PROBLEMA CRÍTICO:** O `RequireAuth` existe mas **NÃO é utilizado** em nenhuma rota no `App.tsx`. Todas as rotas estão acessíveis sem autenticação, exceto a rota pública `/equipamento/:codigo` que é intencionalmente aberta.

**PROBLEMA:** A autenticação atual é do Supabase, **não é** a autenticação real do backend (Apps Script com `auth_login`, `auth_me`, `auth_logout`). O sistema de perfis (ADM, PCM, GESTAO, TECNICO) **não está implementado** no frontend.

---

## 4. ANÁLISE DE DESEMPENHO

### 4.1. Fluxo Atual do Histórico de OS

**Cenário 1: PCM abre a tela de histórico (`/os`)**
1. `ListaOS` monta e chama `useSheetOS()` → `fetchOSFromSheet()`
2. `fetchOSFromSheet()` faz GET ao proxy Supabase
3. O proxy reencaminha ao Apps Script
4. **O Apps Script devolve TODAS as OS da planilha** (sem paginação)
5. O frontend recebe, parseia e normaliza TODOS os registros
6. Filtra e pagina localmente (50 por página visual)
7. Renderiza a página

**Impacto:** Com milhares de registros, a primeira carga pode levar 5-15+ segundos.

**Cenário 2: PCM registra uma OS e volta ao histórico**
1. O `useSaveSheetOS()` chama `createOSInSheet()` (POST direto)
2. **Após sucesso, invalida o cache inteiro:** `queryClient.invalidateQueries({ queryKey: ["sheet-os"] })`
3. Isso força uma **nova requisição completa** de todas as OS
4. O usuário espera novamente 5-15+ segundos
5. Os filtros são mantidos no estado React, mas os dados subjacentes são recarregados totalmente

**Cenário 3: PCM navega entre módulos e volta**
1. O cache do React Query tem `staleTime: 5 * 60_000` (5 min)
2. `refetchOnMount: false` e `refetchOnWindowFocus: false` estão configurados
3. **Dentro de 5 minutos, o cache é reutilizado** ✅
4. **Após 5 minutos, os dados são considerados stale** e serão re-fetched na próxima montagem
5. `gcTime: 15 * 60_000` (15 min) mantém os dados em cache mesmo desmontados

### 4.2. Problemas de Desempenho Identificados

| # | Problema | Severidade | Arquivo |
|---|----------|-----------|---------|
| P1 | **Sem paginação real no backend** — todo o banco é carregado a cada consulta | CRÍTICA | `sheets-api.ts` L304 |
| P2 | **Invalidação total do cache após criar OS** — recarrega TUDO | ALTA | `use-sheet-os.ts` L36 |
| P3 | **Normalização pesada em cada render** — `listaSegura.map(normalizeOS)` é executado para TODOS os registros | MÉDIA | `ListaOS.tsx` L136 |
| P4 | **Dropdown do NovaOS depende do histórico** — precisa carregar todas as OS para popular opções de equipamento, setor, etc. | MÉDIA | `NovaOS.tsx` L340-358 |
| P5 | **Relatórios.tsx com 43KB** — componente monolítico sem code-splitting interno | BAIXA | `Relatorios.tsx` |
| P6 | **Obras.tsx com 51KB** — componente monolítico muito grande | BAIXA | `Obras.tsx` |

### 4.3. O que Funciona Bem

| Evidência | Arquivo | Detalhes |
|-----------|---------|----------|
| Cache compartilhado entre telas | `use-sheet-os.ts` L12-21 | `queryKey: ["sheet-os"]` é reutilizado em ListaOS e NovaOS |
| Dedup automático | React Query | Mesma key em múltiplos componentes = 1 requisição |
| Lazy loading de páginas | `App.tsx` L10-22 | Todas as páginas usam `lazy()` |
| Debounce nos filtros | `ListaOS.tsx` L125-129 | 350ms de debounce |
| Paginação visual funcional | `ListaOS.tsx` L166 | 50/100/200 registros por página |
| Error boundary | `App.tsx` L37-67 | Captura erros de renderização |
| Normalização de dados robusta | `sheets-api.ts` | Aceita múltiplos formatos da planilha |

---

## 5. ANÁLISE DE SEGURANÇA

| # | Problema | Severidade | Evidência |
|---|----------|-----------|-----------|
| S1 | **RequireAuth não aplicado** — rotas abertas | CRÍTICA | `App.tsx`: nenhuma rota usa `RequireAuth` |
| S2 | **POST direto ao Apps Script** sem autenticação | ALTA | `sheets-api.ts` L460 |
| S3 | **Token Supabase no frontend** — ANON_KEY exposta | MEDIA | Esperado para Supabase, mas inadequado como proxy |
| S4 | **Token OIDC da Vercel em .env.local** — não commitado (.gitignore funciona) | BAIXA | `.env.local` |
| S5 | **Sem controle de perfil** — todos os menus visíveis para todos | ALTA | `BottomNav.tsx` L4-14 |
| S6 | **Autenticação Supabase ≠ Autenticação do backend** — sistemas independentes | ALTA | `Auth.tsx` vs endpoints reais |

---

## 6. COMPONENTES E CÓDIGO

### 6.1. Componentes Reutilizáveis Existentes

- **49 componentes shadcn/ui** — base sólida e padronizada ✅
- **PageHeader** — cabeçalho de página reutilizável ✅
- **RefreshButton** — botão de atualização com estado ✅
- **BottomNav** — navegação inferior ✅
- **ThemeToggle** — alternância de tema ✅
- **11 componentes de preventivas** — módulo modularizado ✅

### 6.2. Código Potencialmente Obsoleto

| Arquivo | Observação |
|---------|------------|
| `supabase/` (raiz) | Diretório Supabase fora do src — verificar se é usado |
| `lib/supabase-helpers.ts` | Pode estar subutilizado |
| `pages/Estoque.tsx` | Está mapeado na rota `/preventivas` — nome confuso |
| `components.json` | Config do shadcn/ui — manter |
| `vite-*.log` | Logs de builds anteriores — podem ser removidos |
| `playwright-fixture.ts` | Fixture de 49 bytes — verificar utilidade |

### 6.3. Configuração da Vercel

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Análise:** Configuração mínima de SPA. **Não possui API intermediária** (serverless functions). A ETAPA 04 exigirá criar funções em `api/` para intermediar a comunicação com o Apps Script.

---

## 7. DIAGNÓSTICO DO FLUXO PCM

### 7.1. PCM abre a tela de lançamento (`/os/nova`)

1. **NovaOS** monta → chama `useSheetOS()` para popular dropdowns
2. Se o cache está vazio: dispara GET completo de todas as OS
3. Extrai `equipamentos`, `setores`, `areas`, `responsaveis`, `tipos` via `uniqueSorted()`
4. Renderiza formulário com campos `SearchableLockedSelectField`
5. **Problema:** se o cache está frio, o formulário fica sem opções até o carregamento completo

### 7.2. PCM consulta o histórico (`/os`)

1. **ListaOS** monta → reutiliza cache de `useSheetOS()` se disponível
2. Se não: dispara GET completo
3. Normaliza TODOS os registros no `useMemo`
4. Aplica filtros e paginação visual
5. **Resultado:** lento na primeira vez, rápido nas próximas (5 min)

### 7.3. PCM registra uma nova OS

1. Submete formulário → `createOSInSheet()` POST direto ao Apps Script
2. Backend confirma sucesso com `{ success: true, ... }`
3. Frontend exibe toast "Registro de OS salvo com sucesso"
4. `onSuccess` → `queryClient.invalidateQueries({ queryKey: ["sheet-os"] })`
5. **Cache inteiro invalidado** → próxima montagem do histórico faz GET completo novamente
6. Formulário é limpo → pronto para próxima OS

### 7.4. PCM retorna ao histórico

1. Navega para `/os`
2. Cache invalidado → **GET completo novamente**
3. Espera 5-15+ segundos
4. Filtros preservados no estado local (se a página não foi desmontada)

### 7.5. PCM navega entre módulos

1. Cada módulo tem suas próprias queries
2. Lubrificação, Obras, etc. fazem suas próprias requisições ao Apps Script
3. **Sem interferência** entre cache de OS e cache de outros módulos ✅

---

## 8. ALTERAÇÕES NECESSÁRIAS NO BACKEND

### 8.1. Paginação Real (Requer autorização)

O backend **NÃO oferece paginação verdadeira** no GET de OS. Todo o conteúdo da planilha é devolvido em uma única resposta.

**Proposta:** Adicionar uma action `listar_os_paginado` no Apps Script que aceite parâmetros `page`, `limit` e opcionalmente `filtros`.

> **Esta alteração será detalhada na ETAPA 02 e apresentada para autorização.**

---

## 9. PRIORIDADES DE IMPLEMENTAÇÃO (FRONTEND)

As seguintes melhorias podem ser feitas **sem alterar o backend:**

| # | Ação | Impacto | Risco |
|---|------|---------|-------|
| 1 | **Atualização otimista do cache após criar OS** — inserir a nova OS no cache existente em vez de invalidar tudo | ALTO | BAIXO |
| 2 | **Separar query de opções de formulário** — cache independente para equipamentos/setores/tipos | MÉDIO | BAIXO |
| 3 | **staleTime ajustado** — aumentar para dados de referência | MÉDIO | NENHUM |
| 4 | **Integrar autenticação real** (auth_login/auth_me/auth_logout) | ALTO | MÉDIO |
| 5 | **Implementar controle de perfil** no frontend | ALTO | MÉDIO |
| 6 | **Criar API intermediária na Vercel** para proteger tokens | ALTO | MÉDIO |

---

## 10. ARQUIVOS ENVOLVIDOS POR ETAPA

### ETAPA 02 — Otimização de Performance
- `src/hooks/use-sheet-os.ts` — Atualização otimista do cache
- `src/lib/sheets-api.ts` — Ajustes na comunicação
- `src/pages/ListaOS.tsx` — Melhoria na renderização
- `src/pages/NovaOS.tsx` — Formulário independente de carregamento completo

### ETAPA 03 — Arquitetura e Visual
- `src/App.tsx` — Nova estrutura de rotas e layouts
- `src/index.css` — Design system aprimorado
- `src/components/` — Novos componentes de layout
- `src/pages/Auth.tsx` — Novo design de login

### ETAPA 04 — Autenticação
- `src/integrations/` — Nova integração com Apps Script auth
- `src/components/RequireAuth.tsx` — Migrar para auth real
- `api/` (novo) — Serverless functions Vercel

### ETAPA 05 — Controle de Acesso
- `src/App.tsx` — Rotas condicionais por perfil
- `src/components/BottomNav.tsx` — Menu por perfil

---

## 11. CONCLUSÃO

O sistema tem uma **base sólida** com tecnologias modernas e bem integradas. Os principais problemas são:

1. **Desempenho:** ausência de paginação real e invalidação agressiva do cache após registro de OS.
2. **Segurança:** autenticação Supabase não integrada ao backend real; rotas desprotegidas.
3. **UX:** sem controle de perfil; interface única para todos os usuários.

A correção de desempenho mais impactante e segura (atualização otimista do cache) pode ser feita **imediatamente, sem alterar o backend**.
