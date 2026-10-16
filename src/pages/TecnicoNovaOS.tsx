import { FormEvent, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormOptionsOS } from "@/hooks/use-form-options-os";
import { registrarOSManualTecnico } from "@/lib/tecnico-api";
import { toast } from "@/hooks/use-toast";

interface FormState {
  equipamento: string;
  area: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  data_conclusao: string;
  hora_conclusao: string;
  horimetro: string;
  observacoes: string;
}

function initialForm(): FormState {
  return {
    equipamento: "",
    area: "",
    tipo: "",
    data_inicio: "",
    hora_inicio: "",
    data_conclusao: "",
    hora_conclusao: "",
    horimetro: "",
    observacoes: "",
  };
}

export default function TecnicoNovaOS() {
  const navigate = useNavigate();
  const { data: options, isLoading: loadingOptions } = useFormOptionsOS();
  const [form, setForm] = useState<FormState>(() => initialForm());
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  const submittingRef = useRef(false);

  const equipamentos = useMemo(() => options?.equipamentos ?? [], [options]);
  const areas = useMemo(() => options?.areas ?? [], [options]);
  const tipos = useMemo(() => options?.tipos ?? [], [options]);

  const setField = (field: keyof FormState, value: string) => {
    setSavedId("");
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const obrigatorios: (keyof FormState)[] = [
      "equipamento",
      "area",
      "tipo",
      "data_inicio",
      "hora_inicio",
      "data_conclusao",
      "hora_conclusao",
      "horimetro",
      "observacoes",
    ];

    const faltando = obrigatorios.find((field) => !form[field].trim());
    if (faltando) {
      toast({
        title: "Preencha todos os campos.",
        description: "A OS manual segue os mesmos campos obrigatórios do fluxo QR.",
        variant: "destructive",
      });
      return;
    }

    if (!equipamentos.includes(form.equipamento)) {
      toast({
        title: "Equipamento inválido.",
        description: "Selecione um equipamento da lista oficial.",
        variant: "destructive",
      });
      return;
    }

    if (!areas.includes(form.area) || !tipos.includes(form.tipo)) {
      toast({
        title: "Opção inválida.",
        description: "Selecione área e tipo das listas oficiais.",
        variant: "destructive",
      });
      return;
    }

    if (form.data_conclusao < form.data_inicio) {
      toast({
        title: "Período inválido.",
        description: "A conclusão não pode ser anterior ao início.",
        variant: "destructive",
      });
      return;
    }

    if (saving || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);

    try {
      const result = await registrarOSManualTecnico(form);
      const id = result.id_os || result.numero_os || "";
      setSavedId(id);
      setForm(initialForm());

      toast({
        title: "OS registrada com sucesso.",
        description: id ? `OS ${id}` : "A ordem foi registrada pelo backend.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível registrar a OS.",
        description:
          error instanceof Error ? error.message : "Erro ao registrar OS manual.",
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="page-container max-w-3xl pb-24">
      <PageHeader
        title="Nova OS"
        subtitle="Lançamento manual pelo técnico"
      />

      {savedId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          OS {savedId} registrada com sucesso.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="stat-card space-y-4">
          <div className="space-y-1">
            <Label htmlFor="equipamento">Equipamento / TAG *</Label>
            <select
              id="equipamento"
              value={form.equipamento}
              onChange={(e) => setField("equipamento", e.target.value)}
              disabled={loadingOptions}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">
                {loadingOptions ? "Carregando..." : "Selecione o equipamento"}
              </option>
              {equipamentos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="area">Área *</Label>
              <select
                id="area"
                value={form.area}
                onChange={(e) => setField("area", e.target.value)}
                disabled={loadingOptions}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione</option>
                {areas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tipo">Tipo *</Label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={(e) => setField("tipo", e.target.value)}
                disabled={loadingOptions}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione</option>
                {tipos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="data_inicio">Data início *</Label>
              <Input
                id="data_inicio"
                type="date"
                value={form.data_inicio}
                onChange={(e) => setField("data_inicio", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hora_inicio">Hora início *</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setField("hora_inicio", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="data_conclusao">Data conclusão *</Label>
              <Input
                id="data_conclusao"
                type="date"
                value={form.data_conclusao}
                onChange={(e) => setField("data_conclusao", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hora_conclusao">Hora conclusão *</Label>
              <Input
                id="hora_conclusao"
                type="time"
                value={form.hora_conclusao}
                onChange={(e) => setField("hora_conclusao", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="horimetro">Horímetro *</Label>
            <Input
              id="horimetro"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={form.horimetro}
              onChange={(e) => setField("horimetro", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="observacoes">Descrição / Observações *</Label>
            <Textarea
              id="observacoes"
              rows={6}
              value={form.observacoes}
              onChange={(e) => setField("observacoes", e.target.value)}
              placeholder="Descreva o serviço executado"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full gap-2 text-base"
          disabled={saving || loadingOptions}
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Registrar OS
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => navigate("/tecnico")}
          disabled={saving}
        >
          Voltar para Minhas OS
        </Button>
      </form>
    </div>
  );
}
