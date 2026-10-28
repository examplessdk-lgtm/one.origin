import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const types = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "code", label: "Code" },
];

const empty = { title: "", type: "text", prompt: "", content: "" };

export default function WorkspaceItemDialog({ open, item, onOpenChange, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? { title: item.title || "", type: item.type || "text", prompt: item.prompt || "", content: item.content || "" }
          : empty
      );
    }
  }, [open, item]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (item) {
        await base44.entities.WorkspaceItem.update(item.id, form);
        toast.success("Item updated");
      } else {
        await base44.entities.WorkspaceItem.create(form);
        toast.success("Item saved to your workspace");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error?.message || "Could not save this item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit work" : "Save new work"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {item ? "Update what the agent produced." : "Keep an output from the agent so you can return to it later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-title">Title</Label>
            <Input id="ws-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Q4 launch strategy draft" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-type">Type</Label>
            <select
              id="ws-type"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-prompt">Original prompt</Label>
            <Textarea id="ws-prompt" value={form.prompt} onChange={(e) => set("prompt", e.target.value)} placeholder="What did you ask the agent?" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-content">Result</Label>
            <Textarea id="ws-content" value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Paste or write the agent's output" rows={7} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border bg-transparent">Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()} className="bg-foreground text-background hover:bg-foreground/90">
              {saving ? "Saving…" : item ? "Save changes" : "Save to workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
