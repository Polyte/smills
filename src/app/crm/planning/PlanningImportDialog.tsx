import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight, Table2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { cn } from "../../components/ui/utils";
import {
  PIPELINE_FILE_ACCEPT,
  sppReadFileAsTable,
  sppGuessColumnMapping,
  sppParseAllRowsWithMapping,
  SPP_IMPORT_FIELD_META,
  type SppImportField,
  type SppColumnMapping,
} from "../../../lib/crm/sppImportMap";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  actor: any;
  isOpeningSnapshot: boolean;
  onImported: () => void;
  onRowsParsed?: (rows: any[]) => void;
};

const NONE = "__none__";

export function PlanningImportDialog({ open, onOpenChange, isOpeningSnapshot, onRowsParsed }: Props) {
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<SppColumnMapping>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStep("upload"); setFileName(""); setHeaders([]); setRows([]);
      setMapping({}); setBusy(false); setProgress(0);
    }
  }, [open]);

  async function onPickFile(f: File | null) {
    if (!f) return;
    setBusy(true); setProgress(5);
    try {
      const t = await sppReadFileAsTable(f, setProgress);
      setFileName(f.name); setHeaders(t.headers); setRows(t.rows);
      const guessed = sppGuessColumnMapping(t.headers);
      setMapping(guessed);
      const mapped = Object.keys(guessed).length;
      if (t.headers.length && t.rows.length) {
        setStep("mapping");
        toast.success(`Read ${t.rows.length} rows · ${t.headers.length} columns · ${mapped} mapped`);
      } else {
        toast.error("File has no headers or data rows");
      }
    } catch (e) {
      setProgress(0);
      toast.error(e instanceof Error ? e.message : "Failed to read file");
    } finally { setBusy(false); }
  }

  function setField(field: SppImportField, colIdx: string) {
    if (colIdx === NONE) {
      setMapping((m) => { const n = { ...m }; delete n[field]; return n; });
    } else {
      setMapping((m) => ({ ...m, [field]: Number(colIdx) }));
    }
  }

  const requiredMapped = SPP_IMPORT_FIELD_META.filter((f) => f.required).every((f) => mapping[f.key] !== undefined);
  const parsedPreview = step === "preview" ? sppParseAllRowsWithMapping(headers, rows.slice(0, 12), mapping) : [];
  const parsedCount = headers.length && Object.keys(mapping).length > 0
    ? sppParseAllRowsWithMapping(headers, rows, mapping).length
    : 0;

  function confirmImport() {
    const parsed = sppParseAllRowsWithMapping(headers, rows, mapping);
    if (!parsed.length) { toast.error("No valid rows to import"); return; }
    if (onRowsParsed) onRowsParsed(parsed);
    toast.success(`Imported ${parsed.length} order lines`);
    onOpenChange(false);
  }

  const colOptions = headers.map((h, i) => ({ i, label: h || `Column ${i + 1}` }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl p-0 gap-0 flex flex-col">
        <DialogHeader className="shrink-0 relative isolate overflow-hidden rounded-t-2xl border-b border-border/60 bg-gradient-to-r from-muted/30 to-muted/10 px-6 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[oklch(0.55_0.15_48)] via-[#D4AF37] via-60% to-[oklch(0.55_0.15_300)]" />
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/60 bg-amber-50 shadow-sm">
              <FileSpreadsheet className="size-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold">
                {isOpeningSnapshot ? "Import opening pipeline" : "Import order rows"}
              </DialogTitle>
              <div className="mt-2 flex items-center gap-2">
                {(["upload", "mapping", "preview"] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      step === s ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      <span className="size-4 rounded-full text-center leading-4 text-[10px] font-bold">{i + 1}</span>
                      {s === "upload" ? "Upload" : s === "mapping" ? "Map fields" : "Review"}
                    </span>
                    {i < 2 && <ArrowRight className="size-3 text-muted-foreground/50" />}
                  </div>
                ))}
                {fileName && <span className="ml-auto truncate text-[11px] text-muted-foreground max-w-[160px]" title={fileName}>{fileName}</span>}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Upload step */}
        {step === "upload" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="rounded-xl border-2 border-dashed border-border/70 p-10 text-center transition-all hover:border-muted-foreground/40 hover:bg-muted/15"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void onPickFile(e.dataTransfer.files[0] ?? null); }}
            >
              {busy ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="size-10 animate-spin text-muted-foreground" />
                  <p className="text-sm font-medium">Reading file…</p>
                  <Progress value={progress} className="w-48" />
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-3 size-10 text-muted-foreground opacity-40" />
                  <p className="mb-1 text-sm font-semibold">Drop your spreadsheet here</p>
                  <p className="mb-4 text-xs text-muted-foreground">Accepts .xlsx, .csv, .tsv</p>
                  <input ref={fileInputRef} type="file" accept={PIPELINE_FILE_ACCEPT} className="hidden" disabled={busy}
                    onChange={(e) => { void onPickFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                  <Button variant="outline" disabled={busy} className="gap-2"
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload className="size-4" />Choose file…
                  </Button>
                </>
              )}
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Expected format</p>
              <p className="text-xs text-muted-foreground">Your file should have column headers in the <strong>first data row</strong> with columns like: Order ref, Customer, Item, Quantity. Multi-row titles are auto-skipped.</p>
            </div>
          </div>
        )}

        {/* Mapping step */}
        {step === "mapping" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Table2 className="size-3.5" />
              <span>{rows.length} data rows · {headers.length} columns</span>
              {Object.keys(mapping).length > 0 && (
                <Badge variant="outline" className="text-[10px]">{Object.keys(mapping).length} auto-mapped</Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SPP_IMPORT_FIELD_META.map(({ key, label, required, description }) => {
                const isMapped = mapping[key] !== undefined;
                return (
                  <div key={key} className={cn(
                    "space-y-1.5 rounded-lg border p-3 transition-colors",
                    isMapped ? "border-border/60 bg-card" : required ? "border-amber-500/30 bg-amber-500/[0.04]" : "border-border/40 bg-muted/10"
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-semibold">
                        {label}{required && <span className="ml-1 text-amber-600">*</span>}
                      </Label>
                      {isMapped ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" /> : required ? <AlertCircle className="size-3.5 shrink-0 text-amber-500" /> : null}
                    </div>
                    {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
                    <Select value={mapping[key] !== undefined ? String(mapping[key]) : NONE}
                      onValueChange={(v) => setField(key, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="— not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— not mapped —</SelectItem>
                        {colOptions.map(({ i, label: lab }) => (
                          <SelectItem key={i} value={String(i)}>
                            <span className="font-mono text-[11px] text-muted-foreground mr-1">[{i + 1}]</span>
                            {lab}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preview step */}
        {step === "preview" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span><strong className="text-foreground">{parsedCount}</strong> order lines ready to import from <strong className="text-foreground">{fileName}</strong></span>
            </div>
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="[&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase">
                    <TableHead>Order ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedPreview.map((r, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-mono">{r.erp_order_ref}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{r.customer_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{r.item_description ?? r.pcode ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{r.ordered_qty ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {parsedCount > 12 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">… and {parsedCount - 12} more rows</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-border/60 bg-muted/10 px-6 py-4 flex items-center justify-between">
          <Button variant="outline" className="h-10 transition-all hover:scale-[1.02]"
            onClick={() => {
              if (step === "upload") onOpenChange(false);
              else if (step === "mapping") setStep("upload");
              else setStep("mapping");
            }}>
            {step === "upload" ? "Cancel" : "Back"}
          </Button>
          {step === "mapping" && (
            <Button className="h-10 gap-2 transition-all hover:scale-[1.02]"
              disabled={!requiredMapped}
              onClick={() => setStep("preview")}>
              Preview <ArrowRight className="size-4" />
            </Button>
          )}
          {step === "preview" && (
            <Button className="h-10 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={parsedCount === 0}
              onClick={confirmImport}>
              Import {parsedCount} line{parsedCount !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

