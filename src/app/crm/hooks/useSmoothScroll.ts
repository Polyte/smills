import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useSmoothScroll() {
  useEffect(() => {
    // Lenis was removed: it attached to the window scroller, but the CRM shell
    // uses overflow-hidden on the root and scrolls only via <main> (flex-1 overflow-y-auto).
    // That caused Lenis to swallow all wheel/touchpad events without scrolling anything.
    gsap.ticker.lagSmoothing(0);
  }, []);
}
