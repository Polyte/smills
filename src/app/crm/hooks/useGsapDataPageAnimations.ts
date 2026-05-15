import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Comprehensive GSAP animations for the Standerton Mills dashboard.
 * All animations respect prefers-reduced-motion and use power2 easing.
 * Duration range: 0.3–0.5s · Stagger: 0.05s
 */
export function useGsapDataPageAnimations(
  scopeRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (reduceMotion) {
      gsap.set(scope.querySelectorAll("[data-gsap], [data-gsap-card], [data-gsap-section], [data-gsap-panel]"), {
        autoAlpha: 1, y: 0, scale: 1, clearProps: "all"
      });
      return;
    }

    // Kill previous context
    if (ctxRef.current) ctxRef.current.revert();

    const ctx = gsap.context(() => {
      // ── 1. Page load — sidebar slide-in ──
      gsap.fromTo("[data-gsap-sidebar]",
        { x: "-100%", autoAlpha: 0 },
        { x: "0%", autoAlpha: 1, duration: 0.4, ease: "power2.out" }
      );

      // ── 2. Main content fade-in ──
      gsap.fromTo("[data-gsap-content]",
        { autoAlpha: 0, y: 15 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out", delay: 0.1 }
      );

      // ── 3. KPI cards — staggered fade + slide up ──
      gsap.fromTo("[data-gsap-kpi]",
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out", delay: 0.15 }
      );

      // ── 4. Machine grid — industrial sequential startup ──
      gsap.fromTo("[data-gsap-machine]",
        { autoAlpha: 0, scale: 0.95 },
        { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.02, ease: "power2.out", delay: 0.2 }
      );

      // ── 5. General panel/card entrance (scroll) ──
      gsap.utils.toArray<HTMLElement>("[data-gsap-panel]", scope).forEach((el) => {
        gsap.fromTo(el,
          { autoAlpha: 0, y: 26, scale: 0.985 },
          {
            autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out",
            scrollTrigger: { trigger: el, scroller: scope, start: "top 88%", toggleActions: "play none none reverse" }
          }
        );
      });

      // ── 6. Data-gsap-card entrance (scroll, staggered if multiple) ──
      gsap.utils.toArray<HTMLElement>("[data-gsap-card]", scope).forEach((el) => {
        gsap.fromTo(el,
          { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out",
            scrollTrigger: { trigger: el, scroller: scope, start: "top 90%", toggleActions: "play none none reverse" }
          }
        );
      });

      // ── 7. Section entrance (for each data-gsap-section) ──
      gsap.utils.toArray<HTMLElement>("[data-gsap-section]", scope).forEach((el) => {
        const children = Array.from(el.children).filter(
          (c) => c instanceof HTMLElement && !c.closest("[data-gsap-noanimate]")
        );
        gsap.fromTo(children.length ? children : [el],
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power2.out",
            scrollTrigger: { trigger: el, scroller: scope, start: "top 85%", toggleActions: "play none none reverse" }
          }
        );
      });

      // ── 8. Table rows (staggered, only if > 10 rows) ──
      if (!isMobile) {
        gsap.utils.toArray<HTMLElement>("[data-gsap-table]", scope).forEach((table) => {
          const rows = table.querySelectorAll("tbody tr");
          if (rows.length > 10) {
            gsap.fromTo(rows,
              { autoAlpha: 0, x: -8 },
              {
                autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.02, ease: "power2.out",
                scrollTrigger: { trigger: table, scroller: scope, start: "top 85%", toggleActions: "play none none reverse" }
              }
            );
          }
        });
      }

      // ── 9. Form inputs (label + input pairs) ──
      gsap.utils.toArray<HTMLElement>("form", scope).forEach((form) => {
        gsap.fromTo(
          form.querySelectorAll("label, input, textarea, button, [role='combobox']"),
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.02, ease: "power2.out" }
        );
      });

      // ── 10. Alert bell continuous pulse (when active) ──
      gsap.utils.toArray<HTMLElement>("[data-gsap-alert-pulse]", scope).forEach((el) => {
        gsap.to(el, {
          scale: 1.08, opacity: 0.7, duration: 1.5, repeat: -1, yoyo: true, ease: "power1.inOut"
        });
      });

    }, scope);

    ctxRef.current = ctx;

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Machine status change animation — pulse border + subtle scale bounce.
 * Trigger when a machine's status changes (green→yellow→red).
 */
export function animateMachineStatusChange(el: HTMLElement) {
  gsap.fromTo(el,
    { scale: 1, borderColor: "#D4AF37" },
    { scale: 1.03, borderColor: "#D4AF37", duration: 0.2, ease: "power2.out", yoyo: true, repeat: 1 }
  );
}

/**
 * KPI number update — quick flip animation (old scrolls out, new scrolls up).
 */
export function animateKpiNumber(el: HTMLElement, newValue: string) {
  gsap.to(el, {
    y: -20, autoAlpha: 0, duration: 0.15, ease: "power2.in",
    onComplete: () => {
      el.textContent = newValue;
      gsap.fromTo(el, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25, ease: "power2.out" });
    }
  });
}

/**
 * Alert bell shake — subtle x movement when new alert arrives.
 */
export function animateAlertBell(el: HTMLElement) {
  gsap.fromTo(el,
    { x: 0 },
    { x: 4, duration: 0.08, repeat: 3, yoyo: true, ease: "power1.inOut" }
  );
}

/**
 * Side panel slide-in (right).
 */
export function animateSidePanel(el: HTMLElement) {
  gsap.fromTo(el,
    { x: "100%", autoAlpha: 0 },
    { x: "0%", autoAlpha: 1, duration: 0.35, ease: "power2.out" }
  );
}

/**
 * Toast notification — drop from top with gold border.
 */
export function animateToast(el: HTMLElement) {
  gsap.fromTo(el,
    { y: -50, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out" }
  );
  // Auto-dismiss after 5s
  gsap.to(el, {
    autoAlpha: 0, scale: 0.95, duration: 0.3, ease: "power2.in", delay: 5
  });
}

/**
 * Low stock row pulse — amber background flash.
 */
export function animateLowStockRow(el: HTMLElement) {
  gsap.to(el, {
    backgroundColor: "rgba(255, 193, 7, 0.15)", duration: 1, repeat: -1, yoyo: true, ease: "power1.inOut"
  });
}

/**
 * Progress bar width animation.
 */
export function animateProgressBar(el: HTMLElement, targetWidth: string) {
  gsap.to(el, { width: targetWidth, duration: 0.5, ease: "power2.out" });
}

/**
 * Machine grid — "power on" effect with gold fill sweep.
 */
export function animateMachinePowerOn(el: HTMLElement) {
  gsap.fromTo(el,
    { clipPath: "inset(0 100% 0 0)" },
    { clipPath: "inset(0 0% 0 0)", duration: 0.4, ease: "power2.out" }
  );
}

/**
 * Machine fault flash — red pulse on stop.
 */
export function animateMachineFault(el: HTMLElement) {
  gsap.to(el, {
    boxShadow: "0 0 0 4px rgba(183, 28, 28, 0.6)",
    duration: 0.2, yoyo: true, repeat: 5, ease: "power1.inOut",
    onComplete: () => {
      gsap.set(el, { boxShadow: "0 0 0 2px rgba(183, 28, 28, 0.4)" });
      gsap.to(el, { boxShadow: "0 0 0 4px rgba(183, 28, 28, 0.6)", duration: 1, repeat: -1, yoyo: true, ease: "power1.inOut" });
    }
  });
}
