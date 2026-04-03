import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  isCrmDataAvailable,
  listProfilesForManager,
  localCreateCrmUser,
  updateMyProfileName,
  updateUserRole,
  type CrmActor,
  type ProfileShape,
} from "../../../lib/crm/crmRepo";
import { installSampleCrmData, sampleCrmDataInstalled, SAMPLE_DATA_MARKER } from "../../../lib/crm/sampleCrmData";
import { useCrmAuth } from "../CrmAuthContext";
import type { UserRole } from "../database.types";
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
import { Checkbox } from "../../components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { toast } from "sonner";

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut, isLocalMode, purgeAllLocalLogins } = useCrmAuth();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<ProfileShape[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [sampleInstalled, setSampleInstalled] = useState(false);
  const [sampleChecking, setSampleChecking] = useState(true);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleForce, setSampleForce] = useState(false);
  const [newLoginEmail, setNewLoginEmail] = useState("");
  const [newLoginPassword, setNewLoginPassword] = useState("");
  const [newLoginName, setNewLoginName] = useState("");
  const [newLoginRole, setNewLoginRole] = useState<UserRole>("production_manager");
  const [addingLogin, setAddingLogin] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const installed = await sampleCrmDataInstalled();
        if (!cancelled) setSampleInstalled(installed);
      } finally {
        if (!cancelled) setSampleChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStaff = useCallback(async () => {
    if (!user || (profile?.role !== "admin" && profile?.role !== "production_manager")) return;
    setLoadingStaff(true);
    try {
      const data = await listProfilesForManager();
      setStaff(data);
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

  async function runLoadSample() {
    if (!user || !profile) return;
    if (sampleInstalled && !sampleForce) {
      toast.error("Sample data is already loaded. Enable “Load again” below to add another batch.");
      return;
    }
    const actor: CrmActor = { id: user.id, role: profile.role };
    setSampleLoading(true);
    try {
      const r = await installSampleCrmData(actor, { force: sampleInstalled && sampleForce });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success(r.message);
      setSampleInstalled(await sampleCrmDataInstalled());
      setSampleForce(false);
    } finally {
      setSampleLoading(false);
    }
  }

  async function runPurgeAllLocalLogins() {
    const { error } = await purgeAllLocalLogins();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("All local CRM accounts removed. You can create a new first admin from the login page.");
    navigate("/crm/login", { replace: true });
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

  async function onAddLocalLogin(e: React.FormEvent) {
    e.preventDefault();
    if (
      !isLocalMode ||
      (profile?.role !== "admin" && profile?.role !== "production_manager")
    )
      return;
    setAddingLogin(true);
    const { error } = await localCreateCrmUser(
      newLoginEmail.trim(),
      newLoginPassword,
      newLoginName.trim(),
      newLoginRole
    );
    setAddingLogin(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Login created. They can sign in from the CRM login page.");
    setNewLoginEmail("");
    setNewLoginPassword("");
    setNewLoginName("");
    setNewLoginRole("production_manager");
    void loadStaff();
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

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg">Accounts & sign-in</CardTitle>
          <CardDescription>
            {isLocalMode
              ? "Local CRM stores users in this browser only. Removing all accounts also deletes CRM rows that belong to those users (contacts, deals, tasks, linked inventory movements, etc.)."
              : "Hosted mode uses Supabase Auth. Sessions are per device; removing users is done in your Supabase project."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLocalMode &&
          (profile?.role === "admin" || profile?.role === "production_manager") ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  Remove all local CRM logins
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove every local user?</AlertDialogTitle>
                  <AlertDialogDescription className="text-left space-y-2">
                    <span>
                      This deletes all accounts in this browser’s CRM database and signs you out. Related CRM data
                      owned by those users is removed automatically (cascading deletes). Product catalog items and
                      warehouse locations are kept unless they only existed through removed activity.
                    </span>
                    <span className="block font-medium text-foreground">This cannot be undone.</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void runPurgeAllLocalLogins()}
                  >
                    Remove all accounts
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : isLocalMode ? (
            <p className="text-sm text-muted-foreground">
              Only an operations admin can remove all local accounts. Sign in as the first admin account.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              To delete or disable logins for everyone, open your project in the{" "}
              <a
                href="https://supabase.com/dashboard"
                className="text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Supabase Dashboard
              </a>
              , then go to <strong className="text-foreground">Authentication → Users</strong>. Use{" "}
              <strong className="text-foreground">Sign out</strong> above to clear only this browser’s session.
            </p>
          )}
        </CardContent>
      </Card>

      {isLocalMode && (profile?.role === "admin" || profile?.role === "production_manager") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add local CRM login</CardTitle>
            <CardDescription>
              Create another admin or staff login for this browser-only database. Share the email and password
              offline; they sign in at the same CRM login page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(ev) => void onAddLocalLogin(ev)} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="new-login-name">Full name</Label>
                <Input
                  id="new-login-name"
                  value={newLoginName}
                  onChange={(e) => setNewLoginName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-login-email">Email</Label>
                <Input
                  id="new-login-email"
                  type="email"
                  value={newLoginEmail}
                  onChange={(e) => setNewLoginEmail(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-login-password">Password</Label>
                <Input
                  id="new-login-password"
                  type="password"
                  value={newLoginPassword}
                  onChange={(e) => setNewLoginPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newLoginRole} onValueChange={(v) => setNewLoginRole(v as UserRole)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="production_manager">Production manager</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="quality_officer">Quality officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={addingLogin}>
                {addingLogin ? "Creating…" : "Create login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {(profile?.role === "admin" ||
        profile?.role === "production_manager" ||
        profile?.role === "quality_officer") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sample data</CardTitle>
            <CardDescription>
              Load demo data across the CRM: contacts, pipeline, activities, tasks, quotes and a sample invoice when
              available, workforce (six employees, four departments, gate + dept readers, multi-day clockings and
              department time segments), inventory sites and receipts (including sliver/roving for production demos),
              three production orders (completed, draft, released-open), and a draft shipment. Useful for training or
              screenshots. Rows are tagged in notes with{" "}
              <code className="text-xs bg-muted px-1 rounded">{SAMPLE_DATA_MARKER}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sampleChecking ? (
              <p className="text-sm text-muted-foreground">Checking…</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Status:{" "}
                <span className="font-medium text-foreground">
                  {sampleInstalled ? "Sample data present" : "Not loaded yet"}
                </span>
              </p>
            )}
            <div className="flex items-start gap-2">
              <Checkbox
                id="sample-force"
                checked={sampleForce}
                onCheckedChange={(v) => setSampleForce(v === true)}
                disabled={sampleLoading || !sampleInstalled}
              />
              <label htmlFor="sample-force" className="text-sm leading-snug cursor-pointer">
                Load again (creates a second batch of sample rows even if the first is already present)
              </label>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={sampleLoading || sampleChecking || (sampleInstalled && !sampleForce)}
              onClick={() => void runLoadSample()}
            >
              {sampleLoading ? "Loading…" : sampleInstalled ? "Load another sample batch" : "Load sample data"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {profile?.role === "admin" || profile?.role === "production_manager" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team roles</CardTitle>
            <CardDescription>
              Assign CRM roles after users sign in once (Supabase) or create logins below (local mode).
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
                      {isLocalMode ? <TableHead>Email</TableHead> : null}
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.full_name ?? row.id.slice(0, 8)}</TableCell>
                        {isLocalMode ? (
                          <TableCell className="text-muted-foreground text-sm">{row.email ?? "—"}</TableCell>
                        ) : null}
                        <TableCell>
                          <Select
                            value={row.role}
                            onValueChange={(v) => void updateStaffRole(row.id, v as UserRole)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sales">Sales</SelectItem>
                              <SelectItem value="quality_officer">Quality officer</SelectItem>
                              <SelectItem value="production_manager">Production manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
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

      {profile?.role === "admin" || profile?.role === "production_manager" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Factory automation</CardTitle>
            <CardDescription>Declarative automation rules stored in Postgres (see also DB triggers for QC / order flow).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/crm/settings/automation-rules">Edit automation rules</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
