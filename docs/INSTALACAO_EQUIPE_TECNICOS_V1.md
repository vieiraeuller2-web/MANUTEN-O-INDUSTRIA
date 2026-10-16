# Instalação — Gestão Administrativa de Técnicos v1

## Objetivo

Adicionar ao Apps Script atual as actions administrativas necessárias para a futura tela **Equipe / Técnicos**, sem alterar o núcleo do AUTH62.

Patch:

`backend-patches/equipe_tecnicos_v1.gs`

## Pré-requisitos confirmados

O projeto atual já possui:

- `auth62Autorizar_`;
- `f62HashSenha_(senha, salt, pepper)`;
- `F62_PEPPER_PROPERTY`;
- `F62_SPREADSHEET_ID`;
- `F62_ABA_USUARIOS`;
- abas `USUARIOS`, `CADASTRO_COLABORADORES` e `PERFIS_ACESSO`.

A credencial nova usa o mesmo helper oficial já consumido por `auth62Login_`:

`HMAC_SHA256_PEPPER_V1`

O patch nunca grava senha em texto puro e nunca devolve hash, salt ou pepper.

## 1. Criar arquivo no Apps Script

No editor do Apps Script associado à planilha oficial:

1. Clique em **+ > Script**.
2. Nomeie o arquivo como:
   `API_Equipe_Tecnicos.gs`
3. Cole integralmente o conteúdo de:
   `backend-patches/equipe_tecnicos_v1.gs`

Não altere `AUTH_PEPPER_V1` nem copie seu valor para o código.

## 2. Roteamento GET

No `doGet(e)` atual, depois da autenticação/shadow e antes do fallback final, adicione:

```javascript
if (action === "equipe_tecnicos") {
  return ContentService
    .createTextOutput(JSON.stringify(equipe_tecnicos(params)))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Se o projeto usa `switch (action)`, o equivalente é:

```javascript
case "equipe_tecnicos":
  return ContentService
    .createTextOutput(JSON.stringify(equipe_tecnicos(params)))
    .setMimeType(ContentService.MimeType.JSON);
```

## 3. Roteamento POST

No `doPost(e)` atual, adicione:

```javascript
case "equipe_tecnico_criar":
  return ContentService
    .createTextOutput(JSON.stringify(equipe_tecnico_criar(params)))
    .setMimeType(ContentService.MimeType.JSON);

case "equipe_tecnico_status":
  return ContentService
    .createTextOutput(JSON.stringify(equipe_tecnico_status(params)))
    .setMimeType(ContentService.MimeType.JSON);

case "equipe_tecnico_redefinir_senha":
  return ContentService
    .createTextOutput(JSON.stringify(equipe_tecnico_redefinir_senha(params)))
    .setMimeType(ContentService.MimeType.JSON);
```

## 4. Shadow / mapa AUTH62

Adicionar ao mesmo mapa de rotas usado pelo Shadow:

```javascript
"equipe_tecnicos": {
  modulo: "EQUIPE_COLABORADORES",
  acao: "VISUALIZAR"
},
"equipe_tecnico_criar": {
  modulo: "EQUIPE_COLABORADORES",
  acao: "CRIAR"
},
"equipe_tecnico_status": {
  modulo: "EQUIPE_COLABORADORES",
  acao: "EDITAR"
},
"equipe_tecnico_redefinir_senha": {
  modulo: "EQUIPE_COLABORADORES",
  acao: "EXECUTAR"
}
```

Não ativar Enforcement 6.3B nesta etapa.

## 5. Regras implementadas

### Criação

`equipe_tecnico_criar`:

- exige `EQUIPE_COLABORADORES / CRIAR`;
- perfil fixo: `TECNICO`;
- unidade fixa: `TH30`;
- `ATIVO = SIM`;
- `PRIMEIRO_ACESSO = SIM`;
- `CREDENCIAL_TIPO = HMAC_SHA256_PEPPER_V1`;
- gera salt novo;
- chama o helper oficial `f62HashSenha_`;
- impede login duplicado;
- permite vincular colaborador existente por `id_colaborador`;
- se o nome já existe e nenhum `id_colaborador` foi informado, bloqueia para evitar duplicidade;
- cria novo colaborador com `STATUS_CADASTRO = VALIDADO` quando necessário.

### Status

`equipe_tecnico_status`:

- exige `EQUIPE_COLABORADORES / EDITAR`;
- altera apenas `USUARIOS.ATIVO` e `DATA_ATUALIZACAO`;
- não apaga colaborador nem histórico.

### Redefinição de senha

`equipe_tecnico_redefinir_senha`:

- exige `EQUIPE_COLABORADORES / EXECUTAR`;
- gera novo salt/hash;
- bloqueia usuários `LEGACY_QR_HASH` até o login QR estar unificado com AUTH62.

## 6. Publicação

Depois de salvar os arquivos/rotas, publique uma **nova versão do Web App** mantendo:

- mesma URL oficial;
- execução como proprietário;
- mesmas permissões atuais.

Não alterar Produção/Vercel nesta etapa.

## 7. Smoke inicial

Após publicar, testar somente leitura primeiro:

`equipe_tecnicos`

Esperado:

- `success = true`;
- lista os técnicos existentes;
- não retorna `SENHA_HASH`;
- não retorna `SENHA_SALT`;
- não retorna pepper.

Somente depois testar criação com um técnico real autorizado.
