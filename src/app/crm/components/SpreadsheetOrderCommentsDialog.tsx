import { useState } from "react";
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
      <DialogContent className="max-h-[min(85vh,560px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>
            {row ? (
              <>
                <span className="font-mono text-foreground">{row.salesOrder}</span>
                <span className="text-muted-foreground"> · {row.customer}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/80 bg-muted/30 p-3">
            {row && row.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : null}
            {row?.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-border/60 bg-background p-2 text-sm">
                <p className="whitespace-pre-wrap">{c.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {df.format(new Date(c.createdAt))}
                  {c.authorLabel ? ` · ${c.authorLabel}` : ""}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-comment-draft">New comment</Label>
            <Textarea
              id="so-comment-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note for this order line…"
              rows={3}
              className="min-h-[88px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="min-h-[44px] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
