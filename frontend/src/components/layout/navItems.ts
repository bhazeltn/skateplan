import {
  BarChart3,
  LayoutDashboard,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SystemRole } from "@/lib/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Skaters", to: "/skaters", icon: Users },
  { label: "Competitions", to: "/competitions", icon: Trophy },
  { label: "Gap Analysis", to: "/gap-analysis", icon: BarChart3 },
];

/** True for an athlete/skater account (non-coach, non-admin). */
export function isSkaterRole(role: SystemRole | null): boolean {
  return role === "athlete";
}

/** Nav items tailored to the signed-in role. Athletes get a trimmed portal
 *  (their own profile + competitions); coaches/admins get the full roster nav. */
export function navItemsForRole(
  role: SystemRole | null,
  userId: number | null
): NavItem[] {
  if (isSkaterRole(role) && userId != null) {
    return [
      { label: "My Profile", to: `/skaters/${userId}`, icon: User },
      { label: "Competitions", to: "/competitions", icon: Trophy },
    ];
  }
  return NAV_ITEMS;
}
