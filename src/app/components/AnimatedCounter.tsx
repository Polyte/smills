import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: string;
  className?: string;
}

export function AnimatedCounter({ value, className = "" }: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState("0");
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Extract numeric part and suffix
  const numericMatch = value.match(/^([\d,]+)/);
  const numericPart = numericMatch ? parseInt(numericMatch[1].replace(/,/g, ""), 10) : 0;
  const suffix = value.replace(/^[\d,]+/, "");

  useEffect(() => {
    if (hasAnimated) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const stepTime = duration / steps;
          let current = 0;

          const timer = setInterval(() => {
            current++;
            const progress = current / steps;
            // Ease-out curve
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = Math.round(eased * numericPart);

            if (numericPart >= 1000) {
              setDisplayed(val.toLocaleString());
            } else {
              setDisplayed(val.toString());
            }

            if (current >= steps) {
              clearInterval(timer);
              // Set final value exactly as provided (preserve formatting like 99.2)
              if (numericMatch) {
                setDisplayed(numericMatch[1]);
              }
            }
          }, stepTime);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated, numericPart, numericMatch]);

  return (
    <span ref={ref} className={className}>
      {displayed}{suffix}
    </span>
  );
}
