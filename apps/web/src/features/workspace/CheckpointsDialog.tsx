import * as React from "react";
import { History, RotateCcw, Trash2 } from "lucide-react";
import { api, type Checkpoint } from "@/api";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Checkpoints: named, restorable snapshots of the project's site — the
 * "safe experiment and roll back" capability carried forward from the archive,
 * now server-side.
 */
export function CheckpointsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const projectId = useWorkspaceStore((s) => s.projectId);
  const site = useWorkspaceStore((s) => s.site);
  const dirty = useWorkspaceStore((s) => s.dirty);
  const loadProject = useWorkspaceStore((s) => s.loadProject);

  const [checkpoints, setCheckpoints] = React.useState<Checkpoint[]>([]);
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!projectId) {return;}
    setCheckpoints(await api.listCheckpoints(projectId));
  }, [projectId]);

  React.useEffect(() => {
    if (open) {void refresh();}
  }, [open, refresh]);

  async function handleCreate() {
    if (!projectId || !site || !name.trim()) {return;}
    setBusy(true);
    try {
      // Persist the current site so the checkpoint captures the latest edits.
      await api.saveSite(projectId, site);
      await api.createCheckpoint(projectId, name.trim(), note.trim() || undefined);
      setName("");
      setNote("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(checkpointId: string) {
    if (!projectId) {return;}
    setBusy(true);
    try {
      const project = await api.restoreCheckpoint(projectId, checkpointId);
      loadProject(project);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(checkpointId: string) {
    if (!projectId) {return;}
    await api.deleteCheckpoint(projectId, checkpointId);
    await refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Checkpoints
          </DialogTitle>
          <DialogDescription>
            Capture a named snapshot to experiment safely, then restore it anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-3">
          <div className="flex flex-col gap-1">
            <Label>Checkpoint name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Before densifying north lots"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleCreate} disabled={busy || !name.trim()} className="self-end">
            Create checkpoint
          </Button>
          {dirty && (
            <p className="text-xs text-amber-500">Unsaved edits will be saved into this checkpoint.</p>
          )}
        </div>

        <ScrollArea className="max-h-64">
          <div className="flex flex-col gap-1.5 pr-2">
            {checkpoints.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No checkpoints yet.</p>
            ) : (
              checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{cp.name}</div>
                    {cp.note && <div className="text-xs text-muted-foreground">{cp.note}</div>}
                    <div className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {cp.authorName} · {formatRelativeTime(cp.createdAt)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleRestore(cp.id)} aria-label="Restore">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(cp.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
