# KPI Contract — Controle de Manutenção Industrial

> Status: **Etapa 1 — contrato em consolidação**
>
> Regra principal: o frontend **não recalcula MTTR, MTBF, parada física, HH ou custo**. Ele consome os indicadores materializados pelo backend.

## 1. Fontes verificadas

Este contrato foi levantado cruzando:

1. branch `baseline/outubro-2026` do frontend;
2. memória canônica consolidada em 10/10/2026;
3. planilha operacional viva, apenas para validar nomes/estruturas das camadas KPI.

Quando houver divergência entre memória e sistema vivo, o sistema vivo deve ser auditado antes de qualquer correção.

## 2. Endpoints KPI existentes

### KPI operacional

- `kpi_operacional_health`
- `kpi_operacional_resumo`
- `kpi_operacional_equipamentos`
- `kpi_operacional_eventos`
- `kpi_operacional_paradas`

Filtros documentados:

- `data_inicio`
- `data_fim`
- `equipamento`
- `area`
- `setor`
- `responsavel`
- `tipo`
- `status`
- `page`
- `page_size`

Autorização documentada: `DASH_COMPLETO / VISUALIZAR`.

### HH e custo

- `kpi_hh_custo_health`
- `kpi_hh_custo_resumo`
- `kpi_hh_custo_colaboradores`
- `kpi_hh_custo_equipamentos`
- `kpi_hh_custo_eventos`
- `kpi_hh_custo_os`

Regra de segurança: a API pública não deve expor custo-hora individual de colaborador.

## 3. Campos comprovados — kpi_operacional_resumo

Os campos abaixo foram registrados em retorno real homologado da API operacional:

- `os_total_periodo`
- `eventos_falha_confirmados`
- `eventos_pendentes_excluidos`
- `ativos_com_falha`
- `mttr_h`
- `mtbf_calendario_h`
- `mtbf_intervalos_validos`
- `parada_fisica_h`
- `tempo_mecanico_h`
- `tempo_eletrico_h`
- `paradas_fisicas_unicas`

Também houve retorno publicado com `success=true` e `api_version` da API operacional.

### Semântica

- **MTTR**: média de `DURACAO_EVENTO_H` dos eventos confirmados filtrados.
- **MTBF calendário**: horas-calendário entre o fim de uma falha confirmada e o início da próxima falha confirmada do mesmo ativo.
- **Parada física**: soma deduplicada de `PARADA_REAL_H` por `ID_PARADA`.
- Eventos `PENDENTE` ficam fora do executivo.
- Disponibilidade não deve ser exibida enquanto não existir denominador confiável de horas programadas.

## 4. Estruturas físicas confirmadas na planilha

As estruturas abaixo são fontes derivadas do backend. Elas **não devem ser usadas pelo React para recalcular KPIs**.

### KPI_EVENTOS

Campos relevantes confirmados:

- `ID_EVENTO`
- `ID_PARADA`
- `ATIVO`
- `AREA`
- `DATA_INICIO`
- `HORA_INICIO`
- `DATA_FIM`
- `HORA_FIM`
- `DURACAO_EVENTO_H`
- `STATUS_EVENTO`
- `CLASSIFICACAO`
- `QTD_OS`
- `IDS_OS`
- `RESPONSAVEIS`

### KPI_PARADAS

Campos relevantes confirmados:

- `ID_PARADA`
- `ATIVO`
- `DATA_INICIO`
- `HORA_INICIO`
- `DATA_FIM`
- `HORA_FIM`
- `PARADA_REAL_H`
- `TEMPO_MECANICO_H`
- `TEMPO_ELETRICO_H`
- `HH_COLABORADORES_H`
- `SOBRECONTAGEM_H`
- `QTD_OS`
- `PARADA_MISTA`
- `IDS_OS`
- `RESPONSAVEIS`

### KPI_CUSTO_EVENTOS

Campos confirmados:

- `ID_EVENTO`
- `EQUIPAMENTO`
- `QTD_OS_MAO_OBRA`
- `QTD_COLABORADORES`
- `HH_TOTAL`
- `CUSTO_CONFIRMADO`
- `LINHAS_DIA_TOTAL`
- `LINHAS_DIA_COM_CUSTO`
- `COBERTURA_CUSTO_PCT`
- `STATUS_COBERTURA`

