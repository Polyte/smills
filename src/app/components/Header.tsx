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
  const isHome = location.pathname === "/";
  const homeTransparent = isHome && !scrolled;

  return (
    <>
      {/* Top Info Bar */}
      <div
        className={`transition-all duration-300 overflow-hidden ${scrolled ? "h-0 opacity-0" : "h-10 opacity-100"} ${
          scrolled
            ? ""
            : isHome
              ? "bg-slate-950/55 backdrop-blur-md border-b border-white/20 text-white shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
              : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] animate-sm-gradient-drift text-slate-300"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs">
          <div className={`hidden sm:flex items-center gap-6 font-medium ${isHome && !scrolled ? "text-white drop-shadow-sm" : ""}`}>
            <span>Mon - Fri: 07:30 - 17:00</span>
            <span className={`h-3 w-px shrink-0 ${isHome && !scrolled ? "bg-white/35" : "bg-slate-600"}`} />
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-[0.18em] ${
                isHome && !scrolled ? "border-amber-400/50 bg-white/10 text-amber-100" : "border-amber-600/35 bg-amber-500/10 text-amber-700"
              }`}
            >
              EST. 1948
            </span>
            <span className={`h-3 w-px shrink-0 ${isHome && !scrolled ? "bg-white/35" : "bg-slate-600"}`} />
            <span>Standerton, Mpumalanga, South Africa</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <a
              href="tel:+27177121234"
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                isHome && !scrolled ? "text-white drop-shadow-sm hover:text-amber-300" : "hover:text-amber-400"
              }`}
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>+27 17 712 1234</span>
            </a>
            <span className={`hidden h-3 w-px shrink-0 sm:block ${isHome && !scrolled ? "bg-white/35" : "bg-slate-600"}`} />
            <a
              href="mailto:info@standertonmills.co.za"
              className={`hidden font-medium transition-colors sm:inline ${
                isHome && !scrolled ? "text-white drop-shadow-sm hover:text-amber-300" : "hover:text-amber-400"
              }`}
            >
              info@standertonmills.co.za
            </a>
          </div>
        </div>
      </div>

      {/* Main Header — homepage: transparent over hero; glass morph on scroll */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 sm-shimmer-border ${
          homeTransparent
            ? "border-b border-white/25 bg-slate-950/50 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/40"
            : scrolled
              ? isHome
                ? "bg-white/50 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.65)] border-b border-white/55 supports-[backdrop-filter]:bg-white/40"
                : "bg-white/88 backdrop-blur-xl backdrop-saturate-150 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)] border-b border-amber-900/5"
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
                <div
                  className={`rounded-xl flex items-center justify-center shadow-md transition-all duration-300 ${scrolled ? "w-9 h-9" : "w-11 h-11"} ${
                    homeTransparent
                      ? "bg-gradient-to-br from-slate-800 to-slate-950 ring-2 ring-amber-400/70 shadow-lg shadow-black/40"
                      : "bg-gradient-to-br from-slate-700 to-slate-900 ring-1 ring-white/10"
                  }`}
                >
                  <span
                    className={`font-bold font-display ${homeTransparent ? "text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" : "text-amber-400"}`}
                  >
                    SM
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-bold tracking-tight font-display ${homeTransparent ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]" : "text-slate-800"}`}
                      style={{ fontSize: scrolled ? "1.1rem" : "1.25rem", transition: "font-size 0.3s" }}
                    >
                      Standerton
                    </span>
                    <span
                      className={`font-bold tracking-tight font-display ${homeTransparent ? "text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]" : "text-slate-600"}`}
                      style={{ fontSize: scrolled ? "1.1rem" : "1.25rem", transition: "font-size 0.3s" }}
                    >
                      Mills
                    </span>
                  </div>
                  <div
                    className={`h-0.5 w-full rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${
                      homeTransparent ? "bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300" : "bg-gradient-to-r from-slate-600 via-amber-500 to-slate-600"
                    }`}
                  />
                  <span
                    className={`mt-0.5 text-[9px] font-bold tracking-[0.22em] ${
                      homeTransparent ? "text-amber-200/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]" : "text-amber-600/90"
                    }`}
                  >
                    EST. 1948
                  </span>
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
                  <span
                    className={`relative z-10 transition-colors duration-200 ${
                      homeTransparent
                        ? isActive(link.path)
                          ? "font-bold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                          : "font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] group-hover:text-amber-200"
                        : isActive(link.path)
                          ? "text-slate-800 font-semibold"
                          : "text-gray-600 group-hover:text-slate-900"
                    }`}
                  >
                    {link.name}
                  </span>

                  {/* Hover background */}
                  <span
                    className={`absolute inset-0 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-200 origin-center ${
                      homeTransparent ? "bg-white/18" : "bg-stone-100"
                    }`}
                  />

                  {/* Active indicator */}
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="nav-active"
                      className={`absolute -bottom-1 left-2 right-2 h-0.5 rounded-full ${
                        homeTransparent
                          ? "bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                          : "bg-gradient-to-r from-slate-500 via-amber-500 to-slate-500"
                      }`}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              ))}

              <div className={`w-px h-8 mx-2 ${homeTransparent ? "bg-white/25" : "bg-gray-200"}`} />

              <Link
                to="/crm/login"
                prefetch="intent"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  homeTransparent
                    ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-amber-200"
                    : "text-gray-600 hover:text-slate-900"
                }`}
              >
                Staff
              </Link>

              <a
                href="tel:+27177121234"
                className={`flex items-center gap-2 px-3 py-2 font-medium transition-colors ${
                  homeTransparent
                    ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-amber-200"
                    : "text-gray-600 hover:text-slate-900"
                }`}
              >
                <Phone className="h-4 w-4" />
                <span className="hidden xl:inline text-sm">+27 17 712 1234</span>
              </a>

              <Link
                to="/contact"
                prefetch="intent"
                className="gold-shine-surface relative ml-2 inline-flex items-center px-6 py-2.5 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-700 text-white rounded-xl ring-1 ring-white/20 transition-all hover:from-amber-400 hover:via-yellow-400 hover:to-amber-600 hover:shadow-[0_6px_28px_-4px_oklch(0.78_0.12_86/0.55)] hover:scale-[1.03] active:scale-[0.98] font-medium drop-shadow-sm"
              >
                <span className="relative z-[4]">Get Quote</span>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className={`lg:hidden p-2.5 rounded-xl transition-colors ${
                homeTransparent ? "hover:bg-white/15 active:bg-white/20" : "hover:bg-gray-100 active:bg-gray-200"
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className={`h-6 w-6 ${homeTransparent ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" : "text-gray-800"}`} />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className={`h-6 w-6 ${homeTransparent ? "text-white" : "text-gray-700"}`} />
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
                style={{ top: scrolled ? "64px" : isHome ? "120px" : "104px" }}
              />

              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="lg:hidden border-t border-white/20 bg-white/75 backdrop-blur-2xl backdrop-saturate-150 overflow-hidden relative z-50 supports-[backdrop-filter]:bg-white/55"
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
                    transition={{ delay: 0.28, duration: 0.2 }}
                    className="pt-3"
                  >
                    <Link
                      to="/crm/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center px-4 py-3.5 rounded-xl text-gray-700 hover:bg-gray-50"
                    >
                      Staff sign in
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.2 }}
                    className="pt-1"
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
                      className="gold-shine-surface relative block px-4 py-3.5 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-700 text-center text-white rounded-xl ring-1 ring-white/15 transition-all hover:from-amber-400 hover:via-yellow-400 hover:to-amber-600 font-medium shadow-lg shadow-amber-600/25"
                    >
                      <span className="relative z-[4]">Get a Free Quote</span>
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
