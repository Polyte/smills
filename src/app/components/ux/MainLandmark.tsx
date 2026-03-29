import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { AnimatedOutlet } from "./AnimatedOutlet";

export function MainLandmark() {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <main
      ref={ref}
      id="main-content"
      tabIndex={-1}
      className="relative z-10 flex-1 outline-none focus:outline-none"
    >
      <AnimatedOutlet />
    </main>
  );
}
