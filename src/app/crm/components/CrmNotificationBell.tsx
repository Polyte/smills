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
import { cn } from "../../components/ui/utils";
import type { Json } from "../database.types";

type Payload = {
  title?: string;
  quote_request_id?: string;
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

export function CrmNotificationBell() {
  const { user } = useCrmAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listNotifications>>>([]);

  const refresh = useCallback(async () => {
    if (!user?.id || !quotesDataAvailable()) {
      setUnread(0);
      setItems([]);
      return;
    }
    try {
      const [c, list] = await Promise.all([
        countUnreadNotifications(user.id),
        listNotifications(user.id, 25),
      ]);
      setUnread(c);
      setItems(list);
    } catch {
      setUnread(0);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (!user?.id || !quotesDataAvailable()) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-auto py-1 text-xs text-amber-700"
              onClick={() => {
                void markAllNotificationsRead(user.id).then(() => void refresh());
              }}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const isUnread = n.read_at == null;
                const reqId = payloadRequestId(n.payload);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/80",
                        isUnread && "bg-amber-50/80"
                      )}
                      onClick={() => {
                        if (isUnread) {
                          void markNotificationRead(n.id).then(() => void refresh());
                        }
                        setOpen(false);
                        if (reqId) {
                          navigate(`/crm/quotes?request=${reqId}`);
                        } else {
                          navigate("/crm/quotes");
                        }
                      }}
                    >
                      <span className="font-medium leading-snug">{payloadTitle(n.payload)}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t px-3 py-2">
          <NavLink
            to="/crm/quotes"
            className="text-xs font-medium text-amber-700 hover:underline"
            onClick={() => setOpen(false)}
          >
            Open quotes & invoicing
          </NavLink>
        </div>
      </PopoverContent>
    </Popover>
  );
}
