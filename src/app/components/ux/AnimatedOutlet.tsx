import { Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";

export function AnimatedOutlet() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-[min(60vh,100%)]"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
