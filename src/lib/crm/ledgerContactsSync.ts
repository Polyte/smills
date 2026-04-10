import { crmUsesSupabase, listContacts, saveContact, type CrmActor } from "./crmRepo";
import { listDistinctLedgerCustomerNamesFromBrowser } from "./spreadsheetOrdersPersistence";
import { listDistinctSpreadsheetCustomerNames } from "./spreadsheetSalesRepo";

const LEDGER_NOTE = "Imported from spreadsheet sales ledger.";

function normalizeCompanyKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Supabase RLS: sales may only insert type `lead`; ops roles may insert `customer`. */
function contactTypeForLedgerImport(actor: CrmActor): "customer" | "lead" {
  return actor.role === "sales" ? "lead" : "customer";
}

/**
 * Ensures each distinct sales-ledger customer has a matching CRM contact (by company name, case-insensitive).
 * Idempotent: skips companies that already exist.
 */
export async function syncSalesLedgerCustomersToContacts(
  actor: CrmActor
): Promise<{ created: number; skipped: number; error: Error | null }> {
  let ledgerNames: string[];
  try {
    ledgerNames = crmUsesSupabase()
      ? await listDistinctSpreadsheetCustomerNames()
      : listDistinctLedgerCustomerNamesFromBrowser();
  } catch (e) {
    return {
      created: 0,
      skipped: 0,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }

  if (ledgerNames.length === 0) {
    return { created: 0, skipped: 0, error: null };
  }

  let existing: Awaited<ReturnType<typeof listContacts>>;
  try {
    existing = await listContacts();
  } catch (e) {
    return {
      created: 0,
      skipped: 0,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }

  const seen = new Set(existing.map((c) => normalizeCompanyKey(c.company_name)));
  let created = 0;
  let skipped = 0;
  const type = contactTypeForLedgerImport(actor);

  for (const companyName of ledgerNames) {
    const key = normalizeCompanyKey(companyName);
    if (!key || seen.has(key)) {
      skipped += 1;
      continue;
    }

    const { error } = await saveContact(
      {
        company_name: companyName,
        contact_name: null,
        email: null,
        phone: null,
        type,
        status: "active",
        owner_id: actor.id,
        notes: LEDGER_NOTE,
      },
      actor
    );

    if (error) {
      return { created, skipped, error };
    }

    seen.add(key);
    created += 1;
  }

  return { created, skipped, error: null };
}
