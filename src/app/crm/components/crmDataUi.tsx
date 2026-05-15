import type { ReactNode } from "react";
import { cn } from "../../components/ui/utils";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

/** Full-width horizontal scroll on narrow viewports; use around tables inside padded layouts. */
export function CrmTableScroll({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>{children}</div>
  );
}

type CrmTableSkeletonProps = {
  columnCount?: number;
  rowCount?: number;
  className?: string;
};

export function CrmTableSkeleton({ columnCount = 4, rowCount = 6, className }: CrmTableSkeletonProps) {
  const cols = Array.from({ length: columnCount }, (_, i) => i);
  const rows = Array.from({ length: rowCount }, (_, i) => i);
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
          {cols.map((c) => (
            <TableHead key={c} className="text-muted-foreground">
              <Skeleton className="h-3 w-16 max-w-full" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r} className="border-border/50 hover:bg-transparent">
            {cols.map((c) => (
              <TableCell key={c} className="py-3">
                <Skeleton className={cn("h-4 max-w-full", c === cols.length - 1 ? "ml-auto w-14" : "w-[min(100%,12rem)]")} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const crmFactoryIconWrapClass =
  "card-shine flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--crm-factory-accent-muted)] shadow-[0_0_0_1px_var(--crm-factory-accent-ring)]";

export const crmFactoryPrimaryButtonClass =
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--crm-factory-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--crm-factory-accent-hover)] hover:shadow-md hover:-translate-y-px active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--crm-factory-accent-ring)] focus-visible:ring-offset-2";

export const crmFactoryLinkClass =
  "font-medium text-[var(--crm-factory-accent)] transition-all duration-150 hover:underline hover:opacity-80";
