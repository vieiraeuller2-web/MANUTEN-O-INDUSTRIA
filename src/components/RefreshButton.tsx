import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onClick: () => void;
  isFetching?: boolean;
  label?: string;
  className?: string;
}

export default function RefreshButton({
  onClick, isFetching, label = "Atualizar", className,
}: RefreshButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isFetching}
      onClick={onClick}
      className={cn("h-8 gap-1.5 text-xs active:scale-95", className)}
      title="Atualizar dados da planilha"
    >
      <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
      {isFetching ? "Atualizando..." : label}
    </Button>
  );
}
