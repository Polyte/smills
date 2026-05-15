import { NavLink, Outlet } from "react-router";
import { BrandLogo } from "../../components/BrandLogo";
import { crmSubnavTabClass } from "../crmNavClasses";
import { InventoryHero } from "./inventoryUi";

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
    <div className="space-y-6" data-gsap-section>
      <div className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[oklch(0.45_0.14_265)] via-[#D4AF37] via-60% to-[oklch(0.45_0.14_265)]" />
        <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-[radial-gradient(circle,#D4AF37/0.06),transparent_65%)] blur-2xl" />
        <InventoryHero
          eyebrow="Mill inventory control"
          title="Inventory & mill WIP"
          actions={<BrandLogo height={34} withBrandTile className="shrink-0" />}
        >
          Fibre and yarn receipts, spinning/weaving WIP, greige and industrial woven rolls, coated finishes, and packed FG
          aligned with{" "}
          <a
            href="https://www.standertonmills.co.za/"
            className="font-medium text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Standerton Mills
          </a>{" "}
          product lines. Track receipts, production, transfers, shipments, and stock by location.
        </InventoryHero>
      </div>
      <div className="rounded-xl border border-border/60 bg-card/70 p-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
        <nav
          className="flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          aria-label="Inventory sections"
        >
          {tabs.map(({ to, end, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${crmSubnavTabClass(isActive)} shrink-0`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

