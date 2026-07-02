import { memo, useCallback, useMemo, useState, type ChangeEvent, type FormEvent, type HTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, History, Loader2, RotateCcw, Save } from "lucide-react";
import { createOSInSheet, SheetOS } from "@/lib/sheets-api";
import { useSheetOS } from "@/hooks/use-sheet-os";
import { safeArray, safeString, uniqueSorted } from "@/lib/data-helpers";

interface FormData {
  equipamento: string;
  setor: string;
  area: string;
  responsavel: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  horimetro: string;
  descricao: string;
  causa: string;
  acao: string;
  observacoes: string;
}

type FormField = keyof FormData;
type FormErrors = Partial<Record<FormField, string>>;

const TIPO_OPTIONS = ["CORRETIVA", "COR. PRO.", "PREVENTIVA", "COR. EQUIP. RESERV."];

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function initialForm(): FormData {
  const today = todayLocalISO();
  return {
    equipamento: "",
    setor: "",
    area: "",
    responsavel: "",
    tipo: "",
    data_inicio: today,
    hora_inicio: "",
    data_fim: today,
    hora_fim: "",
    horimetro: "",
    descricao: "",
    causa: "",
    acao: "",
    observacoes: "",
  };
}

function buildDescricao(form: FormData) {
  const blocos = [
    ["Descrição do serviço", form.descricao],
    ["Causa provável", form.causa],
    ["Ação realizada", form.acao],
    ["Observações", form.observacoes],
  ]
    .map(([label, value]) => [label, safeString(value)] as const)
    .filter(([, value]) => value);

  return blocos.map(([label, value]) => `${label}: ${value}`).join("\n\n");
}

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {};
  const required: FormField[] = ["equipamento", "responsavel", "tipo", "data_inicio", "hora_inicio", "hora_fim", "descricao"];

  required.forEach((field) => {
    if (!safeString(form[field])) errors[field] = "Obrigatório";
  });

  if (form.horimetro && Number.isNaN(Number(form.horimetro))) {
    errors.horimetro = "Informe um número válido";
  }

  const dataFim = form.data_fim || form.data_inicio;
  if (dataFim && form.data_inicio && dataFim < form.data_inicio) {
    errors.data_fim = "A data final não pode ser anterior";
  }

  return errors;
}

interface TextFieldProps {
  label: string;
  field: FormField;
  value: string;
  error?: string;
  onChange: (field: FormField, value: string) => void;
  type?: string;
  required?: boolean;
  list?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}

const TextField = memo(function TextField({
  label,
  field,
  value,
  error,
  onChange,
  type = "text",
  required,
  list,
  inputMode,
}: TextFieldProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value),
    [field, onChange],
  );

  return (
    <div className="space-y-1">
      <Label htmlFor={field} className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={field}
        name={field}
        type={type}
        value={value}
        onChange={handleChange}
        list={list}
        inputMode={inputMode}
        className={error ? "border-destructive ring-1 ring-destructive/30" : "border-l-2 border-l-primary/40"}
        aria-invalid={!!error}
      />
      {error && <FieldError message={error} />}
    </div>
  );
});

interface TextAreaFieldProps {
  label: string;
  field: FormField;
  value: string;
  error?: string;
  onChange: (field: FormField, value: string) => void;
  required?: boolean;
  rows?: number;
}

const TextAreaField = memo(function TextAreaField({
  label,
  field,
  value,
  error,
  onChange,
  required,
  rows = 3,
}: TextAreaFieldProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => onChange(field, event.target.value),
    [field, onChange],
  );

  return (
    <div className="space-y-1">
      <Label htmlFor={field} className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Textarea
        id={field}
        name={field}
        value={value}
        onChange={handleChange}
        rows={rows}
        className={error ? "border-destructive ring-1 ring-destructive/30" : "border-l-2 border-l-primary/40"}
        aria-invalid={!!error}
      />
      {error && <FieldError message={error} />}
    </div>
  );
});

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}

