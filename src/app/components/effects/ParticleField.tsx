import { motion } from "motion/react";
import { useMemo } from "react";

interface ParticleFieldProps {
  count?: number;
  color?: string;
  className?: string;
}

export function ParticleField({ count = 20, color = "amber", className = "" }: ParticleFieldProps) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const size = Math.random() * 6 + 2;
      const shapes = ["rounded-full", "rounded-sm rotate-45", "rounded-none rotate-45"];
      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 5,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        opacity: Math.random() * 0.15 + 0.05,
      };
    });
  }, [count]);

  const colorMap: Record<string, string> = {
    amber: "bg-amber-500",
    gold: "bg-yellow-600",
    slate: "bg-slate-400",
    white: "bg-white",
    cream: "bg-stone-300",
  };

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${colorMap[color] || colorMap.amber} ${p.shape}`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 20, 0],
            rotate: [0, 90, 180, 270, 360],
            scale: [1, 1.3, 0.8, 1.1, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}