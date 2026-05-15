import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(ScrollTrigger, TextPlugin);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface AnimationContextValue {
  reduced: boolean;
}

const AnimationContext = createContext<AnimationContextValue>({ reduced: false });

export function useAnimationContext() {
  return useContext(AnimationContext);
}

export function AnimationProvider({ children }: { children: ReactNode }) {
  const reduced = prefersReducedMotion();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    gsap.defaults({ ease: "power2.out", duration: 0.35 });

    if (reduced) {
      gsap.globalTimeline.timeScale(0);
      ScrollTrigger.getAll().forEach((t) => t.disable());
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [reduced]);

  return (
    <AnimationContext.Provider value={{ reduced }}>
      {children}
    </AnimationContext.Provider>
  );
}
