import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Globe, Map, Square } from "lucide-react";
import { api, type CreateProjectInput } from "@/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Template = NonNullable<CreateProjectInput["template"]>;

const TEMPLATES: { id: Template; label: string; description: string; icon: typeof Square }[] = [
  { id: "empty", label: "Blank site", description: "Start from an empty, spatially-defined site.", icon: Square },
  {
    id: "subdivision",
    label: "Subdivision",
    description: "Parcel divided into lots with houses and a park.",
    icon: Building2,
  },
  {
    id: "district",
    label: "Mixed-use district",
    description: "Zones and land-use allocation with anchor buildings.",
    icon: Map,
  },
  {
    id: "estate",
    label: "Estate / homestead",
    description: "A single-household territory at landscape scale, with terrain.",
    icon: Globe,
  },
];

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [template, setTemplate] = React.useState<Template>("subdivision");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setTemplate("subdivision");
    }
  }, [open]);

  async function handleCreate() {
    if (!name.trim()) {return;}
    setBusy(true);
    try {
      const project = await api.createProject({ name: name.trim(), description: description.trim(), template });
      onOpenChange(false);
      onCreated?.();
      navigate(`/project/${project.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Create a server-backed planning workspace. You can change everything later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Project name</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cedar Grove Neighborhood"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What is this plan exploring?"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Starter template</Label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const active = t.id === template;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{t.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={busy || !name.trim()}>
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
