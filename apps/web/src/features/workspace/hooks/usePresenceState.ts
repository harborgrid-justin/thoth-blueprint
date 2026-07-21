import * as React from "react";
import type { Member } from "@/api";
import { partitionMembers } from "../helpers/presenceHelpers";

export function usePresenceState(members: Member[]) {
  const { shown, extra } = React.useMemo(
    () => partitionMembers(members),
    [members],
  );
  return { shown, extra };
}
