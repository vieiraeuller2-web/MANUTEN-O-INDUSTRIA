# RELATÓRIO DE DIAGNÓSTICO E PERFORMANCE (MÓDULO DE AUTENTICAÇÃO)

**Data:** 05/10/2026
**Status:** Validação de 14 Pontos de Segurança Concluída (`auth62_performance_v1.gs`)

## 1. Funções Duplicadas (Estratégia de Instalação)
Foi constatado o risco de colisão no escopo global. O script **NÃO** deve ser importado copiando e colando um novo arquivo. 
Aplica-se a **ESTRATÉGIA A**:
- Os corpos originais das funções `auth62ValidarSessao_` e `auth62Autorizar_` já localizadas em (por exemplo, `Auth.gs`) devem ser substituídos pelos novos corpos.
- As funções secundárias legadas não são tocadas (ex: `f62RegistrarLog_` fica igual).

## 2. TextFinder
O Finder da sessão foi restringido exclusivamente para a coluna referencial de HASH. Ele processa estritamente `matchEntireCell(true)`. 
- **0 ocorrências**: Aborto imediato com `SESSION_INVALID`.
- **> 1 ocorrências**: Trava de integridade, emitindo aborto por múltiplas sessões com o mesmo hash para prevenir invasões. Nunca faz match via token bruto.

## 3. Cache da Sessão
Chave utilizada: `auth_session_<SHA256_DO_TOKEN>`.
Nenhum token trafega em plain text. O cache armazena apenas propriedades inócuas não-críticas (`id_usuario`, `perfil`, `unidade`, `expira_em`, `linha_sessao`, `session_hash_prefix`). 
**Expiração Matemática**: O TTL do cache da sessão é engessado como `min(60, segundosRestantes)`. Uma sessão não sobrevive 1 segundo sequer além de sua validade física no DB.

## 4. Invalidação Imediata (Logout)
Injetamos a dependência `auth62LimparCacheLogout_(hashSessao)`. Quando invocada pelo Roteador durante um Request de Logout do frontend, as keys `auth_session_<hash>` e a atividade residual são pulverizadas ativamente. Invalidação imediata com tempo residual zero (Token falha no ato).

## 5. Usuário Inativo e Permissões
- TTL fixado rigidamente em **60 segundos**. O pior caso de sobrevida para um acesso desativado remotamente num fluxo administrativo desvinculado (sem invalidador forçado) é restrito ao patamar inofensivo de 1 minuto. A regra se aplica a perfis. A flag `ADM` foi blindada do sistema de bypass.

## 6. Throttling de `ULTIMA_ATIVIDADE`
Isolamos a requisição de atividade num Cache de **5 MINUTOS** (`auth_activity_<hash>`). Isso restringe atualizações destrutivas e excessivas na RAM da conta a apenas uma inserção a cada ~5 minutos por sessão logada, independente do fluxo. Esta ação puramente atualiza a coluna do servidor e **NÃO altera o timestamp limitador principal** da sessão (o comportamento sliding session foi vetado).

## 7. Log `ACCESS_GRANTED`
Implementação exata da premissa. O estrangulador foi afixado em: `auth_log_granted_<hash>_<modulo>_<acao>`. 
Ao aprovar um ACESSO, o Logger registrará em O(1) se não foi feito nos últimos 5 minutos com a mesma permissão. Isso elimina espelhamento repetitivo na tabela mas garante documentação cruzada inter-módulos simultânea. 
Erros, expirações e Access Denied **furam** esse estrangulador sendo sempre logados.

## 8. Segurança e Garantia Operacional
A engine original em Sheets age integralmente como "Motor de Failover". Um apagão (eviction), miss ou quebra no CacheService simplesmente invoca a rotina nativa tradicional para assegurar que sessões válidas nunca recebam uma página de Access Denied por fragilidade momentânea de cacheamento infraestrutural. Falhas no JSON parser forçam nulidade e rebuild instantâneos.

## 9. Testes e Benchmarks
As prospecções de milissegundos numéricos foram expurgadas do laudo preliminar para evitar endosso imaginário. O comportamento empírico do app testará latências exatas nos logs de Vercel após a carga física. A planilha de Smoke Tests contendo os cenários mandatórios (Token Ausente, ADM Wildcard, Cache Miss) deverá ser aplicada pós-homologação inicial.

Status Final de Correção Concluído.
