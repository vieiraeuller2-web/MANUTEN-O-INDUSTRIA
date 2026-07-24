import { memo, useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type HTMLAttributes } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Check, CheckCircle2, ChevronsUpDown, History, Loader2, RotateCcw, Save } from "lucide-react";
import type { SheetOS } from "@/lib/sheets-api";
import { useSaveSheetOS, useSheetOS } from "@/hooks/use-sheet-os";
import { normalizeText, safeArray, safeString, uniqueSorted } from "@/lib/data-helpers";
import { cn } from "@/lib/utils";

interface FormData {
  equipamento: string;
  setor: string;
  area: string;
  responsavel: string;
  tipo: string;
  data_inicio: string;
  hora_inicio: string;
  dataConclusao: string;
  horaConclusao: string;
  horimetro: string;
  observacoes: string;
}

type FormField = keyof FormData;
type FormErrors = Partial<Record<FormField, string>>;

const TIPO_OPTIONS = ["CORRETIVA", "COR. PRO.", "PREVENTIVA", "COR. EQUIP. RESERV."];
const RESPONSAVEL_OPTIONS = ["GABRIEL", "LUIS PEDRO"];
const REQUIRED_FIELDS: FormField[] = [
  "equipamento",
  "setor",
  "area",
  "responsavel",
  "tipo",
  "data_inicio",
  "hora_inicio",
  "dataConclusao",
  "horaConclusao",
  "horimetro",
  "observacoes",
];
const FIELD_LABELS: Partial<Record<FormField, string>> = {
  equipamento: "Equipamento",
  setor: "Setor",
  area: "Área",
  responsavel: "Responsável",
  tipo: "Tipo",
  data_inicio: "Data Início",
  hora_inicio: "Hora Início",
  dataConclusao: "Data Conclusão",
  horaConclusao: "Hora Conclusão",
  horimetro: "Horímetro",
  observacoes: "Observações",
};

function initialForm(): FormData {
  return {
    equipamento: "",
    setor: "",
    area: "",
    responsavel: "",
    tipo: "",
    data_inicio: "",
    hora_inicio: "",
    dataConclusao: "",
    horaConclusao: "",
    horimetro: "",
    observacoes: "",
  };
}

interface SelectOptions {
  equipamentos: string[];
  setores: string[];
  areas: string[];
  responsaveis: string[];
  tipos: string[];
}

function isListedValue(value: string, list: string[]) {
  const text = safeString(value);
  if (!text) return true;
  return list.includes(text);
}

const estaPreenchido = (valor: unknown) =>
  valor !== null &&
  valor !== undefined &&
  String(valor).trim() !== "";

function validate(form: FormData, options: SelectOptions): FormErrors {
  const errors: FormErrors = {};

  REQUIRED_FIELDS.forEach((field) => {
    if (!estaPreenchido(form[field])) errors[field] = `${FIELD_LABELS[field]} é obrigatório.`;
  });

  if (estaPreenchido(form.horimetro) && Number.isNaN(Number(form.horimetro))) {
    errors.horimetro = "Informe um número válido";
  }

  if (!isListedValue(form.equipamento, options.equipamentos)) {
    errors.equipamento = "Selecione um equipamento da lista";
  }
  if (!isListedValue(form.setor, options.setores)) {
    errors.setor = "Selecione um setor da lista";
  }
  if (!isListedValue(form.area, options.areas)) {
    errors.area = "Selecione uma área da lista";
  }
  if (!isListedValue(form.responsavel, options.responsaveis)) {
    errors.responsavel = "Selecione um responsável da lista";
  }
  if (!isListedValue(form.tipo, options.tipos)) {
    errors.tipo = "Selecione um tipo da lista";
  }

  if (form.dataConclusao && form.data_inicio && form.dataConclusao < form.data_inicio) {
    errors.dataConclusao = "A data final não pode ser anterior";
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
        inputMode={inputMode}
        className={error ? "border-destructive ring-1 ring-destructive/30" : "border-l-2 border-l-primary/40"}
        aria-invalid={!!error}
      />
      {error && <FieldError message={error} />}
    </div>
  );
});

interface SearchableLockedSelectFieldProps {
  label: string;
  field: FormField;
  value: string;
  options: string[];
  error?: string;
  onChange: (field: FormField, value: string) => void;
  required?: boolean;
  placeholder?: string;
}

