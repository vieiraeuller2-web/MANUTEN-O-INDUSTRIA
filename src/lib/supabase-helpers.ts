import { supabase } from "@/integrations/supabase/client";

export async function uploadOSImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  
  const { error } = await supabase.storage
    .from('os-images')
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from('os-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysSince(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}