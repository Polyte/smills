import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type MachineStatus = "running" | "idle" | "minor-stop" | "major-stop" | "maintenance";

const STATUS_COLORS: Record<MachineStatus, string> = {
  running: "#2E7D32",
  idle: "#D4AF37",
  "minor-stop": "#FFC107",
  "major-stop": "#B71C1C",
  maintenance: "#5D3A1A",
};

/**
 * Master GSAP animation hook for Standerton Mills dashboard.
 * Uses gsap.context() for scoped cleanup — no @gsap/react dependency needed.
 * Respects prefers-reduced-motion and uses gsap.matchMedia() for mobile.
 */
export function useStandertonAnimations(
  scopeRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    if (ctxRef.current) ctxRef.current.revert();

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Reduced-motion: reveal everything instantly, skip all animations
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          scope.querySelectorAll(
            "[data-gsap],[data-gsap-kpi],[data-gsap-machine],[data-gsap-panel],[data-gsap-section],[data-gsap-card]"
          ),
          { autoAlpha: 1, y: 0, x: 0, scale: 1, clearProps: "all" }
        );
      });

      // Full animations for users with no motion preference
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ── 1. Sidebar slide-in ──
        gsap.fromTo(
          "[data-gsap-sidebar]",
          { x: "-100%", autoAlpha: 0 },
          { x: "0%", autoAlpha: 1, duration: 0.4, ease: "power2.out" }
        );

        // ── 2. Main content fade-up ──
        gsap.fromTo(
          "[data-gsap-content]",
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out", delay: 0.08 }
        );

        // ── 3. KPI cards — staggered slide-up ──
        gsap.fromTo(
          "[data-gsap-kpi]",
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.06,
            ease: "power2.out",
            delay: 0.15,
          }
        );

        // ── 4. Machine grid — industrial sequential startup ──
        gsap.fromTo(
          "[data-gsap-machine]",
          { autoAlpha: 0, scale: 0.94 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.35,
            stagger: 0.025,
            ease: "power2.out",
            delay: 0.2,
          }
        );

        // ── 5. Alert bell continuous pulse ──
        gsap.to("[data-gsap-alert-pulse]", {
          scale: 1.08,
          opacity: 0.72,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });

        // ── 6. ScrollTrigger panels ──
        gsap.utils
          .toArray<HTMLElement>("[data-gsap-panel]", scope)
          .forEach((el) => {
            gsap.fromTo(
              el,
              { autoAlpha: 0, y: 28, scale: 0.985 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: el,
                  scroller: scope,
                  start: "top 88%",
                  toggleActions: "play none none reverse",
                },
              }
            );
          });

        // ── 7. ScrollTrigger cards ──
        gsap.utils
          .toArray<HTMLElement>("[data-gsap-card]", scope)
          .forEach((el) => {
            gsap.fromTo(
              el,
              { autoAlpha: 0, y: 20 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.4,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: el,
                  scroller: scope,
                  start: "top 90%",
                  toggleActions: "play none none reverse",
                },
              }
            );
          });

        // ── 8. ScrollTrigger sections (stagger children) ──
        gsap.utils
          .toArray<HTMLElement>("[data-gsap-section]", scope)
          .forEach((el) => {
            const children = Array.from(el.children).filter(
              (c): c is HTMLElement =>
                c instanceof HTMLElement && !c.closest("[data-gsap-noanimate]")
            );
            gsap.fromTo(
              children.length ? children : [el],
              { autoAlpha: 0, y: 30 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.45,
                stagger: 0.06,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: el,
                  scroller: scope,
                  start: "top 85%",
                  toggleActions: "play none none reverse",
                },
              }
            );
          });
      });

      // Mobile: lighter animations (still run, just shorter travel)
      mm.add("(max-width: 768px)", () => {
        gsap.utils
          .toArray<HTMLElement>("[data-gsap-machine]", scope)
          .forEach((el, i) => {
            gsap.set(el, { autoAlpha: 0, y: 10 });
            gsap.to(el, {
              autoAlpha: 1,
              y: 0,
              duration: 0.3,
              delay: i * 0.015,
              ease: "power2.out",
            });
          });
      });
    }, scope);

    ctxRef.current = ctx;
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Standalone imperative helpers ────────────────────────────────────────────

/** Pulse-border + scale bounce when a machine status changes. */
export function animateMachineStatusChange(
  el: HTMLElement,
  status: MachineStatus
) {
  const color = STATUS_COLORS[status] ?? "#D4AF37";
  gsap.fromTo(
    el,
    { scale: 1, borderColor: color },
    {
      scale: 1.03,
      borderColor: color,
      duration: 0.2,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (status === "major-stop") {
          gsap.to(el, {
            boxShadow: `0 0 0 4px rgba(183,28,28,0.6)`,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut",
          });
        }
      },
    }
  );
}

/** Quick flip: old value scrolls out, new value scrolls in. */
export function animateKPIValue(el: HTMLElement, newValue: string) {
  gsap.to(el, {
    y: -20,
    autoAlpha: 0,
    duration: 0.15,
    ease: "power2.in",
    onComplete: () => {
      el.textContent = newValue;
      gsap.fromTo(el, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25, ease: "power2.out" });
    },
  });
}

/** Subtle horizontal shake when a new alert arrives. */
export function animateAlertBell(el: HTMLElement) {
  gsap.fromTo(
    el,
    { x: 0 },
    { x: 4, duration: 0.08, repeat: 5, yoyo: true, ease: "power1.inOut" }
  );
}

/** Side panel slide in from the right. */
export function animateSidePanel(el: HTMLElement) {
  gsap.fromTo(
    el,
    { x: "100%", autoAlpha: 0 },
    { x: "0%", autoAlpha: 1, duration: 0.35, ease: "power2.out" }
  );
}

/** Amber background pulse on low-stock table rows. */
export function animateLowStockRow(el: HTMLElement) {
  gsap.to(el, {
    backgroundColor: "rgba(255,193,7,0.15)",
    duration: 1,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut",
  });
}

/** Gold fill sweep "power on" effect for a machine card. */
export function animateMachinePowerOn(el: HTMLElement) {
  gsap.fromTo(
    el,
    { clipPath: "inset(0 100% 0 0)" },
    { clipPath: "inset(0 0% 0 0)", duration: 0.45, ease: "power2.out" }
  );
}
