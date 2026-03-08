import { useState } from "react";
import { useSubjectTracks, useTrackMutations, type SubjectTrack } from "@/hooks/useSubjectTracks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, BookOpen, Languages, Code, Music, Palette, Dumbbell } from "lucide-react";
import { toast } from "sonner";

const ICONS = [
  { value: "BookOpen", label: "📚 Academics", Icon: BookOpen },
  { value: "Languages", label: "🌍 Language", Icon: Languages },
  { value: "Code", label: "💻 Coding", Icon: Code },
  { value: "Music", label: "🎵 Music", Icon: Music },
  { value: "Palette", label: "🎨 Art", Icon: Palette },
  { value: "Dumbbell", label: "💪 Fitness", Icon: Dumbbell },
];

const CATEGORIES = ["Core Academics", "Language Lab", "Tech Skills", "Creative Arts", "Physical Ed"];
const UNIT_TYPES = ["lessons", "minutes", "sessions", "chapters", "exercises"];
const COLORS = [
  { value: "primary", label: "Navy Blue" },
  { value: "secondary", label: "Gold" },
  { value: "info", label: "Blue" },
  { value: "success", label: "Green" },
  { value: "warning", label: "Orange" },
  { value: "accent", label: "Amber" },
  { value: "destructive", label: "Red" },
];

const EMPTY_FORM = {
  name: "",
  category: "Core Academics",
  daily_target: 1,
  unit_type: "lessons",
  icon: "BookOpen",
  color: "primary",
  enabled: true,
};

export function TrackManagement({ studentId }: { studentId: string }) {
  const { data: tracks = [], isLoading } = useSubjectTracks(studentId);
  const { addTrack, updateTrack, deleteTrack } = useTrackMutations(studentId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Track name is required");
      return;
    }
    try {
      if (editingId) {
        await updateTrack.mutateAsync({ id: editingId, ...form });
        toast.success("Track updated!");
      } else {
        await addTrack.mutateAsync({ ...form, student_id: studentId });
        toast.success("Track created!");
      }
      closeDialog();
    } catch (err: any) {
      toast.error("Failed: " + (err.message || "Unknown error"));
    }
  };

  const handleToggle = async (track: SubjectTrack) => {
    try {
      await updateTrack.mutateAsync({ id: track.id, enabled: !track.enabled });
      toast.success(`${track.name} ${track.enabled ? "disabled" : "enabled"}`);
    } catch {
      toast.error("Failed to toggle track");
    }
  };

  const handleDelete = async (track: SubjectTrack) => {
    if (!confirm(`Delete "${track.name}"? This will also remove all activity logs for this track.`)) return;
    try {
      await deleteTrack.mutateAsync(track.id);
      toast.success("Track deleted");
    } catch {
      toast.error("Failed to delete track");
    }
  };

  const openEdit = (track: SubjectTrack) => {
    setEditingId(track.id);
    setForm({
      name: track.name,
      category: track.category,
      daily_target: track.daily_target,
      unit_type: track.unit_type,
      icon: track.icon,
      color: track.color,
      enabled: track.enabled,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const getIconComponent = (iconName: string) => {
    const found = ICONS.find(i => i.value === iconName);
    return found ? found.Icon : BookOpen;
  };

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const grouped = tracks.reduce<Record<string, SubjectTrack[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg">Learning Tracks</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="font-display" onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); }}>
              <Plus size={14} className="mr-1" /> Add Track
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Edit Track" : "New Learning Track"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Track Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Time4Learning, Rosetta Stone Spanish" />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Daily Target</label>
                  <Input type="number" min={1} max={100} value={form.daily_target}
                    onChange={e => setForm(f => ({ ...f, daily_target: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit Type</label>
                  <Select value={form.unit_type} onValueChange={v => setForm(f => ({ ...f, unit_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Icon</label>
                  <Select value={form.icon} onValueChange={v => setForm(f => ({ ...f, icon: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICONS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <Select value={form.color} onValueChange={v => setForm(f => ({ ...f, color: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} disabled={addTrack.isPending || updateTrack.isPending} className="w-full font-display">
                {addTrack.isPending || updateTrack.isPending ? "Saving..." : editingId ? "Update Track" : "Create Track"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen size={36} className="mx-auto mb-3" />
          <p className="font-display text-lg">No tracks configured yet</p>
          <p className="text-sm">Add learning tracks to start tracking progress by category.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catTracks]) => (
          <div key={category} className="rounded-xl bg-card border p-4 shadow-sm">
            <h4 className="font-display font-semibold text-sm text-muted-foreground mb-3">{category}</h4>
            <div className="space-y-2">
              {catTracks.map(track => {
                const TrackIcon = getIconComponent(track.icon);
                return (
                  <div key={track.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                    track.enabled ? "bg-muted/50" : "bg-muted/20 opacity-60"
                  }`}>
                    <TrackIcon size={18} className={`text-${track.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Target: {track.daily_target} {track.unit_type}/day
                      </p>
                    </div>
                    <Switch checked={track.enabled} onCheckedChange={() => handleToggle(track)} />
                    <button onClick={() => openEdit(track)} className="text-muted-foreground hover:text-primary p-1">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(track)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
