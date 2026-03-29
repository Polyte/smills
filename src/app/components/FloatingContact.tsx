import { useState } from "react";
import { Phone, Mail, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function FloatingContact() {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      icon: Phone,
      label: "Call Us",
      href: "tel:+27177121234",
      color: "from-slate-600 to-slate-700",
      delay: 0.05,
    },
    {
      icon: Mail,
      label: "Email Us",
      href: "mailto:sales@standertonmills.co.za",
      color: "from-amber-500 to-amber-600",
      delay: 0.1,
    },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-start gap-3">
      {/* Toggle */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ring-2 ring-white/60 ring-offset-2 ring-offset-transparent ${
          open
            ? "bg-gray-800 shadow-gray-800/30 ring-white/20"
            : "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/50 hover:ring-amber-200/50"
        }`}
        aria-label="Contact options"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="h-6 w-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Actions */}
      <AnimatePresence>
        {open &&
          actions.map((action) => (
            <motion.a
              key={action.label}
              href={action.href}
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.8 }}
              transition={{ delay: action.delay, type: "spring", stiffness: 400, damping: 20 }}
              className={`flex items-center gap-3 pl-4 pr-5 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all group border border-gray-100`}
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-gray-700 font-medium text-sm whitespace-nowrap">{action.label}</span>
            </motion.a>
          ))}
      </AnimatePresence>
    </div>
  );
}