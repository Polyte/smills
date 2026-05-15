import { gsap } from "gsap";

/**
 * Animates a warp-beam or any progress bar element to a target width percent.
 * @param element  The fill/bar HTMLElement (width driven by CSS `width` property)
 * @param targetPct  0–100
 * @param opts  Optional overrides
 */
export function animateProgressBar(
  element: HTMLElement,
  targetPct: number,
  opts?: { duration?: number; ease?: string; onComplete?: () => void }
) {
  const clamped = Math.min(100, Math.max(0, targetPct));
  gsap.to(element, {
    width: `${clamped}%`,
    duration: opts?.duration ?? 0.8,
    ease: opts?.ease ?? "power2.out",
    onComplete: opts?.onComplete,
  });
}

/**
 * Animates a progress bar represented as an SVG/HTML element whose
 * `data-progress` attribute drives a stroke-dashoffset (for circular bars).
 * @param element  Circle element with `stroke-dashoffset` style
 * @param targetPct  0–100
 * @param circumference  Full stroke circumference in px
 */
export function animateCircularProgress(
  element: SVGElement | HTMLElement,
  targetPct: number,
  circumference: number,
  opts?: { duration?: number }
) {
  const clamped = Math.min(100, Math.max(0, targetPct));
  const offset = circumference - (clamped / 100) * circumference;
  gsap.to(element, {
    strokeDashoffset: offset,
    duration: opts?.duration ?? 0.9,
    ease: "power2.out",
  });
}
