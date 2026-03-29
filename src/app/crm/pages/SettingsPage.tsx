import { useCallback, useEffect, useState } from "react";
import {
  isCrmDataAvailable,
  listProfilesForManager,
  updateMyProfileName,
  updateUserRole,
} from "../../../lib/crm/crmRepo";
import { useCrmAuth } from "../CrmAuthContext";
import type { Database, UserRole } from "../database.types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useCrmAuth();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<ProfileRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  const loadStaff = useCallback(async () => {
    if (!user || profile?.role !== "manager") return;
    setLoadingStaff(true);
    try {
      const data = await listProfilesForManager();
      setStaff(data as ProfileRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load team");
    } finally {
      setLoadingStaff(false);
    }
  }, [user, profile?.role]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function saveProfile() {
    if (!isCrmDataAvailable() || !user) return;
    setSaving(true);
    const { error } = await updateMyProfileName(user.id, fullName.trim());
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    await refreshProfile();
  }

  async function updateStaffRole(id: string, role: UserRole) {
    if (!isCrmDataAvailable()) return;
    const { error } = await updateUserRole(id, role);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Role updated");
    void loadStaff();
    if (id === user?.id) await refreshProfile();
  }

  if (!isCrmDataAvailable()) {
    return (
      <p className="text-sm text-muted-foreground">CRM storage is not available.</p>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">Your profile and sign out.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your profile</CardTitle>
          <CardDescription>Display name shown in the CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="set-name">Full name</Label>
            <Input
              id="set-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Role: <span className="capitalize font-medium">{profile?.role ?? "—"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveProfile()} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void signOut()}>
              Sign out everywhere on this device
            </Button>
          </div>
        </CardContent>
      </Card>

      {profile?.role === "manager" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team roles</CardTitle>
            <CardDescription>
              Promote users to employee or manager after they have signed up once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStaff ? (
              <p className="text-sm text-muted-foreground">Loading team…</p>
            ) : (
              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.full_name ?? row.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Select
                            value={row.role}
                            onValueChange={(v) => void updateStaffRole(row.id, v as UserRole)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
