export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="absolute left-4 top-4 z-[200] -translate-y-[120%] rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg outline-none ring-amber-300 transition-transform focus:translate-y-0 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
    >
      Skip to main content
    </a>
  );
}
