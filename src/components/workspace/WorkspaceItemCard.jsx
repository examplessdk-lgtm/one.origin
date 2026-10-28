import { Type, Image as ImageIcon, Mic, Video, Code2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const typeMap = {
  text: { icon: Type, label: "Text" },
  image: { icon: ImageIcon, label: "Image" },
  audio: { icon: Mic, label: "Audio" },
  video: { icon: Video, label: "Video" },
  code: { icon: Code2, label: "Code" },
};

export default function WorkspaceItemCard({ item, onEdit, onDelete }) {
  const meta = typeMap[item.type] || typeMap.text;
  const Icon = meta.icon;
  const date = new Date(item.updated_date || item.created_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-background text-accent">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(item)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(item)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <h3 className="mt-4 text-base font-semibold leading-snug">{item.title}</h3>
      {item.prompt && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.prompt}</p>}
      {item.content && (
        <p className="mt-3 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground/90 line-clamp-4 whitespace-pre-wrap">
          {item.content}
        </p>
      )}
      <div className="mt-auto pt-4 text-[10px] uppercase tracking-widest text-muted-foreground/60">{date}</div>
    </div>
  );
}
