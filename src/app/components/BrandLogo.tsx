import { useState } from "react";
import { cn } from "./ui/utils";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";

type Props = {
  className?: string;
  /** CSS pixel height of the logo */
  height?: number;
  /**
   * White pad behind the wordmark so dark type reads correctly on dark UI (sidebar, etc.).
   * Omit when the parent already provides a light background (e.g. invoice preview).
   */
  withBrandTile?: boolean;
};

export function BrandLogo({ className, height = 36, withBrandTile = true }: Props) {
  const [failed, setFailed] = useState(false);

  const fallback = (
    <span
      className="block max-w-[min(100%,320px)] font-display font-bold leading-tight tracking-tight text-slate-900"
      style={{ fontSize: Math.max(14, height * 0.55) }}
    >
      {BRAND_NAME}
      <span className="mt-1 block h-0.5 w-12 rounded-full bg-amber-700" aria-hidden />
    </span>
  );

  const img = failed ? (
    fallback
  ) : (
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      height={height}
      className="block w-auto max-w-[min(100%,320px)] object-contain object-left"
      style={{ height, width: "auto" }}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );

  if (!withBrandTile) {
    return <span className={cn("inline-flex items-center", className)}>{img}</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl bg-white px-3 py-2.5 shadow-[0_4px_28px_rgba(15,23,42,0.16),0_0_0_1px_rgba(255,255,255,0.9)_inset] ring-2 ring-white/95 ring-offset-2 ring-offset-transparent dark:bg-white dark:ring-white dark:shadow-[0_6px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15)_inset]",
        className
      )}
    >
      {img}
    </span>
  );
}
