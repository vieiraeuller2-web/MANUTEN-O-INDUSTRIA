import { memo, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeText } from "@/lib/data-helpers";
import { responsavelForaDaLista } from "@/lib/responsaveis-os";
import { cn } from "@/lib/utils";

interface ResponsavelFieldProps {
  value: string;
  options: string[];
  error?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default memo(function ResponsavelField({
  value,
  options,
  error,
  onChange,
  disabled,
}: ResponsavelFieldProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const filtrados = useMemo(() => {
    const termo = normalizeText(busca);
    return (termo ? options.filter((item) => normalizeText(item).includes(termo)) : options).slice(0, 100);
  }, [busca, options]);
  const manual = responsavelForaDaLista(value, options);

  return (
    <div className="space-y-1">
      <Label htmlFor="responsavel" className="text-xs font-medium text-muted-foreground">
        Colaborador / Responsável <span className="text-destructive">*</span>
      </Label>
      <div className="flex gap-2">
        <Input
          id="responsavel"
          name="responsavel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Selecione na lista ou digite o nome"
          autoComplete="off"
          maxLength={120}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={manual ? "responsavel-manual-aviso" : undefined}
          className={cn(
            "min-w-0 flex-1 border-l-2 border-l-primary/40",
            error && "border-destructive ring-1 ring-destructive/30",
          )}
        />
        <Popover open={open} onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) setBusca("");
        }}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label="Abrir lista de colaboradores"
              aria-expanded={open}
              disabled={disabled || options.length === 0}
              className="shrink-0 px-3"
              title="Selecionar colaborador cadastrado ou responsável histórico"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="z-[72] w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[min(90vw,400px)] p-2">
            <Input
              autoFocus
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar na lista..."
              aria-label="Pesquisar colaboradores na lista"
              className="mb-2 h-9"
            />
            <div className="max-h-72 overflow-y-auto pr-1">
              {filtrados.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhum nome encontrado. Você pode digitar no campo.</p>
              ) : filtrados.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === item ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {manual && (
        <p id="responsavel-manual-aviso" className="text-xs text-muted-foreground">
          Nome digitado manualmente. Confirme o vínculo: nomes fora do cadastro podem não ser associados ao HH/custo.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
});
