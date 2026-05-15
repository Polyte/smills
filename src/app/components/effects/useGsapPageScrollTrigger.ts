import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Applies GSAP ScrollTrigger animations to all pages.
 * Targets cards, sections, and content panels with staggered fade-in.
 * Respects prefers-reduced-motion.
 */
export function useGsapPageScrollTrigger() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      // Animate sections tagged with data-gsap-section
      gsap.utils.toArray<HTMLElement>("[data-gsap-section]").forEach((el) => {
        const children = el.children.length > 0
          ? Array.from(el.children).filter(
              (c) => c instanceof HTMLElement && !c.closest("[data-gsap-noanimate]")
            )
          : [el];

        gsap.fromTo(
          children,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Animate cards with data-gsap-card (individual cards, not wrapped)
      gsap.utils.toArray<HTMLElement>("[data-gsap-card]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 20, scale: 0.97 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Hero sections — subtle parallax on background
      gsap.utils.toArray<HTMLElement>("[data-gsap-hero]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 40 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((st) => st.kill());
      initialized.current = false;
    };
  }, []);
}
