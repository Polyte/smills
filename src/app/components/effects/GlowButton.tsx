import { motion } from "motion/react";
import { Link } from "react-router";

interface GlowButtonProps {
  to: string;
  children: React.ReactNode;
  variant?: "primary" | "gold";
  className?: string;
}

export function GlowButton({ to, children, variant = "primary", className = "" }: GlowButtonProps) {
  const variants = {
    primary: {
      bg: "bg-gradient-to-r from-slate-700 to-slate-800",
      hover: "hover:from-slate-800 hover:to-slate-900",
      glow: "group-hover:shadow-slate-500/40",
      ring: "group-hover:ring-slate-400/30",
      text: "text-white",
      border: "border-b-2 border-amber-400 ring-1 ring-amber-500/20",
    },
    gold: {
      bg: "bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-700 gold-shine-surface",
      hover: "hover:from-amber-400 hover:via-yellow-400 hover:to-amber-600",
      glow: "shadow-[0_4px_28px_-6px_oklch(0.72_0.13_84/0.55)] group-hover:shadow-[0_8px_36px_-4px_oklch(0.82_0.11_88/0.5)]",
      ring: "group-hover:ring-amber-300/50",
      text: "text-white drop-shadow-[0_1px_1px_oklch(0.25_0.04_78/0.35)]",
      border: "ring-1 ring-white/25",
    },
  };

  const v = variants[variant];

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className="group inline-block"
    >
      <Link
        to={to}
        className={`relative inline-flex items-center px-8 py-4 ${v.bg} ${v.hover} ${v.text} font-semibold rounded-xl transition-all shadow-lg ${v.glow} group-hover:shadow-2xl ring-0 group-hover:ring-4 ${v.ring} ${v.border} focus-visible:ring-4 focus-visible:ring-amber-300/50 focus-visible:outline-none ${className}`}
      >
        {variant !== "gold" && (
          <span className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-xl">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </span>
        )}
        <span className="relative z-[4] flex items-center gap-2">{children}</span>
      </Link>
    </motion.div>
  );
}