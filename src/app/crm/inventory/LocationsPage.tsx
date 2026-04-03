import { useCallback, useEffect, useState } from "react";
import { isCrmDataAvailable } from "../../../lib/crm/crmRepo";
import type { CrmActor } from "../../../lib/crm/crmRepo";
import { invDeleteLocation, invListLocations, invSaveLocation } from "../../../lib/crm/inventoryRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, InvLocationZone } from "../database.types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type LocRow = Database["public"]["Tables"]["inv_locations"]["Row"];

const ZONES: InvLocationZone[] = [
  "receiving",
  "production",
  "wip",
  "warehouse",
  "export",
  "quarantine",
];

const emptyForm = {
  name: "",
  zone: "warehouse" as InvLocationZone,
  sort_order: "0",
};

export function LocationsPage() {
  const { user, profile } = useCrmAuth();
  const [rows, setRows] = useState<LocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<LocRow | null>(null);

  const actor: CrmActor | null =
    user && profile ? { id: user.id, role: profile.role } : null;
  const canMutate =
    profile?.role === "admin" || profile?.role === "production_manager";

  const load = useCallback(async () => {
    if (!isCrmDataAvailable() || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await invListLocations());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load locations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: LocRow) {
    setEditing(row);
    setForm({
      name: row.name,
      zone: row.zone,
      sort_order: String(row.sort_order ?? 0),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!actor || !canMutate) {
      toast.error("Your role cannot edit locations.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const so = Number(form.sort_order);
    const { error } = await invSaveLocation(
      {
        id: editing?.id,
        name: form.name.trim(),
        zone: form.zone,
        sort_order: Number.isFinite(so) ? so : 0,
      },
      actor
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Location updated" : "Location created");
    setDialogOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!actor || !deleteTarget) return;
    const { error } = await invDeleteLocation(deleteTarget.id, actor);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Location deleted");
    setDeleteTarget(null);
    void load();
  }

  if (!isCrmDataAvailable()) {
    return <p className="text-sm text-muted-foreground">CRM storage is not available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Zones model receiving, production, WIP, warehouse, export staging, and quarantine.
        </p>
        {canMutate ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            New location
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Sort</TableHead>
                {canMutate ? <TableHead className="w-[100px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canMutate ? 4 : 3} className="text-muted-foreground">
                    No locations yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.zone}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.sort_order}</TableCell>
                    {canMutate ? (
                      <TableCell className="text-right space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {profile?.role === "admin" || profile?.role === "production_manager" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit location" : "New location"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="loc-name">Name</Label>
              <Input
                id="loc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Zone</Label>
              <Select
                value={form.zone}
                onValueChange={(v) => setForm((f) => ({ ...f, zone: v as InvLocationZone }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loc-sort">Sort order</Label>
              <Input
                id="loc-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location?</AlertDialogTitle>
            <AlertDialogDescription>
              Only managers can delete. This may fail if stock movements reference this location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
