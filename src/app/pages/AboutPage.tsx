import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Award, Target, Users, Leaf, Shield, Factory, CheckCircle, Globe, Handshake, Heart } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ParticleField } from "../components/effects/ParticleField";
import { TiltCard } from "../components/effects/TiltCard";
import { GlowButton } from "../components/effects/GlowButton";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { ArrowRight } from "lucide-react";

export function AboutPage() {
  const values = [
    {
      icon: Award,
      title: "Quality Excellence",
      description: "We never compromise on quality. Every product meets SABS/SANS standards and is batch-tested in our in-house laboratory.",
      gradient: "from-amber-500 to-amber-600",
    },
    {
      icon: Target,
      title: "Customer Focus",
      description: "Our customers are at the heart of everything we do. We develop tailored fabric solutions for each client's unique needs.",
      gradient: "from-slate-500 to-slate-600",
    },
    {
      icon: Handshake,
      title: "Integrity & Trust",
      description: "Built on five decades of honest business. We deliver what we promise — on spec, on time, every time.",
      gradient: "from-amber-600 to-orange-500",
    },
    {
      icon: Heart,
      title: "Community Impact",
      description: "We invest in the Standerton community through job creation, skills development, and B-BBEE compliance.",
      gradient: "from-slate-600 to-slate-700",
    },
    {
      icon: Leaf,
      title: "Sustainability",
      description: "Committed to sustainable textile practices with ISO 14001-certified environmental management and waste reduction programs.",
      gradient: "from-amber-500 to-yellow-500",
    },
    {
      icon: Globe,
      title: "Innovation",
      description: "Continuously investing in modern weaving technology and R&D to develop next-generation industrial fabrics for evolving markets.",
      gradient: "from-slate-500 to-slate-600",
    },
  ];

  const timeline = [
    {
      year: "1974",
      title: "Foundation",
      description: "Standerton Mills established in Standerton, Mpumalanga, with a vision to manufacture quality industrial fabrics for South Africa's growing economy.",
    },
    {
      year: "1985",
      title: "Conveyor Belt Expansion",
      description: "Major investment in weaving capacity for conveyor belt fabrics, becoming a key supplier to the South African mining sector.",
    },
    {
      year: "1995",
      title: "Mob Head Fabrics Launch",
      description: "Introduced dedicated mob head fabric production line, serving the rapidly growing commercial cleaning industry across Southern Africa.",
    },
    {
      year: "2005",
      title: "ISO & SABS Certification",
      description: "Achieved ISO 9001, ISO 14001, and SABS certification, cementing our reputation for quality management and environmental responsibility.",
    },
    {
      year: "2015",
      title: "Technical Fabrics Division",
      description: "Launched specialized technical fabrics division, offering custom-engineered woven solutions for filtration, construction, and specialty applications.",
    },
    {
      year: "2020",
      title: "Modernisation Programme",
      description: "Invested R50 million in state-of-the-art weaving equipment, doubling production capacity while improving energy efficiency by 30%.",
    },
    {
      year: "2026",
      title: "Innovation Leader",
      description: "Continuing to innovate with sustainable materials, advanced weave constructions, and digital quality control for next-generation industrial fabrics.",
    },
  ];

  const team = [
    { name: "Jan Botha", role: "Managing Director", desc: "35+ years in textile manufacturing. Drives the company's vision and strategic growth." },
    { name: "Nomsa Dlamini", role: "Operations Director", desc: "Oversees all manufacturing operations, quality assurance, and supply chain management." },
    { name: "Pieter Venter", role: "Technical Director", desc: "Leads R&D and custom fabric development. Expert in weave engineering and fibre science." },
    { name: "Lindiwe Mthembu", role: "Sales & Marketing Director", desc: "Manages key client relationships and market expansion across Africa and beyond." },
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
      <section className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        </div>

        <ParticleField count={18} color="amber" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <div className="inline-block px-4 py-2 mb-6 bg-amber-500/20 border border-amber-400/30 rounded-full">
            <span className="text-amber-300 font-medium">Est. 1974  |  Standerton, Mpumalanga</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 font-display">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">Standerton Mills</span>
          </h1>
          <p className="text-xl text-slate-200 max-w-3xl mx-auto">
            Over 50 years of textile manufacturing excellence, serving South Africa's mining, industrial, cleaning, and construction sectors
          </p>
        </motion.div>
      </section>

      {/* Our Story */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="relative h-[600px] rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758271452953-46f4e12ae2fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZXh0aWxlJTIweWFybiUyMGZhY3RvcnklMjBtYW51ZmFjdHVyaW5nfGVufDF8fHx8MTc3NDc0NTA5NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Textile manufacturing facility"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
              </div>
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-2xl p-5 border-l-4 border-amber-500"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">1974</div>
                  <div className="text-sm text-gray-600">Founded</div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-block px-4 py-2 mb-6 bg-gradient-to-r from-stone-100 to-amber-50 border border-amber-200 rounded-full">
                <span className="text-slate-700 font-semibold">Our Story</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
                Five Decades of{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Manufacturing Heritage</span>
              </h2>

              <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                <p>
                  Founded in 1974 in the heart of Standerton, Mpumalanga, Standerton Mills began as
                  a small family-owned textile operation with a simple mission: to provide the finest
                  quality industrial fabrics to South Africa's growing economy.
                </p>
                <p>
                  Over five decades, we have grown from humble beginnings into one of South Africa's
                  most trusted names in industrial fabric manufacturing. Our success is built on unwavering commitment to
                  quality, innovation, and customer satisfaction.
                </p>
                <p>
                  Today, we specialise in four core product lines — conveyor belt fabrics, mob head fabrics,
                  technical fabrics, and woven industrial fabrics — serving hundreds of customers across
                  the mining, construction, cleaning, agricultural, and logistics sectors.
                </p>
                <p>
                  Our state-of-the-art facility houses advanced weaving equipment capable of producing
                  fabrics from EP 100 to EP 500 grades, with widths up to 2200mm. Every batch is
                  laboratory-tested to meet SABS/SANS specifications.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 bg-gradient-to-br from-stone-100 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white p-10 rounded-3xl shadow-lg border-t-4 border-slate-600"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">Our Mission</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                To manufacture and supply premium-quality industrial fabrics that meet the exacting demands
                of South African industry, while creating sustainable employment and contributing to the
                economic development of our local community.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white p-10 rounded-3xl shadow-lg border-t-4 border-amber-500"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Globe className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">Our Vision</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                To be the leading manufacturer of industrial woven fabrics in Southern Africa, recognised
                globally for our quality, innovation, and commitment to sustainable manufacturing practices
                that set the benchmark for our industry.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Our Core <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Values</span>
            </h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              The principles that guide everything we do at Standerton Mills
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {values.map((value) => (
              <motion.div
                key={value.title}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all text-center group border border-gray-100 hover:border-amber-200"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 mb-6 rounded-xl bg-gradient-to-br ${value.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                  <value.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-amber-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">Leadership Team</h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              Experienced professionals driving excellence in every aspect of our business
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {team.map((member) => (
              <motion.div
                key={member.name}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all text-center group"
              >
                <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-stone-200 to-amber-100 rounded-full flex items-center justify-center group-hover:from-stone-300 group-hover:to-amber-200 transition-all">
                  <Users className="h-10 w-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-amber-600 font-semibold text-sm mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{member.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Company Timeline */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Journey</span>
            </h2>
            <p className="text-gray-600 text-xl max-w-2xl mx-auto">
              Five decades of growth, innovation, and textile manufacturing excellence
            </p>
          </motion.div>

          <div className="relative">
            {/* Timeline line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-amber-400 to-slate-300 transform -translate-x-1/2" />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="space-y-12"
            >
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  variants={itemVariants}
                  className={`flex flex-col lg:flex-row gap-8 items-center ${
                    index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? "lg:text-right" : "lg:text-left"}`}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-amber-200"
                    >
                      <div className="text-amber-600 font-bold text-lg mb-2">{item.year}</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.description}</p>
                    </motion.div>
                  </div>

                  {/* Timeline dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-5 h-5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full ring-8 ring-white shadow-lg" />
                  </div>

                  <div className="flex-1 hidden lg:block" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Facility */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-stone-100/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-block px-4 py-2 mb-6 bg-gradient-to-r from-stone-100 to-amber-50 border border-amber-200 rounded-full">
                <span className="text-slate-700 font-semibold">Our Facility</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
                State-of-the-Art{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Manufacturing</span>
              </h2>

              <div className="space-y-4 text-gray-600 text-lg leading-relaxed mb-8">
                <p>
                  Our state-of-the-art facility in Standerton is equipped with the latest
                  weaving and finishing technology to ensure optimal efficiency and product quality.
                </p>
                <p>
                  With advanced rapier and air-jet looms, our facility can produce fabrics up to 2200mm wide
                  in weights from 100 g/m² to 800+ g/m², meeting the demands of both small and large customers.
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  "Advanced rapier and air-jet weaving looms",
                  "In-house textile testing laboratory",
                  "Climate-controlled production environment",
                  "Automated quality monitoring systems",
                  "Dedicated R&D and prototype facility",
                  "50,000 m² manufacturing campus",
                ].map((item, index) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08, duration: 0.5 }}
                    className="flex items-start text-gray-700"
                  >
                    <CheckCircle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-lg">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1761808070515-bfb862a85011?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZXh0aWxlJTIwbWFudWZhY3R1cmluZyUyMGZhY2lsaXR5JTIwaW5kdXN0cmlhbHxlbnwxfHx8fDE3NzQ3NDUwOTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Manufacturing facility"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-24 bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-72 h-72 bg-amber-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-slate-600 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Standerton Mills <span className="text-amber-400">by the Numbers</span>
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: "50+", label: "Years in Operation" },
              { value: "500+", label: "Active Clients" },
              { value: "300+", label: "Skilled Employees" },
              { value: "15+", label: "Export Countries" },
              { value: "50,000", label: "m² Manufacturing Campus" },
              { value: "4", label: "Core Product Lines" },
              { value: "99.2%", label: "On-Time Delivery" },
              { value: "100%", label: "SA Manufactured" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className="text-center group cursor-default"
              >
                <div className="text-4xl md:text-5xl font-bold text-amber-400 mb-2 group-hover:text-amber-300 transition-colors">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm md:text-base">{stat.label}</div>
              </motion.div>
            ))}
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Partner With <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Excellence</span>
            </h2>
            <p className="text-gray-600 text-xl mb-10 max-w-2xl mx-auto">
              Discover how Standerton Mills can supply your industrial fabric needs with quality, reliability, and expertise built over 50+ years.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 font-semibold rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all hover:shadow-xl hover:scale-105"
              >
                Contact Our Team
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all hover:shadow-xl hover:scale-105 border-b-2 border-amber-500"
              >
                View Our Products
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}