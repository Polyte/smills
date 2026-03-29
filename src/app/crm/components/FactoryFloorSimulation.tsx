/**
 * Decorative textile-mill scene: yarn, weaving, and fabric roll (CSS-only).
 */
export function FactoryFloorSimulation() {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-[oklch(0.42_0.08_230)] via-[oklch(0.35_0.06_250)] to-[oklch(0.28_0.05_270)] text-white shadow-lg"
      aria-hidden
    >
      <div className="sm-mill-ambient pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[oklch(0.75_0.12_85/0.35)] blur-3xl" />
      <div className="sm-mill-ambient sm-mill-glow-orb pointer-events-none absolute -bottom-10 left-1/4 h-32 w-48 rounded-full bg-[oklch(0.55_0.14_200/0.3)] blur-3xl" />

      <div className="relative z-[1] flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:justify-between sm:p-5">
        <div className="flex flex-1 flex-col justify-center gap-3 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[oklch(0.92_0.04_95/0.85)]">
            Mill floor · live rhythm
          </p>
          <h3 className="font-display text-lg font-bold leading-tight text-[oklch(0.99_0.01_95)] sm:text-xl">
            Fabrics &amp; yarn in motion
          </h3>
          <p className="max-w-sm text-xs leading-relaxed text-[oklch(0.9_0.02_95/0.88)]">
            Warp, weft, and winding — a stylised view of how fibre becomes cloth and spun goods on the line.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="rounded-full bg-[oklch(0.55_0.12_200/0.45)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm">
              Weaving
            </span>
            <span className="rounded-full bg-[oklch(0.62_0.14_85/0.4)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm">
              Yarn
            </span>
            <span className="rounded-full bg-[oklch(0.5_0.08_280/0.45)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm">
              Finishing
            </span>
          </div>
        </div>

        <div className="relative flex h-[140px] flex-1 items-center justify-center sm:max-w-[min(100%,320px)] sm:h-[160px]">
          {/* Yarn cones */}
          <div className="absolute left-[8%] top-1/2 z-10 flex -translate-y-1/2 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="relative flex h-14 w-10 flex-col items-center justify-end"
                style={{ marginTop: i % 2 === 0 ? 0 : 10 }}
              >
                <div
                  className="sm-mill-yarn-disk absolute bottom-6 h-9 w-9 rounded-full border-2 border-[oklch(0.85_0.06_95/0.5)]"
                  style={{
                    background:
                      "repeating-conic-gradient(from 0deg, oklch(0.72 0.1 85) 0deg 28deg, oklch(0.55 0.08 75) 28deg 56deg)",
                    animation: `sm-mill-yarn ${3.2 + i * 0.4}s linear infinite`,
                    animationDirection: i % 2 === 0 ? "normal" : "reverse",
                  }}
                />
                <div className="h-6 w-7 rounded-b-md bg-gradient-to-b from-[oklch(0.5_0.04_270)] to-[oklch(0.35_0.03_280)] shadow-md" />
              </div>
            ))}
          </div>

          {/* Loom / warp */}
          <div className="absolute left-[28%] right-[22%] top-[22%] h-[52px] overflow-hidden rounded-md border border-[oklch(0.7_0.04_95/0.25)] bg-[oklch(0.22_0.04_260/0.65)]">
            <div
              className="sm-mill-loom-track absolute inset-0 opacity-80"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, oklch(0.88 0.03 95) 0px, oklch(0.88 0.03 95) 2px, transparent 2px, transparent 5px)",
                animation: "sm-mill-loom 2.8s linear infinite",
              }}
            />
            <div
              className="sm-mill-shuttle absolute left-[12%] top-1/2 h-1.5 w-10 -translate-y-1/2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.12_85)] to-[oklch(0.62_0.1_75)] shadow-[0_0_12px_oklch(0.8_0.1_90/0.5)]"
              style={{ animation: "sm-mill-shuttle 1.6s ease-in-out infinite" }}
            />
          </div>

          {/* Fabric roll */}
          <div className="absolute right-[4%] top-1/2 z-10 w-[32%] max-w-[100px] -translate-y-1/2">
            <div className="relative h-16 overflow-hidden rounded-l-lg rounded-r-2xl border border-[oklch(0.75_0.06_95/0.35)] bg-[oklch(0.3_0.04_250)] shadow-lg">
              <div
                className="sm-mill-fabric-stripes absolute inset-0 opacity-95"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-12deg, oklch(0.55 0.1 200) 0px, oklch(0.55 0.1 200) 6px, oklch(0.72 0.08 85) 6px, oklch(0.72 0.08 85) 12px, oklch(0.45 0.06 270) 12px, oklch(0.45 0.06 270) 18px)",
                  backgroundSize: "48px 100%",
                  animation: "sm-mill-fabric 3s linear infinite",
                }}
              />
              <div className="absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-[oklch(0.2_0.02_280)] to-transparent" />
            </div>
            <p className="mt-1 text-center text-[9px] font-medium uppercase tracking-wider text-[oklch(0.88_0.03_95/0.75)]">
              Fabric roll
            </p>
          </div>

          {/* Conveyor hint */}
          <div className="absolute bottom-1 left-[24%] right-[8%] h-1 rounded-full bg-[oklch(0.5_0.06_200/0.4)]">
            <div
              className="h-full w-1/4 rounded-full bg-[oklch(0.78_0.1_85/0.85)]"
              style={{
                animation: "sm-mill-shuttle 2.2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
