import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";
import { FloatingContact } from "./FloatingContact";
import { WhatsAppFloat } from "./WhatsAppFloat";
import { PageProgress } from "./effects/PageProgress";
import { SkipToContent } from "./ux/SkipToContent";
import { RouteAnnouncer } from "./ux/RouteAnnouncer";
import { AppToaster } from "./ux/AppToaster";
import { MainLandmark } from "./ux/MainLandmark";

export function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <SkipToContent />
      <RouteAnnouncer />
      <AppToaster />
      {/* Subtle film grain — adds depth without affecting legibility */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="sm-ambient" aria-hidden>
        <div className="sm-ambient__orb sm-ambient__orb--amber" />
        <div className="sm-ambient__orb sm-ambient__orb--slate" />
        <div className="sm-ambient__orb sm-ambient__orb--warm" />
      </div>
      <PageProgress />
      <Header />
      <MainLandmark />
      <Footer />
      <ScrollToTop />
      <WhatsAppFloat />
      <FloatingContact />
    </div>
  );
}