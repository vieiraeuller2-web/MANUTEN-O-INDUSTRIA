import { AlertTriangle, CheckCircle2, EyeOff, Info, ShieldCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { safeString } from "@/lib/data-helpers";
import type { NoPreventiva, PlanoPreventiva } from "@/types/preventivas";
import { valorEhNao, valorEhSim } from "./preventivas-utils";

interface DetalhePlanoPreventivoProps {
  no: NoPreventiva | null;
  plano?: PlanoPreventiva;
  onOpenChange: (aberto: boolean) => void;
}

const campos: Array<{ chave: keyof NoPreventiva; rotulo: string; icon: typeof Info }> = [
  { chave: "criterio_aceite", rotulo: "Critério de aceite", icon: CheckCircle2 },
  { chave: "metodo_verificacao", rotulo: "Método de verificação", icon: Info },
  { chave: "ferramenta", rotulo: "Ferramenta", icon: Wrench },
  { chave: "risco_se_nao_executar", rotulo: "Risco se não executar", icon: AlertTriangle },
  { chave: "especialidade", rotulo: "Especialidade", icon: ShieldCheck },
  { chave: "observacao", rotulo: "Observações", icon: Info },
];

export default function DetalhePlanoPreventivo({ no, plano, onOpenChange }: DetalhePlanoPreventivoProps) {
  const titulo = safeString(no?.item_verificacao || no?.nome_no, "Item do checklist");
  return (
    <Sheet open={Boolean(no)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-5 sm:max-w-lg">
        <SheetHeader className="pr-7 text-left">
          <div className="flex flex-wrap gap-1.5">
            {no && valorEhSim(no.obrigatorio) && <Badge className="bg-primary text-primary-foreground">Obrigatório</Badge>}
            {no && valorEhNao(no.exibir_no_pdf) && <Badge variant="outline" className="gap-1 text-muted-foreground"><EyeOff className="h-3 w-3" />Fora do PDF</Badge>}
          </div>
          <SheetTitle className="break-words text-lg">{titulo}</SheetTitle>
          <SheetDescription>{plano?.titulo_plano || "Detalhes técnicos do item selecionado."}</SheetDescription>
        </SheetHeader>

        {no && (
          <div className="mt-6 space-y-3">
            {campos.flatMap(({ chave, rotulo, icon: Icone }) => {
              const valor = safeString(no[chave]);
              if (!valor) return [];
              return [
                <div key={chave} className="rounded-lg border bg-card p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Icone className="h-3.5 w-3.5" /> {rotulo}
                  </p>
                  <p className="break-words text-sm leading-relaxed text-foreground">{valor}</p>
                </div>,
              ];
            })}
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-semibold text-muted-foreground">Obrigatoriedade</p>
              <p className="mt-1 text-sm text-foreground">{valorEhSim(no.obrigatorio) ? "Item obrigatório" : "Item não marcado como obrigatório"}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