function OptionsList({ id, values }: { id: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <datalist id={id}>
      {values.slice(0, 200).map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}

export default function NovaOS() {
  const queryClient = useQueryClient();
  const { data: historico } = useSheetOS();
  const [form, setForm] = useState<FormData>(() => initialForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [saved, setSaved] = useState(false);

  const listaSegura = safeArray<SheetOS>(historico);
  const options = useMemo(
    () => ({
      equipamentos: uniqueSorted(listaSegura.map((os) => os.equipamento)),
      setores: uniqueSorted(listaSegura.map((os) => os.setor)),
      areas: uniqueSorted(listaSegura.map((os) => os.area)),
      responsaveis: uniqueSorted(listaSegura.map((os) => os.responsavel)),
      tipos: uniqueSorted([...TIPO_OPTIONS, ...listaSegura.map((os) => os.tipo)]),
    }),
    [listaSegura],
  );

  const setField = useCallback((field: FormField, value: string) => {
    setSaved(false);
    setForm((prev) => {
      const next = { ...prev, [field]: value ?? "" };
      if (field === "data_inicio" && (!prev.data_fim || prev.data_fim === prev.data_inicio)) {
        next.data_fim = value ?? "";
      }
      return next;
    });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialForm());
    setErrors({});
    setSaved(false);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const dataFim = form.data_fim || form.data_inicio;
      const descricaoFinal = buildDescricao(form);
      const payload: SheetOS = {
        equipamento: safeString(form.equipamento),
        setor: safeString(form.setor),
        area: safeString(form.area),
        responsavel: safeString(form.responsavel),
        tipo: safeString(form.tipo),
        data_inicio: form.data_inicio,
        hora_inicio: form.hora_inicio,
        data_fim: dataFim,
        hora_fim: form.hora_fim,
        horimetro: form.horimetro ? Number(form.horimetro) : "",
        descricao: descricaoFinal,
      };
      await createOSInSheet(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheet-os"] });
      toast({ title: "Registro de OS salvo com sucesso." });
      setSaved(true);
      setForm(initialForm());
      setErrors({});
    },
    onError: (err: unknown) => {
      console.error("Erro ao salvar registro de OS:", err);
      toast({
        title: "Erro ao salvar registro.",
        description: "Os dados foram mantidos na tela para nova tentativa.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextErrors = validate(form);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0 || mutation.isPending) return;
      mutation.mutate();
    },
    [form, mutation],
  );

  return (
    <div className="page-container">
      <div className="flex items-start justify-between gap-3 mb-2">
        <PageHeader title="Lançamento rápido de OS" subtitle="Registro de serviço já realizado" />
        <Button asChild size="sm" variant="outline" className="gap-2 shrink-0">
          <Link to="/os">
            <History className="h-4 w-4" /> Histórico
          </Link>
        </Button>
      </div>

      {saved && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Registro de OS salvo com sucesso.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="stat-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Equipamento / TAG"
              field="equipamento"
              value={form.equipamento}
              error={errors.equipamento}
              onChange={setField}
              required
              list="os-equipamentos"
            />
            <TextField
              label="Horímetro"
              field="horimetro"
              type="number"
              inputMode="decimal"
              value={form.horimetro}
              error={errors.horimetro}
              onChange={setField}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Setor" field="setor" value={form.setor} error={errors.setor} onChange={setField} list="os-setores" />
            <TextField label="Área" field="area" value={form.area} error={errors.area} onChange={setField} list="os-areas" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Responsável"
              field="responsavel"
              value={form.responsavel}
              error={errors.responsavel}
              onChange={setField}
              required
              list="os-responsaveis"
            />
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">
                Tipo de serviço <span className="text-destructive">*</span>
              </Label>
              <Select value={form.tipo} onValueChange={(value) => setField("tipo", value)}>
                <SelectTrigger className={errors.tipo ? "border-destructive ring-1 ring-destructive/30" : "border-l-2 border-l-primary/40"}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {options.tipos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo && <FieldError message={errors.tipo} />}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <TextField
              label="Data do serviço"
              field="data_inicio"
              type="date"
              value={form.data_inicio}
              error={errors.data_inicio}
              onChange={setField}
              required
            />
            <TextField
              label="Hora início"
              field="hora_inicio"
              type="time"
              value={form.hora_inicio}
              error={errors.hora_inicio}
              onChange={setField}
              required
            />
            <TextField
              label="Hora fim"
              field="hora_fim"
              type="time"
              value={form.hora_fim}
              error={errors.hora_fim}
              onChange={setField}
              required
            />
            <TextField
              label="Data fim"
              field="data_fim"
              type="date"
              value={form.data_fim}
              error={errors.data_fim}
              onChange={setField}
            />
          </div>
        </div>

        <div className="stat-card space-y-4">
          <TextAreaField
            label="Descrição do serviço"
            field="descricao"
            value={form.descricao}
            error={errors.descricao}
            onChange={setField}
            required
          />
          <TextAreaField label="Causa provável" field="causa" value={form.causa} error={errors.causa} onChange={setField} rows={2} />
          <TextAreaField label="Ação realizada" field="acao" value={form.acao} error={errors.acao} onChange={setField} rows={2} />
          <TextAreaField label="Observações" field="observacoes" value={form.observacoes} error={errors.observacoes} onChange={setField} rows={2} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button type="button" variant="outline" className="sm:w-52 gap-2" onClick={resetForm} disabled={mutation.isPending}>
            <RotateCcw className="h-4 w-4" /> Limpar formulário
          </Button>
          <Button type="submit" className="flex-1 gap-2" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar registro
          </Button>
        </div>
      </form>

      <OptionsList id="os-equipamentos" values={options.equipamentos} />
      <OptionsList id="os-setores" values={options.setores} />
      <OptionsList id="os-areas" values={options.areas} />
      <OptionsList id="os-responsaveis" values={options.responsaveis} />
    </div>
  );
}
