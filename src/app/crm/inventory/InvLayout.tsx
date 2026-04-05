import { NavLink, Outlet } from "react-router";
import { BrandLogo } from "../../components/BrandLogo";
import { crmSubnavTabClass } from "../crmNavClasses";

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
      <div className="rounded-2xl border border-border/70 bg-card/50 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <BrandLogo height={34} withBrandTile className="shrink-0 lg:mt-0.5" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Inventory &amp; mill WIP</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Fibre and yarn receipts, spinning/weaving WIP, greige and industrial woven rolls, coated finishes, and packed
              FG — aligned with{" "}
              <a
                href="https://www.standertonmills.co.za/"
                className="font-medium text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Standerton Mills
              </a>{" "}
              product lines. Track receipts, production, transfers, shipments, and stock by location.
            </p>
          </div>
        </div>
      </div>
      <nav
        className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/35 p-1.5 shadow-inner"
        aria-label="Inventory sections"
      >
        {tabs.map(({ to, end, label }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => crmSubnavTabClass(isActive)}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
