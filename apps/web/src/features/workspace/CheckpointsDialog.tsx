import { History, RotateCcw, Trash2 } from "lucide-react";
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
import { useCheckpointsState } from "./hooks/useCheckpointsState";
import { formatCheckpointTime } from "./helpers/checkpointsHelpers";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

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
  const {
    dirty,
    checkpoints,
    name,
    setName,
    note,
    setNote,
    busy,
    handleCreate,
    handleRestore,
    handleDelete,
  } = useCheckpointsState({ open, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={WORKSPACE_STYLES.dialogContainer + " max-w-xl"}>
        <DialogHeader>
          <DialogTitle className={WORKSPACE_STYLES.title}>
            <History className="h-5 w-5 text-primary" /> Checkpoints
          </DialogTitle>
          <DialogDescription className={WORKSPACE_STYLES.textSubtitle}>
            Capture a named snapshot to experiment safely, then restore it
            anytime.
          </DialogDescription>
        </DialogHeader>

        <div className={WORKSPACE_STYLES.cardSubtle + " flex flex-col gap-2 p-3"}>
          <div className="flex flex-col gap-1">
            <Label className={WORKSPACE_STYLES.label}>Checkpoint name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Before densifying north lots"
              className={WORKSPACE_STYLES.input}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className={WORKSPACE_STYLES.label}>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={WORKSPACE_STYLES.input}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={busy || !name.trim()}
            className={WORKSPACE_STYLES.btnPrimary + " self-end"}
          >
            Create checkpoint
          </Button>
          {dirty && (
            <p className="text-xs text-amber-400">
              Unsaved edits will be saved into this checkpoint.
            </p>
          )}
        </div>

        <ScrollArea className="max-h-64">
          <div className="flex flex-col gap-1.5 pr-2">
            {checkpoints.length === 0 ? (
              <p className={WORKSPACE_STYLES.textMuted + " py-6 text-center text-sm"}>
                No checkpoints yet.
              </p>
            ) : (
              checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className={WORKSPACE_STYLES.cardSubtle + " flex items-start gap-3 p-3"}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {cp.name}
                    </div>
                    {cp.note && (
                      <div className="text-xs text-muted-foreground">
                        {cp.note}
                      </div>
                    )}
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {cp.authorName} · {formatCheckpointTime(cp.createdAt)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRestore(cp.id)}
                    aria-label="Restore"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(cp.id)}
                    aria-label="Delete"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
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
