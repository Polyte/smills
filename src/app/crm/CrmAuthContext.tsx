import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useLocalSqliteCrm } from "../../lib/crm/mode";
import { getSupabase } from "../../lib/supabaseClient";
import {
  clearAllLocalCrmUserAccounts,
  fetchProfile,
  localClearSession,
  localGetSessionUserId,
  localSignIn,
  localSignUpFirst,
  localUserCount,
  trySeedLocalDevAdminsFromEnv,
} from "../../lib/crm/crmRepo";
import { getLocalSqliteDb } from "../../lib/crm/sqlite/engine";
import type { UserRole } from "./database.types";

export type CrmProfile = {
  id: string;
  full_name: string | null;
  role: UserRole;
};

type CrmAuthContextValue = {
  session: Session | null;
  /** Present when signed in (Supabase or local SQLite). */
  user: User | null;
  profile: CrmProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isLocalMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpFirstAdmin: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  localNeedsFirstSetup: boolean;
  /** Local SQLite only: delete all CRM user accounts and sign this browser out. */
  purgeAllLocalLogins: () => Promise<{ error: Error | null }>;
};

const CrmAuthContext = createContext<CrmAuthContextValue | null>(null);

function localUserStub(id: string, emailHint: string): User {
  return {
    id,
    email: emailHint || "local@crm",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as unknown as User;
}

export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [localEmailHint, setLocalEmailHint] = useState("");
  const [profile, setProfile] = useState<CrmProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [localNeedsFirstSetup, setLocalNeedsFirstSetup] = useState(false);

  const isLocalMode = useLocalSqliteCrm();

  const refreshProfile = useCallback(async () => {
    if (!isLocalMode) {
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }
      setProfileLoading(true);
      const p = await fetchProfile(user.id);
      setProfileLoading(false);
      if (p) setProfile({ id: p.id, full_name: p.full_name, role: p.role });
      else setProfile(null);
      return;
    }
    if (!localUserId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    const p = await fetchProfile(localUserId);
    setProfileLoading(false);
    if (p) {
      setProfile({ id: p.id, full_name: p.full_name, role: p.role });
      if (p.email) setLocalEmailHint(p.email);
    } else setProfile(null);
  }, [isLocalMode, localUserId]);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    async function init() {
      if (!isLocalMode) {
        const supabase = getSupabase();
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        setSession(s);
        setLoading(false);
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, next) => {
          setSession(next);
        });
        unsub = () => subscription.unsubscribe();
        return;
      }

      try {
        await getLocalSqliteDb();
        await trySeedLocalDevAdminsFromEnv();
        const n = await localUserCount();
        setLocalNeedsFirstSetup(n === 0);
        const uid = localGetSessionUserId();
        setLocalUserId(uid);
        if (uid) {
          const p = await fetchProfile(uid);
          if (p?.email) setLocalEmailHint(p.email);
        }
      } finally {
        setLoading(false);
      }
    }

    void init();
    return () => unsub?.();
  }, [isLocalMode]);

  useEffect(() => {
    if (!isLocalMode) {
      if (!session?.user) {
        setProfile(null);
        return;
      }
      void refreshProfile();
      return;
    }
    if (!localUserId) {
      setProfile(null);
      return;
    }
    void refreshProfile();
  }, [isLocalMode, session?.user?.id, localUserId, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isLocalMode) {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    }
    const { error } = await localSignIn(email, password);
    if (!error) {
      const uid = localGetSessionUserId();
      setLocalUserId(uid);
      setLocalEmailHint(email.trim());
      setLocalNeedsFirstSetup(false);
    }
    return { error };
  }, [isLocalMode]);

  const signUpFirstAdmin = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!isLocalMode) {
        return { error: new Error("Use Supabase Auth to create the first user.") };
      }
      const { error } = await localSignUpFirst(email, password, fullName);
      if (!error) {
        const uid = localGetSessionUserId();
        setLocalUserId(uid);
        setLocalEmailHint(email.trim());
        setLocalNeedsFirstSetup(false);
      }
      return { error };
    },
    [isLocalMode]
  );

  const signOut = useCallback(async () => {
    if (!isLocalMode) {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      setProfile(null);
      return;
    }
    localClearSession();
    setLocalUserId(null);
    setProfile(null);
  }, [isLocalMode]);

  const purgeAllLocalLogins = useCallback(async () => {
    if (!isLocalMode) {
      return {
        error: new Error("Only available in local SQLite CRM mode."),
      };
    }
    const { error } = await clearAllLocalCrmUserAccounts();
    if (error) return { error };
    setLocalUserId(null);
    setProfile(null);
    const n = await localUserCount();
    setLocalNeedsFirstSetup(n === 0);
    return { error: null };
  }, [isLocalMode]);

  const user: User | null = !isLocalMode
    ? (session?.user ?? null)
    : localUserId
      ? localUserStub(localUserId, localEmailHint)
      : null;

  const value: CrmAuthContextValue = {
    session: !isLocalMode ? session : null,
    user,
    profile,
    loading,
    profileLoading,
    isLocalMode,
    signIn,
    signUpFirstAdmin,
    signOut,
    refreshProfile,
    localNeedsFirstSetup,
    purgeAllLocalLogins,
  };

  return (
    <CrmAuthContext.Provider value={value}>{children}</CrmAuthContext.Provider>
  );
}

export function useCrmAuth() {
  const ctx = useContext(CrmAuthContext);
  if (!ctx) throw new Error("useCrmAuth must be used within CrmAuthProvider");
  return ctx;
}
