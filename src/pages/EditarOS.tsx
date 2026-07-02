import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadOSImage } from "@/lib/supabase-helpers";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditarOS() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: os } = useQuery({
    queryKey: ["os_escaneadas", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("os_escaneadas" as any).select("*").eq("id", id!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const [form, setForm] = useState({
    equipamento: "", horimetro: "", area: "", responsavel: "",
    data_inicio: "", hora_inicio: "", manutencao_tipo: "",
    setor: "", data_conclusao: "", hora_conclusao: "",
    observacoes: "", confianca_leitura: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (os) {
      setForm({
        equipamento: os.equipamento,
        horimetro: String(os.horimetro),
        area: os.area,
        responsavel: os.responsavel,
        data_inicio: os.data_inicio,
        hora_inicio: os.hora_inicio,
        manutencao_tipo: os.manutencao_tipo,
        setor: os.setor,
        data_conclusao: os.data_conclusao || "",
        hora_conclusao: os.hora_conclusao || "",
        observacoes: os.observacoes || "",
        confianca_leitura: os.confianca_leitura ? String(os.confianca_leitura) : "",
      });
      setImagePreview(os.imagem_url);
    }
  }, [os]);

  const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      let imagem_url = os!.imagem_url;
      if (imageFile) imagem_url = await uploadOSImage(imageFile);

      const { error } = await supabase.from("os_escaneadas" as any).update({
        imagem_url: imagem_url,
        equipamento: form.equipamento.trim(),
        horimetro: Number(form.horimetro),
        area: form.area.trim(),
        responsavel: form.responsavel.trim(),
        data_inicio: form.data_inicio,
        hora_inicio: form.hora_inicio,
        manutencao_tipo: form.manutencao_tipo,
        setor: form.setor.trim(),
        data_conclusao: form.data_conclusao || null,
        hora_conclusao: form.hora_conclusao || null,
        observacoes: form.observacoes.trim() || null,
        confianca_leitura: form.confianca_leitura ? Number(form.confianca_leitura) : null,
      }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["os_escaneadas"] });
      toast({ title: "OS atualizada!" });
      navigate(`/os/${id}`);
    },
    onError: (err) => {
      toast({ title: "Erro", description: String(err), variant: "destructive" });
    },
  });

  if (!os) return <div className="page-container"><div className="h-40 bg-muted rounded-lg animate-pulse" /></div>;

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-95"><ArrowLeft className="w-5 h-5" /></button>
        <PageHeader title="Editar OS" />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Imagem</Label>
          <label className="flex flex-col items-center border-2 border-dashed border-border rounded-lg p-4 cursor-pointer">
            {imagePreview && <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded mb-2" />}
            <span className="text-xs text-muted-foreground">Toque para alterar imagem</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
            }} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Equipamento</Label><Input value={form.equipamento} onChange={(e) => set("equipamento", e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground">Horímetro</Label><Input type="number" value={form.horimetro} onChange={(e) => set("horimetro", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Área</Label><Input value={form.area} onChange={(e) => set("area", e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground">Responsável</Label><Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Data Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground">Hora Início</Label><Input type="time" value={form.hora_inicio} onChange={(e) => set("hora_inicio", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={form.manutencao_tipo} onValueChange={(v) => set("manutencao_tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CORRETIVA">Corretiva</SelectItem>
                <SelectItem value="COR. PRO.">Cor. Pro.</SelectItem>
                <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                <SelectItem value="COR. EQUIP. RESERV.">Cor. Equip. Reserv.</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs text-muted-foreground">Setor</Label><Input value={form.setor} onChange={(e) => set("setor", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Data Conclusão</Label><Input type="date" value={form.data_conclusao} onChange={(e) => set("data_conclusao", e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground">Hora Conclusão</Label><Input type="time" value={form.hora_conclusao} onChange={(e) => set("hora_conclusao", e.target.value)} /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground">Confiança Leitura (%)</Label><Input type="number" value={form.confianca_leitura} onChange={(e) => set("confianca_leitura", e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground">Observações</Label><Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} /></div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1 active:scale-95" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" className="flex-1 active:scale-95" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  );
}