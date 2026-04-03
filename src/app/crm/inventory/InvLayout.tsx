import { NavLink, Outlet } from "react-router";
import { cn } from "../../components/ui/utils";
import { BrandLogo } from "../../components/BrandLogo";

const tabs = [
  { to: "/crm/inventory", end: true, label: "Overview" },
  { to: "/crm/inventory/items", label: "Items" },
  { to: "/crm/inventory/lots", label: "Lots" },
  { to: "/crm/inventory/locations", label: "Locations" },
  { to: "/crm/inventory/receipts", label: "Receipts" },
  { to: "/crm/inventory/transfers", label: "Transfers" },
  { to: "/crm/inventory/production", label: "Production" },
  { to: "/crm/inventory/shipments", label: "Shipments" },
  { to: "/crm/inventory/stock", label: "Stock" },
  { to: "/crm/inventory/reports", label: "Reports" },
] as const;

export function InvLayout() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <BrandLogo height={32} withBrandTile className="shrink-0 lg:mt-1" />
        <div className="min-w-0 flex-1">
        <h2 className="text-2xl font-display font-bold tracking-tight">Inventory & mill WIP</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Fibre and yarn receipts, spinning/weaving WIP, greige and industrial woven rolls, coated finishes, and packed FG
          — aligned with{" "}
          <a
            href="https://www.standertonmills.co.za/"
            className="text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Standerton Mills
          </a>{" "}
          product lines. Track receipts, production, transfers, shipments, and stock by location.
        </p>
        </div>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border pb-px" aria-label="Inventory sections">
        {tabs.map(({ to, end, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
