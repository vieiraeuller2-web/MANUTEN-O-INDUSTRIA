import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  Clock3,
  DollarSign,
  FilterX,
  Gauge,
  Loader2,
  RefreshCw,
  Wrench,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useKpiHHCustoColaboradores,
  useKpiHHCustoEquipamentos,
  useKpiHHCustoResumo,
  useKpiOperacionalEquipamentos,
  useKpiOperacionalResumo,
} from "@/hooks/use-kpi";
import type {
  KpiHHCustoFilters,
  KpiOperacionalFilters,
} from "@/lib/kpi-contract";

type CommonFilters = {
  data_inicio: string;
  data_fim: string;
  equipamento: string;
  area: string;
  responsavel: string;
  tipo: string;
};

const EMPTY_FILTERS: CommonFilters = {
  data_inicio: "",
  data_fim: "",
  equipamento: "",
  area: "",
  responsavel: "",
  tipo: "",
};

function clean<T extends Record<string, string>>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value.trim() !== "")
  );
}

function fmtNumber(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function fmtHours(value: number | null | undefined) {
  return value == null ? "—" : `${fmtNumber(value, 1)} h`;
}

function fmtCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Activity;
}) {
  return (
    <Card className="kron-report-card kron-report-card--metric">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function RankingBarChart({
  title,
  description,
  data,
  nameKey,
  valueKey,
  valueFormatter,
}: {
  title: string;
  description: string;
  data: Record<string, string | number>[];
  nameKey: string;
  valueKey: string;
  valueFormatter: (value: number) => string;
}) {
  return (
    <Card className="kron-report-card kron-report-card--chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sem dados no recorte atual.
          </p>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => valueFormatter(Number(value))}
                  fontSize={11}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  type="category"
                  dataKey={nameKey}
                  width={110}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  formatter={(value) => valueFormatter(Number(value))}
                  labelFormatter={(label) => String(label)}
                  cursor={{ fill: "hsl(var(--primary) / .06)" }}
                />
                <Bar
                  dataKey={valueKey}
                  fill="hsl(var(--primary))"
                  maxBarSize={21}
                  radius={[0, 7, 7, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardExecutivo() {
  const [draft, setDraft] = useState<CommonFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<CommonFilters>(EMPTY_FILTERS);

  const operacionalFilters = useMemo(
    () => clean(filters) as KpiOperacionalFilters,
    [filters]
  );

  const custoFilters = useMemo(
    () => clean(filters) as KpiHHCustoFilters,
    [filters]
  );

  const operacional = useKpiOperacionalResumo(operacionalFilters);
  const custo = useKpiHHCustoResumo(custoFilters);
  const operacionalEquipamentos =
    useKpiOperacionalEquipamentos(operacionalFilters);
  const custoColaboradores =
    useKpiHHCustoColaboradores(custoFilters);
  const custoEquipamentos =
    useKpiHHCustoEquipamentos(custoFilters);

  const loading = operacional.isLoading || custo.isLoading;
  const fetching =
    operacional.isFetching ||
    custo.isFetching ||
    operacionalEquipamentos.isFetching ||
    custoColaboradores.isFetching ||
    custoEquipamentos.isFetching;
  const error = operacional.error || custo.error;

  const applyFilters = () => setFilters(draft);

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  const refresh = () => {
    void operacional.refetch();
    void custo.refetch();
    void operacionalEquipamentos.refetch();
    void custoColaboradores.refetch();
    void custoEquipamentos.refetch();
  };

  const op = operacional.data?.kpis;
  const hh = custo.data?.kpis;
  const topEquipamentos = operacional.data?.top_equipamentos ?? [];

  const topCustoColaboradores = useMemo(
    () =>
      [...(custoColaboradores.data?.dados ?? [])]
        .filter((item) => item.custo_confirmado != null)
        .sort(
          (a, b) =>
            (b.custo_confirmado ?? 0) - (a.custo_confirmado ?? 0)
        )
        .slice(0, 10)
        .map((item) => ({
          nome: item.nome,
          custo: item.custo_confirmado ?? 0,
        })),
    [custoColaboradores.data]
  );

  const topHHColaboradores = useMemo(
    () =>
      [...(custoColaboradores.data?.dados ?? [])]
        .filter((item) => item.hh_total != null)
        .sort((a, b) => (b.hh_total ?? 0) - (a.hh_total ?? 0))
        .slice(0, 10)
        .map((item) => ({
          nome: item.nome,
          hh: item.hh_total ?? 0,
        })),
    [custoColaboradores.data]
  );

  const topCustoEquipamentos = useMemo(
    () =>
      [...(custoEquipamentos.data?.dados ?? [])]
        .filter((item) => item.custo_confirmado != null)
        .sort(
          (a, b) =>
            (b.custo_confirmado ?? 0) - (a.custo_confirmado ?? 0)
        )
        .slice(0, 10)
        .map((item) => ({
          equipamento: item.equipamento,
          custo: item.custo_confirmado ?? 0,
        })),
    [custoEquipamentos.data]
  );

  const topMttrEquipamentos = useMemo(
    () =>
      [...(operacionalEquipamentos.data?.equipamentos ?? [])]
        .filter((item) => item.mttr_h != null)
        .sort((a, b) => (b.mttr_h ?? 0) - (a.mttr_h ?? 0))
        .slice(0, 10)
        .map((item) => ({
          equipamento: item.equipamento,
          mttr: item.mttr_h ?? 0,
        })),
    [operacionalEquipamentos.data]
  );

  const topMtbfEquipamentos = useMemo(
    () =>
      [...(operacionalEquipamentos.data?.equipamentos ?? [])]
        .filter(
          (item) =>
            item.mtbf_calendario_h != null &&
            item.mtbf_intervalos_validos > 0
        )
        .sort(
          (a, b) =>
            (b.mtbf_calendario_h ?? 0) - (a.mtbf_calendario_h ?? 0)
        )
        .slice(0, 10)
        .map((item) => ({
          equipamento: item.equipamento,
          mtbf: item.mtbf_calendario_h ?? 0,
        })),
    [operacionalEquipamentos.data]
  );

  return (
    <div className="page-container pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Dashboard Executivo"
          subtitle="Indicadores oficiais do backend de manutenção"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={fetching}
          className="gap-2"
        >
          {fetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      <Card className="kron-report-card mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros globais compatíveis</CardTitle>
          <p className="text-xs text-muted-foreground">
            Período, equipamento, área, responsável e tipo são enviados aos dois
            contratos oficiais. Setor será adicionado quando HH/custo também
            suportar esse filtro.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input
              type="date"
              value={draft.data_inicio}
              onChange={(e) =>
                setDraft((v) => ({ ...v, data_inicio: e.target.value }))
              }
              aria-label="Data inicial"
            />
            <Input
              type="date"
              value={draft.data_fim}
              onChange={(e) =>
                setDraft((v) => ({ ...v, data_fim: e.target.value }))
              }
              aria-label="Data final"
            />
            <Input
              placeholder="Equipamento"
              value={draft.equipamento}
              onChange={(e) =>
                setDraft((v) => ({ ...v, equipamento: e.target.value }))
              }
              aria-label="Equipamento"
            />
            <Input
              placeholder="Área"
              value={draft.area}
              onChange={(e) =>
                setDraft((v) => ({ ...v, area: e.target.value }))
              }
              aria-label="Área"
            />
            <Input
              placeholder="Responsável"
              value={draft.responsavel}
              onChange={(e) =>
                setDraft((v) => ({ ...v, responsavel: e.target.value }))
              }
              aria-label="Responsável"
            />
            <Input
              placeholder="Tipo"
              value={draft.tipo}
              onChange={(e) =>
                setDraft((v) => ({ ...v, tipo: e.target.value }))
              }
              aria-label="Tipo"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={applyFilters}>
              Aplicar filtros
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearFilters}
              className="gap-2"
            >
              <FilterX className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando indicadores oficiais...
        </div>
      ) : error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Não foi possível carregar o dashboard.
              </p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "Erro desconhecido"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="OS no período"
              value={String(op?.os_total_periodo ?? 0)}
              subtitle="Registros considerados pelo backend"
              icon={Wrench}
            />
            <MetricCard
              title="Falhas confirmadas"
              value={String(op?.eventos_falha_confirmados ?? 0)}
              subtitle="Eventos confirmados; pendentes excluídos"
              icon={AlertCircle}
            />
            <MetricCard
              title="Parada física"
              value={fmtHours(op?.parada_fisica_h)}
              subtitle="Deduplicada por ID_PARADA"
              icon={Clock3}
            />
            <MetricCard
              title="MTTR"
              value={fmtHours(op?.mttr_h)}
              subtitle="Média dos eventos confirmados"
              icon={Activity}
            />
            <MetricCard
              title="MTBF calendário"
              value={fmtHours(op?.mtbf_calendario_h)}
              subtitle={`${op?.mtbf_intervalos_validos ?? 0} intervalos válidos`}
              icon={Gauge}
            />
            <MetricCard
              title="HH de mão de obra"
              value={fmtHours(hh?.hh_total)}
              subtitle="HH elegível, sem PJ excluído"
              icon={Wrench}
            />
            <MetricCard
              title="Custo confirmado"
              value={fmtCurrency(hh?.custo_confirmado)}
              subtitle="Somente custo com vigência válida"
              icon={DollarSign}
            />
            <MetricCard
              title="Cobertura de custo"
              value={
                hh?.cobertura_custo_pct == null
                  ? "—"
                  : `${fmtNumber(hh.cobertura_custo_pct, 1)}%`
              }
              subtitle="Cobertura por linhas-dia elegíveis"
              icon={Activity}
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
            <Card className="kron-report-card">
              <CardHeader>
                <CardTitle className="text-base">
                  Equipamentos com mais falhas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topEquipamentos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem equipamentos no recorte atual.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="pb-2 font-medium">Equipamento</th>
                          <th className="pb-2 font-medium">Falhas</th>
                          <th className="pb-2 font-medium">MTTR</th>
                          <th className="pb-2 font-medium">MTBF</th>
                          <th className="pb-2 font-medium">Parada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topEquipamentos.map((item) => (
                          <tr
                            key={item.equipamento}
                            className="border-b last:border-0"
                          >
                            <td className="py-3 font-medium">
                              {item.equipamento}
                            </td>
                            <td className="py-3">{item.falhas_confirmadas}</td>
                            <td className="py-3">{fmtHours(item.mttr_h)}</td>
                            <td className="py-3">
                              {fmtHours(item.mtbf_calendario_h)}
                            </td>
                            <td className="py-3">
                              {fmtHours(item.parada_fisica_h)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Qualidade do recorte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">
                    Eventos pendentes excluídos
                  </p>
                  <p className="text-xl font-semibold">
                    {op?.eventos_pendentes_excluidos ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paradas físicas únicas</p>
                  <p className="text-xl font-semibold">
                    {op?.paradas_fisicas_unicas ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Linhas sem custo</p>
                  <p className="text-xl font-semibold">
                    {hh?.linhas_dia_sem_custo ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">HH excluída de PJ</p>
                  <p className="text-xl font-semibold">
                    {fmtHours(hh?.hh_excluida_pj_global)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <RankingBarChart
              title="Custo de manutenção por equipamento"
              description="Top 10 por custo confirmado no período filtrado."
              data={topCustoEquipamentos}
              nameKey="equipamento"
              valueKey="custo"
              valueFormatter={fmtCurrency}
            />
            <RankingBarChart
              title="Custo por colaborador"
              description="Custo confirmado agregado por colaborador; valor/hora individual não é exposto."
              data={topCustoColaboradores}
              nameKey="nome"
              valueKey="custo"
              valueFormatter={fmtCurrency}
            />
            <RankingBarChart
              title="HH por colaborador"
              description="Top 10 de carga de mão de obra no recorte atual."
              data={topHHColaboradores}
              nameKey="nome"
              valueKey="hh"
              valueFormatter={fmtHours}
            />
            <RankingBarChart
              title="MTTR por equipamento"
              description="Comparativo oficial do MTTR consolidado por equipamento."
              data={topMttrEquipamentos}
              nameKey="equipamento"
              valueKey="mttr"
              valueFormatter={fmtHours}
            />
            <RankingBarChart
              title="MTBF calendário por equipamento"
              description="Comparativo dos equipamentos com intervalos válidos de MTBF."
              data={topMtbfEquipamentos}
              nameKey="equipamento"
              valueKey="mtbf"
              valueFormatter={fmtHours}
            />
          </div>

          <Card className="kron-report-card mt-6 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Próxima camada: evolução temporal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                A evolução mensal/semanal de MTBF, MTTR, custo e HH será exibida
                em gráficos de linha quando o backend publicar uma série temporal
                oficial. O frontend não reconstruirá esses indicadores a partir
                das OS brutas.
              </p>
              <p>
                MTTR por colaborador também depende de uma regra oficial de
                atribuição do evento ao colaborador; hoje o contrato individual
                disponível é de HH e custo.
              </p>
            </CardContent>
          </Card>

          <p className="mt-5 text-xs text-muted-foreground">
            Disponibilidade não é exibida: o contrato atual não possui
            denominador homologado de horas programadas.
          </p>
        </>
      )}
    </div>
  );
}
