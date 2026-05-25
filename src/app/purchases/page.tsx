import { recordPurchase, deletePurchase } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { FlashToast } from "@/components/flash-toast";
import { Card, EmptyState, Field, PageHeader, Pagination, StatusBadge, buttonClass, deleteBtnClass, ghostButtonClass, inputClass } from "@/components/ui";
import { money } from "@/lib/format";
import { row, rows } from "@/lib/db";
import { Trash2 } from "lucide-react";
import { Suspense } from "react";

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "";
  const dateFrom = params.from || "";
  const dateTo = params.to || "";
  const pageSize = 25;
  const page = Math.max(1, Number(params.page || 1));
  const offset = (page - 1) * pageSize;

  const products = await rows<{ id: number; name: string; cost_price: number }>(
    "SELECT id, name, cost_price FROM products WHERE status = 'active' ORDER BY name",
  );
  const suppliers = await rows<{ id: number; name: string }>("SELECT id, name FROM suppliers ORDER BY name");
  const total = await row<{ total: number }>(
    `SELECT COUNT(*) total FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE (? = '' OR s.name LIKE ?)
     AND (? = '' OR p.status = ?)
     AND (? = '' OR p.purchase_date >= ?)
     AND (? = '' OR p.purchase_date <= ?)`,
    [search, `%${search}%`, status, status, dateFrom, dateFrom, dateTo, dateTo],
  );
  const purchases = await rows<{ id: number; purchase_date: string; supplier_name: string | null; total_amount: number; status: string }>(
    `SELECT p.id, p.purchase_date, s.name supplier_name, p.total_amount, p.status
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE (? = '' OR s.name LIKE ?)
     AND (? = '' OR p.status = ?)
     AND (? = '' OR p.purchase_date >= ?)
     AND (? = '' OR p.purchase_date <= ?)
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [search, `%${search}%`, status, status, dateFrom, dateFrom, dateTo, dateTo, pageSize, offset],
  );

  const hasFilter = search || status || dateFrom || dateTo;

  return (
    <AppShell>
      <Suspense><FlashToast /></Suspense>
      <PageHeader title="Purchases" eyebrow="Receiving" />
      <Card className="mb-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Record a purchase</h2>
        <form action={recordPurchase} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Product">
            <select className={inputClass} name="product_id">
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.cost_price)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supplier">
            <select className={inputClass} name="supplier_id">
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input className={inputClass} name="quantity" type="number" min="1" defaultValue="1" />
          </Field>
          <Field label="Unit cost">
            <input className={inputClass} name="unit_cost" type="number" step="0.01" min="0" required />
          </Field>
          <Field label="Date">
            <input className={inputClass} name="purchase_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <input type="hidden" name="status" value="received" />
          <div className="md:col-span-2 xl:col-span-5">
            <Field label="Notes"><input className={inputClass} name="notes" /></Field>
          </div>
          <button className={buttonClass + " md:col-span-2 xl:col-span-5"}>Record purchase</button>
        </form>
      </Card>

      <Card>
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          <input
            className={inputClass + " min-w-44 flex-1"}
            name="search"
            placeholder="Search by supplier name…"
            defaultValue={search}
          />
          <select className={inputClass + " w-40"} name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="flex items-center gap-2">
            <input className={inputClass + " w-36"} name="from" type="date" defaultValue={dateFrom} title="From date" />
            <span className="text-muted-foreground text-xs">to</span>
            <input className={inputClass + " w-36"} name="to" type="date" defaultValue={dateTo} title="To date" />
          </div>
          <button className={buttonClass} type="submit">Filter</button>
          {hasFilter && <a href="/purchases" className={ghostButtonClass}>Clear</a>}
        </form>

        {hasFilter && (
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{Number(total?.total || 0)}</span> purchase{Number(total?.total || 0) !== 1 ? "s" : ""} found
          </p>
        )}

        <div className="table-scroll">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Date</th>
                <th className="pr-4">Supplier</th>
                <th className="pr-4">Amount</th>
                <th className="pr-4">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 text-muted-foreground">{p.purchase_date}</td>
                  <td className="pr-4 font-medium">{p.supplier_name || "No supplier"}</td>
                  <td className="pr-4 font-bold text-foreground">{money(p.total_amount)}</td>
                  <td className="pr-4"><StatusBadge status={p.status} /></td>
                  <td>
                    <form action={deletePurchase} data-confirm={`Delete this purchase of ${money(p.total_amount)}? This cannot be undone.`}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className={deleteBtnClass}>
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {purchases.length === 0 && (
          <EmptyState title="No purchases found" body="Record incoming stock above or adjust your search filters." />
        )}
        <Pagination basePath="/purchases" page={page} pageSize={pageSize} total={Number(total?.total || 0)} params={{ search, status, from: dateFrom, to: dateTo }} />
      </Card>
    </AppShell>
  );
}
