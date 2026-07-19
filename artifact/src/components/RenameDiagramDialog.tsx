import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type Diagram } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface RenameDiagramDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onRenameDiagram: (id: number, name: string) => void;
  diagram: Diagram | null;
  existingDiagramNames: string[];
}

export function RenameDiagramDialog({ isOpen, onOpenChange, onRenameDiagram, diagram, existingDiagramNames }: RenameDiagramDialogProps) {
  const formSchema = z.object({
    name: z.string().min(1, "Diagram name is required").refine(
      (name) => {
        if (diagram && name === diagram.name) {
          return true;
        }
        return !existingDiagramNames.includes(name);
      },
      {
        message: "A diagram with this name already exists.",
      }
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (diagram) {
      form.setValue("name", diagram.name);
    }
  }, [diagram, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (diagram) {
      onRenameDiagram(diagram.id!, values.name);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Diagram</DialogTitle>
          <DialogDescription>
            Enter a new name for your diagram.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagram Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., E-commerce Schema" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Rename</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}