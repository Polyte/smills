import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import {
  Menu, X, Phone, ChevronDown, Mail, MapPin, Clock,
  Factory, Layers, Shield, Truck, Sparkles, Wrench,
  FlaskConical, Award, ArrowRight, Wheat,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type DropdownItem = {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  desc: string;
  path: string;
};

const announcements = [
  { text: "New EP 500 Conveyor Belt Fabrics — Now Available", link: "/products" },
  { text: "Free Technical Consultation for Mining & Industrial Clients", link: "/contact" },
  { text: "75+ Years of Manufacturing Excellence — ISO 9001 Certified", link: "/about" },
];

const productCategories: DropdownItem[] = [
  { icon: Layers, name: "Conveyor Belt Fabrics", desc: "EP 100–500 woven reinforcement for mining", path: "/products" },
  { icon: Sparkles, name: "Cleaning & Mob Head Fabrics", desc: "Industrial cleaning & hygiene solutions", path: "/products" },
  { icon: FlaskConical, name: "Filter Press Fabrics", desc: "Filtration media for mining & chemical processing", path: "/products" },
  { icon: Factory, name: "Technical Fabrics", desc: "Custom engineered industrial solutions", path: "/products" },
  { icon: Wheat, name: "Agricultural Fabrics", desc: "Shade cloth, crop covers & ground sheeting", path: "/products" },
];

const serviceItems: DropdownItem[] = [
  { icon: Wrench, name: "Custom Fabric Development", desc: "Bespoke woven solutions for your industry", path: "/services" },
  { icon: Shield, name: "Quality Testing & Certification", desc: "SABS/SANS certified laboratory testing", path: "/services" },
  { icon: Award, name: "Technical Consultation", desc: "Expert guidance on fabric selection", path: "/services" },
  { icon: Truck, name: "Supply & Logistics", desc: "Reliable delivery across Southern Africa", path: "/services" },
];

type NavLink = { name: string; path: string; dropdown?: DropdownItem[] };

const navLinks: NavLink[] = [
  { name: "Home", path: "/" },
  { name: "Products", path: "/products", dropdown: productCategories },
  { name: "Services", path: "/services", dropdown: serviceItems },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileSubMenu, setMobileSubMenu] = useState<string | null>(null);
  const location = useLocation();
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
    setMobileSubMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    if (announcementDismissed) return;
    const id = setInterval(() => setAnnouncementIdx((i) => (i + 1) % announcements.length), 5000);
    return () => clearInterval(id);
  }, [announcementDismissed]);

  const handleDropdownEnter = (name: string) => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setActiveDropdown(name);
  };

  const handleDropdownLeave = () => {
    closeTimeout.current = setTimeout(() => setActiveDropdown(null), 180);
  };

  const isActive = (path: string) => location.pathname === path;
  const isHome = location.pathname === "/";
  const homeTransparent = isHome && !scrolled;

  return (
    <>
      {/* ── Announcement Ticker ── */}
      <AnimatePresence>
        {!announcementDismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`overflow-hidden ${
              isHome
                ? "bg-white/45 backdrop-blur-sm border-b border-slate-200/50"
                : "bg-gradient-to-r from-slate-900 via-amber-900/80 to-slate-900"
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-center gap-3 text-xs relative">
              <Sparkles className={`h-3 w-3 shrink-0 animate-pulse ${isHome ? "text-amber-600" : "text-amber-400"}`} />
              <div className="overflow-hidden relative h-5 flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={announcementIdx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link
                      to={announcements[announcementIdx].link}
                      className={`font-medium transition-colors whitespace-nowrap ${
                        isHome ? "text-slate-900 hover:text-slate-700" : "text-amber-100/90 hover:text-white"
                      }`}
                    >
                      {announcements[announcementIdx].text}
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>
              <ArrowRight className={`h-3 w-3 shrink-0 hidden sm:block ${isHome ? "text-amber-600/70" : "text-amber-400/60"}`} />
              <button
                onClick={() => setAnnouncementDismissed(true)}
                className={`absolute right-4 p-1 rounded transition-colors ${
                  isHome ? "hover:bg-black/5" : "hover:bg-white/10"
                }`}
                aria-label="Dismiss announcement"
              >
                <X className={`h-3 w-3 ${isHome ? "text-slate-500 hover:text-slate-800" : "text-white/50 hover:text-white/80"}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Info Bar ── */}
      <div
        className={`transition-all duration-300 overflow-hidden ${scrolled ? "h-0 opacity-0" : "h-10 opacity-100"} ${
          scrolled
            ? ""
            : isHome
              ? "bg-transparent backdrop-blur-sm border-b border-slate-200/40 text-slate-900"
              : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] animate-sm-gradient-drift text-slate-300"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs">
          <div className={`hidden sm:flex items-center gap-6 font-medium ${isHome && !scrolled ? "text-slate-900" : ""}`}>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 opacity-60" />
              Mon – Fri: 07:30 – 17:00
            </span>
            <span className={`h-3 w-px shrink-0 ${isHome && !scrolled ? "bg-slate-300" : "bg-slate-600"}`} />
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-[0.18em] ${
                isHome && !scrolled ? "border-amber-600/40 bg-amber-500/15 text-amber-900" : "border-amber-600/35 bg-amber-500/10 text-amber-700"
              }`}
            >
              EST. 1948
            </span>
            <span className={`h-3 w-px shrink-0 ${isHome && !scrolled ? "bg-slate-300" : "bg-slate-600"}`} />
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 opacity-60" />
              Standerton, Mpumalanga
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <a
              href="tel:+27177121234"
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                isHome && !scrolled ? "text-slate-900 hover:text-amber-700" : "hover:text-amber-400"
              }`}
            >
              <Phone className="h-3 w-3 shrink-0" />
              <span>+27 17 712 1234</span>
            </a>
            <span className={`hidden h-3 w-px shrink-0 sm:block ${isHome && !scrolled ? "bg-slate-300" : "bg-slate-600"}`} />
            <a
              href="mailto:info@standertonmills.co.za"
              className={`hidden sm:inline-flex items-center gap-1.5 font-medium transition-colors ${
                isHome && !scrolled ? "text-slate-900 hover:text-amber-700" : "hover:text-amber-400"
              }`}
            >
              <Mail className="h-3 w-3 opacity-60" />
              info@standertonmills.co.za
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 sm-shimmer-border ${
          homeTransparent
            ? "border-b border-white/20 bg-transparent shadow-none backdrop-blur-[2px] supports-[backdrop-filter]:bg-white/[0.04]"
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
                    className={`font-bold font-display ${homeTransparent ? "text-amber-600" : "text-amber-400"}`}
                  >
                    SM
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-bold tracking-tight font-display ${homeTransparent ? "text-slate-900" : "text-slate-800"}`}
                      style={{ fontSize: scrolled ? "1.1rem" : "1.25rem", transition: "font-size 0.3s" }}
                    >
                      Standerton
                    </span>
                    <span
                      className={`font-bold tracking-tight font-display ${homeTransparent ? "text-slate-700" : "text-slate-600"}`}
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
                      homeTransparent ? "text-amber-800" : "text-amber-600/90"
                    }`}
                  >
                    EST. 1948
                  </span>
                </div>
              </motion.div>
            </Link>

            {/* ── Desktop Navigation ── */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <div
                  key={link.path}
                  className="relative"
                  onMouseEnter={() => link.dropdown && handleDropdownEnter(link.name)}
                  onMouseLeave={() => link.dropdown && handleDropdownLeave()}
                >
                  <Link
                    to={link.path}
                    prefetch="intent"
                    className="relative px-4 py-2 group flex items-center gap-1"
                    aria-haspopup={link.dropdown ? "true" : undefined}
                    aria-expanded={link.dropdown ? activeDropdown === link.name : undefined}
                  >
                    <span
                      className={`relative z-10 transition-colors duration-200 ${
                        homeTransparent
                          ? isActive(link.path)
                            ? "font-bold text-black"
                            : "font-semibold text-slate-800 group-hover:text-black"
                          : isActive(link.path)
                            ? "text-slate-800 font-semibold"
                            : "text-gray-600 group-hover:text-slate-900"
                      }`}
                    >
                      {link.name}
                    </span>
                    {link.dropdown && (
                      <ChevronDown
                        className={`relative z-10 h-3.5 w-3.5 transition-all duration-200 ${
                          activeDropdown === link.name ? "rotate-180" : ""
                        } ${
                          homeTransparent
                            ? "text-slate-600 group-hover:text-black"
                            : "text-gray-400 group-hover:text-slate-600"
                        }`}
                      />
                    )}

                    {/* Hover pill */}
                    <span
                      className={`absolute inset-0 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-200 origin-center ${
                        homeTransparent ? "bg-black/[0.06]" : "bg-stone-100"
                      }`}
                    />

                    {/* Active underline */}
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

                  {/* ── Dropdown Panel ── */}
                  <AnimatePresence>
                    {link.dropdown && activeDropdown === link.name && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
                        onMouseEnter={() => handleDropdownEnter(link.name)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(0,0,0,0.04)] p-2 min-w-[340px]">
                          <div className="space-y-0.5">
                            {link.dropdown.map((item) => (
                              <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => setActiveDropdown(null)}
                                className="flex items-start gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-amber-50/80 hover:to-amber-50/20 transition-all duration-200 group/item"
                              >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 flex items-center justify-center ring-1 ring-amber-200/25 group-hover/item:ring-amber-300/50 group-hover/item:shadow-sm transition-all">
                                  <item.icon className="h-5 w-5 text-amber-600 group-hover/item:text-amber-700 transition-colors" />
                                </div>
                                <div className="pt-0.5">
                                  <div className="font-semibold text-slate-800 text-sm group-hover/item:text-amber-800 transition-colors">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                    {item.desc}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                          <div className="mt-1 pt-2 border-t border-gray-100/80 px-2">
                            <Link
                              to={link.path}
                              onClick={() => setActiveDropdown(null)}
                              className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors group/all"
                            >
                              View all {link.name.toLowerCase()}
                              <ArrowRight className="h-3.5 w-3.5 group-hover/all:translate-x-0.5 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <div className={`w-px h-8 mx-2 ${homeTransparent ? "bg-slate-200" : "bg-gray-200"}`} />

              <Link
                to="/crm/login"
                prefetch="intent"
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  homeTransparent
                    ? "text-slate-800 hover:text-black"
                    : "text-gray-600 hover:text-slate-900"
                }`}
              >
                Staff
              </Link>

              <a
                href="tel:+27177121234"
                className={`flex items-center gap-2 px-3 py-2 font-medium transition-colors ${
                  homeTransparent
                    ? "text-slate-800 hover:text-black"
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
                homeTransparent ? "hover:bg-black/5 active:bg-black/10" : "hover:bg-gray-100 active:bg-gray-200"
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className={`h-6 w-6 ${homeTransparent ? "text-black" : "text-gray-800"}`} />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className={`h-6 w-6 ${homeTransparent ? "text-black" : "text-gray-700"}`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* ── Mobile Navigation ── */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
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
                <nav className="px-4 py-5 space-y-1.5 max-h-[70vh] overflow-y-auto overscroll-contain">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                    >
                      {link.dropdown ? (
                        <div>
                          <div className="flex items-center">
                            <Link
                              to={link.path}
                              onClick={() => setIsMenuOpen(false)}
                              className={`flex-1 flex items-center px-4 py-3.5 rounded-l-xl transition-all ${
                                isActive(link.path)
                                  ? "bg-gradient-to-r from-stone-100 to-amber-50/50 text-slate-800 font-semibold border-l-4 border-amber-500 shadow-sm"
                                  : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                              }`}
                            >
                              {link.name}
                            </Link>
                            <button
                              onClick={() => setMobileSubMenu(mobileSubMenu === link.name ? null : link.name)}
                              className={`px-3.5 py-3.5 rounded-r-xl transition-colors ${
                                mobileSubMenu === link.name ? "bg-amber-50 text-amber-700" : "text-gray-400 hover:bg-gray-50"
                              }`}
                              aria-label={`${mobileSubMenu === link.name ? "Collapse" : "Expand"} ${link.name}`}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileSubMenu === link.name ? "rotate-180" : ""}`} />
                            </button>
                          </div>

                          <AnimatePresence>
                            {mobileSubMenu === link.name && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="pl-3 pr-1 py-2 space-y-0.5">
                                  {link.dropdown.map((sub) => (
                                    <Link
                                      key={sub.name}
                                      to={sub.path}
                                      onClick={() => setIsMenuOpen(false)}
                                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-amber-50/60 hover:text-amber-800 transition-colors"
                                    >
                                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-amber-50/80 flex items-center justify-center">
                                        <sub.icon className="h-4 w-4 text-amber-500/80" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{sub.name}</div>
                                        <div className="text-[11px] text-gray-400 truncate">{sub.desc}</div>
                                      </div>
                                    </Link>
                                  ))}
                                  <Link
                                    to={link.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-600"
                                  >
                                    View all {link.name.toLowerCase()}
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Link>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
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
                      )}
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
