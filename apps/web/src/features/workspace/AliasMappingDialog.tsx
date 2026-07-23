import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { DataGrid } from "@/components/ui/data-grid";
import { usePrefsStore } from "@/store/prefsStore";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

export function AliasMappingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [search, setSearch] = React.useState("");
  
  const aliases = usePrefsStore(s => s.aliases);
  const setAlias = usePrefsStore(s => s.setAlias);

  const mappedAliases = Object.entries(aliases)
    .map(([command, alias]) => ({ command, alias }))
    .filter(a => a.command.toLowerCase().includes(search.toLowerCase()) || a.alias.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={WORKSPACE_STYLES.dialogContainerSm}>
        <DialogHeader>
          <DialogTitle className={WORKSPACE_STYLES.title}>
            Keyboard Alias Mapping
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commands or aliases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={WORKSPACE_STYLES.input + " pl-9 font-cad text-xs h-9"}
            />
          </div>
          <div className="h-[250px] overflow-hidden rounded-md border border-border">
            <DataGrid
              columns={[
                { id: "command", header: "Command", width: 200 },
                { id: "alias", header: "Alias", width: 100, accessor: (row: any) => (
                  <Input 
                    value={row.alias} 
                    onChange={(e) => setAlias(row.command, e.target.value.toUpperCase())}
                    className={WORKSPACE_STYLES.input + " h-6 w-16 text-xs font-cad px-2"}
                  />
                ) }
              ]}
              data={mappedAliases}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
