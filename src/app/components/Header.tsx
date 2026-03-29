import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Menu, X, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    { name: "Services", path: "/services" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Info Bar */}
      <div
        className={`bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] animate-sm-gradient-drift text-slate-300 transition-all duration-300 overflow-hidden ${scrolled ? "h-0 opacity-0" : "h-10 opacity-100"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs">
          <div className="hidden sm:flex items-center gap-6">
            <span>Mon - Fri: 07:30 - 17:00</span>
            <span className="w-px h-3 bg-slate-600" />
            <span>Standerton, Mpumalanga, South Africa</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <a href="tel:+27177121234" className="flex items-center gap-1.5 hover:text-amber-400 transition-colors">
              <Phone className="h-3 w-3" />
              <span>+27 17 712 1234</span>
            </a>
            <span className="w-px h-3 bg-slate-600 hidden sm:block" />
            <a href="mailto:info@standertonmills.co.za" className="hidden sm:inline hover:text-amber-400 transition-colors">
              info@standertonmills.co.za
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 sm-shimmer-border ${
          scrolled
            ? "bg-white/88 backdrop-blur-xl backdrop-saturate-150 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] border-b border-amber-900/5"
            : "bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.06)]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-all duration-300 ${scrolled ? "h-16" : "h-20"}`}>
            {/* Logo */}
            <Link to="/" prefetch="intent" className="flex items-center group relative">
              <motion.div
                className="flex items-center gap-2.5"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className={`bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-md ring-1 ring-white/10 transition-all duration-300 ${scrolled ? "w-9 h-9" : "w-11 h-11"}`}>
                  <span className="text-amber-400 font-bold font-display">SM</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="text-slate-800 font-bold tracking-tight font-display" style={{ fontSize: scrolled ? "1.1rem" : "1.25rem", transition: "font-size 0.3s" }}>
                      Standerton
                    </span>
                    <span className="text-slate-600 font-bold tracking-tight font-display" style={{ fontSize: scrolled ? "1.1rem" : "1.25rem", transition: "font-size 0.3s" }}>
                      Mills
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-gradient-to-r from-slate-600 via-amber-500 to-slate-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </div>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  prefetch="intent"
                  className="relative px-4 py-2 group"
                >
                  <span className={`relative z-10 transition-colors duration-200 ${
                    isActive(link.path) ? "text-slate-800 font-semibold" : "text-gray-500 group-hover:text-slate-800"
                  }`}>
                    {link.name}
                  </span>

                  {/* Hover background */}
                  <span className="absolute inset-0 bg-stone-100 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-200 origin-center" />

                  {/* Active indicator */}
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute -bottom-1 left-2 right-2 h-0.5 bg-gradient-to-r from-slate-500 via-amber-500 to-slate-500 rounded-full"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              ))}

              <div className="w-px h-8 bg-gray-200 mx-2" />

              <a
                href="tel:+27177121234"
                className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-slate-800 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden xl:inline text-sm">+27 17 712 1234</span>
              </a>

              <Link
                to="/contact"
                prefetch="intent"
                className="ml-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-700 text-white rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all hover:shadow-lg hover:shadow-amber-500/20 hover:scale-[1.03] active:scale-[0.98] font-medium"
              >
                Get Quote
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="h-6 w-6 text-gray-700" />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="h-6 w-6 text-gray-700" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                style={{ top: scrolled ? "64px" : "104px" }}
              />

              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl overflow-hidden relative z-50"
              >
                <nav className="px-4 py-5 space-y-1.5">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                    >
                      <Link
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center px-4 py-3.5 rounded-xl transition-all ${
                          isActive(link.path)
                            ? "bg-gradient-to-r from-stone-100 to-amber-50/50 text-slate-800 font-semibold border-l-4 border-amber-500 shadow-sm"
                            : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                        }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.2 }}
                    className="pt-3"
                  >
                    <a
                      href="tel:+27177121234"
                      className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-slate-800"
                    >
                      <Phone className="h-5 w-5" />
                      <span>+27 17 712 1234</span>
                    </a>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.2 }}
                    className="pt-2"
                  >
                    <Link
                      to="/contact"
                      prefetch="intent"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3.5 bg-gradient-to-r from-amber-600 to-yellow-700 text-white text-center rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-colors font-medium shadow-lg shadow-amber-500/10"
                    >
                      Get a Free Quote
                    </Link>
                  </motion.div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
