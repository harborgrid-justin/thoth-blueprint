import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ElementType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GitCommitHorizontal, LucideProps, SquareDashed, StickyNote, Table } from "lucide-react";

interface AddElementDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (elementType: ElementType) => void;
  tableCount: number;
}

interface Element {
  type: ElementType;
  title: string;
  description: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  disabled: boolean;
}

export function AddElementDialog({ isOpen, onOpenChange, onSelect, tableCount }: AddElementDialogProps) {
  const elements: Element[] = [
    {
      type: 'table',
      title: 'Table',
      description: 'Add a new database table.',
      icon: Table,
      disabled: false,
    },
    {
      type: 'relationship',
      title: 'Relationship',
      description: 'Define a link between tables.',
      icon: GitCommitHorizontal,
      disabled: tableCount < 2,
    },
    {
      type: 'note',
      title: 'Note',
      description: 'Add a sticky note for comments.',
      icon: StickyNote,
      disabled: false,
    },
    {
      type: 'zone',
      title: 'Zone',
      description: 'Group related tables together.',
      icon: SquareDashed,
      disabled: false,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Element</DialogTitle>
          <DialogDescription>Select an element to add to your diagram.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {elements.map((element) => (
            <Card
              key={element.type}
              onClick={() => !element.disabled && onSelect(element.type)}
              className={cn(
                "cursor-pointer transition-all hover:border-primary hover:shadow-lg",
                element.disabled && "cursor-not-allowed opacity-50 hover:border-border hover:shadow-none"
              )}
            >
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <div className="p-3 bg-muted rounded-lg">
                  <element.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{element.title}</CardTitle>
                  <CardDescription className="text-xs">{element.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}