const SearchableLockedSelectField = memo(function SearchableLockedSelectField({
  label,
  field,
  value,
  options,
  error,
  onChange,
  required,
  placeholder = "Selecione",
}: SearchableLockedSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hasOptions = options.length > 0;

  const filteredOptions = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return options.slice(0, 100);
    return options.filter((option) => normalizeText(option).includes(q)).slice(0, 100);
  }, [options, query]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setQuery("");
  }, []);

  const selectOption = useCallback(
    (selected: string) => {
      onChange(field, selected);
      setOpen(false);
      setQuery("");
    },
    [field, onChange],
  );

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={!!error}
            disabled={!hasOptions}
            className={cn(
              "h-10 w-full justify-between bg-background px-3 text-left font-normal",
              error ? "border-destructive ring-1 ring-destructive/30" : "border-l-2 border-l-primary/40",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate">{value || (hasOptions ? placeholder : "Nenhuma opção disponível")}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[72] w-[var(--radix-popover-trigger-width)] p-2">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Digite para filtrar..."
            className="mb-2 h-9"
          />
          <div className="max-h-72 overflow-y-auto pr-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                Nenhum resultado encontrado na lista.
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(option)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === option ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{option}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
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

export default function NovaOS() {
  const { data: historico } = useSheetOS();
  const mutation = useSaveSheetOS();
  const [form, setForm] = useState<FormData>(() => initialForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [saved, setSaved] = useState(false);
  const submittingRef = useRef(false);

  const listaSegura = safeArray<SheetOS>(historico);
  const options = useMemo(
    () => ({
      equipamentos: uniqueSorted(listaSegura.map((os) => os.equipamento)),
      setores: uniqueSorted(listaSegura.map((os) => os.setor)),
      areas: uniqueSorted(listaSegura.map((os) => os.area)),
      responsaveis: uniqueSorted([...RESPONSAVEL_OPTIONS, ...listaSegura.map((os) => os.responsavel)]),
      tipos: uniqueSorted([...TIPO_OPTIONS, ...listaSegura.map((os) => os.tipo)]),
    }),
    [listaSegura],
  );

  const setField = useCallback((field: FormField, value: string) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
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

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSaved(false);
      const nextErrors = validate(form, options);
      setErrors(nextErrors);
      const firstError = Object.values(nextErrors)[0];
      if (firstError) {
        toast({
          title: "Não foi possível salvar a OS.",
          description: firstError,
          variant: "destructive",
        });
        return;
      }
      if (mutation.isPending || submittingRef.current) return;
      submittingRef.current = true;
      mutation.mutate(
        { ...form },
        {
          onSuccess: () => {
            toast({ title: "Registro de OS salvo com sucesso." });
            setSaved(true);
            setForm(initialForm());
            setErrors({});
          },
          onError: (err: unknown) => {
            console.error("Erro ao salvar registro de OS:", err);
            setSaved(false);
            toast({
              title: "Erro ao salvar registro.",
              description: err instanceof Error ? err.message : "Erro ao salvar OS.",
              variant: "destructive",
            });
          },
          onSettled: () => {
            submittingRef.current = false;
          },
        },
      );
    },
    [form, mutation, options],
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
            <SearchableLockedSelectField
              label="Equipamento / TAG"
              field="equipamento"
              value={form.equipamento}
              options={options.equipamentos}
              error={errors.equipamento}
              onChange={setField}
              required
            />
            <TextField
              label="Horímetro"
              field="horimetro"
              type="number"
              inputMode="decimal"
              value={form.horimetro}
              error={errors.horimetro}
              onChange={setField}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchableLockedSelectField
              label="Setor"
              field="setor"
              value={form.setor}
              options={options.setores}
              error={errors.setor}
              onChange={setField}
              required
            />
            <SearchableLockedSelectField
              label="Área"
              field="area"
              value={form.area}
              options={options.areas}
              error={errors.area}
              onChange={setField}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchableLockedSelectField
              label="Responsável"
              field="responsavel"
              value={form.responsavel}
              options={options.responsaveis}
              error={errors.responsavel}
              onChange={setField}
              required
            />
            <SearchableLockedSelectField
              label="Tipo de serviço"
              field="tipo"
              value={form.tipo}
              options={options.tipos}
              error={errors.tipo}
              onChange={setField}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <TextField
              label="Data Início"
              field="data_inicio"
              type="date"
              value={form.data_inicio}
              error={errors.data_inicio}
              onChange={setField}
              required
            />
            <TextField
              label="Hora Início"
              field="hora_inicio"
              type="time"
              value={form.hora_inicio}
              error={errors.hora_inicio}
              onChange={setField}
              required
            />
            <TextField
              label="Data Conclusão"
              field="dataConclusao"
              type="date"
              value={form.dataConclusao}
              error={errors.dataConclusao}
              onChange={setField}
              required
            />
            <TextField
              label="Hora Conclusão"
              field="horaConclusao"
              type="time"
              value={form.horaConclusao}
              error={errors.horaConclusao}
              onChange={setField}
              required
            />
          </div>
        </div>

        <div className="stat-card">
          <TextAreaField label="Observações" field="observacoes" value={form.observacoes} error={errors.observacoes} onChange={setField} required rows={6} />
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

    </div>
  );
}
