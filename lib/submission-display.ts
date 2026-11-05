import { getTierLabel } from "./utils";

export function submissionTierLabel(userTier: number | null | undefined): string {
  if (typeof userTier !== "number" || !Number.isInteger(userTier) || userTier < 1 || userTier > 7) return "—";
  return String(getTierLabel(userTier));
}
