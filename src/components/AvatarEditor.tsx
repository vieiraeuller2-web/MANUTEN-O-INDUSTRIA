import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Camera, Check, Cog, HardHat, ImageUp, ShieldCheck, UserRound, Wrench, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export type AvatarPreset = "hardhat" | "wrench" | "cog" | "shield" | "person";
export type AvatarSelection = { kind: "preset"; preset: AvatarPreset } | { kind: "photo"; photo: string };

export const DEFAULT_AVATAR: AvatarSelection = { kind: "preset", preset: "hardhat" };
const PHOTO_LIMIT_BYTES = 5 * 1024 * 1024;

const PRESETS = [
  { id: "hardhat", label: "Técnico", Icon: HardHat },
  { id: "wrench", label: "Manutenção", Icon: Wrench },
  { id: "cog", label: "Mecânica", Icon: Cog },
  { id: "shield", label: "Segurança", Icon: ShieldCheck },
  { id: "person", label: "Perfil", Icon: UserRound },
] as const;

function avatarStorageKey(login: string) {
  return `kron:profile-avatar:v1:${encodeURIComponent(login)}`;
}

export function readAvatar(login: string): AvatarSelection {
  if (!login) return DEFAULT_AVATAR;
  try {
    const raw = localStorage.getItem(avatarStorageKey(login));
    if (!raw) return DEFAULT_AVATAR;
    const saved: unknown = JSON.parse(raw);
    if (saved && typeof saved === "object" && "kind" in saved) {
      if (saved.kind === "preset" && "preset" in saved && PRESETS.some((p) => p.id === saved.preset)) {
        return { kind: "preset", preset: saved.preset as AvatarPreset };
      }
      if (saved.kind === "photo" && "photo" in saved &&
          typeof saved.photo === "string" && /^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(saved.photo) &&
          saved.photo.length < 150000) {
        return { kind: "photo", photo: saved.photo };
      }
    }
  } catch {
    // Navegadores com armazenamento indisponível usam o avatar padrão.
  }
  return DEFAULT_AVATAR;
}

export function persistAvatar(login: string, avatar: AvatarSelection): boolean {
  if (!login) return false;
  try {
    localStorage.setItem(avatarStorageKey(login), JSON.stringify(avatar));
    return true;
  } catch {
    return false;
  }
}

export function AvatarFace({ avatar, size = 20 }: { avatar: AvatarSelection; size?: number }) {
  if (avatar.kind === "photo") {
    return <img className="kron-user-photo" src={avatar.photo} alt="" aria-hidden="true" />;
  }
  const selected = PRESETS.find((preset) => preset.id === avatar.preset) ?? PRESETS[0];
  const Icon = selected.Icon;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}

async function compressPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Escolha uma foto JPG, PNG ou WebP.");
  }
  if (file.size > PHOTO_LIMIT_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const url = URL.createObjectURL(file);
  try {
    const source = new Image();
    source.src = url;
    await source.decode();
    if (!source.naturalWidth || !source.naturalHeight) throw new Error("Arquivo de imagem inválido.");
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar esta imagem.");
    const shortSide = Math.min(source.naturalWidth, source.naturalHeight);
    context.drawImage(
      source,
      (source.naturalWidth - shortSide) / 2,
      (source.naturalHeight - shortSide) / 2,
      shortSide,
      shortSide,
      0, 0, 192, 192,
    );
    const photo = canvas.toDataURL("image/jpeg", 0.78);
    if (photo.length > 150000) throw new Error("A foto ficou muito grande. Tente outra imagem.");
    return photo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarEditor({
  open,
  onOpenChange,
  avatar,
  onSelect,
  login,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatar: AvatarSelection;
  onSelect: (avatar: AvatarSelection) => void;
  login: string;
  name: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function saveAvatar(next: AvatarSelection) {
    onSelect(next);
    if (!persistAvatar(login, next)) {
      toast({ title: "Avatar alterado nesta sessão", description: "O navegador não permitiu salvar a preferência neste dispositivo.", variant: "destructive" });
      return;
    }
    toast({ title: "Avatar atualizado", description: "Preferência salva neste navegador." });
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const photo = await compressPhoto(file);
      saveAvatar({ kind: "photo", photo });
    } catch (error) {
      toast({ title: "Não foi possível usar a foto", description: error instanceof Error ? error.message : "Imagem inválida.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="kron-avatar-dialog sm:max-w-md" aria-describedby="kron-avatar-description">
        <DialogHeader>
          <DialogTitle>Personalizar meu avatar</DialogTitle>
          <DialogDescription id="kron-avatar-description">
            Escolha um ícone ou adicione uma foto para o seu perfil KRON.
          </DialogDescription>
        </DialogHeader>
        <div className="kron-avatar-editor">
          <div className="kron-avatar-editor__preview">
            <span className="kron-avatar-editor__preview-face"><AvatarFace avatar={avatar} size={37}/></span>
            <div>
              <strong>{name}</strong>
              <small>Prévia do seu perfil</small>
            </div>
          </div>
          <span className="kron-avatar-editor__section">ESCOLHA UM AVATAR</span>
          <div className="kron-avatar-editor__options">
            {PRESETS.map(({ id, label, Icon }) => {
              const selected = avatar.kind === "preset" && avatar.preset === id;
              return (
                <button type="button" key={id} aria-label={`Usar avatar ${label}`} title={label}
                  aria-pressed={selected}
                  className={`kron-avatar-editor__option ${selected ? "is-selected" : ""}`}
                  onClick={() => saveAvatar({ kind: "preset", preset: id })}>
                  <Icon size={23} strokeWidth={1.6}/>
                  {selected && <Check className="kron-avatar-editor__check" size={13}/>}
                </button>
              );
            })}
          </div>
          <span className="kron-avatar-editor__section">OU USE SUA FOTO</span>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp"
            className="sr-only" onChange={handleUpload} aria-label="Selecionar foto do dispositivo"/>
          <button type="button" className="kron-avatar-editor__upload"
            onClick={() => fileInput.current?.click()} disabled={busy}>
            <ImageUp size={19}/>{busy ? "Preparando foto..." : "Escolher foto do dispositivo"}
            <Camera size={15}/>
          </button>
          <p className="kron-avatar-editor__note">
            JPG, PNG ou WebP, até 5 MB. A foto é reduzida e salva apenas neste navegador, neste dispositivo;
            não é enviada ao servidor e não sincroniza entre computadores.
          </p>
          {avatar.kind === "photo" && (
            <button type="button" onClick={() => saveAvatar(DEFAULT_AVATAR)}
              className="kron-avatar-editor__remove"><X size={14}/> Remover foto</button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
