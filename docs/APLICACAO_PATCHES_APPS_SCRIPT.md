# APLICAÇÃO DOS PATCHES NO GOOGLE APPS SCRIPT (Atualizado Fase 03)

Este guia define exatamente os passos necessários para habilitar as novas actions (`listar_os_paginado` e `opcoes_formulario_os`) no backend em produção, sem quebrar os fluxos existentes.

## 1. Patches a aplicar

A ordem de aplicação obrigatória é:

1. `backend-patches/opcoes_formulario_os_v1.gs` (Contém cache para não onerar sistema).
2. `backend-patches/listar_os_paginado_v1.gs` (Ação com paginação eficiente).

## 2. Inserção no Apps Script

Abra o Editor do Google Apps Script associado à planilha `[SISTEMA_C] MANUTENCAO`:

1. No menu lateral esquerdo, clique no ícone `+` e selecione **Script**.
2. Crie um arquivo com o nome `API_OS_Formulario.gs`.
3. Cole o conteúdo integral do arquivo `backend-patches/opcoes_formulario_os_v1.gs`.
4. Crie outro arquivo com o nome `API_OS_Paginacao.gs`.
5. Cole o conteúdo integral do arquivo `backend-patches/listar_os_paginado_v1.gs`.

## 3. Dependências e Permissões

Estes patches requerem que os perfis já possuam essas permissões no sistema atual:
- `opcoes_formulario_os` exige: `auth62Autorizar_(sessao, "LANCAMENTO", "VISUALIZAR")`
- `listar_os_paginado` exige: `auth62Autorizar_(sessao, "HISTORICO", "VISUALIZAR")`

## 4. Alterações em `doPost` (MÉTODO DEFINITIVO)

Como a sua Vercel proxy atua usando requisições POST para a URL do GAS, o roteamento deverá ir para a função `doPost(e)` do seu backend.

Dentro do switch case existente do seu `doPost(e)` principal:

```javascript
case "opcoes_formulario_os":
  return ContentService.createTextOutput(JSON.stringify(opcoes_formulario_os(params, sessao)))
    .setMimeType(ContentService.MimeType.JSON);

case "listar_os_paginado":
  return ContentService.createTextOutput(JSON.stringify(listar_os_paginado(params, sessao)))
    .setMimeType(ContentService.MimeType.JSON);
```

## 5. Shadow de Log de Execução

Se você mapeia logs de acessos, deve acrescentar as novas rotas no formato exato:

```javascript
"listar_os_paginado": {
  modulo: "HISTORICO",
  acao: "VISUALIZAR"
},
"opcoes_formulario_os": {
  modulo: "LANCAMENTO",
  acao: "VISUALIZAR"
}
```

Isso garante que o shadow tracker valide-as como leituras autorizadas e emita o log padrão para auditoria (F63A_MAPA), sem forçar enforcement.

## 6. Checklist de Validação do Administrador

- [ ] Validar a leitura e parsing perfeito da string `"07:30"` da aba via `getDisplayValues()`.
- [ ] O request de Options da OS deverá ser ligeiramente mais rápido após a primeira vez (CashService de 3 horas).
- [ ] Cursors de paginação testados em cenários de adição paralela não duplicarão itens da página 2 para frente devido à indexação absoluta por número de linha (ex `endRow - 1`).
