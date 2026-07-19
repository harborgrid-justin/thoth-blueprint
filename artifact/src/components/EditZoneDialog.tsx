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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface EditZoneDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialName: string;
  initialColor?: string;
  onUpdateZone: (name: string, color?: string) => void;
  existingZoneNames?: string[];
  excludeName?: string; // current name to allow unchanged value
}

export function EditZoneDialog({ isOpen, onOpenChange, initialName, initialColor, onUpdateZone, existingZoneNames = [], excludeName }: EditZoneDialogProps) {
  // Build schema with runtime validation against existing names
  const formSchema = z.object({
    name: z
      .string()
      .min(1, "Zone name is required")
      .refine(
        (name) => {
          if (!existingZoneNames || existingZoneNames.length === 0) return true;
          if (excludeName && name === excludeName) return true;
          return !existingZoneNames.includes(name);
        },
        { message: "A zone with this name already exists in this diagram." }
      ),
    color: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: initialName || "", color: initialColor || ZONE_COLORS[0]?.value || "" },
  });

  useEffect(() => {
    form.reset({ name: initialName || "", color: initialColor || ZONE_COLORS[0]?.value || "" });
  }, [initialName, initialColor, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onUpdateZone(values.name, values.color);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Zone</DialogTitle>
          <DialogDescription>Update the name and color for this zone.</DialogDescription>
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
              <Button type="submit">Update Zone</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}