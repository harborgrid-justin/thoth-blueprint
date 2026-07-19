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
import { ZONE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";



interface AddZoneDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateZone: (name: string, color?: string) => void;
  existingZoneNames: string[];
}

export function AddZoneDialog({ isOpen, onOpenChange, onCreateZone, existingZoneNames }: AddZoneDialogProps) {

  const formSchema = z.object({
    name: z.string().min(1, "Zone name is required").refine(
      (name) => !existingZoneNames.includes(name),
      {
        message: "A zone with this name already exists in this diagram.",
      }
    ),
    color: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: ZONE_COLORS[0]?.value || "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onCreateZone(values.name, values.color);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Zone</DialogTitle>
          <DialogDescription>Give your new zone a name and color.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., User Management" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {ZONE_COLORS.map((color) => (
                      <div
                        key={color.name}
                        className={cn(
                          "w-8 h-8 rounded-full cursor-pointer border-2 transition-all",
                          field.value === color.value ? "border-primary scale-110" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value, borderColor: field.value === color.value ? undefined : color.border }}
                        onClick={() => field.onChange(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Create Zone</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}