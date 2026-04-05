import { cn } from "../components/ui/utils";

/** Horizontal sub-navigation tabs (Inventory, Workforce, etc.) */
export function crmSubnavTabClass(isActive: boolean) {
  return cn(
    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/15"
      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
  );
}
