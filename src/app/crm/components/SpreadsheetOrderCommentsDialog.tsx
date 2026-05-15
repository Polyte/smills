import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import type { SpreadsheetOrderRow } from "../../../lib/crm/spreadsheetOrderTypes";
import { toast } from "sonner";

const df = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: SpreadsheetOrderRow | null;
  onAddComment: (rowId: string, text: string) => Promise<void>;
};

export function SpreadsheetOrderCommentsDialog({ open, onOpenChange, row, onAddComment }: Props) {
  const [draft, setDraft] = useState("");

  async function add() {
    if (!row) return;
    const t = draft.trim();
    if (!t) {
      toast.error("Write a comment first.");
      return;
    }
    try {
      await onAddComment(row.id, t);
      setDraft("");
      toast.success("Comment added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save comment");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setDraft("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[min(85vh,560px)] overflow-y-auto sm:max-w-lg p-0 gap-0">
        <DialogHeader className="relative isolate overflow-hidden rounded-t-2xl border-b border-border/60 bg-gradient-to-r from-muted/30 to-muted/10 px-6 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[oklch(0.55_0.15_48)] via-[oklch(0.72_0.14_82)] via-60% to-[oklch(0.55_0.15_300)]" />
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/60 bg-sky-50 shadow-sm">
              <MessageSquareText className="size-5 text-sky-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Comments</DialogTitle>
              <DialogDescription className="mt-0.5 text-sm">
                {row ? (
                  <>
                    <span className="font-mono font-medium text-foreground">{row.salesOrder}</span>
                    <span className="text-muted-foreground"> · {row.customer}</span>
                  </>
                ) : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-muted/15 p-3 shadow-inner">
            {row && row.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
            ) : null}
            {row?.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-border/50 bg-card p-3 text-sm shadow-sm transition-all hover:shadow-md hover:-translate-y-px">
                <p className="whitespace-pre-wrap leading-relaxed">{c.text}</p>
                <p className="mt-1.5 text-xs text-muted-foreground/70">
                  {df.format(new Date(c.createdAt))}
                  {c.authorLabel ? <span className="font-medium text-muted-foreground"> · {c.authorLabel}</span> : ""}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-comment-draft" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New comment</Label>
            <Textarea
              id="so-comment-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note for this order line…"
              rows={3}
              className="min-h-[88px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="h-10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            disabled={!row}
            onClick={() => void add()}
          >
            Add comment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
