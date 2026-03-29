import { motion } from "motion/react";

interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedBorder({ children, className = "" }: AnimatedBorderProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "conic-gradient(from 0deg, #475569, #b8860b, #475569, #b8860b, #475569)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>
      {/* Inner content */}
      <div className="relative bg-white rounded-2xl h-full">
        {children}
      </div>
    </div>
  );
}