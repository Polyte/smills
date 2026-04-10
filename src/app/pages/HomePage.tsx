import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { ArrowRight, Award, Users, Factory, Globe, Shield, Layers, Droplets, Settings, CheckCircle, Star, HardHat, Building2, Wheat, Truck, ChevronLeft, ChevronRight, History } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { ParticleField } from "../components/effects/ParticleField";
import { TiltCard } from "../components/effects/TiltCard";
import { TextReveal } from "../components/effects/TextReveal";
import { GlowButton } from "../components/effects/GlowButton";
import { AnimatedBorder } from "../components/effects/AnimatedBorder";
import { useRef } from "react";
import { ProductQuoteDialog } from "../components/quote/ProductQuoteDialog";
import type { QuoteProductKey } from "../../lib/quoteProductCatalog";
import { Button } from "../components/ui/button";

type HeroSlide = {
  image?: string;
  /** When set, shows a muted autoplay YouTube embed instead of the image */
  youtubeId?: string;
  /** Autoplay interval for this slide (ms). Video slides use a longer default */
  durationMs?: number;
  badge: string;
  title: string;
  highlight: string;
  titleEnd: string;
  subtitle: string;
  cta: { label: string; to: string };
  secondary: { label: string; to: string };
};

const HERO_SLIDES: HeroSlide[] = [
  {
    image: "https://images.unsplash.com/photo-1758271941610-dbf5ce7d3c23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwd2VhdmluZyUyMGxvb20lMjBtYWNoaW5lcnl8ZW58MXx8fHwxNzc0NzQ2NDc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    badge: "SABS/SANS Certified  |  Since 1948",
    title: "South Africa's Premier",
    highlight: "Industrial Fabric",
    titleEnd: "Manufacturer",
    subtitle: "Conveyor belt fabrics, mob head fabrics, technical fabrics, and woven industrial fabrics — engineered for the toughest environments",
    cta: { label: "Explore Products", to: "/products" },
    secondary: { label: "Request a Quote", to: "/contact" },
  },
  {
    youtubeId: "Ffqs8SyOOMI",
    durationMs: 45000,
    badge: "Watch  |  Mill & operations",
    title: "See Our",
    highlight: "Manufacturing",
    titleEnd: "In Action",
    subtitle: "A closer look at how we weave, test, and deliver industrial fabrics built for South African industry.",
    cta: { label: "Explore Products", to: "/products" },
    secondary: { label: "Contact Us", to: "/contact" },
  },
  {
    image: "https://images.unsplash.com/photo-1766927189733-a39cf79c6f82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb252ZXlvciUyMGJlbHQlMjBtaW5pbmclMjBoZWF2eSUyMGluZHVzdHJ5fGVufDF8fHx8MTc3NDc0NzM1Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    badge: "EP 100 – EP 500 Grades Available",
    title: "Heavy-Duty",
    highlight: "Conveyor Belt",
    titleEnd: "Fabrics",
    subtitle: "Engineered for South African mining — high tensile strength, heat resistant, and abrasion resistant woven reinforcement fabrics",
    cta: { label: "View Conveyor Fabrics", to: "/products" },
    secondary: { label: "Get Technical Specs", to: "/contact" },
  },
  {
    image: "https://images.unsplash.com/photo-1684259499086-93cb3e555803?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZXh0aWxlJTIwZmFjdG9yeSUyMHByb2R1Y3Rpb24lMjBsaW5lJTIwd29ya2Vyc3xlbnwxfHx8fDE3NzQ3NDczNTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    badge: "Custom Solutions  |  R&D Lab",
    title: "Bespoke",
    highlight: "Technical Fabrics",
    titleEnd: "& Solutions",
    subtitle: "Our R&D team develops custom woven fabric solutions — from filtration and cleaning to construction and agricultural applications",
    cta: { label: "Our Services", to: "/services" },
    secondary: { label: "Talk to an Engineer", to: "/contact" },
  },
  {
    image: "https://images.unsplash.com/photo-1764114440403-4dd539cb582a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbWFudWZhY3R1cmluZyUyMG1hY2hpbmVyeXxlbnwxfHx8fDE3NzQ2OTkwMTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    badge: "75+ Years of Excellence  |  Since 1948",
    title: "Trusted by",
    highlight: "500+ Clients",
    titleEnd: "Across Africa",
    subtitle: "From Mpumalanga to the world — ISO 9001 certified, B-BBEE compliant, and committed to quality that South African industry depends on",
    cta: { label: "About Us", to: "/about" },
    secondary: { label: "Contact Us", to: "/contact" },
  },
  {
    youtubeId: "casxx2fr0-I",
    durationMs: 45000,
    badge: "Watch  |  Company story",
    title: "Built for",
    highlight: "Industry",
    titleEnd: "& endurance",
    subtitle: "Quality, scale, and the people behind every roll of fabric — from Standerton to your operation.",
    cta: { label: "About Us", to: "/about" },
    secondary: { label: "Request a Quote", to: "/contact" },
  },
];

