import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Plus, Search, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WorkspaceItemCard from "@/components/workspace/WorkspaceItemCard";
import WorkspaceItemDialog from "@/components/workspace/WorkspaceItemDialog";

export const Route = createFileRoute("/_authed/workspace")({
  head: () => ({ meta: [{ title: "Workspace library — ONEORIGIN" }] }),
  component: WorkspacePage,
});

const filters = [
  { value: "all", label: "All work" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Audio" },
  { value: "video", label: "Video" },
  { value: "code", label: "Code" },
];

function WorkspacePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.WorkspaceItem.list({ sort: "-updated_date", limit: 100 });
      setItems(Array.isArray(page) ? page : page.items || []);
    } catch (error) {
      toast.error(error?.message || "Could not load your workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = filter === "all" || item.type === filter;
      const matchesQuery =
        !q ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.prompt || "").toLowerCase().includes(q) ||
        (item.content || "").toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [items, filter, query]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try {
      await base44.entities.WorkspaceItem.delete(item.id);
      toast.success("Item deleted");
      load();
    } catch (error) {
      toast.error(error?.message || "Could not delete this item");
    }
  };

  return (
    <div className="relative">
      <div className="absolute -top-16 right-0 w-[420px] h-[300px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] font-bold text-accent mb-3">WORKSPACE LIBRARY</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your saved work</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Everything the agent creates or you save is kept here — reopen it, refine it, or start again from it.
            </p>
          </div>
          <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90 h-11 px-5 rounded-full shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Save new work
          </Button>
        </div>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-xs border transition-all ${
                  filter === f.value
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-accent/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your work"
              className="pl-9 bg-card border-border h-10"
            />
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-52 rounded-2xl border border-border/40 bg-card/40 animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl border border-accent/30 bg-background flex items-center justify-center text-accent">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="mt-5 font-semibold">
                {items.length === 0 ? "Nothing saved yet" : "No results for this filter"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                {items.length === 0
                  ? "Save an output from the agent, or add one yourself — it will appear here for next time."
                  : "Try another type or a different search term."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button onClick={openNew} variant="outline" className="border-border bg-transparent h-10">
                  <Plus className="w-4 h-4 mr-2" /> Save new work
                </Button>
                <Button asChild className="bg-foreground text-background hover:bg-foreground/90 h-10">
                  <Link to="/Agent">Open the agent</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                {visible.length} {visible.length === 1 ? "item" : "items"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item) => (
                  <WorkspaceItemCard key={item.id} item={item} onEdit={openEdit} onDelete={remove} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <WorkspaceItemDialog
        open={dialogOpen}
        item={editing}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />
    </div>
  );
}
