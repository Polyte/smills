import { useCallback, useEffect, useState } from "react";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import {
  getQcDefectPhotoSignedUrl,
  listQcDefectsRecent,
  type QcDefectRow,
} from "../../../lib/crm/factoryRepo";

type Row = QcDefectRow & {
  qc_inspections: { roll_id: string | null; result: string; sales_order_id: string | null } | null;
};

export function QcDefectGallery({ limit = 16, title = "QC defect photos" }: { limit?: number; title?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!crmUsesSupabase()) {
      setRows([]);
      return;
    }
    try {
      const data = await listQcDefectsRecent(limit);
      setRows(data as Row[]);
      const next: Record<string, string> = {};
      await Promise.all(
        data.map(async (d) => {
          if (!d.photo_url) return;
          const u = await getQcDefectPhotoSignedUrl(d.photo_url);
          if (u) next[d.id] = u;
        })
      );
      setUrls(next);
    } catch {
      setRows([]);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!crmUsesSupabase()) return null;

  const withPhotos = rows.filter((r) => r.photo_url);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      {withPhotos.length === 0 ? (
        <p className="text-xs text-muted-foreground">No defect photos logged yet.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {withPhotos.map((d) => (
            <li key={d.id} className="rounded-lg border overflow-hidden bg-muted/20">
              {urls[d.id] ? (
                <a href={urls[d.id]} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-muted">
                  <img src={urls[d.id]} alt="" className="w-full h-full object-cover max-h-28" />
                </a>
              ) : (
                <div className="aspect-video bg-muted animate-pulse max-h-28" />
              )}
              <div className="p-2 text-[10px] leading-tight">
                <p className="font-medium truncate">{d.defect_type}</p>
                <p className="text-muted-foreground truncate">
                  Roll {d.qc_inspections?.roll_id ?? "—"} · {d.location_label ?? "—"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
