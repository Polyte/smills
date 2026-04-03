import { cn } from "./ui/utils";
import { BRAND_LOGO_SRC, BRAND_NAME } from "../brand";

type Props = {
  className?: string;
  /** CSS pixel height of the raster logo */
  height?: number;
  /**
   * White pad behind the wordmark so black type reads correctly (required on dark UI).
   * On bare image: no wrapper styling — use only when the parent already provides white.
   */
  withBrandTile?: boolean;
};

export function BrandLogo({ className, height = 36, withBrandTile = true }: Props) {
  const img = (
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      height={height}
      className="block w-auto max-w-[min(100%,320px)] object-contain object-left"
      style={{ height }}
      loading="eager"
      decoding="async"
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
