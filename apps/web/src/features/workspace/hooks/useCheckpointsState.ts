import * as React from "react";
import { api, type Checkpoint } from "@/api";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useCheckpointsState({
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
    if (!projectId) {
      return;
    }
    setCheckpoints(await api.listCheckpoints(projectId));
  }, [projectId]);

  React.useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  async function handleCreate() {
    if (!projectId || !site || !name.trim()) {
      return;
    }
    setBusy(true);
    try {
      await api.saveSite(projectId, site);
      await api.createCheckpoint(
        projectId,
        name.trim(),
        note.trim() || undefined,
      );
      setName("");
      setNote("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(checkpointId: string) {
    if (!projectId) {
      return;
    }
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
    if (!projectId) {
      return;
    }
    await api.deleteCheckpoint(projectId, checkpointId);
    await refresh();
  }

  return {
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
  };
}
