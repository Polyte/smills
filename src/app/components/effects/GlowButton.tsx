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
      border: "border-b-2 border-amber-500",
    },
    gold: {
      bg: "bg-gradient-to-r from-amber-600 to-yellow-700",
      hover: "hover:from-amber-500 hover:to-yellow-600",
      glow: "group-hover:shadow-amber-600/40",
      ring: "group-hover:ring-amber-500/30",
      text: "text-white",
      border: "",
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
        className={`relative inline-flex items-center px-8 py-4 ${v.bg} ${v.hover} ${v.text} font-semibold rounded-xl transition-all shadow-lg ${v.glow} group-hover:shadow-2xl ring-0 group-hover:ring-4 ${v.ring} ${v.border} focus-visible:ring-4 focus-visible:ring-amber-400/40 focus-visible:outline-none ${className}`}
      >
        {/* Animated shimmer */}
        <span className="absolute inset-0 rounded-xl overflow-hidden">
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </span>
        <span className="relative flex items-center gap-2">{children}</span>
      </Link>
    </motion.div>
  );
}