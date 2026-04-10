import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ordersFilledRaw from "../../../data/ordersFilled.json";
import { crmUsesSupabase } from "../../../lib/crm/crmRepo";
import type { ImportedOrderLine } from "../../../lib/crm/importedOrdersTypes";
import {
  deleteSpreadsheetSalesLine,
  insertSpreadsheetSalesLine,
  listSpreadsheetSalesLines,
  updateSpreadsheetSalesLine,
} from "../../../lib/crm/spreadsheetSalesRepo";
import {
  SPREADSHEET_ORDERS_STORAGE_KEY,
  buildFreshRowsFromSeed,
  parseStoredPayload,
  serializeRows,
} from "../../../lib/crm/spreadsheetOrdersPersistence";
import type {
  SpreadsheetOrderComment,
  SpreadsheetOrderRow,
  SpreadsheetOrderStatus,
} from "../../../lib/crm/spreadsheetOrderTypes";
import { useCrmAuth } from "../CrmAuthContext";

const SEED = ordersFilledRaw as ImportedOrderLine[];
const CLOUD = crmUsesSupabase();

type SpreadsheetOrdersContextValue = {
  rows: SpreadsheetOrderRow[];
  ready: boolean;
  loading: boolean;
  error: string | null;
  usesCloud: boolean;
  refresh: () => Promise<void>;
  addRow: (payload: ImportedOrderLine & { orderStatus: SpreadsheetOrderStatus }) => Promise<void>;
  updateRow: (
    id: string,
    patch: Partial<ImportedOrderLine> & { orderStatus?: SpreadsheetOrderStatus }
  ) => Promise<void>;
  deleteRow: (id: string) => Promise<void>;
  addComment: (rowId: string, text: string) => Promise<void>;
  resetToSeed: () => void;
};

const SpreadsheetOrdersContext = createContext<SpreadsheetOrdersContextValue | null>(null);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newCommentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadLocalRows(): SpreadsheetOrderRow[] {
  try {
    const raw = localStorage.getItem(SPREADSHEET_ORDERS_STORAGE_KEY);
    if (!raw) return buildFreshRowsFromSeed(SEED);
    const merged = parseStoredPayload(raw, SEED);
    return merged ?? buildFreshRowsFromSeed(SEED);
  } catch {
    return buildFreshRowsFromSeed(SEED);
  }
}

export function SpreadsheetOrdersProvider({ children }: { children: ReactNode }) {
  const { profile } = useCrmAuth();
  const authorLabel = profile?.full_name?.trim() || null;

  const [rows, setRows] = useState<SpreadsheetOrderRow[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(CLOUD);

  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!CLOUD) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listSpreadsheetSalesLines();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ledger");
      setRows([]);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (CLOUD) {
      void refresh();
      return;
    }
    setRows(loadLocalRows());
    setReady(true);
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    if (CLOUD) return;
    try {
      localStorage.setItem(SPREADSHEET_ORDERS_STORAGE_KEY, serializeRows(rows));
    } catch {
      /* quota */
    }
  }, [rows]);

  const addRow = useCallback(
    async (payload: ImportedOrderLine & { orderStatus: SpreadsheetOrderStatus }) => {
      const { orderStatus, ...line } = payload;
      if (CLOUD) {
        const created = await insertSpreadsheetSalesLine({
          ...line,
          orderStatus,
          comments: [],
          source: "manual",
        });
        setRows((prev) => [...prev, created]);
        return;
      }
      setRows((prev) => [
        ...prev,
        {
          ...line,
          id: newId(),
          source: "manual",
          orderStatus,
          comments: [],
        },
      ]);
    },
    []
  );

  const updateRow = useCallback(
    async (id: string, patch: Partial<ImportedOrderLine> & { orderStatus?: SpreadsheetOrderStatus }) => {
      const { orderStatus, ...rest } = patch;
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          return {
            ...r,
            ...rest,
            ...(orderStatus != null ? { orderStatus } : {}),
          };
        })
      );
      if (CLOUD) {
        await updateSpreadsheetSalesLine(id, {
          ...rest,
          ...(orderStatus != null ? { orderStatus } : {}),
        });
      }
    },
    []
  );

  const deleteRow = useCallback(async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (CLOUD) {
      await deleteSpreadsheetSalesLine(id);
    }
  }, []);

  const addComment = useCallback(
    async (rowId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const comment: SpreadsheetOrderComment = {
        id: newCommentId(),
        text: trimmed,
        createdAt: new Date().toISOString(),
        authorLabel,
      };
      let nextComments: SpreadsheetOrderComment[] | null = null;
      setRows((prev) => {
        const r = prev.find((x) => x.id === rowId);
        if (!r) return prev;
        nextComments = [...r.comments, comment];
        return prev.map((x) => (x.id === rowId ? { ...x, comments: nextComments! } : x));
      });
      if (CLOUD && nextComments) {
        await updateSpreadsheetSalesLine(rowId, { comments: nextComments });
      }
    },
    [authorLabel]
  );

  const resetToSeed = useCallback(() => {
    if (CLOUD) return;
    setRows(buildFreshRowsFromSeed(SEED));
    try {
      localStorage.removeItem(SPREADSHEET_ORDERS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      rows,
      ready,
      loading,
      error,
      usesCloud: CLOUD,
      refresh,
      addRow,
      updateRow,
      deleteRow,
      addComment,
      resetToSeed,
    }),
    [rows, ready, loading, error, refresh, addRow, updateRow, deleteRow, addComment, resetToSeed]
  );

  return (
    <SpreadsheetOrdersContext.Provider value={value}>{children}</SpreadsheetOrdersContext.Provider>
  );
}

export function useSpreadsheetOrders(): SpreadsheetOrdersContextValue {
  const ctx = useContext(SpreadsheetOrdersContext);
  if (!ctx) {
    throw new Error("useSpreadsheetOrders must be used within SpreadsheetOrdersProvider");
  }
  return ctx;
}
