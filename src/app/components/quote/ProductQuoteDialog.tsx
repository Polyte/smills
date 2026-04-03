"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { QuoteProductKey } from "../../../lib/quoteProductCatalog";
import { submitPublicQuoteRequest } from "../../../lib/submitPublicQuoteRequest";
import { FileText, Loader2 } from "lucide-react";
import { BrandLogo } from "../BrandLogo";

type Props = {
  productKey: QuoteProductKey;
  productLabel: string;
  /** Button or link that opens the dialog */
  children: React.ReactNode;
  className?: string;
};

export function ProductQuoteDialog({ productKey, productLabel, children, className }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [company_name, setCompanyName] = useState("");
  const [contact_name, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const qty = quantity.trim() ? Number(quantity) : undefined;
      const result = await submitPublicQuoteRequest({
        product_key: productKey,
        product_label: productLabel,
        company_name: company_name.trim(),
        contact_name: contact_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        message: message.trim() || undefined,
        quantity: qty != null && Number.isFinite(qty) ? qty : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Request sent. Our sales team will respond with a quote number.");
      setOpen(false);
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setQuantity("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className={className}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            <BrandLogo height={32} withBrandTile className="shrink-0" />
            <span className="flex items-center gap-2">
              <FileText className="size-5 text-amber-600 shrink-0" />
              Get a quote
            </span>
          </DialogTitle>
          <DialogDescription>
            Request pricing for <span className="font-medium text-foreground">{truncate(productLabel, 48)}</span>. We
            will email you a formal quotation after review.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor={`qc-${productKey}`}>Company</Label>
            <Input
              id={`qc-${productKey}`}
              required
              value={company_name}
              onChange={(ev) => setCompanyName(ev.target.value)}
              autoComplete="organization"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`qn-${productKey}`}>Your name</Label>
            <Input
              id={`qn-${productKey}`}
              required
              value={contact_name}
              onChange={(ev) => setContactName(ev.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`qe-${productKey}`}>Email</Label>
              <Input
                id={`qe-${productKey}`}
                type="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`qp-${productKey}`}>Phone</Label>
              <Input
                id={`qp-${productKey}`}
                type="tel"
                required
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`qq-${productKey}`}>Quantity / volume (optional)</Label>
            <Input
              id={`qq-${productKey}`}
              inputMode="decimal"
              value={quantity}
              onChange={(ev) => setQuantity(ev.target.value)}
              placeholder="e.g. 500"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`qm-${productKey}`}>Message (optional)</Label>
            <Textarea
              id={`qm-${productKey}`}
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              rows={3}
              placeholder="Grade, width, application, delivery location…"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
