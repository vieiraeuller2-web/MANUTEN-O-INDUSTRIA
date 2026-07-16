import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreventivasEstadoProps {
  tipo: "loading" | "erro" | "vazio";
  mensagem: string;
  detalhe?: string;
  onTentarNovamente?: () => void;
}

export default function PreventivasEstado({
  tipo,
  mensagem,
  detalhe,
  onTentarNovamente,
}: PreventivasEstadoProps) {
  const Icone = tipo === "loading" ? Loader2 : tipo === "erro" ? AlertCircle : Inbox;
  return (
    <div
      className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-5 text-center"
      role={tipo === "erro" ? "alert" : "status"}
    >
      <Icone
        className={`mb-2 h-5 w-5 ${
          tipo === "loading" ? "animate-spin text-primary" : tipo === "erro" ? "text-destructive" : "text-muted-foreground"
        }`}
      />
      <p className="text-sm font-medium text-foreground">{mensagem}</p>
      {detalhe && <p className="mt-1 max-w-md text-xs text-muted-foreground">{detalhe}</p>}
      {tipo === "erro" && onTentarNovamente && (
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onTentarNovamente}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
