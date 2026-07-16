import { useEffect, useMemo, useRef, useState } from "react";
import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import RefreshButton from "@/components/RefreshButton";
import ArvorePreventiva from "@/components/preventivas/ArvorePreventiva";
import AtivosPreventivas from "@/components/preventivas/AtivosPreventivas";
import PlanosPreventivas from "@/components/preventivas/PlanosPreventivas";
import PreventivasFiltros from "@/components/preventivas/PreventivasFiltros";
import PreventivasResumo from "@/components/preventivas/PreventivasResumo";
import RegistrarPreventiva from "@/components/preventivas/RegistrarPreventiva";
import SetoresPreventivas from "@/components/preventivas/SetoresPreventivas";
import {
  TODOS_FILTRO,
  achatarArvorePreventiva,
  formatarModalidadePlano,
  formatarPeriodicidadePlano,
  formatarStatusPlano,
  obterItensFinaisPreventiva,
  valorEhNao,
} from "@/components/preventivas/preventivas-utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeText, safeString, uniqueSorted } from "@/lib/data-helpers";
import { cn } from "@/lib/utils";
import {
  buscarAtivosPreventivas,
  buscarPlanoCompletoPreventiva,
  buscarPlanosPreventivas,
  buscarResumoPreventivas,
  buscarSetoresPreventivas,
  gerarPdfAtivoPreventiva,
  gerarPdfDiretoriaPreventivas,
  gerarPdfExecucaoPreventiva,
  gerarPdfGeralPreventivas,
  gerarPdfSetorPreventiva,
} from "@/services/preventivasApi";
import type { ConcluirPreventivaResponse, FiltrosPreventivas, PdfPreventivaResponse } from "@/types/preventivas";

const CHAVE_PREVENTIVAS = ["preventivas-api"] as const;
const TEMPO_CACHE = 30 * 60 * 1000;

const filtrosIniciais: FiltrosPreventivas = {
  busca: "",
  setor: TODOS_FILTRO,
  ativo: TODOS_FILTRO,
  modalidade: TODOS_FILTRO,
  periodicidade: TODOS_FILTRO,
  status: TODOS_FILTRO,
};

function erroConsulta(error: unknown): Error | null {
  return error instanceof Error ? error : error ? new Error(String(error)) : null;
}

type ChavePdf = "geral" | "diretoria" | "setor" | "ativo" | "execucao";