### KPI_CUSTO_RESUMO

Estrutura física confirmada:

- `METRICA`
- `VALOR`
- `OBSERVACAO`

Métricas atualmente materializadas incluem:

- `LINHAS_BD`
- `HH_TOTAL_NAO_PJ`
- `HH_EXCLUIDA_PJ`
- `CUSTO_CONFIRMADO`
- `COBERTURA_CUSTO_PCT`
- `COLABORADORES_SEM_POLITICA`
- `NOMES_SEM_CADASTRO`

Esses nomes pertencem à camada materializada. O formato exato publicado por `kpi_hh_custo_resumo` ainda precisa ser capturado antes de virar contrato TypeScript obrigatório.

## 5. Estado atual do frontend

A tela `src/pages/Relatorios.tsx` ainda calcula métricas a partir da lista de OS carregada no cliente, incluindo MTTR e uma disponibilidade estimada.

Esse comportamento é legado e **não deve ser levado para o novo dashboard**.

O novo dashboard deve consumir as APIs KPI oficiais.

## 6. Contratos capturados no Web App publicado

Em 14/10/2026 foi feita uma captura estrutural read-only dos 11 endpoints KPI publicados. Foram registrados os nomes dos campos top-level, objetos internos e primeiro item das coleções, sem expor dados sensíveis.

### Operacional

- `kpi_operacional_health`: `success`, `api_version`, `status`, `fontes`, `qualidade`, `metodologia`, `versao`.
- `kpi_operacional_resumo`: `filtros`, `kpis`, `metodologia`, `top_equipamentos`.
- `kpi_operacional_equipamentos`: `total`, `equipamentos`.
- `kpi_operacional_eventos`: paginação por `page` / `page_size` / `total_pages` e coleção `eventos`.
- `kpi_operacional_paradas`: paginação por `page` / `page_size` / `total_pages`, `parada_fisica_total_h` e coleção `paradas`.

### HH/custo

- `kpi_hh_custo_health`: `materializacao` e flag `custo_individual_exposto`.
- `kpi_hh_custo_resumo`: `kpis`, `qualidade`, `observacao`.
- `kpi_hh_custo_colaboradores`: coleção `dados` por colaborador.
- `kpi_hh_custo_equipamentos`: coleção `dados` por equipamento.
- `kpi_hh_custo_eventos`: paginação por `offset` / `limit` e coleção `dados`.
- `kpi_hh_custo_os`: paginação por `offset` / `limit` e coleção `dados`.

Os nomes dos campos estão tipados em `src/lib/kpi-contract.ts`.

### Tipos ainda conservadores

A captura confirmou nomes e estrutura, mas não percorreu valores suficientes para provar toda a nulabilidade e a forma interna de alguns campos compostos. Por isso:

- métricas potencialmente ausentes usam `number | null`;
- campos compostos como listas/textos agregados permanecem `unknown` onde o formato ainda não foi observado diretamente;
- isso deve ser refinado somente após captura adicional, sem inferência.

## 7. Estado da integração nesta branch

Já concluído em `feat/kpi-contract`:

- actions KPI adicionadas à whitelist segura do proxy;
- actions KPI classificadas como leitura no transporte GAS;
- `src/lib/kpi-api.ts` criado com retorno tipado por `action`;
- hooks TanStack Query adicionados em `src/hooks/use-kpi.ts`;
- testes de regressão cobrem whitelist, query keys, encaminhamento de filtros e `enabled=false`.

Ainda pendente:

1. refinar apenas os tipos internos ainda marcados como `unknown` quando houver evidência real;
2. validar localmente tsc, Vitest e build com os novos hooks;
3. testar autorização GESTAO e ADM em Preview;
4. substituir cálculos legados de `Relatorios.tsx` pelo consumo dos contratos oficiais;
5. somente então iniciar o redesign visual.

## 8. Invariantes

- Não recalcular KPI no React.
- Não converter hora operacional pura para `Date`.
- Não expor custo-hora individual.
- Não ativar Enforcement 6.3B nesta fase.
- Não fazer deploy de produção nesta fase.
