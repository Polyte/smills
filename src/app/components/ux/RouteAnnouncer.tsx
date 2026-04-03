import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { BRAND_TITLE } from "../../brand";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/products": "Products",
  "/services": "Services",
  "/about": "About",
  "/contact": "Contact",
};

export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const label = ROUTE_LABELS[pathname] ?? pathname;
    document.title = pathname === "/" ? BRAND_TITLE : `${label} | ${BRAND_TITLE}`;

    const node = liveRef.current;
    if (node) {
      node.textContent = `Navigated to ${label}`;
    }
  }, [pathname]);

  return (
    <div
      ref={liveRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
