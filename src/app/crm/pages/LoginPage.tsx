import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useCrmAuth } from "../CrmAuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";

export function LoginPage() {
  const { user, loading, signIn, signUpFirstAdmin, isLocalMode, localNeedsFirstSetup } = useCrmAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/crm";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
  }, [email, password, fullName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to={from.startsWith("/crm") ? from : "/crm"} replace />;
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) setError(err.message);
  }

  async function onCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signUpFirstAdmin(email.trim(), password, fullName.trim());
    setSubmitting(false);
    if (err) setError(err.message);
  }

  if (isLocalMode && localNeedsFirstSetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 text-center max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display font-bold text-foreground"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm">
              SM
            </span>
            Standerton Mills
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Create the first admin (offline CRM)</p>
          <Alert className="mt-4 text-left border-amber-200 bg-amber-50/80">
            <AlertDescription className="text-xs text-amber-950/90">
              Data is stored in this browser only (SQLite via IndexedDB). Clear site data to reset. Add
              Supabase keys in <code className="text-[10px]">.env</code> to sync to the cloud instead.
            </AlertDescription>
          </Alert>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>First-time setup</CardTitle>
            <CardDescription>
              This account becomes a manager. Others can be added under Settings after you sign in.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onCreateAdmin}>
            <CardContent className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="crm-name">Your name</Label>
                <Input
                  id="crm-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crm-email">Work email</Label>
                <Input
                  id="crm-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crm-password">Password</Label>
                <Input
                  id="crm-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create admin & sign in"}
              </Button>
              <Button variant="ghost" type="button" asChild>
                <Link to="/">Back to website</Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-display font-bold text-foreground"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm">
            SM
          </span>
          Standerton Mills
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">Staff sign in</p>
        {isLocalMode ? (
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Using local browser storage. Configure Supabase in .env to use the cloud.
          </p>
        ) : null}
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your work email and password.</CardDescription>
        </CardHeader>
        <form onSubmit={onSignIn}>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="crm-email">Email</Label>
              <Input
                id="crm-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm-password">Password</Label>
              <Input
                id="crm-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            <Button variant="ghost" type="button" asChild>
              <Link to="/">Back to website</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
