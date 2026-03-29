import { Truck, Shield, HeadphonesIcon, Scissors, FlaskConical, Ruler, CheckCircle, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ParticleField } from "../components/effects/ParticleField";
import { Breadcrumbs } from "../components/ux/Breadcrumbs";
import { TiltCard } from "../components/effects/TiltCard";

export function ServicesPage() {
  const services = [
    {
      icon: Scissors,
      title: "Custom Weaving",
      description: "Advanced weaving capabilities for conveyor belt, mob head, technical, and industrial fabric constructions to your exact specifications.",
      features: ["Plain, twill, and satin weaves", "Widths up to 2200mm", "EP 100 – EP 500 grades", "Custom weight and strength specs"],
      gradient: "from-amber-500 to-amber-600",
    },
    {
      icon: Ruler,
      title: "Fabric Development",
      description: "Our R&D team develops custom fabric solutions from concept to production, tailored to your specific application requirements.",
      features: ["Application analysis & consultation", "Prototype development & testing", "Performance optimisation", "Full technical documentation"],
      gradient: "from-slate-500 to-slate-600",
    },
    {
      icon: FlaskConical,
      title: "Finishing & Treatment",
      description: "Specialist finishing treatments to enhance fabric performance for specific industrial applications and environments.",
      features: ["Heat-setting & stabilisation", "Chemical resistance treatments", "Anti-abrasion coatings", "Custom colour matching"],
      gradient: "from-amber-600 to-orange-500",
    },
    {
      icon: Shield,
      title: "Quality Assurance",
      description: "Comprehensive quality control at every stage. SABS/SANS certified with in-house testing laboratory for full batch traceability.",
      features: ["Tensile strength testing", "Adhesion & elongation testing", "Dimensional stability checks", "Full batch certificates"],
      gradient: "from-emerald-600 to-emerald-700",
    },
    {
      icon: Truck,
      title: "Logistics & Delivery",
      description: "Reliable delivery across South Africa and international shipping to 15+ countries. Just-in-time options available.",
      features: ["Nationwide distribution network", "Export logistics & documentation", "Just-in-time delivery options", "Real-time order tracking"],
      gradient: "from-amber-500 to-yellow-500",
    },
    {
      icon: HeadphonesIcon,
      title: "Technical Support",
      description: "Expert guidance from our experienced textile engineers for product selection, application engineering, and problem-solving.",
      features: ["Product recommendation", "Application engineering", "On-site technical visits", "After-sales support"],
      gradient: "from-emerald-500 to-emerald-600",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-amber-500 rounded-full blur-3xl" />
        </div>
        <ParticleField count={18} color="amber" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <div className="mb-8 flex justify-center">
            <Breadcrumbs items={[{ label: "Services" }]} tone="dark" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 font-display">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">Services</span>
          </h1>
          <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
            End-to-end industrial fabric manufacturing — from custom development to quality-certified delivery
          </p>
        </motion.div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-50" />
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
              <span className="text-amber-700 font-semibold text-sm tracking-wider uppercase">What We Offer</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-display">Comprehensive Textile Services</h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              From initial consultation to final delivery, we handle every aspect of your industrial fabric needs
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {services.map((service) => (
              <motion.div key={service.title} variants={itemVariants}>
                <TiltCard className="h-full" intensity={8}>
                  <div className="relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all overflow-hidden group h-full">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${service.gradient} opacity-5 rounded-bl-full group-hover:opacity-15 transition-opacity`} />

                    <motion.div
                      className={`inline-flex items-center justify-center w-16 h-16 mb-6 rounded-xl bg-gradient-to-br ${service.gradient} shadow-lg relative z-10`}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <service.icon className="h-8 w-8 text-white" />
                    </motion.div>

                    <h3 className="text-2xl font-bold mb-3 text-gray-900 relative z-10">{service.title}</h3>
                    <p className="text-gray-600 mb-6 relative z-10 leading-relaxed">{service.description}</p>

                    <ul className="space-y-2 relative z-10">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-start text-gray-700">
                          <CheckCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
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

      {/* Manufacturing Process */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-display">
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Manufacturing</span> Process
            </h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              From raw material to finished product, we maintain the highest standards at every step
            </p>
          </motion.div>

          <div className="relative">
            <div className="hidden md:block absolute top-14 left-0 right-0 h-1 bg-gradient-to-r from-emerald-200 via-amber-400 to-emerald-200" />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10"
            >
              {[
                { step: "1", title: "Consultation", desc: "Understanding your application requirements and performance specifications" },
                { step: "2", title: "Engineering", desc: "Custom fabric design with optimal weave pattern, weight, and fibre selection" },
                { step: "3", title: "Weaving", desc: "Precision manufacturing on advanced looms with real-time quality monitoring" },
                { step: "4", title: "Testing", desc: "Laboratory testing for tensile strength, elongation, adhesion, and more" },
                { step: "5", title: "Delivery", desc: "Certified, packaged, and dispatched with full documentation and traceability" },
              ].map((process) => (
                <motion.div
                  key={process.step}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all text-center relative group"
                >
                  <motion.div
                    className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {process.step}
                  </motion.div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">{process.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{process.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Industries Served */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-display">Industries We Serve</h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              Our products and services support diverse industries across multiple sectors
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
                image: "https://images.unsplash.com/photo-1766927189733-a39cf79c6f82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbmclMjBjb252ZXlvciUyMGJlbHQlMjBpbmR1c3RyaWFsfGVufDF8fHx8MTc3NDc0NjQ3OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
                title: "Mining & Resources",
                desc: "Conveyor belt fabrics for South Africa's mining industry — underground, open-pit, and mineral processing",
              },
              {
                image: "https://images.unsplash.com/photo-1669101602108-fa5ba89507ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbW9wJTIwY2xlYW5pbmclMjBmbG9vcnxlbnwxfHx8fDE3NzQ3NDY0Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
                title: "Cleaning & Hygiene",
                desc: "Premium mob head fabrics for industrial, commercial, and institutional cleaning applications",
              },
              {
                image: "https://images.unsplash.com/photo-1672552226255-7ef3996d4814?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXJlaG91c2UlMjBsb2dpc3RpY3MlMjBmYWJyaWMlMjByb2xsc3xlbnwxfHx8fDE3NzQ3NDY0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
                title: "Logistics & Manufacturing",
                desc: "Technical and woven industrial fabrics for material handling, filtration, and production systems",
              },
            ].map((industry) => (
              <motion.div
                key={industry.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }}
                className="relative h-80 rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
              >
                <ImageWithFallback
                  src={industry.image}
                  alt={industry.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end">
                  <div className="p-8 text-white w-full">
                    <h3 className="text-2xl font-bold mb-2">{industry.title}</h3>
                    <p className="text-gray-200">{industry.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 font-display">
              Manufacturing <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Capabilities</span>
            </h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              State-of-the-art equipment and skilled workforce
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
                title: "Weaving Capacity",
                items: ["Advanced rapier looms", "Air-jet weaving capability", "Width range: 1000mm – 2200mm", "Weight range: 100 – 800+ g/m²"],
                gradient: "from-emerald-500 to-teal-500",
              },
              {
                title: "Testing Laboratory",
                items: ["Tensile strength testing", "Elongation at break", "Adhesion testing", "Dimensional stability"],
                gradient: "from-amber-500 to-amber-600",
              },
              {
                title: "Production Specs",
                items: ["EP 100 – EP 500 conveyor grades", "Cotton/poly/blend mob heads", "Custom technical constructions", "ISO 9001 certified processes"],
                gradient: "from-emerald-600 to-emerald-700",
              },
            ].map((capability) => (
              <motion.div
                key={capability.title}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100"
              >
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${capability.gradient}`} />
                <h3 className="text-2xl font-bold mb-6 text-gray-900">{capability.title}</h3>
                <ul className="space-y-3 text-gray-700">
                  {capability.items.map((item) => (
                    <li key={item} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-800 via-emerald-900 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <ParticleField count={12} color="amber" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-display">
            Need Custom <span className="text-amber-400">Textile Solutions</span>?
          </h2>
          <p className="text-emerald-100 text-xl max-w-2xl mx-auto mb-10">
            Our team of textile experts is ready to work with you to develop tailored solutions
            that meet your specific requirements. Contact us today to discuss your needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/contact"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 font-semibold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all hover:shadow-2xl"
              >
                Get in Touch
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </motion.div>
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
