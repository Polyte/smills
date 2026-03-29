import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { CheckCircle, Shield, Droplets, Settings, Layers, Factory, Truck, HardHat, Wrench, Wheat, Package, Building2, Shirt, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ParticleField } from "../components/effects/ParticleField";
import { TiltCard } from "../components/effects/TiltCard";
import { TextReveal } from "../components/effects/TextReveal";
import { GlowButton } from "../components/effects/GlowButton";
import { Breadcrumbs } from "../components/ux/Breadcrumbs";

export function ProductsPage() {
  const products = [
    {
      id: 1,
      name: "Conveyor Belt Fabrics",
      subtitle: "CONVEYOR BELT FABRICS",
      description:
        "Heavy-duty woven fabrics specifically designed for conveyor belt reinforcement. Engineered for maximum durability in demanding industrial environments.",
      image:
        "https://images.unsplash.com/photo-1766927189733-a39cf79c6f82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb252ZXlvciUyMGJlbHQlMjBtaW5pbmclMjBpbmR1c3RyaWFsfGVufDF8fHx8MTc3NDc0NTg4NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      features: ["High tensile strength", "Heat resistant", "Abrasion resistant"],
      color: "from-slate-600 to-slate-700",
      icon: Truck,
    },
    {
      id: 2,
      name: "Mob Head Fabrics",
      subtitle: "MOB HEAD FABRICS",
      description:
        "High-quality fabrics designed for industrial cleaning applications. Superior absorbency and durability for heavy-duty mopping tasks.",
      image:
        "https://images.unsplash.com/photo-1770922262610-259aade25700?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbW9wJTIwY2xlYW5pbmclMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzc0NzQ1ODgxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      features: ["Excellent absorbency", "Long lasting durability", "Industrial grade quality"],
      color: "from-blue-600 to-indigo-600",
      icon: Droplets,
    },
    {
      id: 3,
      name: "Technical Fabrics",
      subtitle: "TECHNICAL FABRICS",
      description:
        "Custom woven solutions for various industrial applications. Available in different weights, strengths, and specifications to meet your needs.",
      image:
        "https://images.unsplash.com/photo-1726208054327-b29cac050df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobmljYWwlMjB3b3ZlbiUyMGZhYnJpYyUyMHRleHRpbGUlMjBjbG9zZSUyMHVwfGVufDF8fHx8MTc3NDc0NTg4MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      features: ["Custom specifications", "Various weights available", "ISO certified quality"],
      color: "from-amber-600 via-yellow-500 to-amber-800",
      icon: Settings,
    },
    {
      id: 4,
      name: "Woven Industrial Fabrics",
      subtitle: "WOVEN INDUSTRIAL FABRICS",
      description:
        "Versatile woven fabrics for multiple industrial applications. Precision-engineered for performance across diverse sectors.",
      image:
        "https://images.unsplash.com/photo-1758271941610-dbf5ce7d3c23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwd292ZW4lMjBmYWJyaWMlMjBtYW51ZmFjdHVyaW5nJTIwbG9vbXxlbnwxfHx8fDE3NzQ3NDU4ODF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
      features: ["Multi-purpose use", "Consistent quality", "Engineered durability"],
      color: "from-purple-500 to-pink-500",
      icon: Layers,
    },
  ];

  const industries = [
    {
      title: "Mining",
      description: "Heavy-duty conveyor belt fabrics designed to withstand the demanding conditions of South African mines.",
      icon: HardHat,
      gradient: "from-amber-500 via-yellow-400 to-amber-600",
      items: ["Underground mining", "Open-pit operations", "Mineral processing"],
    },
    {
      title: "Manufacturing",
      description: "Technical fabrics for various manufacturing applications, from industrial equipment to consumer goods.",
      icon: Factory,
      gradient: "from-slate-500 to-slate-600",
      items: ["Conveyor systems", "Industrial equipment", "Custom applications"],
    },
    {
      title: "Construction",
      description: "Durable fabrics for construction applications including safety equipment and material handling.",
      icon: Building2,
      gradient: "from-blue-500 to-indigo-500",
      items: ["Scaffolding nets", "Safety barriers", "Material transport"],
    },
    {
      title: "Cleaning & Hygiene",
      description: "High-absorbency mob head fabrics for industrial and commercial cleaning applications.",
      icon: Droplets,
      gradient: "from-cyan-500 to-blue-500",
      items: ["Industrial mops", "Cleaning cloths", "Hygiene products"],
    },
    {
      title: "Agriculture",
      description: "Specialized fabrics for agricultural applications including crop protection and livestock farming.",
      icon: Wheat,
      gradient: "from-green-500 to-lime-500",
      items: ["Shade cloth", "Protective covers", "Farm infrastructure"],
    },
    {
      title: "Logistics",
      description: "Heavy-duty fabrics for logistics and material handling operations across various sectors.",
      icon: Package,
      gradient: "from-purple-500 to-indigo-500",
      items: ["Conveyor belts", "Cargo securement", "Warehouse operations"],
    },
    {
      title: "Cement",
      description: "Specialized fabrics for the cement industry, including filtration and material handling.",
      icon: Wrench,
      gradient: "from-gray-500 to-slate-600",
      items: ["Filtration bags", "Conveyor belting", "Dust collection"],
    },
    {
      title: "Textiles",
      description: "High-quality fabrics for various textile applications, from apparel to home furnishings.",
      icon: Shirt,
      gradient: "from-pink-500 to-rose-500",
      items: ["Apparel manufacturing", "Home textiles", "Technical textiles"],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-amber-500 rounded-full blur-3xl" />
        </div>
        <ParticleField count={18} color="amber" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <div className="mb-8 flex justify-center">
            <Breadcrumbs items={[{ label: "Products" }]} tone="dark" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 font-display">Our Products</h1>
          <p className="text-xl text-slate-200 max-w-3xl mx-auto mb-4">
            Premium industrial fabrics engineered for South Africa's toughest environments
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {["Conveyor Belt Fabrics", "Mob Head Fabrics", "Technical Fabrics", "Woven Industrial"].map((p) => (
              <span key={p} className="px-4 py-1.5 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-full">{p}</span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Products Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Product Range</h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              Four core product lines serving South Africa's key industrial sectors
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-10"
          >
            {products.map((product) => (
              <motion.div
                key={product.id}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-64 overflow-hidden">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-6">
                    <p className="text-xs tracking-[0.2em] text-amber-300 mb-1">{product.subtitle}</p>
                  </div>
                  <div
                    className={`absolute top-4 right-4 w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} shadow-lg flex items-center justify-center`}
                  >
                    <product.icon className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-amber-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>

                  <ul className="space-y-3">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center text-gray-700">
                        <CheckCircle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Specifications */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Key Specifications</h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              Our fabrics are manufactured to exacting standards with full traceability
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
                title: "Conveyor Belt Specs",
                specs: ["EP 100 – EP 500 grades", "Widths up to 2200mm", "Nylon & polyester warp/weft"],
                icon: Shield,
              },
              {
                title: "Mob Head Specs",
                specs: ["Cotton & blended compositions", "Cut-pile & loop-pile options", "Custom strip widths"],
                icon: Droplets,
              },
              {
                title: "Technical Fabric Specs",
                specs: ["Custom weave patterns", "Weight range 100–800 g/m²", "Heat & chemical resistant options"],
                icon: Settings,
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }}
                className="relative bg-gradient-to-br from-stone-50 to-gray-50 p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-stone-200/30 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl mb-4 shadow-lg">
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">{item.title}</h3>
                  <ul className="space-y-3">
                    {item.specs.map((spec) => (
                      <li key={spec} className="flex items-center text-gray-700">
                        <span className="text-amber-600 mr-3 text-xl">✓</span>
                        <span className="font-medium">{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Industries Served */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Our Industries</h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              Standerton Mills supplies high-quality fabrics to a wide range of industries.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {industries.map((industry) => (
              <motion.div
                key={industry.title}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="bg-white p-7 rounded-2xl shadow-md hover:shadow-xl transition-all group"
              >
                <div
                  className={`w-14 h-14 mb-5 rounded-xl bg-gradient-to-br ${industry.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <industry.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{industry.title}</h3>
                <p className="text-gray-600 mb-5 text-sm leading-relaxed">{industry.description}</p>
                <ul className="space-y-2">
                  {industry.items.map((item) => (
                    <li key={item} className="flex items-center text-gray-700 text-sm">
                      <CheckCircle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quality Standards */}
      <section className="py-24 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDd2MWgtN3pNMjUgNDBoN3YxaC03ek0zNiA0Nmg3djFoLTd6TTI1IDUyaDd2MWgtN3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Quality Standards & Certifications</h2>
            <p className="text-slate-200 text-xl max-w-3xl mx-auto mb-12">
              All our products are manufactured under strict quality control and meet international textile standards.
              Every batch is tested for tensile strength, elongation, and adhesion to ensure consistent performance.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
              {[
                { cert: "ISO 9001", label: "Quality Management" },
                { cert: "ISO 14001", label: "Environmental" },
                { cert: "SABS", label: "SA Bureau of Standards" },
                { cert: "SANS", label: "National Standards" },
              ].map((item, index) => (
                <motion.div
                  key={item.cert}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.1 }}
                  className="text-center group cursor-default"
                >
                  <div className="w-24 h-24 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <div className="text-3xl font-bold text-white">{item.cert}</div>
                  </div>
                  <div className="text-slate-200 font-medium">{item.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Need a Custom Solution?</h2>
            <p className="text-gray-600 text-xl mb-10 max-w-2xl mx-auto">
              Our technical team can develop bespoke fabric solutions tailored to your specific industrial requirements.
              Get in touch to discuss your project.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-600 to-yellow-700 text-white rounded-xl font-medium text-lg shadow-lg hover:shadow-xl hover:from-amber-500 hover:to-yellow-600 transition-all"
            >
              Request a Quote
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}