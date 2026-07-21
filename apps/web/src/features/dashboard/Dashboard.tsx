import * as React from "react";
import { Link } from "react-router-dom";
import {
  Eraser,
  Loader2,
  MapPinned,
  Moon,
  MoreVertical,
  Plus,
  RotateCcw,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import { api, type ProjectSummary } from "@/api";
import { useTheme } from "@/theme/theme-provider";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PresenceBar } from "@/features/workspace/PresenceBar";

const CreateProjectDialog = React.lazy(() =>
  import("./CreateProjectDialog").then((m) => ({
    default: m.CreateProjectDialog,
  })),
);

export function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await api.listProjects());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleDelete(id: string) {
    await api.deleteProject(id);
    void refresh();
  }

  async function handleReset(mode: "samples" | "empty") {
    const message =
      mode === "empty"
        ? "Clear ALL local projects and start from scratch? This cannot be undone."
        : "Reset to the sample projects? Your local changes will be replaced.";
    if (!window.confirm(message)) {
      return;
    }
    await api.resetWorkspace(mode);
    void refresh();
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-5 backdrop-blur">
          <div className="flex items-center gap-2">
            <img src="/thoth.svg" alt="" className="h-7 w-7" />
            <span className="text-base font-semibold">Thoth Blueprint</span>
            <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
              Planning workspace
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Workspace settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Local workspace</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleReset("empty")}>
                  <Eraser /> Start from scratch (clear all)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReset("samples")}>
                  <RotateCcw /> Reset to sample projects
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                  Projects are stored in your browser.
                </DropdownMenuLabel>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Collaborative site &amp; community plans. Open one to draw
              parcels, zones, and land uses, and watch metrics update live.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
              projects…
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => handleDelete(project.id)}
                />
              ))}
            </div>
          )}
        </main>

        {createOpen && (
          <React.Suspense fallback={null}>
            <CreateProjectDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              onCreated={refresh}
            />
          </React.Suspense>
        )}
      </div>
    </TooltipProvider>
  );
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: ProjectSummary;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative overflow-hidden transition-colors hover:border-primary/40">
      <Link to={`/project/${project.id}`} className="block">
        <div className="flex h-28 items-center justify-center border-b border-border bg-[hsl(var(--canvas))]">
          <MapPinned className="h-9 w-9 text-muted-foreground/40" />
        </div>
        <div className="p-4">
          <h3 className="truncate font-semibold text-foreground">
            {project.name}
          </h3>
          <p className="mt-1 line-clamp-2 h-9 text-xs text-muted-foreground">
            {project.description}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {formatNumber(project.siteAreaAcres, 1)} ac
            </span>
            <span>·</span>
            <span className="tabular-nums">
              {formatNumber(project.lotCount)} lots
            </span>
            <span className="ml-auto">
              {formatRelativeTime(project.updatedAt)}
            </span>
          </div>
          <div className="mt-3">
            <PresenceBar members={project.members} />
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="bg-card/80"
              aria-label="Project menu"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center">
      <MapPinned className="h-10 w-10 text-muted-foreground/40" />
      <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first plan to start laying out parcels, zones, and land uses
        on a collaborative canvas.
      </p>
      <Button className="mt-4" onClick={onCreate}>
        <Plus className="h-4 w-4" /> New project
      </Button>
    </div>
  );
}