function HeroYoutubeBackground({ videoId, isActive }: { videoId: string; isActive: boolean }) {
  if (!isActive) {
    return <div className="absolute inset-0 bg-slate-950" aria-hidden />;
  }

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: videoId,
    controls: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    iv_load_policy: "3",
    enablejsapi: "1",
    /** Hint for HTML5 embed; YouTube may still cap by source / device */
    vq: "hd1080",
  });
  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }

  const embedSrc = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;

  /**
   * ~35% larger than 16:9 “cover” so the iframe’s layout box pushes YouTube toward higher ABR rungs.
   * Pure max() avoids nested calc() quirks; parent overflow clips the excess.
   */
  const iframeW = "max(135vw, 240vh)";
  const iframeH = "max(75.9375vw, 135vh)";

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <iframe
        key={videoId}
        title="Hero background video"
        className="pointer-events-none absolute left-1/2 top-1/2 max-w-none border-0 [transform:translate3d(-50%,-50%,0)] [backface-visibility:hidden]"
        style={{
          width: iframeW,
          height: iframeH,
        }}
        src={embedSrc}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

export function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  const currentDurationSec = (HERO_SLIDES[currentSlide].durationMs ?? 6000) / 1000;

  useEffect(() => {
    const ms = HERO_SLIDES[currentSlide].durationMs ?? 6000;
    const timer = window.setTimeout(nextSlide, ms);
    return () => window.clearTimeout(timer);
  }, [currentSlide, nextSlide]);

  const stats = [
    { label: "Years of Excellence", value: "75+", icon: Award },
    { label: "Satisfied Clients", value: "500+", icon: Users },
    { label: "Product Lines", value: "4", icon: Factory },
    { label: "Export Markets", value: "15+", icon: Globe },
  ];

  const products: {
    title: string;
    quoteKey: QuoteProductKey;
    description: string;
    image: string;
    icon: typeof Layers;
    gradient: string;
  }[] = [
    {
      title: "Conveyor Belt Fabrics",
      quoteKey: "conveyor-belt-fabrics",
      description: "Heavy-duty woven fabrics engineered for conveyor belt reinforcement in mining and industrial applications. EP 100 to EP 500 grades.",
      image:
        "https://images.unsplash.com/photo-1766927189733-a39cf79c6f82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb252ZXlvciUyMGJlbHQlMjBtaW5pbmclMjBpbmR1c3RyaWFsfGVufDF8fHx8MTc3NDc0NTg4NXww&ixlib=rb-4.1.0&q=80&w=800&utm_source=figma&utm_medium=referral",
      icon: Layers,
      gradient: "from-amber-500 to-amber-600",
    },
    {
      title: "Mob Head Fabrics",
      quoteKey: "mob-head-fabrics",
      description: "Premium absorbent fabrics for industrial and commercial cleaning applications. Cotton, polyester, and blended compositions.",
      image:
        "https://images.unsplash.com/photo-1770922262610-259aade25700?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbW9wJTIwY2xlYW5pbmclMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzc0NzQ1ODgxfDA&ixlib=rb-4.1.0&q=80&w=800&utm_source=figma&utm_medium=referral",
      icon: Droplets,
      gradient: "from-slate-500 to-slate-600",
    },
    {
      title: "Technical Fabrics",
      quoteKey: "technical-fabrics",
      description: "Custom-engineered woven solutions for specialized industrial requirements. Heat-resistant, chemical-resistant, and high-performance.",
      image:
        "https://images.unsplash.com/photo-1726208054327-b29cac050df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobmljYWwlMjB3b3ZlbiUyMGZhYnJpYyUyMHRleHRpbGUlMjBjbG9zZSUyMHVwfGVufDF8fHx8MTc3NDc0NTg4MXww&ixlib=rb-4.1.0&q=80&w=800&utm_source=figma&utm_medium=referral",
      icon: Settings,
      gradient: "from-amber-600 to-yellow-700",
    },
    {
      title: "Woven Industrial Fabrics",
      quoteKey: "woven-industrial-fabrics",
      description: "Versatile multi-purpose industrial fabrics for filtration, material handling, and general industrial use.",
      image:
        "https://images.unsplash.com/photo-1758271941610-dbf5ce7d3c23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwd292ZW4lMjBmYWJyaWMlMjBtYW51ZmFjdHVyaW5nJTIwbG9vbXxlbnwxfHx8fDE3NzQ3NDU4ODF8MA&ixlib=rb-4.1.0&q=80&w=800&utm_source=figma&utm_medium=referral",
      icon: Shield,
      gradient: "from-slate-600 to-slate-700",
    },
  ];

  const industries = [
    { title: "Mining", icon: HardHat, desc: "Conveyor belt fabrics for SA mines" },
    { title: "Construction", icon: Building2, desc: "Safety & material handling fabrics" },
    { title: "Agriculture", icon: Wheat, desc: "Protective & shade cloth fabrics" },
    { title: "Logistics", icon: Truck, desc: "Material handling & transport" },
    { title: "Manufacturing", icon: Factory, desc: "Technical & custom solutions" },
    { title: "Cleaning", icon: Droplets, desc: "Industrial mop & cleaning fabrics" },
  ];

  const testimonials = [
    {
      quote: "Standerton Mills has been our go-to supplier for conveyor belt fabrics for over 15 years. Consistent quality and reliable delivery every time.",
      author: "Johan van der Merwe",
      role: "Procurement Manager",
      company: "Mpumalanga Mining Group",
      rating: 5,
    },
    {
      quote: "Their mob head fabrics are unmatched in absorbency and durability. We've reduced our cleaning supply costs by 30% since switching to Standerton Mills.",
      author: "Thandi Nkosi",
      role: "Operations Director",
      company: "CleanPro Industrial Services",
      rating: 5,
    },
    {
      quote: "The technical team at Standerton Mills developed a custom fabric solution that perfectly met our filtration requirements. Outstanding service.",
      author: "Pieter du Plessis",
      role: "Chief Engineer",
      company: "PretoriaCem Holdings",
      rating: 5,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative h-[750px] flex items-center justify-center overflow-hidden">
        {/* Parallax background images */}
        {HERO_SLIDES.map((slide, index) => (
          <motion.div
            key={index}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              opacity: currentSlide === index ? 1 : 0,
              y: heroY,
            }}
          >
            {/* Parallax zoom blurs scaled video; keep scale on images only */}
            <motion.div
              className="absolute inset-0"
              style={{ scale: slide.youtubeId ? 1 : heroScale }}
            >
              {slide.youtubeId ? (
                <HeroYoutubeBackground videoId={slide.youtubeId} isActive={currentSlide === index} />
              ) : (
                <ImageWithFallback
                  src={slide.image!}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </motion.div>
          </motion.div>
        ))}

        {/* Gold diagonal accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/10 to-transparent" />

        {/* Floating particles */}
        <ParticleField count={25} color="gold" />
        <ParticleField count={10} color="slate" />

        {/* Carousel Navigation Arrows */}
        <motion.button
          onClick={prevSlide}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-amber-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 hover:border-amber-400/50 transition-all group"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-white group-hover:text-amber-300 transition-colors" />
        </motion.button>
        <motion.button
          onClick={nextSlide}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-amber-500/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 hover:border-amber-400/50 transition-all group"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 text-white group-hover:text-amber-300 transition-colors" />
        </motion.button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
          <motion.div
            key={currentSlide}
            className="h-full bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: currentDurationSec, ease: "linear" }}
          />
        </div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-block px-5 py-2.5 mb-6 bg-slate-500/20 backdrop-blur-sm border border-amber-400/40 rounded-full"
              >
                <span className="bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-300 bg-clip-text font-medium tracking-wide text-transparent">
                  {HERO_SLIDES[currentSlide].badge}
                </span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl text-white mb-6 font-bold leading-tight font-display">
                {HERO_SLIDES[currentSlide].title}<br />
                <span className="gold-text-shimmer inline-block">{HERO_SLIDES[currentSlide].highlight}</span>{" "}
                {HERO_SLIDES[currentSlide].titleEnd}
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
                {HERO_SLIDES[currentSlide].subtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <GlowButton to={HERO_SLIDES[currentSlide].cta.to} variant="gold">
                  {HERO_SLIDES[currentSlide].cta.label}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </GlowButton>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={HERO_SLIDES[currentSlide].secondary.to}
                    className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border-2 border-amber-400/40 hover:border-amber-400/70"
                  >
                    {HERO_SLIDES[currentSlide].secondary.label}
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide indicators */}
          <div className="mt-10 flex justify-center gap-3">
            {HERO_SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index
                    ? "w-10 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 shadow-lg shadow-amber-400/40 ring-1 ring-white/30"
                    : "w-2 bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Certification badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            {["Est. 1948", "ISO 9001 Certified", "SABS Approved", "B-BBEE Compliant", "SANS Standards"].map((cert, i) => (
              <motion.div
                key={cert}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                whileHover={{ scale: 1.05, borderColor: "rgba(234,179,8,0.45)" }}
                className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 transition-all"
              >
                {cert === "Est. 1948" ? (
                  <History className="h-4 w-4 text-amber-300 drop-shadow-[0_0_8px_oklch(0.78_0.12_86/0.45)]" />
                ) : (
                  <Shield className="h-4 w-4 text-yellow-300 drop-shadow-[0_0_8px_oklch(0.88_0.1_90/0.5)]" />
                )}
                <span className={cert === "Est. 1948" ? "font-semibold text-amber-100/95 tracking-wide" : undefined}>{cert}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <ParticleField count={15} color="white" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                whileHover={{ scale: 1.08, y: -8 }}
                className="text-center group cursor-default"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-amber-500/20 backdrop-blur-sm rounded-2xl group-hover:bg-amber-500/30 transition-all border border-amber-400/20"
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <stat.icon className="h-8 w-8 text-amber-400" />
                </motion.div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-slate-300 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Core Products Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-stone-200 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-100 rounded-full blur-3xl opacity-50" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block px-4 py-2 mb-4 bg-amber-50 border border-amber-200 rounded-full">
              <span className="text-amber-700 font-semibold text-sm tracking-wider uppercase">Our Core Product Lines</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-display">
              <TextReveal>Four Pillars of Excellence</TextReveal>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Engineered for South Africa's most demanding industries
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {products.map((product) => (
              <motion.div key={product.title} variants={itemVariants} className="h-full min-h-0">
                <TiltCard className="h-full">
                  <AnimatedBorder className="h-full">
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl">
                      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-200">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                        <motion.div
                          className={`absolute bottom-3 left-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${product.gradient} shadow-lg ring-2 ring-white/30`}
                          whileHover={{ scale: 1.08, rotate: 4 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <product.icon className="h-6 w-6 text-white" aria-hidden />
                        </motion.div>
                      </div>
                      <div className="flex flex-1 flex-col p-5 pt-5">
                        <h3 className="mb-2 text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-slate-800 lg:text-xl">
                          {product.title}
                        </h3>
                        <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">{product.description}</p>
                        <div className="mt-auto flex flex-col gap-2 w-full">
                          <Link
                            to="/products"
                            className="inline-flex items-center text-sm font-semibold text-amber-600 transition-colors hover:text-amber-700 group/link"
                          >
                            Learn More
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                          </Link>
                          <ProductQuoteDialog productKey={product.quoteKey} productLabel={product.title}>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full border-amber-200 text-amber-800 hover:bg-amber-50"
                            >
                              Get a quote
                            </Button>
                          </ProductQuoteDialog>
                        </div>
                      </div>
                    </div>
                  </AnimatedBorder>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <GlowButton to="/products" variant="primary">
              View All Products & Specifications
              <ArrowRight className="h-5 w-5" />
            </GlowButton>
          </motion.div>
        </div>
      </section>

      {/* Industries We Serve */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-display">
              Industries We <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Serve</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Trusted by leading companies across South Africa's key sectors
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
          >
            {industries.map((ind) => (
              <motion.div
                key={ind.title}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.05 }}
                className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all text-center group border border-gray-100 hover:border-amber-200 cursor-pointer"
              >
                <motion.div
                  className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-md group-hover:from-amber-500 group-hover:to-amber-600 transition-all"
                  whileHover={{ rotate: 10 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ind.icon className="h-7 w-7 text-white" />
                </motion.div>
                <h3 className="font-bold text-gray-900 mb-1">{ind.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{ind.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Preview Section */}
      <section className="py-24 bg-gradient-to-br from-stone-100 via-white to-amber-50 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-stone-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex flex-wrap items-center gap-3 mb-6">
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-stone-100 to-amber-50 border border-amber-200 rounded-full">
                  <span className="text-slate-700 font-semibold">About Standerton Mills</span>
                </div>
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-white/90 px-4 py-2 text-xs font-bold tracking-[0.2em] text-amber-800 shadow-sm"
                  aria-label="Established nineteen forty-eight"
                >
                  EST. 1948
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight font-display">
                75+ Years of Textile{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Manufacturing Heritage</span>
              </h2>

              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                Established in 1948 in Standerton, Mpumalanga, we have grown from a small family operation into one of South Africa's most respected industrial fabric manufacturers. Our facility houses state-of-the-art weaving equipment capable of producing fabrics from 100 g/m² to 800+ g/m².
              </p>

              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                We serve the mining, construction, cleaning, agricultural, and logistics sectors with SABS-approved products that meet the most stringent South African and international quality standards.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: "SABS/SANS Certified", icon: Shield },
                  { label: "B-BBEE Compliant", icon: Award },
                  { label: "ISO 9001 Quality", icon: CheckCircle },
                  { label: "SA Manufactured", icon: Factory },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.03 }}
                    className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all"
                  >
                    <item.icon className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <span className="text-gray-700 text-sm font-medium">{item.label}</span>
                  </motion.div>
                ))}
              </div>

              <GlowButton to="/about" variant="primary">
                Our Full Story
                <ArrowRight className="h-5 w-5" />
              </GlowButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <motion.div
                className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1750582343233-880f73565bcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb3V0aCUyMGFmcmljYSUyMGZhY3RvcnklMjB3b3JrZXJzJTIwdGVhbXxlbnwxfHx8fDE3NzQ3NDY0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Factory team"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
              </motion.div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.1, rotate: -3 }}
                className="absolute -bottom-6 -left-6 max-w-[220px] rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/40 to-white p-5 shadow-2xl ring-1 ring-black/5"
              >
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg ring-2 ring-amber-400/50">
                    <History className="h-7 w-7 text-amber-300" aria-hidden />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700">Established</p>
                    <p className="font-display text-3xl font-bold leading-none text-slate-900">1948</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">Standerton, Mpumalanga</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-stone-100 to-amber-50 rounded-full blur-3xl opacity-60" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-display">
              Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-slate-700">Standerton Mills</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The trusted name in South African industrial textiles
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                title: "Proudly South African",
                desc: "100% locally manufactured in Standerton, Mpumalanga. We support local jobs, local supply chains, and the South African economy.",
                gradient: "from-slate-500 to-slate-600",
                highlights: ["Local employment", "SA supply chains", "Community investment"],
              },
              {
                title: "Unmatched Quality",
                desc: "Every roll of fabric undergoes rigorous testing in our in-house laboratory. SABS/SANS certified and ISO 9001 compliant for consistent excellence.",
                gradient: "from-amber-500 to-amber-600",
                highlights: ["In-house testing lab", "Full traceability", "Batch certification"],
              },
              {
                title: "Tailored Solutions",
                desc: "Our experienced technical team works directly with you to develop custom fabric specifications that perfectly match your application requirements.",
                gradient: "from-slate-600 to-slate-700",
                highlights: ["Custom weave patterns", "Bespoke specifications", "Prototype development"],
              },
            ].map((item) => (
              <motion.div key={item.title} variants={itemVariants}>
                <TiltCard className="h-full">
                  <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 group h-full">
                    <div className={`w-full h-1.5 bg-gradient-to-r ${item.gradient} rounded-full mb-6`} />
                    <h3 className="text-2xl font-bold mb-3 text-gray-900">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-6">{item.desc}</p>
                    <ul className="space-y-2">
                      {item.highlights.map((h) => (
                        <li key={h} className="flex items-center text-gray-700 text-sm">
                          <CheckCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <ParticleField count={15} color="amber" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-slate-600 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-display">
              What Our <span className="text-amber-400">Clients</span> Say
            </h2>
            <p className="text-slate-300 text-xl max-w-2xl mx-auto">
              Trusted by leading companies across Southern Africa
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((t) => (
              <motion.div key={t.author} variants={itemVariants}>
                <TiltCard className="h-full" intensity={6}>
                  <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-amber-400/30 transition-all h-full">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-gray-200 leading-relaxed mb-6 italic">"{t.quote}"</p>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-white font-semibold">{t.author}</p>
                      <p className="text-amber-300 text-sm">{t.role}</p>
                      <p className="text-slate-400 text-sm">{t.company}</p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-slate-950 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <ParticleField count={12} color="amber" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-display">
            Ready to Partner With{" "}
            <span className="gold-text-shimmer inline-block">South Africa&apos;s Best</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Whether you need conveyor belt fabrics for mining, mob head fabrics for cleaning, or custom technical solutions — we deliver quality, on time, every time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GlowButton to="/contact" variant="gold">
              Contact Us Today
              <ArrowRight className="h-5 w-5" />
            </GlowButton>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border-2 border-white/20 hover:border-amber-400/40"
              >
                View Products
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}