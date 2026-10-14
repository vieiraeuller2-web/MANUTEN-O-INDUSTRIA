import { BarChart3, Gauge } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Relatorios from "@/pages/Relatorios";
import DashboardExecutivo from "@/pages/DashboardExecutivo";

export default function RelatoriosHub() {
  return (
    <Tabs defaultValue="tradicional" className="w-full">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Relatórios e Indicadores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulte a visão tradicional existente ou os KPIs oficiais homologados.
          </p>
        </div>

        <TabsList className="mt-4 grid h-auto w-full max-w-xl grid-cols-2">
          <TabsTrigger value="tradicional" className="gap-2 py-2.5">
            <BarChart3 className="h-4 w-4" />
            Visão tradicional
          </TabsTrigger>
          <TabsTrigger value="oficiais" className="gap-2 py-2.5">
            <Gauge className="h-4 w-4" />
            Indicadores oficiais
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tradicional" className="mt-0">
        <Relatorios />
      </TabsContent>

      <TabsContent value="oficiais" className="mt-0">
        <DashboardExecutivo />
      </TabsContent>
    </Tabs>
  );
}
