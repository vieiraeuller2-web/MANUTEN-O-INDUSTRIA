# RELATÓRIO DE HOMOLOGAÇÃO FASE 03

**Data:** 05/10/2026
**Responsável:** Engenheiro de Software Principal
**Status:** Correções realizadas pré-homologação. Aguardando execução do Admin.

## 1. Patches e Endpoints

Os arquivos de patches e roteamento foram ajustados rigorosamente para espelhar a arquitetura e as limitações do BD real da MANUTENÇÃO INDUSTRIAL.

### Correção Cirúrgica de Segurança da Unidade
A unidade não é mais aceita passivamente via `params.unidade` enviado pelo frontend/Vercel. O Apps Script agora desempacota o payload validado diretamente pelo módulo de autorização core:
`var auth = auth62Autorizar_(token, "LANCAMENTO", "VISUALIZAR");`
Após a validação bem-sucedida do token, o Script isola a variável `auth.usuario.unidade` e a utiliza na chave exclusiva do CacheService (`"os_form_options_v3_" + unidade`), garantindo que o isolamento dependa estritamente da engine de autenticação nativa do backend.

### Ausência de Coluna Unidade na BD Real
A tabela `BD` comprovadamente não possui coluna de "Unidade". 
- Tratamos a `BD` temporariamente como **Single-Tenant** (TH30). 
- **Fontes de Responsáveis**: Ao extrair opções do formulário (Responsáveis, Equipamentos, Setores, Áreas), o algoritmo agora lê todas as linhas globalmente (visto que não há filtro possível na BD) e não tenta cruzar uma coluna fantasma.

### Tratamento e Normalização de Horas (Sem `Date`)
Foi identificada formatação inconsistente na base (ex: `"09:00:00"`, `"10:30:00"`, `"17:00"`).
- O backend extrai a célula visual usando `getDisplayValues()`.
- O valor puramente textual é repassado para `osPagNormalizeTimeStr_`.
- Este utilitário utiliza Regex simples para arrancar estritamente `"HH:MM"`, podando os segundos (`:00`) se existirem e preservando valores puros. (ex: `"09:00:00"` => `"09:00"`). Não há uso de timezone, locales, nem objeto `new Date()`.

### Tratamento do Cursor Estável com `row_ref`
- Registros legados não contêm identificador `id_os`. 
- **Estratégia de deduplicação visual**: A listagem paginada retorna agora obrigatoriamente a propriedade `row_ref` para CADA registro retornado. Este valor é a **linha absoluta** do Google Sheets real em que a OS repousa (ex: `8750`). 
- Em queries **Sem Filtro**: o `row_ref` é mapeado perfeitamente durante a iteração retroativa da janela cortada (`endRow + i`).
- Em queries **Com Filtro**: o sistema mapeia o array completo rastreando o `index + 2` antes de fatiar, garantindo que o `row_ref` da linha 2 na planilha não vire o índice 0.
- O Frontend e o contrato JSON foram atualizados (`PaginatedOSItem`) prevendo `id_os: string | null` e repassando `row_ref: number` como a `React key` de fallback absoluta, eliminando colisões de UI. 

### Cursor Limits Validation
Não repassamos cursores nulos. Se o cursor não for válido (NaN, < 0), abortamos controladamente `{ success: false, code: 400 }`.

## 2. Contratos Corrigidos

**Item Legado sem ID**:
```json
{
  "row_ref": 8750,
  "id_os": null,
  "equipamento": "MTF001",
  "hora_inicio": "08:00",
  "hora_conclusao": "09:00"
}
```

**Item Moderno**:
```json
{
  "row_ref": 9000,
  "id_os": "OS-20260903-094414-718657D3",
  "equipamento": "MTF001",
  "hora_inicio": "08:00",
  "hora_conclusao": "09:00"
}
```

## 3. Testes Executados Locais

- Todos os *types* de `api-client.ts`, hooks e `ListaOS` re-transpilados sem erros de tipagem. `tsc --noEmit` operou limpo.
- `Vitest` rodou todos os 29 testes com 100% `PASS`.
- Verificadas ausências de colisão de nomes com namespaces.

## 4. O que testar no Staging Vercel?

Assim que os patches forem aplicados no Editor de GAS, inicie os testes end-to-end. A paginação deverá prosseguir com a máxima fluidez.
