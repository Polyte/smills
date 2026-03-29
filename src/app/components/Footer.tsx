import { Link } from "react-router";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 bg-slate-900 text-slate-400">
      {/* Gold accent bar */}
      <div className="h-1.5 sm-gradient-bar-animated" />

      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center">
                <span className="text-amber-400 font-bold text-lg font-display">SM</span>
              </div>
              <div>
                <h3 className="text-white text-lg font-bold font-display tracking-tight">Standerton Mills</h3>
                <div className="h-0.5 bg-gradient-to-r from-slate-500 via-amber-500 to-slate-500 rounded-full" />
              </div>
            </div>
            <p className="text-slate-500 mb-4 text-sm leading-relaxed">
              Leading manufacturer of premium conveyor belt fabrics, mob head fabrics, technical fabrics, and woven industrial fabrics in South Africa. SABS/SANS certified for quality excellence.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="sm-icon-tile w-9 h-9 bg-slate-800 hover:bg-amber-600 rounded-lg flex items-center justify-center transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="sm-icon-tile w-9 h-9 bg-slate-800 hover:bg-amber-600 rounded-lg flex items-center justify-center transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="sm-icon-tile w-9 h-9 bg-slate-800 hover:bg-amber-600 rounded-lg flex items-center justify-center transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-amber-500 font-semibold mb-4 text-sm tracking-wider uppercase">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { label: "Home", to: "/" },
                { label: "Products", to: "/products" },
                { label: "Services", to: "/services" },
                { label: "About Us", to: "/about" },
                { label: "Contact", to: "/contact" },
                { label: "Staff sign in", to: "/crm/login" },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="sm-link-underline w-fit text-slate-500 hover:text-white transition-colors flex items-center group text-sm">
                    <ArrowRight className="h-3 w-3 mr-2 text-amber-600 group-hover:translate-x-1 transition-transform" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-amber-500 font-semibold mb-4 text-sm tracking-wider uppercase">Our Products</h3>
            <ul className="space-y-3">
              {[
                "Conveyor Belt Fabrics",
                "Mob Head Fabrics",
                "Technical Fabrics",
                "Woven Industrial Fabrics",
              ].map((product) => (
                <li key={product}>
                  <Link to="/products" className="sm-link-underline w-fit text-slate-500 hover:text-white transition-colors flex items-center group text-sm">
                    <ArrowRight className="h-3 w-3 mr-2 text-amber-600 group-hover:translate-x-1 transition-transform" />
                    {product}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-amber-500 font-semibold mb-4 text-sm tracking-wider uppercase">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-amber-600" />
                <span className="text-slate-500 text-sm">Standerton, Mpumalanga, South Africa</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-3 flex-shrink-0 text-amber-600" />
                <span className="text-slate-500 text-sm">+27 17 712 1234</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-3 flex-shrink-0 text-amber-600" />
                <span className="text-slate-500 text-sm">info@standertonmills.co.za</span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700 sm-card-lift">
              <p className="text-amber-500 text-xs font-semibold mb-1">SABS / SANS Certified</p>
              <p className="text-slate-600 text-xs">ISO 9001 | ISO 14001 | SANS Compliant</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-sm">&copy; {new Date().getFullYear()} Standerton Mills (Pty) Ltd. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-600">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">B-BBEE Certificate</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
