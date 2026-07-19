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
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  text: z.string().min(1, "Note text is required"),
});

interface EditNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialText: string;
  onUpdateNote: (text: string) => void;
}

export function EditNoteDialog({ isOpen, onOpenChange, initialText, onUpdateNote }: EditNoteDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { text: initialText || "" },
  });

  useEffect(() => {
    // Keep form in sync when opening for different notes
    form.reset({ text: initialText || "" });
  }, [initialText, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onUpdateNote(values.text);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Note</DialogTitle>
          <DialogDescription>Edit the text for this note.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Text</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Type your note here..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Update Note</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}