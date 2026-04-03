import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { useCrmAuth } from "../CrmAuthContext";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  quotesDataAvailable,
} from "../../../lib/crm/quotesRepo";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import {
  listAutomationAlerts,
  markAutomationAlertRead,
  type AutomationAlertRow,
} from "../../../lib/crm/factoryRepo";
import { getSupabase } from "../../../lib/supabaseClient";
import { cn } from "../../components/ui/utils";
import type { Json } from "../database.types";

type Payload = {
  title?: string;
  quote_request_id?: string;
  company_name?: string;
};

function payloadTitle(payload: Json): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "title" in payload) {
    const t = (payload as Payload).title;
    return typeof t === "string" ? t : "Notification";
  }
  return "Notification";
}

function payloadRequestId(payload: Json): string | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "quote_request_id" in payload) {
    const id = (payload as Payload).quote_request_id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function payloadCompany(payload: Json): string | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "company_name" in payload) {
    const c = (payload as Payload).company_name;
    return typeof c === "string" && c.trim() ? c.trim() : null;
  }
  return null;
}

type QuoteNotification = Awaited<ReturnType<typeof listNotifications>>[number];

type MergedItem =
  | { kind: "quote"; t: string; unread: boolean; n: QuoteNotification }
  | { kind: "auto"; t: string; unread: boolean; a: AutomationAlertRow };

export function CrmNotificationBell() {
  const { user } = useCrmAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [merged, setMerged] = useState<MergedItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setMerged([]);
      setUnread(0);
      return;
    }
    const quoteUnread = quotesDataAvailable()
      ? await countUnreadNotifications(user.id).catch(() => 0)
      : 0;
    let quoteList: QuoteNotification[] = [];
    if (quotesDataAvailable()) {
      quoteList = await listNotifications(user.id, 20).catch(() => []);
    }
    let autoList: AutomationAlertRow[] = [];
    if (crmUsesSupabase()) {
      autoList = await listAutomationAlerts(20).catch(() => []);
    }
    const autoUnread = autoList.filter((a) => a.read_at == null).length;
    setUnread(quoteUnread + autoUnread);

    const qItems: MergedItem[] = quoteList.map((n) => ({
      kind: "quote",
      t: n.created_at,
      unread: n.read_at == null,
      n,
    }));
    const aItems: MergedItem[] = autoList.map((a) => ({
      kind: "auto",
      t: a.created_at,
      unread: a.read_at == null,
      a,
    }));
    const all = [...qItems, ...aItems].sort((x, y) => (y.t > x.t ? 1 : -1));
    setMerged(all);
  }, [user?.id]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next && user?.id) {
        setListLoading(true);
        void refresh().finally(() => setListLoading(false));
      }
    },
    [refresh, user?.id]
  );

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!crmUsesSupabase() || !user?.id) return;
    const sb = getSupabase();
    const ch = sb
      .channel("automation-alerts-ui")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "automation_alerts" },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [user?.id, refresh]);

  if (!user?.id || (!quotesDataAvailable() && !crmUsesSupabase())) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative shrink-0" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[200]" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && quotesDataAvailable() ? (
            <Button
              type="button"
              variant="ghost"
              className="h-auto py-1 text-xs text-amber-700"
              onClick={() => {
                void markAllNotificationsRead(user.id).then(() => void refresh());
              }}
            >
              Mark quote alerts read
            </Button>
          ) : null}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {listLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : merged.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y">
              {merged.map((item) => {
                if (item.kind === "quote") {
                  const n = item.n;
                  const isUnread = item.unread;
                  const reqId = payloadRequestId(n.payload);
                  const company = payloadCompany(n.payload);
                  return (
                    <li key={`q-${n.id}`}>
                      <button
                        type="button"
                        className={cn(
                          "w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/80",
                          isUnread && "bg-amber-50/80 dark:bg-amber-950/30"
                        )}
                        onClick={() => {
                          if (isUnread) {
                            void markNotificationRead(n.id).then(() => void refresh());
                          }
                          setOpen(false);
                          if (reqId) navigate(`/crm/quotes?request=${reqId}`);
                          else navigate("/crm/quotes");
                        }}
                      >
                        <span className="font-medium leading-snug">{payloadTitle(n.payload)}</span>
                        {company ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{company}</span>
                        ) : null}
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </button>
                    </li>
                  );
                }
                const a = item.a;
                const isUnread = item.unread;
                return (
                  <li key={`a-${a.id}`}>
                    <button
                      type="button"
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/80",
                        isUnread && "bg-sky-50/80 dark:bg-sky-950/30"
                      )}
                      onClick={() => {
                        if (isUnread) {
                          void markAutomationAlertRead(a.id).then(() => void refresh());
                        }
                        setOpen(false);
                        navigate("/crm/automation");
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{a.severity}</span>
                      <span className="font-medium leading-snug block">{a.title}</span>
                      {a.body ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{a.body}</span>
                      ) : null}
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t px-3 py-2 flex flex-col gap-1">
          <NavLink to="/crm/quotes" className="text-xs font-medium text-amber-700 hover:underline" onClick={() => setOpen(false)}>
            Quotes & invoicing
          </NavLink>
          <NavLink to="/crm/automation" className="text-xs font-medium text-primary hover:underline" onClick={() => setOpen(false)}>
            Automation hub
          </NavLink>
        </div>
      </PopoverContent>
    </Popover>
  );
}
