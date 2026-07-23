import type { Member } from "@/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePresenceState } from "./hooks/usePresenceState";
import { initials } from "./helpers/presenceHelpers";

/**
 * Collaborator presence avatars. Real-time presence is a Phase 4 concern
 * (services/collaboration); this surfaces the project's members with the same
 * visual language the live cursors will use.
 */
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

export function PresenceBar({ members }: { members: Member[] }) {
  const { shown, extra } = usePresenceState(members);
  return (
    <div className={WORKSPACE_STYLES.presenceBar}>
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
