import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, Shield, ArrowRight, MessageSquare } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ParticleField } from "../components/effects/ParticleField";

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    product: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", phone: "", company: "", product: "", message: "" });
    }, 4000);
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: "Visit Us",
      details: ["123 Mill Street", "Standerton, 2430", "Mpumalanga, South Africa"],
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      icon: Phone,
      title: "Call Us",
      details: ["Main: +27 17 712 1234", "Sales: +27 17 712 1235", "Fax: +27 17 712 1236"],
      gradient: "from-amber-500 to-amber-600",
    },
    {
      icon: Mail,
      title: "Email Us",
      details: ["info@standertonmills.co.za", "sales@standertonmills.co.za", "technical@standertonmills.co.za"],
      gradient: "from-emerald-600 to-teal-600",
    },
    {
      icon: Clock,
      title: "Business Hours",
      details: ["Mon - Fri: 07:30 - 17:00", "Saturday: 08:00 - 13:00", "Sunday & Public Holidays: Closed"],
      gradient: "from-amber-600 to-orange-500",
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
          <div className="absolute top-10 right-10 w-72 h-72 bg-amber-500 rounded-full blur-3xl" />
        </div>
        <ParticleField count={18} color="amber" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 font-display">
            Contact <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">Us</span>
          </h1>
          <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
            Get in touch with our team — we're ready to help with your industrial fabric requirements
          </p>
        </motion.div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {contactInfo.map((info) => (
              <motion.div
                key={info.title}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="bg-white p-7 rounded-2xl shadow-md hover:shadow-xl transition-all group border border-gray-100 hover:border-amber-200"
              >
                <motion.div
                  className={`w-14 h-14 mb-5 rounded-xl bg-gradient-to-br ${info.gradient} flex items-center justify-center shadow-lg`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <info.icon className="h-7 w-7 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{info.title}</h3>
                <div className="space-y-1.5">
                  {info.details.map((detail) => (
                    <p key={detail} className="text-gray-600 text-sm">{detail}</p>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block px-4 py-2 mb-6 bg-gradient-to-r from-emerald-50 to-amber-50 border border-amber-200 rounded-full">
                <span className="text-emerald-700 font-semibold text-sm">Send Us a Message</span>
              </div>
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Request a Quote or Enquiry</h2>
              <p className="text-gray-600 mb-8">
                Fill out the form below and our team will respond within 24 business hours.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-emerald-50 to-amber-50 border border-emerald-200 rounded-2xl p-10 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">
                    Thank you for contacting Standerton Mills. Our team will respond within 24 business hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                      <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 transition-all" placeholder="Your full name" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                      <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 transition-all" placeholder="you@company.co.za" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                      <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 transition-all" placeholder="+27 12 345 6789" />
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                      <input type="text" id="company" name="company" value={formData.company} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 transition-all" placeholder="Your company" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1.5">Product Interest</label>
                    <select id="product" name="product" value={formData.product} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 transition-all">
                      <option value="">Select a product line...</option>
                      <option value="conveyor">Conveyor Belt Fabrics</option>
                      <option value="mobhead">Mob Head Fabrics</option>
                      <option value="technical">Technical Fabrics</option>
                      <option value="industrial">Woven Industrial Fabrics</option>
                      <option value="custom">Custom / Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                    <textarea id="message" name="message" required rows={5} value={formData.message} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-gray-50 transition-all"
                      placeholder="Tell us about your fabric requirements, quantities, and any specific specifications..." />
                  </div>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium py-3.5 px-6 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all flex items-center justify-center hover:shadow-lg border-b-2 border-amber-500 relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <Send className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">Send Message</span>
                  </motion.button>
                </form>
              )}
            </motion.div>

            {/* Location & Additional Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block px-4 py-2 mb-6 bg-gradient-to-r from-emerald-50 to-amber-50 border border-amber-200 rounded-full">
                <span className="text-emerald-700 font-semibold text-sm">Our Location</span>
              </div>
              <h2 className="text-3xl font-bold mb-6 text-gray-900">Visit Our Facility</h2>

              <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 border border-gray-100">
                <div className="relative h-[300px] bg-gray-200">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1659088742936-d591856d55c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFpbiUyMHN0b3JhZ2UlMjBzaWxvcyUyMGFncmljdWx0dXJlfGVufDF8fHx8MTc3NDc0NDcwM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                    alt="Standerton Mills Location"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Standerton Mills Head Office & Factory</h3>
                  <p className="text-gray-600 mb-4">
                    123 Mill Street<br />
                    Standerton, 2430<br />
                    Mpumalanga, South Africa
                  </p>
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Get Directions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-amber-50 rounded-2xl p-7 border border-emerald-100 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Quick Response Guarantee</h3>
                </div>
                <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                  We pride ourselves on excellent customer service. Our team typically responds to
                  enquiries within 24 business hours.
                </p>
                <ul className="space-y-2 text-gray-700 text-sm">
                  {[
                    "Email enquiries: Response within 24 hours",
                    "Phone calls: Immediate assistance during business hours",
                    "Technical queries: Specialist engineer callback",
                    "Emergency orders: Priority handling available",
                  ].map((item) => (
                    <li key={item} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-6 w-6 text-emerald-600" />
                  <h3 className="text-lg font-bold text-gray-900">Certifications</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["ISO 9001", "ISO 14001", "SABS", "SANS", "B-BBEE"].map((cert) => (
                    <span key={cert} className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-amber-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-amber-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 font-display">
              Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Questions</span>
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-5"
          >
            {[
              {
                q: "What is your minimum order quantity?",
                a: "Minimum order quantities vary by product line. For conveyor belt fabrics, typical MOQs start from 500 linear metres. Mob head fabrics start from 200kg. Technical fabrics depend on complexity. Contact our sales team for exact figures.",
              },
              {
                q: "What conveyor belt fabric grades do you manufacture?",
                a: "We manufacture the full range from EP 100 to EP 500, in nylon and polyester warp/weft combinations. Widths up to 2200mm are available. All grades meet SABS/SANS specifications for conveyor belt reinforcement.",
              },
              {
                q: "Do you offer international shipping?",
                a: "Yes, we export to 15+ countries across Africa and internationally. We provide comprehensive export logistics support including documentation, customs clearance, and CIF/FOB pricing options.",
              },
              {
                q: "Can you develop custom fabric specifications?",
                a: "Absolutely! Our technical team specialises in custom fabric development. We work with you from consultation through prototype to full production, including custom weave patterns, weights, and treatment options.",
              },
              {
                q: "What quality certifications do you hold?",
                a: "We are ISO 9001 (Quality Management) and ISO 14001 (Environmental Management) certified. Our products meet SABS and SANS standards. We are B-BBEE compliant and provide full batch certification with every order.",
              },
              {
                q: "What is your typical lead time?",
                a: "Standard products are typically available within 2-3 weeks. Custom specifications may require 4-6 weeks depending on complexity. We offer just-in-time delivery options for regular orders and emergency priority handling.",
              },
            ].map((faq) => (
              <motion.div
                key={faq.q}
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                className="bg-white p-7 rounded-2xl shadow-md border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all"
              >
                <h3 className="text-lg font-bold mb-3 text-gray-900">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-emerald-800 via-emerald-900 to-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <ParticleField count={10} color="amber" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">
            Prefer to <span className="text-amber-400">Call</span>?
          </h2>
          <p className="text-emerald-200 text-lg mb-8">
            Our sales team is available Monday to Friday, 07:30 – 17:00 SAST
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} href="tel:+27177121234" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 font-semibold rounded-xl hover:from-amber-400 hover:to-amber-500 transition-all hover:shadow-xl">
              <Phone className="h-5 w-5 mr-2" />
              +27 17 712 1234
            </motion.a>
            <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} href="mailto:sales@standertonmills.co.za" className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border-2 border-white/20 hover:border-amber-400/40">
              <Mail className="h-5 w-5 mr-2" />
              sales@standertonmills.co.za
            </motion.a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
