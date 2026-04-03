import { useCallback, useEffect, useRef, useState } from "react";
import { useCrmAuth } from "../CrmAuthContext";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import {
  createQcInspection,
  getQcDefectPhotoSignedUrl,
  insertQcDefect,
  listQcInspectionsWithDefects,
  uploadQcDefectPhoto,
  type QcInspectionWithDefects,
} from "../../../lib/crm/factoryRepo";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";

export function QualityControlPage() {
  const { user } = useCrmAuth();
  const [rows, setRows] = useState<QcInspectionWithDefects[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  const [rollId, setRollId] = useState("");
  const [result, setResult] = useState<"pass" | "fail" | "pending">("pending");

  const [defectInspectionId, setDefectInspectionId] = useState("");
  const [defectType, setDefectType] = useState("");
  const [defectLoc, setDefectLoc] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!crmUsesSupabase()) return;
    try {
      const data = await listQcInspectionsWithDefects(30);
      setRows(data);
      setDefectInspectionId((prev) =>
        prev && data.some((r) => r.id === prev) ? prev : (data[0]?.id ?? "")
      );
      const map: Record<string, string> = {};
      for (const insp of data) {
        for (const d of insp.qc_defects ?? []) {
          if (!d.photo_url) continue;
          const u = await getQcDefectPhotoSignedUrl(d.photo_url);
          if (u) map[d.id] = u;
        }
      }
      setThumbUrls(map);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!crmUsesSupabase()) {
    return (
      <p className="text-sm text-muted-foreground">Quality inspections require Supabase.</p>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-display font-bold tracking-tight">Quality control</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log inspection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <Input placeholder="Roll id" value={rollId} onChange={(e) => setRollId(e.target.value)} className="w-40" />
          <Select value={result} onValueChange={(v) => setResult(v as typeof result)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={!user}
            onClick={() =>
              user &&
              void createQcInspection({
                roll_id: rollId.trim() || null,
                result,
                inspector_id: user.id,
              })
                .then((id) => {
                  toast.success("Inspection saved");
                  setRollId("");
                  setDefectInspectionId(id);
                  void load();
                })
                .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
            }
          >
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Log defect (photos)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Inspection</p>
            <Select value={defectInspectionId} onValueChange={setDefectInspectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose inspection" />
              </SelectTrigger>
              <SelectContent>
                {rows.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.roll_id ?? r.id.slice(0, 8)} · {r.result} · {new Date(r.created_at).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Defect type"
              value={defectType}
              onChange={(e) => setDefectType(e.target.value)}
              className="w-40"
            />
            <Input
              placeholder="Location (e.g. edge)"
              value={defectLoc}
              onChange={(e) => setDefectLoc(e.target.value)}
              className="w-44"
            />
          </div>
          <Input
            placeholder="Photo URL (optional if uploading file)"
            value={photoUrlInput}
            onChange={(e) => setPhotoUrlInput(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() => {}}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Choose image
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!user || !defectInspectionId || !defectType.trim()}
              onClick={() => {
                if (!user || !defectInspectionId || !defectType.trim()) return;
                const file = fileRef.current?.files?.[0];
                void (async () => {
                  try {
                    let photoUrl: string | null = photoUrlInput.trim() || null;
                    if (file) {
                      photoUrl = await uploadQcDefectPhoto(defectInspectionId, file);
                    }
                    await insertQcDefect({
                      inspection_id: defectInspectionId,
                      defect_type: defectType.trim(),
                      location_label: defectLoc.trim() || null,
                      photo_url: photoUrl,
                    });
                    toast.success("Defect logged");
                    setDefectType("");
                    setDefectLoc("");
                    setPhotoUrlInput("");
                    if (fileRef.current) fileRef.current.value = "";
                    void load();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })();
              }}
            >
              Add defect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent inspections & defects</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border max-h-[28rem] overflow-y-auto text-sm">
            {rows.map((r) => (
              <li key={r.id} className="px-3 py-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{r.roll_id ?? r.id.slice(0, 8)}</span>
                  <span className="uppercase text-xs font-semibold">{r.result}</span>
                </div>
                {(r.qc_defects?.length ?? 0) > 0 ? (
                  <ul className="grid gap-2 pl-2 border-l-2 border-muted">
                    {(r.qc_defects ?? []).map((d) => (
                      <li key={d.id} className="flex gap-2 items-start">
                        {thumbUrls[d.id] ? (
                          <img
                            src={thumbUrls[d.id]}
                            alt=""
                            className="size-14 rounded object-cover border shrink-0"
                          />
                        ) : null}
                        <div>
                          <p className="font-medium">{d.defect_type}</p>
                          {d.location_label ? (
                            <p className="text-xs text-muted-foreground">{d.location_label}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No defects recorded.</p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
