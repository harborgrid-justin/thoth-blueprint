import type { Member } from "@/api";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Collaborator presence avatars. Real-time presence is a Phase 4 concern
 * (services/collaboration); this surfaces the project's members with the same
 * visual language the live cursors will use.
 */
export function PresenceBar({ members }: { members: Member[] }) {
  const shown = members.slice(0, 4);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((m) => (
        <Tooltip key={m.user.id} delayDuration={200}>
          <TooltipTrigger asChild>
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white"
              style={{ backgroundColor: m.user.color }}
            >
              {initials(m.user.name)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {m.user.name} · {m.role}
          </TooltipContent>
        </Tooltip>
      ))}
      {extra > 0 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
          +{extra}
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
