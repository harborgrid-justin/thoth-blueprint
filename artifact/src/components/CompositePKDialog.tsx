import { type Column } from "@/lib/types";
import { Key } from "lucide-react";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";

interface CompositePKDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: Column[];
    onSave: (updatedColumns: Column[]) => void;
}

export function CompositePKDialog({
    open,
    onOpenChange,
    columns,
    onSave,
}: CompositePKDialogProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        () => new Set(columns.filter((c) => c.pk).map((c) => c.id))
    );

    // Re-sync when dialog opens with fresh column state
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setSelectedIds(new Set(columns.filter((c) => c.pk).map((c) => c.id)));
        }
        onOpenChange(isOpen);
    };

    const toggleColumn = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSave = () => {
        const updatedColumns = columns.map((col) => ({
            ...col,
            pk: selectedIds.has(col.id),
        }));
        onSave(updatedColumns);
        onOpenChange(false);
    };

    const selectedCount = selectedIds.size;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-yellow-500" />
                        Manage Primary Key
                    </DialogTitle>
                    <DialogDescription>
                        Select the column(s) that form the primary key. Selecting multiple
                        columns creates a composite primary key.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-72 overflow-y-auto space-y-1 py-2">
                    {columns.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No columns defined yet.
                        </p>
                    )}
                    {columns.map((col) => (
                        <label
                            key={col.id}
                            htmlFor={`pk-col-${col.id}`}
                            className="flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                        >
                            <Checkbox
                                id={`pk-col-${col.id}`}
                                checked={selectedIds.has(col.id)}
                                onCheckedChange={() => toggleColumn(col.id)}
                            />
                            <span className="flex-1 text-sm font-medium truncate">
                                {col.name}
                            </span>
                            <Badge variant="outline" className="font-mono text-xs shrink-0">
                                {col.type}
                            </Badge>
                        </label>
                    ))}
                </div>

                {selectedCount >= 2 && (
                    <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                        <Key className="h-3 w-3 inline mr-1 text-yellow-500" />
                        <strong>Composite PK</strong> — {selectedCount} columns selected
                    </p>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