function abrirPdf(response: PdfPreventivaResponse) {
  const link = document.createElement("a");
  link.href = response.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function BotaoPdf({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={loading} onClick={onClick}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      {loading ? "Gerando..." : label}
    </Button>
  );
}

export default function PlanosManutencao() {
  const queryClient = useQueryClient();
  const fluxoRef = useRef<HTMLDivElement>(null);
  const [filtros, setFiltros] = useState<FiltrosPreventivas>(filtrosIniciais);
  const [idPlanoSelecionado, setIdPlanoSelecionado] = useState("");
  const [pdfsCarregando, setPdfsCarregando] = useState<Set<ChavePdf>>(() => new Set());
  const [registroAberto, setRegistroAberto] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState("");

  const idSetor = filtros.setor === TODOS_FILTRO ? "" : filtros.setor;
  const idAtivo = filtros.ativo === TODOS_FILTRO ? "" : filtros.ativo;

  const resumoQuery = useQuery({
    queryKey: [...CHAVE_PREVENTIVAS, "resumo"],
    queryFn: ({ signal }) => buscarResumoPreventivas(signal),
    staleTime: Infinity,
    gcTime: TEMPO_CACHE,
    retry: 1,
  });

  const setoresQuery = useQuery({
    queryKey: [...CHAVE_PREVENTIVAS, "setores"],
    queryFn: ({ signal }) => buscarSetoresPreventivas(signal),
    staleTime: Infinity,
    gcTime: TEMPO_CACHE,
    retry: 1,
  });

  const ativosQuery = useQuery({
    queryKey: [...CHAVE_PREVENTIVAS, "ativos", idSetor],
    queryFn: ({ signal }) => buscarAtivosPreventivas(idSetor, signal),
    enabled: Boolean(idSetor),
    staleTime: Infinity,
    gcTime: TEMPO_CACHE,
    retry: 1,
  });

  const planosQuery = useQuery({
    queryKey: [...CHAVE_PREVENTIVAS, "planos", idAtivo],
    queryFn: ({ signal }) => buscarPlanosPreventivas(idAtivo, signal),
    enabled: Boolean(idAtivo),
    staleTime: Infinity,
    gcTime: TEMPO_CACHE,
    retry: 1,
  });

  const planoCompletoQuery = useQuery({
    queryKey: [...CHAVE_PREVENTIVAS, "plano-completo", idPlanoSelecionado],
    queryFn: ({ signal }) => buscarPlanoCompletoPreventiva(idPlanoSelecionado, signal),
    enabled: Boolean(idPlanoSelecionado),
    staleTime: Infinity,
    gcTime: TEMPO_CACHE,
    retry: 1,
  });

  const setores = useMemo(() => setoresQuery.data ?? [], [setoresQuery.data]);
  const ativos = useMemo(() => ativosQuery.data ?? [], [ativosQuery.data]);
  const planos = useMemo(() => planosQuery.data ?? [], [planosQuery.data]);
  const busca = normalizeText(filtros.busca);

  const ativosVisiveis = useMemo(
    () => ativos.filter((ativo) => {
      if (!busca || ativo.id_ativo === idAtivo) return true;
      return [ativo.nome_ativo, ativo.tag_ativo, ativo.tipo_ativo, ativo.localizacao]
        .some((valor) => normalizeText(valor).includes(busca));
    }),
    [ativos, busca, idAtivo],
  );

  const modalidades = useMemo(
    () => uniqueSorted(planos.map(formatarModalidadePlano)),
    [planos],
  );
  const periodicidades = useMemo(
    () => uniqueSorted(planos.map(formatarPeriodicidadePlano)),
    [planos],
  );
  const statusDisponiveis = useMemo(
    () => uniqueSorted(planos.map((plano) => valorEhNao(plano.ativo) ? "INATIVO" : formatarStatusPlano(plano.status_plano))),
    [planos],
  );

  const planosVisiveis = useMemo(
    () => planos.filter((plano) => {
      const modalidade = formatarModalidadePlano(plano);
      const periodicidade = formatarPeriodicidadePlano(plano);
      const status = valorEhNao(plano.ativo) ? "INATIVO" : formatarStatusPlano(plano.status_plano);
      if (filtros.modalidade !== TODOS_FILTRO && modalidade !== filtros.modalidade) return false;
      if (filtros.periodicidade !== TODOS_FILTRO && periodicidade !== filtros.periodicidade) return false;
      if (filtros.status !== TODOS_FILTRO && status !== filtros.status) return false;
      if (!busca) return true;
      return [plano.nome_ativo, plano.tag_ativo, plano.titulo_plano, modalidade, periodicidade]
        .some((valor) => normalizeText(valor).includes(busca));
    }),
    [busca, filtros.modalidade, filtros.periodicidade, filtros.status, planos],
  );

  useEffect(() => {
    if (!registroAberto && idPlanoSelecionado && planosQuery.isSuccess && !planosVisiveis.some((plano) => plano.id_plano === idPlanoSelecionado)) {
      setIdPlanoSelecionado("");
    }
  }, [idPlanoSelecionado, planosQuery.isSuccess, planosVisiveis, registroAberto]);

  const planoDaLista = planos.find((plano) => plano.id_plano === idPlanoSelecionado);
  const planoExibido = planoCompletoQuery.data?.plano ?? planoDaLista;
  const nosChecklist = useMemo(() => {
    const completo = planoCompletoQuery.data;
    if (!completo) return [];
    return completo.itens.length ? completo.itens : achatarArvorePreventiva(completo.arvore);
  }, [planoCompletoQuery.data]);
  const itensFinais = useMemo(() => obterItensFinaisPreventiva(nosChecklist), [nosChecklist]);
  const setorSelecionado = setores.find((setor) => setor.id_setor === idSetor);
  const ativoSelecionado = ativos.find((ativo) => ativo.id_ativo === idAtivo);

  useEffect(() => {
    let montado = true;
    void supabase.auth.getSession()
      .then(({ data }) => {
        const usuario = data.session?.user;
        if (!usuario || !montado) return;
        const metadados = usuario.user_metadata;
        const nome = safeString(
          metadados?.full_name || metadados?.name || metadados?.nome || usuario.email,
        );
        setUsuarioAtual(nome);
      })
      .catch(() => undefined);
    return () => {
      montado = false;
    };
  }, []);

  const etapa = idPlanoSelecionado ? 4 : idAtivo ? 3 : idSetor ? 2 : 1;

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.requestAnimationFrame(() => fluxoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [etapa]);

  const selecionarSetor = (valor: string) => {
    const setor = valor === TODOS_FILTRO ? TODOS_FILTRO : valor;
    setFiltros((atual) => ({
      ...atual,
      setor,
      ativo: TODOS_FILTRO,
      modalidade: TODOS_FILTRO,
      periodicidade: TODOS_FILTRO,
      status: TODOS_FILTRO,
    }));
    setIdPlanoSelecionado("");
  };

  const selecionarAtivo = (valor: string) => {
    const ativo = valor === TODOS_FILTRO ? TODOS_FILTRO : valor;
    setFiltros((atual) => ({
      ...atual,
      ativo,
      modalidade: TODOS_FILTRO,
      periodicidade: TODOS_FILTRO,
      status: TODOS_FILTRO,
    }));
    setIdPlanoSelecionado("");
  };

  const alterarFiltro = (campo: keyof FiltrosPreventivas, valor: string) => {
    if (campo === "setor") return selecionarSetor(valor);
    if (campo === "ativo") return selecionarAtivo(valor);
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  };

  const limparFiltros = () => {
    setFiltros(filtrosIniciais);
    setIdPlanoSelecionado("");
  };

  const voltarEtapa = () => {
    if (etapa === 4) setIdPlanoSelecionado("");
    else if (etapa === 3) selecionarAtivo(TODOS_FILTRO);
    else if (etapa === 2) selecionarSetor(TODOS_FILTRO);
  };

  const atualizacoes = [
    resumoQuery.dataUpdatedAt,
    setoresQuery.dataUpdatedAt,
    ativosQuery.dataUpdatedAt,
    planosQuery.dataUpdatedAt,
    planoCompletoQuery.dataUpdatedAt,
  ].filter(Boolean);
  const ultimaAtualizacao = atualizacoes.length ? Math.max(...atualizacoes) : 0;
  const consultasEmAndamento = useIsFetching({ queryKey: CHAVE_PREVENTIVAS });

  const atualizar = () => {
    void queryClient.invalidateQueries({ queryKey: CHAVE_PREVENTIVAS, refetchType: "active" });
  };

  const executarPdf = async (
    chave: ChavePdf,
    rotulo: string,
    gerar: () => Promise<PdfPreventivaResponse>,
  ) => {
    setPdfsCarregando((atuais) => new Set(atuais).add(chave));
    toast({ title: `Gerando ${rotulo}...`, description: "O arquivo será aberto em uma nova aba quando estiver pronto." });
    try {
      const response = await gerar();
      abrirPdf(response);
      toast({ title: `${rotulo} gerado com sucesso.`, description: response.message });
    } catch (error) {
      toast({
        title: `Falha ao gerar ${rotulo}.`,
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setPdfsCarregando((atuais) => {
        const proximos = new Set(atuais);
        proximos.delete(chave);
        return proximos;
      });
    }
  };

  const atualizarAposRegistro = async (_response: ConcluirPreventivaResponse) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...CHAVE_PREVENTIVAS, "resumo"], refetchType: "active" }),
      queryClient.invalidateQueries({ queryKey: [...CHAVE_PREVENTIVAS, "planos", idAtivo], refetchType: "active" }),
      queryClient.invalidateQueries({ queryKey: [...CHAVE_PREVENTIVAS, "plano-completo", idPlanoSelecionado], refetchType: "active" }),
    ]);
  };

  return (
    <div className="page-container">
      <div className="mb-4 flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="PLANOS DE MANUTENÇÃO"
          subtitle="Gerenciamento e consulta dos planos preventivos por setor, ativo, modalidade e periodicidade."
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <BotaoPdf
            label="PDF Geral"
            loading={pdfsCarregando.has("geral")}
            onClick={() => void executarPdf("geral", "PDF Geral", gerarPdfGeralPreventivas)}
          />
          <BotaoPdf
            label="PDF Diretoria"
            loading={pdfsCarregando.has("diretoria")}
            onClick={() => void executarPdf("diretoria", "PDF Diretoria", gerarPdfDiretoriaPreventivas)}
          />
          <RefreshButton onClick={atualizar} isFetching={consultasEmAndamento > 0} />
          <span className="text-[11px] text-muted-foreground" aria-live="polite">
            {ultimaAtualizacao
              ? `Última atualização: ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(ultimaAtualizacao)}`
              : "Aguardando atualização"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <PreventivasResumo
          resumo={resumoQuery.data}
          isLoading={resumoQuery.isLoading}
          error={erroConsulta(resumoQuery.error)}
          onTentarNovamente={() => void resumoQuery.refetch()}
        />

        <PreventivasFiltros
          filtros={filtros}
          setores={setores}
          ativos={ativos}
          modalidades={modalidades}
          periodicidades={periodicidades}
          status={statusDisponiveis}
          onChange={alterarFiltro}
          onLimpar={limparFiltros}
        />

        {(idSetor || idAtivo) && (
          <div className="stat-card flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Ações do contexto selecionado</p>
              <p className="text-[11px] text-muted-foreground">
                {setorSelecionado?.nome_setor}
                {ativoSelecionado ? ` · ${ativoSelecionado.tag_ativo || "TAG NÃO CADASTRADA"} · ${ativoSelecionado.nome_ativo}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {idSetor && (
                <BotaoPdf
                  label="PDF do Setor"
                  loading={pdfsCarregando.has("setor")}
                  onClick={() => void executarPdf("setor", "PDF do Setor", () => gerarPdfSetorPreventiva(idSetor))}
                />
              )}
              {idAtivo && (
                <BotaoPdf
                  label="PDF do Ativo"
                  loading={pdfsCarregando.has("ativo")}
                  onClick={() => void executarPdf("ativo", "PDF do Ativo", () => gerarPdfAtivoPreventiva(idAtivo))}
                />
              )}
            </div>
          </div>
        )}

        <div ref={fluxoRef} className="scroll-mt-4">
          {etapa > 1 && (
            <Button type="button" size="sm" variant="ghost" className="mb-2 gap-1.5 md:hidden" onClick={voltarEtapa}>
              <ArrowLeft className="h-4 w-4" /> Voltar à etapa anterior
            </Button>
          )}

          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1fr)_minmax(360px,1.35fr)]">
            <div className={cn(etapa === 1 ? "block" : "hidden", "min-w-0 md:block")}>
              <SetoresPreventivas
                setores={setores}
                selecionado={idSetor}
                isLoading={setoresQuery.isLoading}
                error={erroConsulta(setoresQuery.error)}
                onSelecionar={selecionarSetor}
                onTentarNovamente={() => void setoresQuery.refetch()}
              />
            </div>
            <div className={cn(etapa === 2 ? "block" : "hidden", "min-w-0 md:block")}>
              <AtivosPreventivas
                ativos={ativosVisiveis}
                setorSelecionado={Boolean(idSetor)}
                selecionado={idAtivo}
                isLoading={ativosQuery.isLoading && Boolean(idSetor)}
                error={erroConsulta(ativosQuery.error)}
                onSelecionar={selecionarAtivo}
                onTentarNovamente={() => void ativosQuery.refetch()}
              />
            </div>
            <div className={cn(etapa === 3 ? "block" : "hidden", "min-w-0 md:col-span-2 md:block xl:col-span-1")}>
              <PlanosPreventivas
                planos={planosVisiveis}
                ativoSelecionado={Boolean(idAtivo)}
                selecionado={idPlanoSelecionado}
                isLoading={planosQuery.isLoading && Boolean(idAtivo)}
                error={erroConsulta(planosQuery.error)}
                onSelecionar={setIdPlanoSelecionado}
                onTentarNovamente={() => void planosQuery.refetch()}
              />
            </div>
          </div>

          <div className={cn("mt-4 min-w-0", etapa === 4 ? "block" : "hidden", "md:block")}>
            <ArvorePreventiva
              plano={planoExibido}
              nos={nosChecklist}
              planoSelecionado={Boolean(idPlanoSelecionado)}
              isLoading={planoCompletoQuery.isLoading && Boolean(idPlanoSelecionado)}
              error={erroConsulta(planoCompletoQuery.error)}
              onTentarNovamente={() => void planoCompletoQuery.refetch()}
              onGerarPdfExecucao={() => void executarPdf(
                "execucao",
                "PDF de Execução",
                () => gerarPdfExecucaoPreventiva(idPlanoSelecionado),
              )}
              onRegistrarPreventiva={() => setRegistroAberto(true)}
              isGerandoPdf={pdfsCarregando.has("execucao")}
              podeRegistrar={Boolean(planoExibido && itensFinais.length && !planoCompletoQuery.isLoading && !planoCompletoQuery.error)}
            />
          </div>
        </div>
      </div>

      <RegistrarPreventiva
        open={registroAberto}
        plano={planoExibido}
        setor={planoCompletoQuery.data?.setor ?? setorSelecionado}
        ativo={planoCompletoQuery.data?.ativo ?? ativoSelecionado}
        nos={nosChecklist}
        apontadoPorPadrao={usuarioAtual}
        onOpenChange={setRegistroAberto}
        onSuccess={atualizarAposRegistro}
      />
    </div>
  );
}
