import { BrandLogo } from "../../../components/BrandLogo";
import { cn } from "../../../components/ui/utils";

export type CommercialPreviewLine = {
  description: string;
  qty: number;
  unit_price_zar: number;
  line_total_zar: number;
};

export type CommercialSellerBlock = {
  name: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
};

export type CommercialBuyerBlock = {
  company: string;
  contactName: string;
  email: string;
};

function fmtZar(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "ZAR", minimumFractionDigits: 2 });
}

type Props = {
  variant: "quote" | "invoice";
  seller: CommercialSellerBlock;
  buyer: CommercialBuyerBlock;
  documentNumber: string;
  documentDateLabel?: string;
  validUntil?: string;
  dueDate?: string;
  rows: CommercialPreviewLine[];
  subtotal_zar: number;
  tax_rate: number;
  tax_zar: number;
  total_zar: number;
  paymentNotes?: string;
  /** Sidebar preview uses tighter typography */
  density?: "comfortable" | "compact";
  className?: string;
};

export function CommercialDocumentPreview({
  variant,
  seller,
  buyer,
  documentNumber,
  documentDateLabel,
  validUntil,
  dueDate,
  rows,
  subtotal_zar,
  tax_rate,
  tax_zar,
  total_zar,
  paymentNotes,
  density = "comfortable",
  className,
}: Props) {
  const compact = density === "compact";
  const title = variant === "quote" ? "Quote" : "Tax invoice";

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white text-slate-900 shadow-md",
        compact ? "p-4 text-[11px] leading-snug" : "p-8 text-sm",
        className
      )}
    >
      <div className={cn("flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4", compact && "pb-3")}>
        <div className="space-y-2 min-w-0">
          <div className={cn(compact && "scale-90 origin-left")}>
            <BrandLogo height={compact ? 28 : 40} withBrandTile />
          </div>
          <div>
            <p className={cn("font-semibold tracking-tight text-slate-950", compact ? "text-sm" : "text-lg")}>{title}</p>
            <p className="text-slate-500">{documentNumber}</p>
          </div>
        </div>
        <div className="text-right text-slate-600 space-y-0.5">
          {documentDateLabel ? <p>{documentDateLabel}</p> : null}
          {variant === "quote" && validUntil ? (
            <p>
              <span className="font-medium text-slate-800">Valid until</span> {validUntil}
            </p>
          ) : null}
          {variant === "invoice" && dueDate ? (
            <p>
              <span className="font-medium text-slate-800">Due</span> {dueDate}
            </p>
          ) : null}
        </div>
      </div>

      <div className={cn("grid gap-6 pt-4 sm:grid-cols-2", compact && "gap-4 pt-3")}>
        <div>
          <p className={cn("font-semibold text-slate-800 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
            Bill from
          </p>
          <div className="mt-1 space-y-0.5 text-slate-700">
            <p className="font-medium text-slate-900">{seller.name || "—"}</p>
            {seller.address ? <p className="whitespace-pre-line">{seller.address}</p> : null}
            {(seller.zip || seller.city || seller.country) && (
              <p>
                {[seller.zip, seller.city, seller.country].filter(Boolean).join(", ")}
              </p>
            )}
            {seller.email ? <p>{seller.email}</p> : null}
            {seller.phone ? <p>{seller.phone}</p> : null}
          </div>
        </div>
        <div>
          <p className={cn("font-semibold text-slate-800 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
            Bill to
          </p>
          <div className="mt-1 space-y-0.5 text-slate-700">
            <p className="font-medium text-slate-900">{buyer.company || "—"}</p>
            {buyer.contactName ? <p>{buyer.contactName}</p> : null}
            {buyer.email ? <p>{buyer.email}</p> : null}
          </div>
        </div>
      </div>

      <div className={cn("mt-6 overflow-x-auto", compact && "mt-4")}>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-300 text-slate-600">
              <th className={cn("py-2 pr-2 font-medium", compact ? "text-[10px]" : "text-xs")}>Description</th>
              <th className={cn("py-2 px-2 text-right font-medium", compact ? "text-[10px]" : "text-xs")}>Qty</th>
              <th className={cn("py-2 px-2 text-right font-medium", compact ? "text-[10px]" : "text-xs")}>Unit</th>
              <th className={cn("py-2 pl-2 text-right font-medium", compact ? "text-[10px]" : "text-xs")}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  Add line items
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 pr-2 text-slate-800">{r.description}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{r.qty}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmtZar(r.unit_price_zar)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums font-medium">{fmtZar(r.line_total_zar)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={cn("mt-4 flex flex-col items-end gap-1 border-t border-slate-200 pt-4", compact && "mt-3 pt-3")}>
        <p className="text-slate-700">
          Subtotal <span className="ml-4 tabular-nums font-medium text-slate-900">{fmtZar(subtotal_zar)}</span>
        </p>
        <p className="text-slate-700">
          Tax ({Math.round((tax_rate || 0) * 1000) / 10}%)
          <span className="ml-4 tabular-nums font-medium text-slate-900">{fmtZar(tax_zar)}</span>
        </p>
        <p className={cn("text-slate-950", compact ? "text-base" : "text-lg")}>
          <span className="font-semibold">Total</span>
          <span className="ml-4 tabular-nums font-bold">{fmtZar(total_zar)}</span>
        </p>
      </div>

      {paymentNotes?.trim() ? (
        <div className={cn("mt-6 border-t border-slate-200 pt-4", compact && "mt-4 pt-3")}>
          <p className={cn("font-semibold text-slate-800 uppercase tracking-wide", compact ? "text-[10px]" : "text-xs")}>
            Payment
          </p>
          <p className="mt-1 whitespace-pre-line text-slate-700">{paymentNotes.trim()}</p>
        </div>
      ) : null}
    </div>
  );
}

export const DEFAULT_SELLER_BLOCK: CommercialSellerBlock = {
  name: "",
  address: "",
  zip: "",
  city: "",
  country: "South Africa",
  email: "",
  phone: "",
};
