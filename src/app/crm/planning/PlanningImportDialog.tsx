import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "sonner";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import {
  SPP_IMPORT_FIELD_META,
  type SppColumnMapping,
  type SppImportField,
  sppGuessColumnMapping,
  sppParseAllRowsWithMapping,
  sppReadFileAsTable,
} from "../../../lib/crm/sppImportMap";
import { sppImportPipelineRows } from "../../../lib/crm/sppRepo";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  actor: CrmActor;
  isOpeningSnapshot: boolean;
  onImported: () => void;
};

const NONE = "__none__";

export function PlanningImportDialog({
  open,
  onOpenChange,
  trackerId,
  actor,
  isOpeningSnapshot,
  onImported,
}: Props) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<SppColumnMapping>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setMapping({});
    }
  }, [open]);

  async function onPickFile(f: File | null) {
    if (!f) return;
    setBusy(true);
    try {
      const t = await sppReadFileAsTable(f);
      setFileName(f.name);
      setHeaders(t.headers);
      setRows(t.rows);
      setMapping(sppGuessColumnMapping(t.headers));
      if (!t.headers.length) toast.error("No header row found in file.");
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not read file. Try CSV, or save Excel as .xlsx. Legacy .xls may require export to CSV."
      );
    } finally {
      setBusy(false);
    }
  }

  function setField(field: SppImportField, colIdx: string) {
    if (colIdx === NONE) {
      setMapping((m) => {
        const n = { ...m };
        delete n[field];
        return n;
      });
      return;
    }
    setMapping((m) => ({ ...m, [field]: Number(colIdx) }));
  }

  async function confirmImport() {
    if (mapping.erp_order_ref === undefined) {
      toast.error('Map "Order (SO ref)" to a column before importing.');
      return;
    }
    const parsed = sppParseAllRowsWithMapping(headers, rows, mapping);
    if (!parsed.length) {
      toast.error("No valid rows — check column mapping.");
      return;
    }
    setBusy(true);
    try {
      const { inserted } = await sppImportPipelineRows(actor, trackerId, fileName || "import", parsed, {
        isOpeningSnapshot,
      });
      toast.success(`Imported ${inserted} line(s)`);
      onImported();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const previewRows = rows.slice(0, 6);
  const colOptions = headers.map((h, i) => ({ i, label: h || `(Column ${i + 1})` }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isOpeningSnapshot ? "Import opening pipeline" : "Import additional pipeline rows"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="spp-import-file">File (CSV, TSV, .xlsx — first sheet)</Label>
            <input
              id="spp-import-file"
              type="file"
              accept=".csv,.txt,.tsv,.xlsx,.xls,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="text-sm"
              disabled={busy}
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Map columns A–F from your ERP export: order, delivery date, customer, product code, item, ordered qty.
              Optional: unit price, delivered, balance.
            </p>
          </div>

          {headers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {SPP_IMPORT_FIELD_META.map(({ key, label, required }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">
                    {label}
                    {required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  <Select
                    value={mapping[key] !== undefined ? String(mapping[key]) : NONE}
                    onValueChange={(v) => setField(key, v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {colOptions.map(({ i, label: lab }) => (
                        <SelectItem key={i} value={String(i)}>
                          Col {i + 1}: {lab.slice(0, 48)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : null}

          {previewRows.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-xs">Preview (first rows)</Label>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap max-w-[8rem] truncate">
                          {h || `Col ${i + 1}`}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r, ri) => (
                      <TableRow key={ri}>
                        {headers.map((_, ci) => (
                          <TableCell key={ci} className="text-xs max-w-[8rem] truncate">
                            {r[ci] ?? ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirmImport()} disabled={busy || !headers.length}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
